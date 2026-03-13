#!/usr/bin/env bash
# deploy-remote.sh — SSH-based idempotent deployment script for AAPR instances
# Story 7.5: Merge-triggered remote rollout
#
# Usage:
#   ./scripts/deploy-remote.sh --host <host> --user <ssh-user> --repo-path <path> \
#       --ref <branch-or-ref> --instance <stu|hms|elia> [--dry-run] [--ssh-key <path>] [--port <port>]
#
# Exit codes:
#   0  — deployment succeeded
#   1  — validation/input error (bad arguments, missing env file)
#   2  — SSH connection failure
#   3  — git sync failure
#   4  — compose config validation failure
#   5  — image build/pull failure
#   6  — compose up failure
#   7  — health check failure
#   99 — unexpected/internal error

set -euo pipefail

# ─── Exit code contract ───────────────────────────────────────────────────────
readonly EXIT_SUCCESS=0
readonly EXIT_VALIDATION=1
readonly EXIT_SSH=2
readonly EXIT_GIT=3
readonly EXIT_COMPOSE_CONFIG=4
readonly EXIT_BUILD=5
readonly EXIT_UP=6
readonly EXIT_HEALTH=7
readonly EXIT_INTERNAL=99

# ─── Logging ──────────────────────────────────────────────────────────────────
step_count=0
log_step() {
  step_count=$((step_count + 1))
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "  STEP $step_count: $1"
  echo "═══════════════════════════════════════════════════════════════"
}

log_ok() {
  echo "  ✓ $1"
}

log_fail() {
  echo "  ✗ FAILED: $1" >&2
}

log_info() {
  echo "  ℹ $1"
}

# ─── Defaults ─────────────────────────────────────────────────────────────────
HOST=""
SSH_USER=""
SSH_PORT="22"
REPO_PATH=""
REF="main"
INSTANCE=""
DRY_RUN=false
SSH_KEY=""

# ─── Argument parsing ────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $0 --host <host> --user <ssh-user> --repo-path <path> --ref <ref> --instance <instance> [options]

Required:
  --host        Target server hostname or IP
  --user        SSH user for remote connection
  --repo-path   Absolute path to the AAPR repository on the remote server
  --instance    Instance key (stu, hms, or elia)

Optional:
  --ref         Branch or commit ref to deploy (default: main)
  --dry-run     Validate inputs and SSH connection without mutating remote state
  --ssh-key     Path to SSH private key (default: use ssh-agent / default key)
  --port        SSH port for remote connection (default: 22)
  -h, --help    Show this help message

Exit codes:
  0  — success
  1  — validation/input error
  2  — SSH connection failure
  3  — git sync failure
  4  — compose config validation failure
  5  — image build/pull failure
  6  — compose up failure
  7  — health check failure
  99 — unexpected error
EOF
  exit "${1:-$EXIT_VALIDATION}"
}

# Guard: ensure the next argument has a non-flag value following it
require_arg() {
  if [[ $# -lt 2 ]] || [[ "$2" == --* ]]; then
    echo "Error: $1 requires a value" >&2
    usage "$EXIT_VALIDATION"
  fi
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --host)     require_arg "$@"; HOST="$2"; shift 2 ;;
    --user)     require_arg "$@"; SSH_USER="$2"; shift 2 ;;
    --repo-path) require_arg "$@"; REPO_PATH="$2"; shift 2 ;;
    --ref)      require_arg "$@"; REF="$2"; shift 2 ;;
    --instance) require_arg "$@"; INSTANCE="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --ssh-key)  require_arg "$@"; SSH_KEY="$2"; shift 2 ;;
    --port)     require_arg "$@"; SSH_PORT="$2"; shift 2 ;;
    -h|--help)  usage "$EXIT_SUCCESS" ;;
    *)
      echo "Error: Unknown argument '$1'" >&2
      usage "$EXIT_VALIDATION"
      ;;
  esac
done

# ─── Input validation ────────────────────────────────────────────────────────
log_step "Validate inputs"

errors=0

if [[ -z "$HOST" ]]; then
  log_fail "--host is required"
  errors=$((errors + 1))
fi

if [[ -z "$SSH_USER" ]]; then
  log_fail "--user is required"
  errors=$((errors + 1))
fi

if ! [[ "$SSH_PORT" =~ ^[0-9]+$ ]] || (( SSH_PORT < 1 || SSH_PORT > 65535 )); then
  log_fail "--port must be an integer between 1 and 65535 (got '$SSH_PORT')"
  errors=$((errors + 1))
fi

if [[ -z "$REPO_PATH" ]]; then
  log_fail "--repo-path is required"
  errors=$((errors + 1))
fi

if [[ -z "$INSTANCE" ]]; then
  log_fail "--instance is required"
  errors=$((errors + 1))
fi

case "$INSTANCE" in
  stu|hms|elia) ;;
  "")           ;; # already reported above
  *)
    log_fail "--instance must be one of: stu, hms, elia (got '$INSTANCE')"
    errors=$((errors + 1))
    ;;
esac

if [[ $errors -gt 0 ]]; then
  echo ""
  echo "Deployment aborted: $errors validation error(s). Run with --help for usage." >&2
  exit $EXIT_VALIDATION
fi

ENV_FILE="deploy/compose/${INSTANCE}.env"
COMPOSE_ARGS="--env-file $ENV_FILE -f docker-compose.yml"

log_ok "Host:      $HOST"
log_ok "User:      $SSH_USER"
log_ok "Port:      $SSH_PORT"
log_ok "Repo path: $REPO_PATH"
log_ok "Ref:       $REF"
log_ok "Instance:  $INSTANCE"
log_ok "Env file:  $ENV_FILE"
log_ok "Dry run:   $DRY_RUN"

# ─── SSH command helper ──────────────────────────────────────────────────────
build_ssh_opts() {
  # Builds SSH_OPTS as a global array so paths with spaces are handled safely
  SSH_OPTS=("-p" "$SSH_PORT" "-o" "BatchMode=yes" "-o" "ConnectTimeout=10" "-o" "StrictHostKeyChecking=accept-new")
  if [[ -n "$SSH_KEY" ]]; then
    SSH_OPTS+=("-i" "$SSH_KEY")
  fi
}

ssh_exec() {
  local description="$1"
  shift
  build_ssh_opts

  log_info "Remote: $description"
  if ! ssh "${SSH_OPTS[@]}" "${SSH_USER}@${HOST}" "$@"; then
    return 1
  fi
  return 0
}

# ─── Step 2: Verify SSH connectivity ─────────────────────────────────────────
log_step "Verify SSH connectivity"

if ! ssh_exec "Testing SSH connection" "echo 'SSH connection OK'"; then
  log_fail "Cannot connect to ${SSH_USER}@${HOST}"
  echo "  Remediation: Verify SSH key is available, host is reachable, and user has access." >&2
  exit $EXIT_SSH
fi
log_ok "SSH connection to ${SSH_USER}@${HOST} verified"

# ─── Step 3: Verify remote repository ────────────────────────────────────────
log_step "Verify remote repository"

if ! ssh_exec "Checking repository exists" "test -d '$REPO_PATH/.git'"; then
  log_fail "Repository not found at $REPO_PATH on $HOST"
  echo "  Remediation: Ensure the repository is cloned at '$REPO_PATH' on the remote host." >&2
  exit $EXIT_GIT
fi
log_ok "Repository found at $REPO_PATH"

if ! ssh_exec "Checking env file exists" "test -f '$REPO_PATH/$ENV_FILE'"; then
  log_fail "Instance env file not found at $REPO_PATH/$ENV_FILE"
  echo "  Remediation: Ensure instance env file '$ENV_FILE' exists in the repository." >&2
  exit $EXIT_VALIDATION
fi
log_ok "Instance env file $ENV_FILE found"

# ─── Dry-run stop point ──────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "  DRY RUN COMPLETE — no changes applied"
  echo "═══════════════════════════════════════════════════════════════"
  echo "  All preflight checks passed."
  echo "  Re-run without --dry-run to execute deployment."
  exit $EXIT_SUCCESS
fi

# ─── Step 4: Git sync to target ref ──────────────────────────────────────────
log_step "Sync repository to ref '$REF'"

if ! ssh_exec "Fetching latest refs" "cd '$REPO_PATH' && git fetch --all --prune"; then
  log_fail "git fetch failed on remote"
  echo "  Remediation: Check remote git configuration, network access, and repository permissions." >&2
  exit $EXIT_GIT
fi
log_ok "git fetch completed"

if ! ssh_exec "Resetting to ref '$REF'" "cd '$REPO_PATH' && git checkout '$REF' && git reset --hard 'origin/$REF'"; then
  # Try as a direct commit/tag ref if branch checkout fails
  if ! ssh_exec "Trying direct ref checkout" "cd '$REPO_PATH' && git checkout '$REF' && git reset --hard '$REF'"; then
    log_fail "Cannot checkout/reset to ref '$REF'"
    echo "  Remediation: Verify that ref '$REF' exists in the remote repository (branch, tag, or commit SHA)." >&2
    exit $EXIT_GIT
  fi
fi
log_ok "Repository synced to $REF"

ssh_exec "Current HEAD" "cd '$REPO_PATH' && git log --oneline -1"

# ─── Step 5: Compose config validation ───────────────────────────────────────
log_step "Validate compose configuration for instance '$INSTANCE'"

if ! ssh_exec "Validating compose config" "cd '$REPO_PATH' && docker compose $COMPOSE_ARGS config --quiet"; then
  log_fail "Compose configuration invalid for instance '$INSTANCE'"
  echo "  Remediation: Run 'docker compose $COMPOSE_ARGS config' on the remote to see detailed errors." >&2
  exit $EXIT_COMPOSE_CONFIG
fi
log_ok "Compose config valid for instance '$INSTANCE'"

# ─── Step 6: Build / pull images ─────────────────────────────────────────────
log_step "Build/pull images for instance '$INSTANCE'"

if ! ssh_exec "Building images" "cd '$REPO_PATH' && docker compose $COMPOSE_ARGS build"; then
  log_fail "Image build failed for instance '$INSTANCE'"
  echo "  Remediation: Check Dockerfiles and build context. Run build manually on remote for details." >&2
  exit $EXIT_BUILD
fi
log_ok "Images built successfully"

# ─── Step 7: Deploy (compose up) ─────────────────────────────────────────────
log_step "Deploy instance '$INSTANCE'"

if ! ssh_exec "Starting services" "cd '$REPO_PATH' && docker compose $COMPOSE_ARGS up -d"; then
  log_fail "docker compose up failed for instance '$INSTANCE'"
  echo "  Remediation: Check container logs with 'docker compose $COMPOSE_ARGS logs' on remote." >&2
  exit $EXIT_UP
fi
log_ok "Services started for instance '$INSTANCE'"

# ─── Step 8: Post-deploy health check ────────────────────────────────────────
log_step "Post-deploy health check for instance '$INSTANCE'"

# Wait for services to stabilize
log_info "Waiting 15s for services to become healthy..."
sleep 15

if ! ssh_exec "Running health check" "cd '$REPO_PATH' && bash scripts/compose-instance.sh health '$ENV_FILE'"; then
  log_fail "Health check failed for instance '$INSTANCE'"
  echo "  Remediation: Check service logs with 'docker compose $COMPOSE_ARGS logs' on remote." >&2
  echo "  Run 'bash scripts/compose-instance.sh health $ENV_FILE' on remote for details." >&2
  exit $EXIT_HEALTH
fi
log_ok "Health check passed"

# ─── Step 9: Deployment summary ──────────────────────────────────────────────
log_step "Deployment complete"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  DEPLOYMENT SUCCESSFUL                                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Host:       $HOST"
echo "  Instance:   $INSTANCE"
echo "  Ref:        $REF"
echo "  Env file:   $ENV_FILE"
echo ""

# Machine-readable summary line for CI parsing
echo "DEPLOY_RESULT=success host=$HOST instance=$INSTANCE ref=$REF env=$ENV_FILE"

ssh_exec "Container status" "cd '$REPO_PATH' && docker compose $COMPOSE_ARGS ps"

exit $EXIT_SUCCESS
