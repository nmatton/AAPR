#!/usr/bin/env bash
set -euo pipefail

# Wrapper for deploy-remote.sh with predefined deployment target settings.
# Usage:
#   ./scripts/deploy-remote-instance.sh <stu|hms|elia>

usage() {
  echo "Usage: $0 <instance>"
  echo "  instance: stu | hms | elia"
  exit 1
}

if [[ $# -ne 1 ]]; then
  usage
fi

INSTANCE="$1"
case "$INSTANCE" in
  stu|hms|elia) ;;
  *)
    echo "Error: instance must be one of: stu, hms, elia (got '$INSTANCE')" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/deploy-remote.sh" \
  --host "unamurcs.be" \
  --user "nmatton" \
  --port "10422" \
  --repo-path "/home/nmatton/AAPR" \
  --ssh-key "/mnt/c/Users/nmatton/.ssh/aapr_private_openssh" \
  --instance "$INSTANCE"
