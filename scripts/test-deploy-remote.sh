#!/usr/bin/env bash
# test-deploy-remote.sh — Tests for deploy-remote.sh input validation and exit code contract
# Story 7.5: Verifies script argument parsing, validation, and dry-run behavior
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-remote.sh"

# ─── Exit code contract (must match deploy-remote.sh) ─────────────────────────
readonly EXIT_SUCCESS=0
readonly EXIT_VALIDATION=1
readonly EXIT_SSH=2

pass_count=0
fail_count=0
total_count=0

assert_exit_code() {
  local description="$1"
  local expected="$2"
  shift 2
  total_count=$((total_count + 1))

  local actual
  set +e
  "$@" >/dev/null 2>&1
  actual=$?
  set -e

  if [[ "$actual" -eq "$expected" ]]; then
    echo "  PASS: $description (exit=$actual)"
    pass_count=$((pass_count + 1))
  else
    echo "  FAIL: $description (expected=$expected, got=$actual)"
    fail_count=$((fail_count + 1))
  fi
}

assert_output_contains() {
  local description="$1"
  local pattern="$2"
  shift 2
  total_count=$((total_count + 1))

  local output
  set +e
  output=$("$@" 2>&1)
  set -e

  if echo "$output" | grep -qi "$pattern"; then
    echo "  PASS: $description"
    pass_count=$((pass_count + 1))
  else
    echo "  FAIL: $description (pattern '$pattern' not found in output)"
    fail_count=$((fail_count + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  deploy-remote.sh — Input Validation & Exit Code Tests"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Test: Script exists and is readable ──────────────────────────────────────
echo "--- Preconditions ---"
total_count=$((total_count + 1))
if [[ -f "$DEPLOY_SCRIPT" ]]; then
  echo "  PASS: deploy-remote.sh exists"
  pass_count=$((pass_count + 1))
else
  echo "  FAIL: deploy-remote.sh not found at $DEPLOY_SCRIPT"
  fail_count=$((fail_count + 1))
  echo ""
  echo "TESTS ABORTED: Script not found"
  exit 1
fi

# ─── Test: Missing required arguments ────────────────────────────────────────
echo ""
echo "--- Missing Arguments → Exit $EXIT_VALIDATION ---"

assert_exit_code \
  "No arguments at all" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT"

assert_exit_code \
  "Missing --host" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --user deploy --repo-path /opt/aapr --instance stu

assert_exit_code \
  "Missing --user" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --host server1 --repo-path /opt/aapr --instance stu

assert_exit_code \
  "Missing --repo-path" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --host server1 --user deploy --instance stu

assert_exit_code \
  "Missing --instance" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --host server1 --user deploy --repo-path /opt/aapr

# ─── Test: Invalid instance name ─────────────────────────────────────────────
echo ""
echo "--- Invalid Instance → Exit $EXIT_VALIDATION ---"

assert_exit_code \
  "Invalid instance 'prod'" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --host server1 --user deploy --repo-path /opt/aapr --instance prod

assert_exit_code \
  "Invalid instance 'dev'" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --host server1 --user deploy --repo-path /opt/aapr --instance dev

# ─── Test: Unknown arguments ─────────────────────────────────────────────────
echo ""
echo "--- Unknown Arguments → Exit $EXIT_VALIDATION ---"

assert_exit_code \
  "Unknown flag --foobar" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --foobar

# ─── Test: Help flag ─────────────────────────────────────────────────────────
echo ""
echo "--- Help Flag ---"

assert_exit_code \
  "--help exits with 0" \
  "$EXIT_SUCCESS" \
  bash "$DEPLOY_SCRIPT" --help

assert_exit_code \
  "-h exits with 0" \
  "$EXIT_SUCCESS" \
  bash "$DEPLOY_SCRIPT" -h

assert_output_contains \
  "--help shows usage text" \
  "Usage:" \
  bash "$DEPLOY_SCRIPT" --help

assert_output_contains \
  "--help mentions exit codes" \
  "exit codes" \
  bash "$DEPLOY_SCRIPT" --help

# ─── Test: Flag provided without a value → exit 1 (validation, not shell crash) ─
echo ""
echo "--- Flag Missing Value → Exit $EXIT_VALIDATION ---"

assert_exit_code \
  "--host without value exits with validation error (not shell crash)" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --host

assert_output_contains \
  "--host without value prints error message" \
  "requires a value" \
  bash "$DEPLOY_SCRIPT" --host

# ─── Test: --ssh-key flag accepted without crashing ───────────────────────────
echo ""
echo "--- --ssh-key Flag ---"

assert_exit_code \
  "--ssh-key without following value exits with validation error" \
  "$EXIT_VALIDATION" \
  bash "$DEPLOY_SCRIPT" --ssh-key

assert_exit_code \
  "--ssh-key with a key path reaches SSH phase (unreachable host → exit 2)" \
  "$EXIT_SSH" \
  bash "$DEPLOY_SCRIPT" --host 192.0.2.1 --user nobody --repo-path /opt/aapr --instance stu --ssh-key /tmp/fake_key

# ─── Test: Valid args but unreachable host → exit 2 (SSH failure) ─────────────
echo ""
echo "--- SSH Failure → Exit $EXIT_SSH ---"

assert_exit_code \
  "Unreachable host exits with SSH error" \
  "$EXIT_SSH" \
  bash "$DEPLOY_SCRIPT" --host 192.0.2.1 --user nobody --repo-path /opt/aapr --ref main --instance stu

# ─── Test: Dry-run with unreachable host → exit 2 (SSH still checked) ────────
echo ""
echo "--- Dry-run with Unreachable Host → Exit $EXIT_SSH ---"

assert_exit_code \
  "Dry-run still checks SSH (unreachable → exit 2)" \
  "$EXIT_SSH" \
  bash "$DEPLOY_SCRIPT" --host 192.0.2.1 --user nobody --repo-path /opt/aapr --instance stu --dry-run

# ─── Test: Machine-readable output line format ───────────────────────────────
echo ""
echo "--- Output Format ---"

assert_output_contains \
  "Validation error shows error count" \
  "validation error" \
  bash "$DEPLOY_SCRIPT"

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Results: $pass_count/$total_count passed, $fail_count failed"
echo "═══════════════════════════════════════════════════════════════"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
exit 0
