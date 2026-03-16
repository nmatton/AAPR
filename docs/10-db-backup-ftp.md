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
- Uploads file to `FTP_REMOTE_DIR/INSTANCE_KEY/`
- Removes local dump files older than `--keep-days`

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
