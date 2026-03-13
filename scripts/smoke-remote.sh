#!/usr/bin/env bash
# smoke-remote.sh - Trusted-network remote smoke checks for deployment instances
set -euo pipefail

readonly EXIT_SUCCESS=0
readonly EXIT_FAILURE=1
readonly EXIT_VALIDATION=2
readonly EXIT_UNSUPPORTED_CONTEXT=20

HOST=""
SSH_USER=""
REPO_PATH=""
INSTANCES_CSV="stu,hms,elia"
MAX_ATTEMPTS=4
RETRY_DELAY=5
SSH_KEY=""
DEPLOY_RESULTS_FILE=""

SSH_BIN="${SMOKE_SSH_BIN:-ssh}"
SLEEP_BIN="${SMOKE_SLEEP_BIN:-sleep}"

usage() {
  cat <<EOF
Usage: $0 --host <host> --user <ssh-user> --repo-path <path> [options]

Required:
  --host                 Target server hostname or IP
  --user                 SSH user for remote execution
  --repo-path            Absolute path to repository on remote host

Optional:
  --instances            Comma-separated instance list (default: stu,hms,elia)
  --max-attempts         Retry attempts for health checks (default: 4)
  --retry-delay          Delay in seconds between retries (default: 5)
  --ssh-key              Path to SSH private key
  --deploy-results-file  Optional file containing DEPLOY_RESULT=success lines
  -h, --help             Show this help message

Exit codes:
  0   - all instance smoke checks passed
  1   - one or more instance checks failed
  2   - input validation failure
  20  - unsupported execution context (GitHub-hosted runner)
EOF
  exit "${1:-$EXIT_VALIDATION}"
}

require_arg() {
  if [[ $# -lt 2 ]] || [[ "$2" == --* ]]; then
    echo "Error: $1 requires a value" >&2
    usage "$EXIT_VALIDATION"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) require_arg "$@"; HOST="$2"; shift 2 ;;
    --user) require_arg "$@"; SSH_USER="$2"; shift 2 ;;
    --repo-path) require_arg "$@"; REPO_PATH="$2"; shift 2 ;;
    --instances) require_arg "$@"; INSTANCES_CSV="$2"; shift 2 ;;
    --max-attempts) require_arg "$@"; MAX_ATTEMPTS="$2"; shift 2 ;;
    --retry-delay) require_arg "$@"; RETRY_DELAY="$2"; shift 2 ;;
    --ssh-key) require_arg "$@"; SSH_KEY="$2"; shift 2 ;;
    --deploy-results-file) require_arg "$@"; DEPLOY_RESULTS_FILE="$2"; shift 2 ;;
    -h|--help) usage "$EXIT_SUCCESS" ;;
    *)
      echo "Error: Unknown argument '$1'" >&2
      usage "$EXIT_VALIDATION"
      ;;
  esac
done

build_ssh_opts() {
  SSH_OPTS=("-o" "BatchMode=yes" "-o" "ConnectTimeout=10" "-o" "StrictHostKeyChecking=accept-new")
  if [[ -n "$SSH_KEY" ]]; then
    SSH_OPTS+=("-i" "$SSH_KEY")
  fi
}

ssh_exec() {
  local command="$1"
  build_ssh_opts
  "$SSH_BIN" "${SSH_OPTS[@]}" "${SSH_USER}@${HOST}" "$command"
}

trim() {
  local value="$1"
  value="${value#${value%%[![:space:]]*}}"
  value="${value%${value##*[![:space:]]}}"
  printf '%s' "$value"
}

get_env_value() {
  local env_file="$1"
  local key="$2"
  local value
  value=$(grep -E "^${key}=" "$env_file" | head -n 1 | cut -d= -f2- || true)
  trim "$value"
}

validate_execution_context() {
  local gh_actions="${GITHUB_ACTIONS:-false}"
  local runner_env="${RUNNER_ENVIRONMENT:-}"
  if [[ "$gh_actions" == "true" && "$runner_env" != "self-hosted" ]]; then
    echo "UNSUPPORTED_EXECUTION_CONTEXT=github-hosted-runner"
    echo "Reason: trusted IP SSH restrictions prevent hosted runners from reaching deployment server." >&2
    echo "Supported contexts: trusted operator machine, or self-hosted runner in trusted network." >&2
    exit "$EXIT_UNSUPPORTED_CONTEXT"
  fi
}

RETRY_ATTEMPTS=0
RETRY_RECOVERED="false"
retry_stage() {
  local stage_name="$1"
  local command="$2"
  local attempt=1

  RETRY_RECOVERED="false"
  while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
    RETRY_ATTEMPTS="$attempt"
    if ssh_exec "$command" >/dev/null 2>&1; then
      if [[ "$attempt" -gt 1 ]]; then
        RETRY_RECOVERED="true"
      fi
      return 0
    fi

    if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
      echo "  retry stage=$stage_name attempt=$attempt/$MAX_ATTEMPTS delay=${RETRY_DELAY}s"
      "$SLEEP_BIN" "$RETRY_DELAY"
    fi
    attempt=$((attempt + 1))
  done

  return 1
}

validate_inputs() {
  local errors=0

  if [[ -z "$HOST" ]]; then
    echo "Error: --host is required" >&2
    errors=$((errors + 1))
  fi
  if [[ -z "$SSH_USER" ]]; then
    echo "Error: --user is required" >&2
    errors=$((errors + 1))
  fi
  if [[ -z "$REPO_PATH" ]]; then
    echo "Error: --repo-path is required" >&2
    errors=$((errors + 1))
  fi

  if ! [[ "$MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || [[ "$MAX_ATTEMPTS" -lt 1 ]]; then
    echo "Error: --max-attempts must be an integer >= 1" >&2
    errors=$((errors + 1))
  fi
  if ! [[ "$RETRY_DELAY" =~ ^[0-9]+$ ]] || [[ "$RETRY_DELAY" -lt 0 ]]; then
    echo "Error: --retry-delay must be an integer >= 0" >&2
    errors=$((errors + 1))
  fi

  if ! command -v "$SSH_BIN" >/dev/null 2>&1; then
    echo "Error: SSH binary not found: $SSH_BIN" >&2
    errors=$((errors + 1))
  fi

  if [[ -n "$DEPLOY_RESULTS_FILE" && ! -f "$DEPLOY_RESULTS_FILE" ]]; then
    echo "Error: --deploy-results-file does not exist: $DEPLOY_RESULTS_FILE" >&2
    errors=$((errors + 1))
  fi

  if [[ "$errors" -gt 0 ]]; then
    exit "$EXIT_VALIDATION"
  fi
}

set_instance_result() {
  local instance="$1"
  local status="$2"
  local stage="$3"
  local code="$4"
  local backend_attempts="$5"
  local frontend_attempts="$6"
  local recovered="$7"

  RESULT_STATUS["$instance"]="$status"
  RESULT_STAGE["$instance"]="$stage"
  RESULT_CODE["$instance"]="$code"
  RESULT_BACKEND_ATTEMPTS["$instance"]="$backend_attempts"
  RESULT_FRONTEND_ATTEMPTS["$instance"]="$frontend_attempts"
  RESULT_RECOVERED["$instance"]="$recovered"

  echo "SMOKE_RESULT=$status instance=$instance stage=$stage code=$code backend_attempts=$backend_attempts frontend_attempts=$frontend_attempts transient_recovered=$recovered"
}

validate_execution_context
validate_inputs

IFS=',' read -r -a INSTANCES <<< "$INSTANCES_CSV"

declare -A RESULT_STATUS RESULT_STAGE RESULT_CODE RESULT_BACKEND_ATTEMPTS RESULT_FRONTEND_ATTEMPTS RESULT_RECOVERED

overall_failed=0

echo "TRUSTED_CONTEXT_CHECK=passed context=${RUNNER_ENVIRONMENT:-operator}"
echo "SMOKE_SCOPE=server-focused checks=compose-config,compose-ps,backend-health,frontend-availability"

for raw_instance in "${INSTANCES[@]}"; do
  instance=$(trim "$raw_instance")
  if [[ -z "$instance" ]]; then
    continue
  fi

  case "$instance" in
    stu|hms|elia) ;;
    *)
      set_instance_result "$instance" "fail" "validation" "invalid_instance" "0" "0" "false"
      overall_failed=1
      continue
      ;;
  esac

  env_file="deploy/compose/${instance}.env"
  if [[ ! -f "$env_file" ]]; then
    set_instance_result "$instance" "fail" "validation" "missing_env_file" "0" "0" "false"
    overall_failed=1
    continue
  fi

  backend_port=$(get_env_value "$env_file" "BACKEND_HOST_PORT")
  frontend_port=$(get_env_value "$env_file" "FRONTEND_HOST_PORT")
  if [[ -z "$backend_port" || -z "$frontend_port" ]]; then
    set_instance_result "$instance" "fail" "validation" "missing_ports" "0" "0" "false"
    overall_failed=1
    continue
  fi

  if [[ -n "$DEPLOY_RESULTS_FILE" ]]; then
    if ! grep -Eq "DEPLOY_RESULT=success .*instance=${instance}( |$)" "$DEPLOY_RESULTS_FILE"; then
      set_instance_result "$instance" "fail" "deploy-contract" "deploy_result_missing" "0" "0" "false"
      overall_failed=1
      continue
    fi
  fi

  compose_config_cmd="cd '$REPO_PATH' && docker compose --env-file '$env_file' -f docker-compose.yml config --quiet"
  if ! ssh_exec "$compose_config_cmd" >/dev/null 2>&1; then
    set_instance_result "$instance" "fail" "compose-config" "compose_config_failed" "0" "0" "false"
    overall_failed=1
    continue
  fi

  compose_ps_cmd="cd '$REPO_PATH' && docker compose --env-file '$env_file' -f docker-compose.yml ps"
  if ! ssh_exec "$compose_ps_cmd" >/dev/null 2>&1; then
    set_instance_result "$instance" "fail" "compose-ps" "compose_ps_failed" "0" "0" "false"
    overall_failed=1
    continue
  fi

  backend_cmd="cd '$REPO_PATH' && curl -sf 'http://localhost:${backend_port}/api/v1/health' >/dev/null"
  frontend_cmd="cd '$REPO_PATH' && curl -sf 'http://localhost:${frontend_port}/' >/dev/null"

  backend_attempts=0
  frontend_attempts=0
  recovered="false"

  if ! retry_stage "backend-health" "$backend_cmd"; then
    set_instance_result "$instance" "fail" "backend-health" "backend_health_failed" "$RETRY_ATTEMPTS" "0" "false"
    overall_failed=1
    continue
  fi
  backend_attempts="$RETRY_ATTEMPTS"
  if [[ "$RETRY_RECOVERED" == "true" ]]; then
    recovered="true"
  fi

  if ! retry_stage "frontend-health" "$frontend_cmd"; then
    set_instance_result "$instance" "fail" "frontend-health" "frontend_health_failed" "$backend_attempts" "$RETRY_ATTEMPTS" "$recovered"
    overall_failed=1
    continue
  fi
  frontend_attempts="$RETRY_ATTEMPTS"
  if [[ "$RETRY_RECOVERED" == "true" ]]; then
    recovered="true"
  fi

  set_instance_result "$instance" "pass" "completed" "ok" "$backend_attempts" "$frontend_attempts" "$recovered"
done

echo ""
echo "| Instance | Status | Failed Stage | Code | Backend Attempts | Frontend Attempts | Transient Recovered |"
echo "|---|---|---|---|---:|---:|---|"

for raw_instance in "${INSTANCES[@]}"; do
  instance=$(trim "$raw_instance")
  [[ -z "$instance" ]] && continue

  status="${RESULT_STATUS[$instance]:-fail}"
  stage="${RESULT_STAGE[$instance]:-unknown}"
  code="${RESULT_CODE[$instance]:-unknown}"
  backend_attempts="${RESULT_BACKEND_ATTEMPTS[$instance]:-0}"
  frontend_attempts="${RESULT_FRONTEND_ATTEMPTS[$instance]:-0}"
  recovered="${RESULT_RECOVERED[$instance]:-false}"

  echo "| $instance | $status | $stage | $code | $backend_attempts | $frontend_attempts | $recovered |"
done

if [[ "$overall_failed" -eq 1 ]]; then
  echo "SMOKE_SUMMARY=fail"
  exit "$EXIT_FAILURE"
fi

echo "SMOKE_SUMMARY=pass"
exit "$EXIT_SUCCESS"