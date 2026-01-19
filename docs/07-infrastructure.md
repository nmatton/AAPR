# Infrastructure

**Infrastructure & Deployment Guide for AAPR Platform**

Last Updated: January 19, 2026  
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
npx tsx prisma/seed.ts
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

**Restore Database:**
```powershell
docker exec -i aapr-postgres psql -U aapr_user aapr < backup_20260119_100000.sql
```

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
GET http://localhost:3000/health

Response (200):
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-19T10:00:00.000Z"
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

**Last Updated:** January 19, 2026
