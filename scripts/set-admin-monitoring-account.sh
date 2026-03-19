#!/usr/bin/env bash
# ==============================================================================
# set-admin-monitoring-account.sh
#
# Provision a global monitoring admin account by setting the is_admin_monitor
# flag on a target user. Enforces fresh-state constraints before enabling the
# flag, and optionally cleans up blocking artifacts with explicit confirmation.
#
# Usage:
#   ./scripts/set-admin-monitoring-account.sh <email-or-id> [env-file] [--cleanup] [--yes]
#
# Arguments:
#   <email-or-id>   Email address or numeric user ID of the target account.
#   [env-file]      Path to instance env file (default: deploy/compose/stu.env).
#   --cleanup       If specified, remove team memberships and Big Five data
#                   before setting the admin-monitor flag. Requires interactive
#                   confirmation unless --yes is also passed.
#   --yes           Skip interactive confirmation for cleanup (use with care).
#
# Examples:
#   # Set flag on a fresh account (no cleanup needed):
#   ./scripts/set-admin-monitoring-account.sh admin-monitor@example.com
#
#   # Target a specific compose instance env file:
#   ./scripts/set-admin-monitoring-account.sh admin-monitor@example.com deploy/compose/hms.env
#
#   # Set flag after reviewing cleanup prompt:
#   ./scripts/set-admin-monitoring-account.sh 42 --cleanup
#
#   # Non-interactive cleanup (e.g. in CI/staging bootstrap):
#   ./scripts/set-admin-monitoring-account.sh admin-monitor@example.com --cleanup --yes
#
# Requirements:
#   - Docker + Docker Compose available.
#   - Target compose stack started with db service running.
#
# Exit codes:
#   0  Success
#   1  Input/configuration error
#   2  Account not found
#   3  Fresh-state check failed (cleanup required but not confirmed)
#   4  Database error
# ==============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

info()    { echo "[INFO]  $*"; }
warn()    { echo "[WARN]  $*" >&2; }
error()   { echo "[ERROR] $*" >&2; }
success() { echo "[OK]    $*"; }

usage() {
  sed -n '/^# Usage:/,/^# ==/{ /^# ==/d; s/^# \{0,3\}//; p }' "$0"
  exit 1
}

get_env_value() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d '\r'
}

require_compose_context() {
  if [ ! -f "$ENV_FILE" ]; then
    error "Env file not found: $ENV_FILE"
    exit 1
  fi

  POSTGRES_USER="$(get_env_value POSTGRES_USER)"
  POSTGRES_DB="$(get_env_value POSTGRES_DB)"

  if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    error "POSTGRES_USER and POSTGRES_DB must be defined in env file: $ENV_FILE"
    exit 1
  fi

  if [ -z "$(docker compose $COMPOSE_ARGS ps -q db)" ]; then
    error "db service is not running for env file '$ENV_FILE'."
    error "Start it first with: ./scripts/compose-instance.sh up $ENV_FILE"
    exit 1
  fi
}

run_sql() {
  # Run SQL in the target compose db container and return raw query output.
  docker compose $COMPOSE_ARGS exec -T db \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "$1" 2>&1 || {
    error "Database query failed."
    exit 4
  }
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

if [ $# -lt 1 ]; then
  usage
fi

case "${1:-}" in
  -h|--help)
    usage
    ;;
esac

IDENTIFIER="${1}"
ENV_FILE="deploy/compose/stu.env"
DO_CLEANUP=false
ASSUME_YES=false

shift
while [ $# -gt 0 ]; do
  case "$1" in
    --cleanup) DO_CLEANUP=true ;;
    --yes)     ASSUME_YES=true ;;
    -h|--help) usage ;;
    *)
      if [ "$ENV_FILE" = "deploy/compose/stu.env" ] && [[ "$1" != --* ]]; then
        ENV_FILE="$1"
      else
        error "Unknown argument: $1"
        usage
      fi
      ;;
  esac
  shift
done

COMPOSE_ARGS="--env-file $ENV_FILE -f docker-compose.yml"

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

require_compose_context
info "Using env file: ${ENV_FILE}"

# 1. Resolve user ID from email or numeric ID
info "Resolving account: ${IDENTIFIER}"

if [[ "${IDENTIFIER}" =~ ^[0-9]+$ ]]; then
  LOOKUP_SQL="SELECT id FROM users WHERE id = ${IDENTIFIER} LIMIT 1;"
else
  ESCAPED_EMAIL="$(printf "%s" "$IDENTIFIER" | sed "s/'/''/g")"
  LOOKUP_SQL="SELECT id FROM users WHERE email = '${ESCAPED_EMAIL}' LIMIT 1;"
fi

USER_ID="$(run_sql "${LOOKUP_SQL}")"

if [ -z "${USER_ID}" ]; then
  error "Account not found: ${IDENTIFIER}"
  exit 2
fi

success "Found user ID: ${USER_ID}"

# 2. Fresh-state checks
info "Checking fresh-state constraints for user ID ${USER_ID}..."

MEMBERSHIP_COUNT="$(run_sql "SELECT COUNT(*) FROM team_members WHERE user_id = ${USER_ID};")"
BIG_FIVE_RESPONSE_COUNT="$(run_sql "SELECT COUNT(*) FROM big_five_responses WHERE user_id = ${USER_ID};")"
BIG_FIVE_SCORE_COUNT="$(run_sql "SELECT COUNT(*) FROM big_five_scores WHERE user_id = ${USER_ID};")"

HAS_BLOCKING_DATA=false
if [ "${MEMBERSHIP_COUNT}" -gt 0 ] || [ "${BIG_FIVE_RESPONSE_COUNT}" -gt 0 ] || [ "${BIG_FIVE_SCORE_COUNT}" -gt 0 ]; then
  HAS_BLOCKING_DATA=true
fi

if $HAS_BLOCKING_DATA; then
  warn "Account is not in a fresh state:"
  [ "${MEMBERSHIP_COUNT}" -gt 0 ]          && warn "  - team_members rows:        ${MEMBERSHIP_COUNT}"
  [ "${BIG_FIVE_RESPONSE_COUNT}" -gt 0 ]   && warn "  - big_five_responses rows:  ${BIG_FIVE_RESPONSE_COUNT}"
  [ "${BIG_FIVE_SCORE_COUNT}" -gt 0 ]      && warn "  - big_five_scores rows:     ${BIG_FIVE_SCORE_COUNT}"

  if ! $DO_CLEANUP; then
    error "Cleanup is required. Re-run with --cleanup to remove blocking data, or"
    error "manually remediate the account before setting the admin-monitor flag."
    exit 3
  fi

  # Confirm cleanup unless --yes was passed
  if ! $ASSUME_YES; then
    echo ""
    echo "  WARNING: This will permanently remove all team memberships and Big Five"
    echo "  data for user ID ${USER_ID} (${IDENTIFIER}). This cannot be undone."
    echo ""
    read -r -p "  Type 'yes' to confirm cleanup: " CONFIRMATION
    if [ "${CONFIRMATION}" != "yes" ]; then
      info "Cleanup not confirmed. Exiting without changes."
      exit 3
    fi
  fi

  # Perform cleanup in a transaction
  info "Performing cleanup for user ID ${USER_ID}..."
  run_sql "BEGIN;
    DELETE FROM team_members      WHERE user_id = ${USER_ID};
    DELETE FROM big_five_responses WHERE user_id = ${USER_ID};
    DELETE FROM big_five_scores    WHERE user_id = ${USER_ID};
  COMMIT;" > /dev/null
  success "Cleanup complete."
else
  info "Account is in a fresh state. No cleanup required."
fi

# 3. Set admin-monitor flag
info "Setting is_admin_monitor = true for user ID ${USER_ID}..."
run_sql "UPDATE users SET is_admin_monitor = true WHERE id = ${USER_ID};" > /dev/null
success "Admin-monitor flag set for user ID ${USER_ID} (${IDENTIFIER})."

echo ""
echo "  The account can now access all teams without explicit membership rows and"
echo "  will be excluded from member listings, affinity computations, and Big Five"
echo "  questionnaire participation."
echo ""
echo "  To revoke: UPDATE users SET is_admin_monitor = false WHERE id = ${USER_ID};"
