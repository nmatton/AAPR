#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--env-file PATH] [--compose-file PATH] [--config PATH] [--backup-dir PATH] [--keep-days N] [--skip-quality-check] [--skip-checksum-check] [--checksum-max-rows N]"
  echo ""
  echo "Defaults:"
  echo "  --env-file    deploy/compose/stu.env"
  echo "  --compose-file docker-compose.yml"
  echo "  --config      /etc/aapr/db-backup-ftp.conf"
  echo "  --backup-dir  /var/backups/aapr"
  echo "  --keep-days   14"
  echo "  quality check enabled (restore test + full table count comparison)"
  echo "  checksum check enabled for tables up to 200000 rows"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="$REPO_ROOT/deploy/compose/stu.env"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
CONFIG_FILE="/etc/aapr/db-backup-ftp.conf"
BACKUP_DIR="/var/backups/aapr"
KEEP_DAYS=14
QUALITY_CHECK=1
CHECKSUM_CHECK=1
CHECKSUM_MAX_ROWS=200000

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
    --skip-quality-check)
      QUALITY_CHECK=0
      shift 1
      ;;
    --skip-checksum-check)
      CHECKSUM_CHECK=0
      shift 1
      ;;
    --checksum-max-rows)
      CHECKSUM_MAX_ROWS="$2"
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

run_psql() {
  local db="$1"
  local sql="$2"
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
    psql -U "$POSTGRES_USER" -d "$db" -v ON_ERROR_STOP=1 -At -c "$sql"
}

get_table_list() {
  local db="$1"
  run_psql "$db" "
    SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND n.nspname !~ '^pg_toast'
    ORDER BY 1;
  "
}

write_all_table_counts() {
  local db="$1"
  local output_file="$2"
  local table
  : > "$output_file"

  while IFS= read -r table; do
    [[ -z "$table" ]] && continue
    local row_count
    row_count="$(run_psql "$db" "SELECT count(*)::bigint FROM ${table};")"
    printf "%s,%s\n" "$table" "$row_count" >> "$output_file"
  done < <(get_table_list "$db")
}

table_checksum() {
  local db="$1"
  local table="$2"
  run_psql "$db" "
    SELECT
      COALESCE(sum(hashtextextended(to_jsonb(t)::text, 0)::numeric), 0)::text
      || ':' ||
      COALESCE(sum(hashtextextended(to_jsonb(t)::text, 1)::numeric), 0)::text
    FROM ${table} AS t;
  "
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

# Honeybadger check-in ID (optional)
HONEYBADGER_CHECKIN_ID="${HONEYBADGER_CHECKIN_ID:-}"

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

if ! [[ "$CHECKSUM_MAX_ROWS" =~ ^[0-9]+$ ]]; then
  echo "Error: --checksum-max-rows must be a non-negative integer" >&2
  exit 1
fi

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

if [[ "$QUALITY_CHECK" -eq 1 ]]; then
  TMP_DIR="$(mktemp -d)"
  RESTORE_TEST_DB="${POSTGRES_DB}_backup_verify_$(date -u +%Y%m%d%H%M%S)"
  RESTORE_TEST_DB="${RESTORE_TEST_DB:0:63}"
  CONTAINER_BACKUP_PATH="/tmp/$(basename "$BACKUP_FILE")"
  SOURCE_COUNTS_FILE="$TMP_DIR/source_counts.csv"
  RESTORE_COUNTS_FILE="$TMP_DIR/restore_counts.csv"
  SOURCE_TABLES_FILE="$TMP_DIR/source_tables.txt"
  RESTORE_TABLES_FILE="$TMP_DIR/restore_tables.txt"
  SOURCE_CHECKSUMS_FILE="$TMP_DIR/source_checksums.csv"
  RESTORE_CHECKSUMS_FILE="$TMP_DIR/restore_checksums.csv"

  cleanup_quality_check() {
    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
      psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
      -c "DROP DATABASE IF EXISTS \"$RESTORE_TEST_DB\";" >/dev/null 2>&1 || true
    docker exec "$DB_CONTAINER_ID" rm -f "$CONTAINER_BACKUP_PATH" >/dev/null 2>&1 || true
    rm -rf "$TMP_DIR" >/dev/null 2>&1 || true
  }

  trap cleanup_quality_check EXIT

  log "Running backup quality check (temporary restore + all table row counts)"
  get_table_list "$POSTGRES_DB" > "$SOURCE_TABLES_FILE"
  write_all_table_counts "$POSTGRES_DB" "$SOURCE_COUNTS_FILE"

  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
    psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"$RESTORE_TEST_DB\";"

  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
    psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE \"$RESTORE_TEST_DB\";"

  docker cp "$BACKUP_FILE" "$DB_CONTAINER_ID:$CONTAINER_BACKUP_PATH"

  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
    pg_restore -U "$POSTGRES_USER" -d "$RESTORE_TEST_DB" \
    --clean --if-exists --single-transaction --no-owner --no-privileges "$CONTAINER_BACKUP_PATH"

  get_table_list "$RESTORE_TEST_DB" > "$RESTORE_TABLES_FILE"
  if ! diff -u "$SOURCE_TABLES_FILE" "$RESTORE_TABLES_FILE" >/dev/null; then
    echo "Error: table list mismatch between source DB and restored validation DB" >&2
    diff -u "$SOURCE_TABLES_FILE" "$RESTORE_TABLES_FILE" >&2 || true
    exit 1
  fi

  write_all_table_counts "$RESTORE_TEST_DB" "$RESTORE_COUNTS_FILE"
  if ! diff -u "$SOURCE_COUNTS_FILE" "$RESTORE_COUNTS_FILE" >/dev/null; then
    echo "Error: row count mismatch detected by quality check" >&2
    diff -u "$SOURCE_COUNTS_FILE" "$RESTORE_COUNTS_FILE" >&2 || true
    exit 1
  fi

  if [[ "$CHECKSUM_CHECK" -eq 1 ]]; then
    log "Running checksum validation for tables with <= $CHECKSUM_MAX_ROWS rows"
    : > "$SOURCE_CHECKSUMS_FILE"
    : > "$RESTORE_CHECKSUMS_FILE"
    CHECKSUM_TABLES=0
    SKIPPED_CHECKSUM_TABLES=0

    while IFS=',' read -r table row_count; do
      [[ -z "$table" ]] && continue

      if [[ "$row_count" =~ ^[0-9]+$ ]] && [[ "$row_count" -le "$CHECKSUM_MAX_ROWS" ]]; then
        source_checksum="$(table_checksum "$POSTGRES_DB" "$table")"
        restore_checksum="$(table_checksum "$RESTORE_TEST_DB" "$table")"
        printf "%s,%s\n" "$table" "$source_checksum" >> "$SOURCE_CHECKSUMS_FILE"
        printf "%s,%s\n" "$table" "$restore_checksum" >> "$RESTORE_CHECKSUMS_FILE"
        CHECKSUM_TABLES=$((CHECKSUM_TABLES + 1))
      else
        SKIPPED_CHECKSUM_TABLES=$((SKIPPED_CHECKSUM_TABLES + 1))
      fi
    done < "$SOURCE_COUNTS_FILE"

    if ! diff -u "$SOURCE_CHECKSUMS_FILE" "$RESTORE_CHECKSUMS_FILE" >/dev/null; then
      echo "Error: checksum mismatch detected during quality check" >&2
      diff -u "$SOURCE_CHECKSUMS_FILE" "$RESTORE_CHECKSUMS_FILE" >&2 || true
      exit 1
    fi

    log "Checksum validation passed ($CHECKSUM_TABLES tables checked, $SKIPPED_CHECKSUM_TABLES skipped by threshold)"
  fi

  log "Quality check passed"
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

# --- Honeybadger check-in (after successful backup+upload) ---
if [ -n "$HONEYBADGER_CHECKIN_ID" ]; then
  curl -fsSL "https://api.honeybadger.io/v1/check_in/$HONEYBADGER_CHECKIN_ID" -o /dev/null || \
    echo "[WARN] Honeybadger check-in failed (ID: $HONEYBADGER_CHECKIN_ID)" >&2
fi
