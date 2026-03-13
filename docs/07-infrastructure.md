# Infrastructure

**Infrastructure & Deployment Guide for AAPR Platform**

Last Updated: March 13, 2026  
Environment: Local Development (Docker) + Future Production

---

## Overview

The AAPR platform runs with:
- **Frontend:** React SPA served by Vite dev server (dev) or static files (production)
- **Backend:** Node.js Express API
- **Database:** PostgreSQL 14+ in Docker container
- **Email:** SMTP (Mailtrap for dev, SendGrid/AWS SES for production)

---

## Local Development Setup

### Prerequisites

Installed software:
- **Node.js:** 18+ LTS ([download](https://nodejs.org/))
- **npm:** 9+ (bundled with Node.js)
- **Docker Desktop:** Latest ([download](https://www.docker.com/products/docker-desktop/))
- **Git:** Latest ([download](https://git-scm.com/))

### Docker PostgreSQL

**Start Database:**
```powershell
docker run -d `
  --name aapr-postgres `
  -e POSTGRES_USER=aapr_user `
  -e POSTGRES_PASSWORD=aapr_password `
  -e POSTGRES_DB=aapr `
  -p 5432:5432 `
  postgres:14
```

**Verify Running:**
```powershell
docker ps | Select-String "aapr-postgres"
```

**Stop Database:**
```powershell
docker stop aapr-postgres
```

**Remove Container:**
```powershell
docker rm aapr-postgres
```

**Data Persistence:**
By default, data is stored in Docker's internal volume. To persist data across container removal:
```powershell
docker run -d `
  --name aapr-postgres `
  -e POSTGRES_USER=aapr_user `
  -e POSTGRES_PASSWORD=aapr_password `
  -e POSTGRES_DB=aapr `
  -p 5432:5432 `
  -v aapr-pgdata:/var/lib/postgresql/data `
  postgres:14
```

---

## Environment Variables

### Backend (.env)

**File:** `server/.env`

```bash
# Database
DATABASE_URL="postgresql://aapr_user:aapr_password@localhost:5432/aapr"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# SMTP Email (Mailtrap for dev)
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-mailtrap-username"
SMTP_PASS="your-mailtrap-password"
SMTP_FROM="noreply@aapr.local"

# App Config
NODE_ENV="development"
PORT=3000
```

**Security Notes:**
- `JWT_SECRET`: Minimum 32 characters, random, NEVER commit to Git
- `DATABASE_URL`: Update credentials for production
- `SMTP_*`: Use Mailtrap for dev, SendGrid/AWS SES for production

---

### Frontend (.env)

**File:** `client/.env`

```bash
VITE_API_URL="http://localhost:3000"
```

**Note:** Vite requires `VITE_` prefix for environment variables

---

## Running the Application

### Backend

**Install Dependencies:**
```powershell
cd server
npm install
```

**Run Migrations:**
```powershell
npx prisma migrate deploy
```

**Seed Database (Optional):**
```powershell
npm run db:seed
```

**Start Development Server:**
```powershell
npm run dev
```

**Server Runs:** `http://localhost:3000`

---

### Frontend

**Install Dependencies:**
```powershell
cd client
npm install
```

**Start Development Server:**
```powershell
npm run dev
```

**Frontend Runs:** `http://localhost:5173`

---

## Database Management

### Prisma CLI

**Generate Prisma Client:**
```powershell
cd server
npx prisma generate
```

**Create Migration:**
```powershell
npx prisma migrate dev --name add_new_table
```

**Apply Migrations:**
```powershell
npx prisma migrate deploy
```

**Reset Database (DESTRUCTIVE):**
```powershell
npx prisma migrate reset
```

**Prisma Studio (GUI):**
```powershell
npx prisma studio
```
Opens browser at `http://localhost:5555`

---

### Manual Database Access

**Connect via psql:**
```powershell
docker exec -it aapr-postgres psql -U aapr_user -d aapr
```

**Common Queries:**
```sql
-- List tables
\dt

-- Describe table
\d users

-- Count users
SELECT COUNT(*) FROM users;

-- View events
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;

-- Exit
\q
```

---

### Backup & Restore

**Backup Database:**
```powershell
docker exec aapr-postgres pg_dump -U aapr_user aapr > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

This backup is full-database and explicitly includes the `events` table (research audit trail).

**Restore Database:**
```powershell
docker exec -i aapr-postgres psql -U aapr_user aapr < backup_20260119_100000.sql
```

**Post-Restore Verification (required):**
```powershell
cd server
npm run events:verify-restore
```

**Stronger verification (recommended for research snapshots):**
```powershell
cd server
npm run events:verify-restore -- --expected-min-count 100 --required-event-types issue.created,issue.comment_added,issue.decision_recorded,issue.evaluated
```

Expected result:
- command exits with code `0`
- output contains `events_row_count=<N>` with `N > 0`

**Controlled purge prerequisites:**
- `ALLOW_EVENT_BATCH_PURGE=true` must be set explicitly in environment before running purge.
- `EVENT_PURGE_CONFIRM_TOKEN` must be configured with a strong secret token (min 12 chars).
- purge command must include `--confirm <token>` matching `EVENT_PURGE_CONFIRM_TOKEN`.

### Event Export CLI (Local Dev + Docker Production)

Story 6.3 adds a server-side export workflow for research use. Export remains intentionally outside the web UI.

Use this runbook to export events that occurred during a date range in:
- local development environment
- Docker production-style environment (single or multi-instance compose)

#### Parameters and Validation

Required parameters:
- `--team-id <number>`
- `--from <date-or-iso-datetime>`
- `--to <date-or-iso-datetime>`

Optional parameters:
- `--event-type <value>` (repeatable, one or more)
- `--format csv|json` (default: `csv`)

Validation behavior:
- `team-id` must be a positive integer
- date range must be valid; `to` may be today but not a future calendar day
- date-only values such as `2026-01-15` are normalized to inclusive UTC boundaries:
  - `from=2026-01-15` -> `2026-01-15T00:00:00.000Z`
  - `to=2026-01-22` -> `2026-01-22T23:59:59.999Z`
- unsupported format fails with `Invalid export format`

Security and reliability behavior:
- payload PII is redacted before writing file output (emails, names, sensitive fields)
- output is streamed in batches (stable for large result sets)
- no file is retained on failure or when no rows match
- immutable telemetry events are written for export start/completion/failure

#### Export Directory

Optional environment variable:

```bash
EVENT_EXPORT_DIR="exports"
```

Directory resolution rules:
- local run from `server/`: default output is `server/exports/`
- Docker backend container (`/app/server` working directory): default output is `/app/server/exports/`
- custom path can be set with `EVENT_EXPORT_DIR`

#### Local Development Workflow

> **Important:** Do **not** use `npm run events:export -- --flag value` for this script. npm 9/10 fuzzy-matches `--to → --token-description` and `--format → --format-package-lock` before the `--` separator takes effect, consuming flags as npm config options before they reach the script. Use `npx tsx` directly to bypass npm's argument parser.

1. Ensure backend dependencies are installed and database is reachable.

```powershell
cd server
npm install
npx prisma migrate deploy
```

2. Run export (CSV example).

```powershell
cd server
npx tsx src/scripts/export-events.ts --team-id 3 --from 2026-01-15 --to 2026-01-22 --format csv
```

3. Run export with event-type filtering (JSON example).

```powershell
cd server
npx tsx src/scripts/export-events.ts --team-id 3 --from 2026-01-15 --to 2026-01-22 --event-type issue.created --event-type issue.evaluated --format json
```

4. Confirm output in `server/exports/` (or custom `EVENT_EXPORT_DIR`).

Expected CLI output:

```text
[START] Exporting events for team 3 from 2026-01-15T00:00:00.000Z to 2026-01-22T23:59:59.999Z as csv
Exported 184 events
Output path: C:\path\to\repo\server\exports\team-events-2026-01-15-to-2026-01-22.csv
Format: csv
```

#### Docker Production-Style Workflow (Compose)

Important runtime detail:
- In the backend production image, the TypeScript source and `tsx` dev runner are not present.
- Run export via the compiled script (`node dist/scripts/export-events.js`) inside the running backend container.

1. Start or verify the target instance.

```powershell
npm run compose:up:stu
npm run compose:health:stu
```

2. Execute export in backend container (replace profile if needed).

```powershell
docker compose --env-file deploy/compose/stu.env -f docker-compose.yml exec backend node dist/scripts/export-events.js --team-id 2 --from 2026-03-12 --to 2026-03-12 --format csv
```

3. Execute filtered JSON export.

```powershell
docker compose --env-file deploy/compose/stu.env -f docker-compose.yml exec backend node dist/scripts/export-events.js --team-id 3 --from 2026-01-15 --to 2026-01-22 --event-type issue.created --event-type issue.evaluated --format json
```

4. Retrieve export file from container to host.

```powershell
docker cp aapr-stu-backend:/app/server/exports/team-events-2026-01-15-to-2026-01-22.csv .\_bmad-output\exports\team-events-2026-01-15-to-2026-01-22.csv
```

Notes:
- Container naming convention is `<COMPOSE_PROJECT_NAME>-backend` (for `stu`, default is `aapr-stu-backend`).
- For `hms` and `elia`, use the corresponding compose env file and container name.

#### Multi-Instance Export Safety

When multiple instances run concurrently:
- always target one explicit env profile (`stu.env`, `hms.env`, or `elia.env`)
- run export in that instance's backend container only
- keep copied output filenames instance-qualified if you archive multiple exports together

Example (hms):

```powershell
docker compose --env-file deploy/compose/hms.env -f docker-compose.yml exec backend node dist/scripts/export-events.js --team-id 7 --from 2026-02-01 --to 2026-02-15 --format csv
```

#### Telemetry Verification (Optional but Recommended)

After export, verify immutable telemetry in the database:

```powershell
docker compose --env-file deploy/compose/stu.env -f docker-compose.yml exec db sh -lc "psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -c \"SELECT event_type, created_at, payload_json FROM events WHERE event_type IN ('event.export_started','event.export_completed','event.export_failed') ORDER BY created_at DESC LIMIT 20;\""
```

#### Failure Modes and Fixes

Common failures and meaning:
- `Invalid date range`
  - check `from <= to` and confirm neither date is in the future
- `Invalid export format`
  - use only `csv` or `json`
- `No events found in date range`
  - adjust team or date filters; no export file is retained by design
- database/auth/connectivity errors
  - verify backend and db are healthy for the targeted compose profile

Quick health checks:

```powershell
npm run compose:ps:stu
npm run compose:health:stu
```

#### Operational Recommendations

- Keep export server-side only (no web UI exposure)
- Prefer date-only ranges for research windows to avoid timezone ambiguity
- Always preserve raw CLI output in research audit notes alongside exported artifacts
- For repeat operations, script profile-specific commands in a secured operator runbook

---

## Email Testing (Mailtrap)

**Setup:**
1. Sign up at [mailtrap.io](https://mailtrap.io/)
2. Create inbox
3. Copy SMTP credentials
4. Update `server/.env`:
   ```bash
   SMTP_HOST="sandbox.smtp.mailtrap.io"
   SMTP_PORT=2525
   SMTP_USER="your-username"
   SMTP_PASS="your-password"
   ```

**Test Email:**
```powershell
cd server
npm run test:email  # (if script exists)
```

**View Emails:**
- Log into Mailtrap dashboard
- Open inbox
- All emails sent by app appear here (not sent to real recipients)

---

## Build & Production

### Multi-Instance Docker Compose (Story 7.2)

Single compose architecture now lives at repository root:

- `docker-compose.yml`
- `deploy/compose/.env.instance.example`
- `deploy/compose/stu.env`
- `deploy/compose/hms.env`
- `deploy/compose/elia.env`

The compose stack is parameterized by env file values and does not require per-instance compose file duplication.

Required/important variables:

- `COMPOSE_PROJECT_NAME`: deterministic instance scope (`aapr-stu`, `aapr-hms`, ...)
- `INSTANCE_KEY`: logical instance label
- `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT`, `POSTGRES_HOST_PORT`: host-exposed ports, must be unique per instance
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: per-instance database contract
- `JWT_SECRET`: required by backend runtime validation (must be non-empty)
- `POSTGRES_PASSWORD`: required per profile (must be non-empty)
- `FRONTEND_RUNTIME_API_URL`: runtime API URL injected into frontend `runtime-config.js`

Isolation-forward naming conventions (for Story 7.3 extension):

- network name pattern: `<COMPOSE_PROJECT_NAME>-net`
- volume name pattern: `<COMPOSE_PROJECT_NAME>-postgres-data`
- container names use `<COMPOSE_PROJECT_NAME>-<service>`

Compose config validation commands:

```powershell
npm run compose:config:stu
npm run compose:config:hms
npm run compose:config:elia
```

Run one instance:

```powershell
npm run compose:up:stu
npm run compose:ps:stu
npm run compose:health:stu
npm run compose:down:stu
```

Run two instances concurrently:

```powershell
npm run compose:up:stu
npm run compose:up:hms

npm run compose:ps:stu
npm run compose:ps:hms

npm run compose:health:stu
npm run compose:health:hms

npm run compose:down:stu
npm run compose:down:hms
```

Optional cleanup (including volumes):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/compose-instance.ps1 -Action clean -EnvFile deploy/compose/stu.env
powershell -ExecutionPolicy Bypass -File scripts/compose-instance.ps1 -Action clean -EnvFile deploy/compose/hms.env
```

### Instance Resource Isolation (Story 7.3)

Every instance is fully isolated at the Docker resource level:

| Resource | Naming Pattern | Example (stu) | Example (hms) |
|----------|---------------|---------------|---------------|
| Network | `<COMPOSE_PROJECT_NAME>-net` | `aapr-stu-net` | `aapr-hms-net` |
| Volume | `<COMPOSE_PROJECT_NAME>-postgres-data` | `aapr-stu-postgres-data` | `aapr-hms-postgres-data` |
| Containers | `<COMPOSE_PROJECT_NAME>-<service>` | `aapr-stu-db` | `aapr-hms-db` |
| Database | `<POSTGRES_DB>` | `aapr_stu` | `aapr_hms` |

**Isolation guarantees:**
- Each instance has its own Docker bridge network — containers cannot communicate across instances
- Each instance has its own named volume — database data is physically isolated
- Each instance uses a unique database name — backup/restore/teardown operations are scoped
- Teardown (`down`) of one instance does not remove another instance's resources
- Clean (`down --volumes`) of one instance only removes that instance's network and volume

**Required uniqueness per instance profile:**
- `COMPOSE_PROJECT_NAME` (global scope for all resource names)
- `POSTGRES_DB` (database-level data isolation)
- `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT`, `POSTGRES_HOST_PORT` (no port conflicts)
- `JWT_SECRET` (recommended unique per instance in production)

**Active Instance Profiles (Story 7.4 Contracts):**

| Instance | Project Name | DB Name     | Frontend Port | Backend Port | Postgres Port |
|----------|--------------|-------------|---------------|--------------|---------------|
| `stu`    | `aapr-stu`   | `aapr_stu`  | `5173`        | `3000`       | `5543`        |
| `hms`    | `aapr-hms`   | `aapr_hms`  | `5174`        | `3001`       | `5544`        |
| `elia`   | `aapr-elia`  | `aapr_elia` | `5175`        | `3002`       | `5545`        |

**Adding a new instance (e.g., `new-instance`):**

1. Use `deploy/compose/elia.env` (baseline contract is also documented in `deploy/compose/elia.env.example`)
2. Set production-grade unique values for `POSTGRES_PASSWORD` and `JWT_SECRET`
3. Verify no port conflicts: `npm run compose:validate-isolation`
4. Validate config: `docker compose --env-file deploy/compose/elia.env -f docker-compose.yml config`
5. Start: `docker compose --env-file deploy/compose/elia.env -f docker-compose.yml up -d`

No compose file changes are needed — isolation is entirely env-driven.

**Isolation validation commands:**

```powershell
# Validate all env profiles have unique project names, DB names, and ports
npm run compose:validate-isolation

# Full runtime isolation verification (requires running instances)
npm run compose:verify-isolation

# Inspect a specific instance's Docker resources
powershell -ExecutionPolicy Bypass -File scripts/compose-instance.ps1 -Action inspect -EnvFile deploy/compose/stu.env
```

**Backup/restore isolation:**

Backups and restores are scoped to instance database naming:

```powershell
# Backup a specific instance's database
docker exec aapr-stu-db pg_dump -U aapr_user aapr_stu > backup_stu.sql

# Restore only affects the target instance
docker exec -i aapr-stu-db psql -U aapr_user aapr_stu < backup_stu.sql
```

The database name (`aapr_stu`, `aapr_hms`) ensures backup files target only the correct instance.

### Container Images (Story 7.1 Baseline)

Build both production images from repository root:

```powershell
docker build -f server/Dockerfile -t aapr-backend:7.1 ./server
docker build -f client/Dockerfile -t aapr-frontend:7.1 ./client
```

Backend runtime contract:
- image exposes internal port `3000`
- startup command runs compiled app: `node dist/index.js`
- production env validation enforces `DATABASE_URL` and `JWT_SECRET`
- optional `PORT` must be an integer between `1` and `65535` when provided

Frontend runtime contract:
- image exposes internal port `80`
- startup command runs Nginx in foreground
- static assets served from `client/dist`
- API endpoint is deployment-driven at container runtime via `VITE_API_URL`

Run container smoke checks:

```powershell
docker run --rm -d --name aapr-backend-smoke -e NODE_ENV=production -e DATABASE_URL="postgresql://aapr_user:aapr_password@host.docker.internal:5432/aapr" -e JWT_SECRET="replace-with-strong-secret" -p 3000:3000 aapr-backend:7.1

docker run --rm -d --name aapr-frontend-smoke -e VITE_API_URL="http://localhost:3000" -p 8080:80 aapr-frontend:7.1

curl http://localhost:3000/api/v1/health
curl http://localhost:8080/
```

Stop smoke containers:

```powershell
docker stop aapr-backend-smoke aapr-frontend-smoke
```

### SSH Remote Deployment (Story 7.5)

The `scripts/deploy-remote.sh` script provides idempotent SSH-based deployment for CI-triggered rollouts. It orchestrates a remote update cycle: git sync → compose validation → image build → rollout → health check.

**Prerequisites:**

- SSH key-based access to the target server (no password prompts)
- Repository cloned on the remote server at a known path
- Instance env files (`deploy/compose/*.env`) present in the remote repository
- Docker and Docker Compose V2 installed on the remote server

**Invocation:**

```bash
bash scripts/deploy-remote.sh \
  --host <server-hostname> \
  --user <ssh-user> \
  --repo-path <absolute-path-to-repo-on-remote> \
  --ref <branch-or-commit> \
  --instance <stu|hms|elia> \
  [--dry-run] \
  [--ssh-key <path-to-private-key>]
```

**Deployment Sequence:**

1. Validate inputs (host, user, repo path, instance)
2. Verify SSH connectivity (`BatchMode=yes`, key-based auth)
3. Verify remote repository and env file exist
4. Sync repository to target ref (`git fetch --all --prune`, `git checkout/reset`)
5. Validate compose configuration (`docker compose config --quiet`)
6. Build images (`docker compose build`)
7. Start services (`docker compose up -d`)
8. Run post-deploy health check (reuses `scripts/compose-instance.sh health`)

**Exit Code Contract:**

| Code | Meaning |
|------|---------|
| 0    | Deployment succeeded |
| 1    | Validation/input error (bad arguments, missing env file) |
| 2    | SSH connection failure |
| 3    | Git sync failure |
| 4    | Compose config validation failure |
| 5    | Image build/pull failure |
| 6    | Compose up failure |
| 7    | Health check failure |
| 99   | Unexpected/internal error |

**Dry-run mode:**

```bash
bash scripts/deploy-remote.sh \
  --host server1 --user deploy --repo-path /opt/aapr \
  --instance stu --dry-run
```

Dry-run validates SSH connectivity and remote repository existence without modifying any state.

**Machine-readable output:**

On success, the script emits a parseable summary line for CI consumers:

```
DEPLOY_RESULT=success host=<host> instance=<instance> ref=<ref> env=<env-file>
```

**Security considerations:**

- SSH uses `BatchMode=yes` to prevent interactive password prompts in CI
- `StrictHostKeyChecking=accept-new` accepts new host keys but rejects changed ones
- Secrets (SSH keys, passwords) must be injected via CI secret stores, never committed to the repository
- The script never reads or exposes secret values

**Rollback:**

To rollback a deployment, re-run the script targeting a previous ref:

```bash
bash scripts/deploy-remote.sh \
  --host server1 --user deploy --repo-path /opt/aapr \
  --ref <previous-commit-or-tag> --instance stu
```

The idempotent flow (git reset + compose up) ensures the instance converges to the desired state.

**npm entrypoints:**

```bash
# Deploy (pass arguments after --)
npm run deploy:remote -- --host server1 --user deploy --repo-path /opt/aapr --instance stu --ref main

# Run deployment script tests
npm run deploy:test
```

### Trusted-Context Server Smoke Checks (Story 7.7)

Story 7.7 adds `scripts/smoke-remote.sh` for deployment-focused smoke validation executed from trusted network contexts.

Trusted execution boundary:

- GitHub-hosted runners are unsupported because deployment SSH is restricted to allowlisted/trusted IP ranges.
- Supported contexts are:
  - operator workstation on trusted network
  - self-hosted runner inside trusted network with SSH access to deployment host

If the script runs in an unsupported context, it exits with:

```text
UNSUPPORTED_EXECUTION_CONTEXT=github-hosted-runner
```

and exit code `20`.

**Run smoke checks for all instances (`stu,hms,elia`):**

```bash
bash scripts/smoke-remote.sh \
  --host <server-hostname> \
  --user <ssh-user> \
  --repo-path <absolute-path-to-remote-repo>
```

**Optional controls:**

```bash
bash scripts/smoke-remote.sh \
  --host <server-hostname> \
  --user <ssh-user> \
  --repo-path <absolute-path-to-remote-repo> \
  --instances stu,hms,elia \
  --max-attempts 4 \
  --retry-delay 5 \
  --deploy-results-file ./deploy-results.log
```

`--deploy-results-file` is optional and lets smoke checks enforce Story 7.5 deployment contract lines (`DEPLOY_RESULT=success instance=<key>`) before running health probes.

Smoke scope is intentionally server-focused:

- compose config validation (`docker compose ... config --quiet`)
- compose deployment status (`docker compose ... ps`)
- backend health (`/api/v1/health`) with bounded retries
- frontend availability (`/`) with bounded retries

Machine-readable output per instance:

```text
SMOKE_RESULT=<pass|fail> instance=<key> stage=<stage> code=<label> backend_attempts=<n> frontend_attempts=<n> transient_recovered=<true|false>
```

Final summary line:

```text
SMOKE_SUMMARY=<pass|fail>
```

Exit behavior:

- `0`: all instance checks passed
- `1`: one or more instances failed
- `2`: invocation/config validation error
- `20`: unsupported execution context

Operator remediation guide:

- `compose_config_failed`: fix env profile or compose substitutions for that instance.
- `compose_ps_failed`: inspect container state/logs (`docker compose ... logs`).
- `backend_health_failed` / `frontend_health_failed`: check service readiness, then inspect container logs and restart if required.
- `deploy_result_missing`: ensure deploy stage emitted `DEPLOY_RESULT=success` for the same instance before smoke.

**npm entrypoints:**

```bash
npm run deploy:smoke -- --host <server> --user <ssh-user> --repo-path <path>
npm run deploy:smoke:test
```

### Build Frontend

```powershell
cd client
npm run build
```

**Output:** `client/dist/` (static files)

**Bundle Size:**
- `index.html`
- `assets/index-[hash].js` (~200 KB gzipped)
- `assets/index-[hash].css` (~10 KB gzipped)

---

### Build Backend

```powershell
cd server
npm run build
```

**Output:** `server/dist/` (compiled TypeScript)

---

### Serve Production Build

**Option 1: Separate Servers**
1. Serve `client/dist/` with Nginx/Apache/Caddy
2. Run `server/dist/index.js` with PM2/systemd
3. Configure reverse proxy: `/api/*` → Backend

**Option 2: Express Serves Frontend**
```typescript
// server/src/index.ts
import express from "express";
import path from "path";

const app = express();

// API routes
app.use("/api", apiRouter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../../client/dist")));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

app.listen(3000);
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Update `JWT_SECRET` with production secret
- [ ] Update `DATABASE_URL` with production credentials
- [ ] Configure production SMTP (SendGrid/AWS SES)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (TLS certificates)
- [ ] Set secure cookie flags: `secure=true`, `sameSite=strict`
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run all tests (`npm test` backend + frontend)
- [ ] Build frontend (`npm run build`)
- [ ] Build backend (`npm run build`)

### Production Environment Variables

```bash
# Backend
DATABASE_URL="postgresql://user:pass@prod-db.example.com:5432/aapr"
JWT_SECRET="[64-char random string]"
NODE_ENV="production"
PORT=3000

# SMTP (Example: SendGrid)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="[SendGrid API key]"
SMTP_FROM="noreply@aapr-platform.com"

# Security
ALLOWED_ORIGINS="https://aapr-platform.com"
RATE_LIMIT_MAX=100
```

---

## Monitoring & Logging

### Application Logs

**Backend Logs:**
- File: `server/logs/app.log`
- Rotation: Daily (future enhancement)
- Level: INFO (production), DEBUG (development)

**Frontend Logs:**
- Browser console (development)
- Error tracking service (future: Sentry)

---

### Database Monitoring

**Check Connection:**
```sql
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'aapr';
```

**Slow Queries:**
```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Database Size:**
```sql
SELECT pg_size_pretty(pg_database_size('aapr'));
```

---

### Health Checks

**Backend Health Endpoint:**
```http
GET http://localhost:3000/api/v1/health

Response (200):
{
  "status": "ok",
  "timestamp": "2026-01-19T10:00:00.000Z",
  "version": "1.0.0"
}
```

**Monitor:**
- CPU usage: < 50% average
- Memory usage: < 500 MB (backend)
- Response times: < 200ms (p95)
- Database connections: < 10/10 pool

---

## Scaling Considerations

### Horizontal Scaling

**Backend:**
- Deploy multiple backend instances behind load balancer
- Use Redis for session store (replace JWT in-memory validation)
- Ensure stateless architecture (no server-side sessions)

**Database:**
- PostgreSQL read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Vertical scaling (more CPU/RAM) for single-instance

**Frontend:**
- CDN for static assets (CloudFront, Cloudflare)
- Edge caching for API responses (optional)

---

### Performance Optimization

**Backend:**
- Enable gzip compression
- Add Redis cache for team membership checks
- Database query optimization (EXPLAIN ANALYZE)
- Rate limiting per user

**Frontend:**
- Code splitting (lazy load routes)
- Image optimization (WebP, lazy loading)
- Service worker for offline support (future)

---

## Security Hardening

### Production Security

**Backend:**
- [ ] Helmet.js for HTTP headers
- [ ] Rate limiting (express-rate-limit)
- [ ] Input validation (validator.js)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] CORS whitelist (only production domain)
- [ ] HTTPS only (redirect HTTP → HTTPS)
- [ ] Secure cookies (`httpOnly=true`, `secure=true`, `sameSite=strict`)

**Database:**
- [ ] Firewall rules (only backend server can connect)
- [ ] Strong passwords (20+ chars, random)
- [ ] Regular backups (daily automated)
- [ ] Encrypted connections (SSL/TLS)

**Frontend:**
- [ ] CSP headers (Content Security Policy)
- [ ] XSS prevention (React sanitizes by default)
- [ ] Dependency audit (npm audit, Snyk)

---

## Disaster Recovery

### Backup Strategy

**Database:**
- Full backup: Daily at 2 AM UTC
- Retention: 30 days
- Storage: S3 / Azure Blob / encrypted local

**Application Code:**
- Git repository (GitHub/GitLab)
- Tagged releases (v1.0.0, v1.1.0, etc.)

**Environment Config:**
- Encrypted .env files in secure vault (AWS Secrets Manager, Azure Key Vault)

---

### Recovery Procedures

**Database Failure:**
1. Stop application
2. Restore from latest backup
3. Verify data integrity
4. Restart application
5. Monitor for errors

**Application Failure:**
1. Check logs (`server/logs/app.log`)
2. Restart process (PM2: `pm2 restart aapr`)
3. If persistent, rollback to previous release
4. Investigate root cause

---

## Cost Estimation (Production)

**Monthly Costs (Estimated):**
- **Hosting:** $20-50 (VPS: DigitalOcean Droplet, AWS Lightsail)
- **Database:** $15-30 (Managed PostgreSQL: DigitalOcean, AWS RDS)
- **Email:** $10-20 (SendGrid: 40,000 emails/month)
- **Domain:** $1/month (example.com)
- **SSL Certificate:** $0 (Let's Encrypt)
- **Monitoring:** $0-10 (UptimeRobot free, Sentry free tier)

**Total:** $46-111/month

---

## Next Steps

### Epic 2 Infrastructure

- Add Redis for caching (team membership, practice catalog)
- Implement rate limiting (protect auth endpoints)
- Add API versioning (`/api/v1/teams`)
- Set up CI/CD pipeline (GitHub Actions)
  - Run tests on PR
  - Auto-deploy to staging on merge
  - Manual deploy to production

---

**Last Updated:** March 13, 2026
