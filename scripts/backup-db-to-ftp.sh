#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--env-file PATH] [--compose-file PATH] [--config PATH] [--backup-dir PATH] [--keep-days N]"
  echo ""
  echo "Defaults:"
  echo "  --env-file    deploy/compose/stu.env"
  echo "  --compose-file docker-compose.yml"
  echo "  --config      /etc/aapr/db-backup-ftp.conf"
  echo "  --backup-dir  /var/backups/aapr"
  echo "  --keep-days   14"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="$REPO_ROOT/deploy/compose/stu.env"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
CONFIG_FILE="/etc/aapr/db-backup-ftp.conf"
BACKUP_DIR="/var/backups/aapr"
KEEP_DAYS=14

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --keep-days)
      KEEP_DAYS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

read_env_var() {
  local key="$1"
  local file="$2"
  grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- | tr -d '\r'
}

require_cmd docker
require_cmd curl

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: FTP config file not found: $CONFIG_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${FTP_HOST:?FTP_HOST is required in config file}"
: "${FTP_USER:?FTP_USER is required in config file}"
: "${FTP_PASS:?FTP_PASS is required in config file}"

FTP_PROTOCOL="${FTP_PROTOCOL:-ftp}"
FTP_PORT="${FTP_PORT:-}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-aapr-backups}"

PROJECT_NAME="$(read_env_var COMPOSE_PROJECT_NAME "$ENV_FILE")"
INSTANCE_KEY="$(read_env_var INSTANCE_KEY "$ENV_FILE")"
POSTGRES_DB="$(read_env_var POSTGRES_DB "$ENV_FILE")"
POSTGRES_USER="$(read_env_var POSTGRES_USER "$ENV_FILE")"
POSTGRES_PASSWORD="$(read_env_var POSTGRES_PASSWORD "$ENV_FILE")"

: "${PROJECT_NAME:?COMPOSE_PROJECT_NAME is missing in env file}"
: "${INSTANCE_KEY:?INSTANCE_KEY is missing in env file}"
: "${POSTGRES_DB:?POSTGRES_DB is missing in env file}"
: "${POSTGRES_USER:?POSTGRES_USER is missing in env file}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is missing in env file}"

mkdir -p "$BACKUP_DIR"
umask 077

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/${PROJECT_NAME}_${POSTGRES_DB}_${TIMESTAMP}.dump"

COMPOSE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")
DB_CONTAINER_ID="$(docker compose "${COMPOSE_ARGS[@]}" ps -q db)"

if [[ -z "$DB_CONTAINER_ID" ]]; then
  echo "Error: could not resolve running db container for env file: $ENV_FILE" >&2
  exit 1
fi

log "Creating PostgreSQL dump from container $DB_CONTAINER_ID"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Error: backup file is empty: $BACKUP_FILE" >&2
  exit 1
fi

REMOTE_DIR_CLEAN="${FTP_REMOTE_DIR#/}"
REMOTE_URL="${FTP_PROTOCOL}://${FTP_HOST}"
if [[ -n "$FTP_PORT" ]]; then
  REMOTE_URL+="${REMOTE_URL:+}:$FTP_PORT"
fi
REMOTE_URL+="/${REMOTE_DIR_CLEAN%/}/${INSTANCE_KEY}/$(basename "$BACKUP_FILE")"

log "Uploading backup to $FTP_PROTOCOL server"
curl --fail --show-error --silent --ftp-create-dirs \
  --user "$FTP_USER:$FTP_PASS" \
  -T "$BACKUP_FILE" \
  "$REMOTE_URL"

log "Upload completed: $REMOTE_URL"

if [[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] && [[ "$KEEP_DAYS" -gt 0 ]]; then
  log "Pruning local backups older than $KEEP_DAYS days"
  find "$BACKUP_DIR" -maxdepth 1 -type f -name "${PROJECT_NAME}_${POSTGRES_DB}_*.dump" -mtime +"$KEEP_DAYS" -delete
fi

log "Backup workflow completed successfully"
