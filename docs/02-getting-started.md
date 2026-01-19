# Getting Started

**Developer Onboarding Guide for AAPR Platform**

Last Updated: January 19, 2026

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** ([Download](https://nodejs.org/)) - Check with `node -v`
- **npm 9+** (comes with Node.js) - Check with `npm -v`
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/)) - For PostgreSQL
- **Git** ([Download](https://git-scm.com/)) - For version control
- **Code Editor** - VS Code recommended with TypeScript + ESLint + Prettier extensions

**Verify versions:**
```powershell
node -v    # Should show v18.x.x or higher
npm -v     # Should show 9.x.x or higher
docker -v  # Should show Docker version 20.x or higher
```

---

## Quick Setup (5 Minutes)

### 1. Clone the Repository

```powershell
git clone https://github.com/nmatton/AAPR.git
cd AAPR/bmad_version
```

### 2. Start PostgreSQL Database

```powershell
docker-compose up -d
```

This starts PostgreSQL 14 in a Docker container:
- **Host:** localhost
- **Port:** 5432
- **Database:** aapr
- **User:** aapr_user
- **Password:** aapr_password

**Verify database is running:**
```powershell
docker ps
# Should show container "aapr-postgres" running
```

### 3. Install Backend Dependencies

```powershell
cd server
npm install
```

**Expected install time:** 1-2 minutes

### 4. Configure Backend Environment

Create `server/.env` file:
```bash
# Database
DATABASE_URL="postgresql://aapr_user:aapr_password@localhost:5432/aapr"

# JWT Authentication
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRY="1h"
JWT_REFRESH_EXPIRY="7d"

# Server
PORT=3000
NODE_ENV=development

# SMTP Email (for invitations)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
SMTP_FROM="AAPR Platform <noreply@aapr.com>"
```

**For local development without email:** Email sending will fail gracefully. Invites are still created in the database with "Failed" status.

### 5. Run Database Migrations

```powershell
# Still in server/ directory
npx prisma migrate dev
```

This creates all tables in the database. You should see:
```
✔ Generated Prisma Client
✔ Applied migrations:
  20260116142444_add_users_and_events_tables
  20260119xxx_add_teams_and_members
  20260119xxx_add_invites
```

### 6. (Optional) Seed Test Data

```powershell
npm run db:seed
```

This creates:
- 2 test users
- 1 test team
- Sample practices (if available)

### 7. Start Backend Server

```powershell
npm run dev
```

**Expected output:**
```
Server running on http://localhost:3000
Database connected successfully
```

**Test the server:**
```powershell
# In a new terminal
curl http://localhost:3000/api/v1/health
# Should return: {"status":"ok","timestamp":"...","version":"1.0.0"}
```

### 8. Install Frontend Dependencies

```powershell
# In a new terminal, from project root
cd client
npm install
```

**Expected install time:** 1-2 minutes

### 9. Configure Frontend Environment

Create `client/.env` file:
```bash
VITE_API_URL=http://localhost:3000
```

### 10. Start Frontend Dev Server

```powershell
npm run dev
```

**Expected output:**
```
VITE v5.x.x ready in 500 ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 11. Access the Application

Open browser to: **http://localhost:5173**

You should see the AAPR landing page with [Sign Up] and [Log In] buttons.

---

## Verify Installation

### Test User Registration

1. Navigate to http://localhost:5173
2. Click [Sign Up]
3. Enter:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
4. Click [Create Account]
5. You should be redirected to `/teams` (empty state)

### Test User Login

1. Click [Log Out] (if logged in)
2. Click [Log In]
3. Enter email and password from above
4. Click [Log In]
5. You should be redirected to `/teams`

### Test Team Creation

1. While logged in, click [Create Team]
2. Enter team name: `My Test Team`
3. Click [Next]
4. Select a few practices (if available) or skip
5. Click [Create Team]
6. You should see your new team in the list

---

## Development Workflow

### Running Tests

**Backend tests:**
```powershell
cd server
npm test                 # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run with coverage report
```

**Frontend tests:**
```powershell
cd client
npm test                 # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run with coverage report
```

**Expected result:** All tests should pass ✅

### Database Management

**View database schema:**
```powershell
cd server
npx prisma studio
```
Opens Prisma Studio in browser at http://localhost:5555

**Create a new migration:**
```powershell
npx prisma migrate dev --name descriptive_name
```

**Reset database (WARNING: deletes all data):**
```powershell
npx prisma migrate reset
```

**Generate Prisma Client (after schema changes):**
```powershell
npx prisma generate
```

### Building for Production

**Backend:**
```powershell
cd server
npm run build
# Creates dist/ folder with compiled JavaScript
```

**Frontend:**
```powershell
cd client
npm run build
# Creates dist/ folder with optimized bundle
```

---

## Troubleshooting

### Issue: Port 5432 already in use

**Symptom:** Docker fails to start PostgreSQL with "port is already allocated"

**Solution:**
```powershell
# Stop any existing PostgreSQL instances
Stop-Service postgresql-x64-14  # Windows service
# OR
docker stop $(docker ps -q --filter ancestor=postgres:14)  # Docker containers

# Then restart
docker-compose up -d
```

### Issue: Port 3000 or 5173 already in use

**Symptom:** Server or Vite fails to start with "address already in use"

**Solution:**
```powershell
# Find process using the port
netstat -ano | findstr :3000   # Windows
# OR
lsof -i :3000                   # macOS/Linux

# Kill the process (Windows)
taskkill /PID <process_id> /F
```

### Issue: Prisma Client not generated

**Symptom:** TypeScript errors about `@prisma/client` not found

**Solution:**
```powershell
cd server
npx prisma generate
npm install
```

### Issue: Database connection fails

**Symptom:** "Can't reach database server at localhost:5432"

**Solution:**
1. Verify Docker container is running: `docker ps`
2. Check `DATABASE_URL` in `server/.env` matches Docker credentials
3. Restart Docker container: `docker-compose restart`

### Issue: TypeScript errors on npm install

**Symptom:** "Conflicting peer dependencies" or version mismatches

**Solution:**
```powershell
# Delete node_modules and package-lock.json
rm -r node_modules
rm package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Issue: Tests fail with "Cannot find module"

**Symptom:** Jest/Vitest can't resolve imports

**Solution:**
```powershell
# Backend
cd server
npm run build   # Compile TypeScript first
npm test

# Frontend
cd client
# Check vite.config.ts has correct test setup
npm test
```

### Issue: CORS errors in browser console

**Symptom:** "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Solution:**
1. Verify backend CORS configuration in `server/src/index.ts`
2. Ensure `VITE_API_URL` in `client/.env` matches backend URL
3. Restart both servers after changing environment variables

### Issue: Email invitations not sending

**Symptom:** Invites created with "Failed" status

**Expected for local dev:** Email sending will fail without valid SMTP credentials. This is acceptable for development.

**To fix for production:**
1. Add valid SMTP credentials to `server/.env`
2. Test email sending: `npm run test:email` (if test script exists)

---

## Common Tasks

### Add a new API endpoint

1. Define route in `server/src/routes/`
2. Create controller in `server/src/controllers/`
3. Implement service logic in `server/src/services/`
4. Add repository functions in `server/src/repositories/`
5. Write tests in `__tests__/` folders
6. Document in `/docs/05-backend-api.md`

### Add a new frontend page

1. Create component in `client/src/features/<feature>/components/`
2. Add route in `client/src/App.tsx`
3. Create API client function in `client/src/features/<feature>/api/`
4. Add state management in `client/src/features/<feature>/state/` (Zustand)
5. Write tests in `<component>.test.tsx`
6. Document in `/docs/06-frontend.md`

### Run database migration

1. Modify `server/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Verify migration in `server/prisma/migrations/`
4. Update `/docs/04-database.md` with schema changes
5. Commit migration files to Git

---

## Next Steps

Now that you have the platform running:

1. **Read the Architecture:** [docs/03-architecture.md](./03-architecture.md)
2. **Explore the Database:** [docs/04-database.md](./04-database.md)
3. **Review the API:** [docs/05-backend-api.md](./05-backend-api.md)
4. **Understand the Frontend:** [docs/06-frontend.md](./06-frontend.md)
5. **Follow Development Standards:** [docs/08-development-guide.md](./08-development-guide.md)

**Happy coding! 🚀**

---

## Getting Help

- **Documentation Issues:** Update this file and submit PR
- **Technical Questions:** Ask in team channel or create GitHub issue
- **Research Questions:** Contact Nicolas Matton (project lead)

**Last Updated:** January 19, 2026
