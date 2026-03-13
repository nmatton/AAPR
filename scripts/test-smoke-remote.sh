#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SMOKE_SCRIPT="$SCRIPT_DIR/smoke-remote.sh"

pass_count=0
fail_count=0
total_count=0

assert_exit_and_output() {
  local description="$1"
  local expected_exit="$2"
  local expected_pattern="$3"
  shift 3
  total_count=$((total_count + 1))

  local output
  local exit_code
  set +e
  output=$("$@" 2>&1)
  exit_code=$?
  set -e

  if [[ "$exit_code" -eq "$expected_exit" ]] && echo "$output" | grep -Eq "$expected_pattern"; then
    echo "  PASS: $description"
    pass_count=$((pass_count + 1))
  else
    echo "  FAIL: $description"
    echo "        expected exit=$expected_exit pattern=$expected_pattern"
    echo "        got exit=$exit_code"
    echo "        output:"
    echo "$output" | sed 's/^/        /'
    fail_count=$((fail_count + 1))
  fi
}

make_mock_ssh() {
  local mock_path="$1"
  cat > "$mock_path" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

command_str="${@: -1}"
instance="unknown"
if [[ "$command_str" =~ deploy/compose/(stu|hms|elia)\.env ]]; then
  instance="${BASH_REMATCH[1]}"
elif [[ "$command_str" =~ localhost:(3000|5173) ]]; then
  instance="stu"
elif [[ "$command_str" =~ localhost:(3001|5174) ]]; then
  instance="hms"
elif [[ "$command_str" =~ localhost:(3002|5175) ]]; then
  instance="elia"
fi

state_file="${SMOKE_MOCK_STATE_FILE:-/tmp/smoke-mock-state}"
mkdir -p "$(dirname "$state_file")"
touch "$state_file"

next_attempt() {
  local key="$1"
  local current
  current=$(grep -E "^${key}=" "$state_file" | cut -d= -f2 || true)
  if [[ -z "$current" ]]; then
    current=0
  fi
  current=$((current + 1))
  grep -Ev "^${key}=" "$state_file" > "${state_file}.tmp" || true
  echo "${key}=${current}" >> "${state_file}.tmp"
  mv "${state_file}.tmp" "$state_file"
  echo "$current"
}

scenario="${SMOKE_MOCK_SCENARIO:-all-pass}"

if [[ "$command_str" == *"config --quiet"* ]]; then
  exit 0
fi

if [[ "$command_str" == *" docker compose "*" ps"* ]]; then
  exit 0
fi

if [[ "$command_str" == *"/api/v1/health"* ]]; then
  if [[ "$scenario" == "backend-retry-once" && "$instance" == "stu" ]]; then
    attempt=$(next_attempt "${instance}_backend")
    if [[ "$attempt" -eq 1 ]]; then
      exit 1
    fi
  fi
  exit 0
fi

if [[ "$command_str" == *"curl -sf 'http://localhost:"*"/' >/dev/null"* ]]; then
  if [[ "$scenario" == "frontend-hard-fail-hms" && "$instance" == "hms" ]]; then
    exit 1
  fi
  exit 0
fi

exit 0
EOF
  chmod +x "$mock_path"
}

echo ""
echo "==============================================================="
echo "  smoke-remote.sh - contract tests"
echo "==============================================================="

if [[ ! -f "$SMOKE_SCRIPT" ]]; then
  echo "FAIL: missing script $SMOKE_SCRIPT"
  exit 1
fi

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

mock_ssh="$tmp_dir/mock-ssh.sh"
mock_sleep="$tmp_dir/mock-sleep.sh"
mock_state="$tmp_dir/mock-state.txt"

make_mock_ssh "$mock_ssh"
cat > "$mock_sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$mock_sleep"

assert_exit_and_output \
  "Unsupported GitHub-hosted context fails clearly" \
  20 \
  "UNSUPPORTED_EXECUTION_CONTEXT=github-hosted-runner" \
  env GITHUB_ACTIONS=true RUNNER_ENVIRONMENT=github-hosted bash "$SMOKE_SCRIPT" --host server --user deploy --repo-path /opt/aapr

assert_exit_and_output \
  "Retry path reports transient recovery and success" \
  0 \
  "SMOKE_RESULT=pass instance=stu .*transient_recovered=true" \
  env SMOKE_SSH_BIN="$mock_ssh" SMOKE_SLEEP_BIN="$mock_sleep" SMOKE_MOCK_STATE_FILE="$mock_state" SMOKE_MOCK_SCENARIO=backend-retry-once bash "$SMOKE_SCRIPT" --host server --user deploy --repo-path /opt/aapr --max-attempts 3 --retry-delay 0

rm -f "$mock_state"

assert_exit_and_output \
  "Mixed outcomes emit per-instance results and overall fail" \
  1 \
  "SMOKE_RESULT=pass instance=stu|SMOKE_RESULT=pass instance=elia" \
  env SMOKE_SSH_BIN="$mock_ssh" SMOKE_SLEEP_BIN="$mock_sleep" SMOKE_MOCK_STATE_FILE="$mock_state" SMOKE_MOCK_SCENARIO=frontend-hard-fail-hms bash "$SMOKE_SCRIPT" --host server --user deploy --repo-path /opt/aapr --max-attempts 2 --retry-delay 0

assert_exit_and_output \
  "Mixed outcomes include hard-failed instance and summary fail" \
  1 \
  "SMOKE_RESULT=fail instance=hms stage=frontend-health code=frontend_health_failed" \
  env SMOKE_SSH_BIN="$mock_ssh" SMOKE_SLEEP_BIN="$mock_sleep" SMOKE_MOCK_STATE_FILE="$mock_state" SMOKE_MOCK_SCENARIO=frontend-hard-fail-hms bash "$SMOKE_SCRIPT" --host server --user deploy --repo-path /opt/aapr --max-attempts 2 --retry-delay 0

assert_exit_and_output \
  "Mixed outcomes emit summary fail" \
  1 \
  "SMOKE_SUMMARY=fail" \
  env SMOKE_SSH_BIN="$mock_ssh" SMOKE_SLEEP_BIN="$mock_sleep" SMOKE_MOCK_STATE_FILE="$mock_state" SMOKE_MOCK_SCENARIO=frontend-hard-fail-hms bash "$SMOKE_SCRIPT" --host server --user deploy --repo-path /opt/aapr --max-attempts 2 --retry-delay 0

echo ""
echo "Results: $pass_count/$total_count passed, $fail_count failed"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi

exit 0