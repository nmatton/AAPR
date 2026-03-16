# PostgreSQL Docker Backup to FTP (Linux Production)

This guide provides a production-safe backup workflow for the current Docker architecture:

- Database service in compose: `db`
- PostgreSQL container resolution: `docker compose --env-file <instance.env> -f docker-compose.yml ps -q db`
- Instance-level DB settings loaded from `deploy/compose/*.env`:
  - `COMPOSE_PROJECT_NAME`
  - `INSTANCE_KEY`
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`

The backup script created for this project:

- `scripts/backup-db-to-ftp.sh`
- `scripts/backup-db-to-ftp.conf.example`

## 1) Install prerequisites on the production server

```bash
sudo apt-get update
sudo apt-get install -y curl
# Docker Engine + Docker Compose plugin must already be available
```

## 2) Prepare FTP secret config (server-side)

Create a protected config file (outside git):

```bash
sudo mkdir -p /etc/aapr
sudo cp /path/to/repo/scripts/backup-db-to-ftp.conf.example /etc/aapr/db-backup-ftp.conf
sudo chown root:root /etc/aapr/db-backup-ftp.conf
sudo chmod 600 /etc/aapr/db-backup-ftp.conf
sudo nano /etc/aapr/db-backup-ftp.conf
```

Set your real FTP values:

```dotenv
FTP_PROTOCOL=ftp
FTP_HOST=your-ftp-host
FTP_PORT=21
FTP_USER=your-user
FTP_PASS=your-password
FTP_REMOTE_DIR=aapr-backups
```

## 3) Make script executable and test manually

```bash
cd /path/to/repo
chmod +x scripts/backup-db-to-ftp.sh

# Example for stu instance
scripts/backup-db-to-ftp.sh \
  --env-file deploy/compose/stu.env \
  --compose-file docker-compose.yml \
  --config /etc/aapr/db-backup-ftp.conf \
  --backup-dir /var/backups/aapr \
  --keep-days 14
```

Expected behavior:

- Generates PostgreSQL custom dump (`.dump`) in `/var/backups/aapr`
- Validates backup integrity before upload by restoring to a temporary DB and comparing row counts for all user tables
- Adds checksum comparison for eligible tables (default: tables up to `200000` rows)
- Uploads file to `FTP_REMOTE_DIR/INSTANCE_KEY/`
- Removes local dump files older than `--keep-days`

To skip this quality check in exceptional cases (faster but less safe), add:

```bash
--skip-quality-check
```

Checksum tuning flags:

```bash
# Skip checksum stage only (row-count quality check still runs)
--skip-checksum-check

# Change checksum threshold (default 200000 rows)
--checksum-max-rows 100000
```

## 4) Schedule every 12h with cron

Open crontab for the account that can run Docker:

```bash
crontab -e
```

Add this entry (every 12 hours at minute 0):

```cron
0 */12 * * * cd /path/to/repo && /bin/bash scripts/backup-db-to-ftp.sh --env-file deploy/compose/stu.env --compose-file docker-compose.yml --config /etc/aapr/db-backup-ftp.conf --backup-dir /var/backups/aapr --keep-days 14 >> /var/log/aapr-db-backup.log 2>&1
```

## 5) Schedule every 12h with systemd (recommended)

Create service file:

```bash
sudo tee /etc/systemd/system/aapr-db-backup.service > /dev/null <<'EOF'
[Unit]
Description=AAPR PostgreSQL Docker backup to FTP
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/path/to/repo
ExecStart=/bin/bash /path/to/repo/scripts/backup-db-to-ftp.sh --env-file /path/to/repo/deploy/compose/stu.env --compose-file /path/to/repo/docker-compose.yml --config /etc/aapr/db-backup-ftp.conf --backup-dir /var/backups/aapr --keep-days 14
User=root
Group=root
EOF
```

Create timer file:

```bash
sudo tee /etc/systemd/system/aapr-db-backup.timer > /dev/null <<'EOF'
[Unit]
Description=Run AAPR DB backup every 12 hours

[Timer]
OnCalendar=*-*-* 00,12:00:00
Persistent=true
Unit=aapr-db-backup.service

[Install]
WantedBy=timers.target
EOF
```

Enable and start timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aapr-db-backup.timer
sudo systemctl list-timers --all | grep aapr-db-backup
```

Manual run/test with systemd:

```bash
sudo systemctl start aapr-db-backup.service
sudo systemctl status aapr-db-backup.service --no-pager
journalctl -u aapr-db-backup.service -n 100 --no-pager
```

## Notes

- If possible, prefer `FTP_PROTOCOL=ftps` for encrypted transfer.
- Keep `/etc/aapr/db-backup-ftp.conf` permission as `600`.
- If you run multiple instances (stu/hms/elia), create one timer/service per env file or duplicate `ExecStart` with instance-specific unit names.

## 6) Restoration procedure

This project backup format is PostgreSQL custom archive (`.dump`, created with `pg_dump -F c`).

### 6.1 Prepare restore context

```bash
cd /path/to/repo
ENV_FILE=deploy/compose/stu.env
COMPOSE_FILE=docker-compose.yml
BACKUP_FILE=/var/backups/aapr/aapr-stu_aapr_stu_20260316T120000Z.dump

DB_CONTAINER_ID=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q db)
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2)
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2)
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
```

Check backup archive is readable:

```bash
pg_restore --list "$BACKUP_FILE" > /dev/null
```

If `pg_restore` is not installed on host, use:

```bash
docker cp "$BACKUP_FILE" "$DB_CONTAINER_ID:/tmp/restore.dump"
docker exec "$DB_CONTAINER_ID" pg_restore --list /tmp/restore.dump > /dev/null
```

### 6.2 Recommended: dry-run restore to a temporary database

```bash
RESTORE_TEST_DB="${POSTGRES_DB}_restore_test"

docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$RESTORE_TEST_DB\";"

docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"$RESTORE_TEST_DB\";"

cat "$BACKUP_FILE" | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  pg_restore -U "$POSTGRES_USER" -d "$RESTORE_TEST_DB" --clean --if-exists --no-owner --no-privileges --single-transaction
```

Optional count sanity check (source DB vs restore test DB):

```bash
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -F ',' \
  -c "SELECT 'users',count(*) FROM users UNION ALL SELECT 'teams',count(*) FROM teams UNION ALL SELECT 'issues',count(*) FROM issues UNION ALL SELECT 'events',count(*) FROM events ORDER BY 1;" > /tmp/source_counts.csv

docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  psql -U "$POSTGRES_USER" -d "$RESTORE_TEST_DB" -At -F ',' \
  -c "SELECT 'users',count(*) FROM users UNION ALL SELECT 'teams',count(*) FROM teams UNION ALL SELECT 'issues',count(*) FROM issues UNION ALL SELECT 'events',count(*) FROM events ORDER BY 1;" > /tmp/restore_counts.csv

diff -u /tmp/source_counts.csv /tmp/restore_counts.csv
```

### 6.3 In-place restore (destructive)

Only do this when you are ready to replace current production data.

1. Stop write traffic (maintenance mode / stop app containers).
2. Keep one safety backup before restore.
3. Restore backup into the target DB.

```bash
# Stop app containers (db stays up)
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop backend frontend

# Safety backup before overwrite
./scripts/backup-db-to-ftp.sh --env-file "$ENV_FILE" --compose-file "$COMPOSE_FILE" --config /etc/aapr/db-backup-ftp.conf --backup-dir /var/backups/aapr --keep-days 14

# Restore over target DB
cat "$BACKUP_FILE" | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --single-transaction

# Restart app
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" start backend frontend
```

### 6.4 Post-restore checks

```bash
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 backend
curl -sf http://localhost:3000/api/v1/health
```

If backend host port differs by instance, replace `3000` with the `BACKEND_HOST_PORT` from your env file.

## 7) Troubleshooting common restore errors

### Error: `unrecognized configuration parameter "transaction_timeout"`

Cause:

- The backup was produced by newer PostgreSQL client tooling (commonly pg_dump/pgAdmin from newer major version) and restored into an older PostgreSQL server (for this project: PostgreSQL 14).

Fix (recommended):

1. Re-create the backup using the DB container tooling (same major as server), not host pgAdmin binaries.

```bash
DB_CONTAINER_ID=$(docker compose --env-file deploy/compose/stu.env -f docker-compose.yml ps -q db)
docker exec "$DB_CONTAINER_ID" pg_dump --version
```

Use the project backup script to ensure version alignment:

```bash
./scripts/backup-db-to-ftp.sh --env-file deploy/compose/stu.env --compose-file docker-compose.yml --config /etc/aapr/db-backup-ftp.conf
```

By default, the backup script performs a full validation restore and compares row counts for all user tables before uploading.
If you need a quick backup without validation (not recommended for normal operations), use `--skip-quality-check`.

Checksum behavior:

- Enabled by default, but only on tables with row count less than or equal to `--checksum-max-rows`.
- This keeps CPU cost bounded on large tables while still adding stronger integrity validation on most operational tables.

Notes:

- If this is the only error, restore usually still proceeds.
- To avoid this permanently, keep backup and restore tooling on the same PostgreSQL major version as target server.

### Error: `role "aapr_user" does not exist`

Cause:

- The target server/database does not have the role referenced in dump ownership metadata.

Fix option A (preferred): restore without ownership/ACL changes

```bash
cat "$BACKUP_FILE" | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --single-transaction --no-owner --no-privileges
```

Fix option B: create the role before restore

```bash
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER_ID" \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aapr_user') THEN CREATE ROLE aapr_user LOGIN; END IF; END $$;"
```

### pgAdmin restore settings to avoid ownership errors

In pgAdmin `Restore...` dialog, set:

- `Format`: `Custom or tar`
- `Clean before restore`: `Yes` (if overwriting)
- `Single transaction`: `Yes`
- `Do not save owner`: `Yes`
- `Do not save privileges`: `Yes`

This is equivalent to CLI flags `--no-owner --no-privileges`.
