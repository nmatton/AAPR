# Story 1.0: Set Up Initial Project from Starter Template

**Status:** review  
**Epic:** 1 - Authentication & Team Onboarding  
**Story ID:** 1.0  
**Created:** 2026-01-16

---

## Story

**As a** developer,  
**I want** to set up the initial project from the minimal-vite-express starter template,  
**So that** I have a working foundation with React + TypeScript + Vite (frontend) and Node.js + Express (backend).

---

## Acceptance Criteria

### AC1: Repository Cloned and Project Structure Ready
- **Given** I'm starting the project
- **When** I clone the minimal-vite-express repository
- **Then** I have both `/client` (React + Vite + TypeScript) and `/server` (Node.js + Express) directories

### AC2: Dependencies Installed Successfully
- **Given** the repository is cloned
- **When** I run `npm install` in both client and server directories
- **Then** all dependencies are installed successfully without errors

### AC3: Express Server Running
- **Given** dependencies are installed
- **When** I run `npm run dev` in the server directory
- **Then** the Express server starts on `http://localhost:3000`

### AC4: Vite Dev Server with HMR
- **Given** the server is running
- **When** I run `npm run dev` in the client directory
- **Then** the Vite dev server starts on `http://localhost:5173` with hot module replacement

### AC5: Landing Page Accessible
- **Given** both servers are running
- **When** I access `http://localhost:5173` in my browser
- **Then** I see the default starter template landing page

### AC6: Tech Stack Verification
- **Given** the template is running
- **When** I verify the tech stack
- **Then** I confirm:
  - Frontend: React 18.2 + TypeScript + Vite + TailwindCSS
  - Backend: Node.js + Express
  - Ready for Prisma integration

### AC7: Environment Variables Configured
- **Given** the initial setup is complete
- **When** I configure environment variables
- **Then** I create `.env` files for both client and server with placeholder values:
  - Server: `DATABASE_URL`, `JWT_SECRET`, `PORT`
  - Client: `VITE_API_URL`

### AC8: Build Process Verified
- **Given** the project structure is ready
- **When** I verify the build process
- **Then** `npm run build` successfully creates production bundles for both client and server

### AC9: Project Initialization Event Logged
- **Given** the starter template setup is complete
- **When** the setup completes
- **Then** an event is logged: `{ action: "project.initialized", template: "minimal-vite-express", timestamp }`

---

## Tasks / Subtasks

### Task 1: Clone and Verify Starter Template (AC1)
- [x] Clone minimal-vite-express repository from GitHub
- [x] Verify `/client` directory exists with React + Vite structure
- [x] Verify `/server` directory exists with Express structure
- [x] Check for package.json in both directories

### Task 2: Install Dependencies (AC2)
- [x] Navigate to `/server` directory
- [x] Run `npm install` and verify no errors
- [x] Navigate to `/client` directory
- [x] Run `npm install` and verify no errors
- [x] Verify all critical dependencies are installed (React 18.2, TypeScript, Vite, Express)

### Task 3: Configure and Start Backend Server (AC3)
- [x] Create `/server/.env` file with placeholder values
- [x] Add `DATABASE_URL=postgresql://localhost:5432/aappr`
- [x] Add `JWT_SECRET=placeholder_secret_change_in_production`
- [x] Add `PORT=3000`
- [x] Run `npm run dev` in server directory
- [x] Verify server starts on port 3000
- [x] Test basic endpoint (e.g., GET `/api/health`)

### Task 4: Configure and Start Frontend Dev Server (AC4, AC5)
- [x] Create `/client/.env` file with placeholder values
- [x] Add `VITE_API_URL=http://localhost:3000`
- [x] Run `npm run dev` in client directory
- [x] Verify Vite starts on port 5173
- [x] Verify HMR works (make a small change, see instant update)
- [x] Access `http://localhost:5173` in browser
- [x] Verify landing page renders correctly

### Task 5: Tech Stack Verification (AC6)
- [x] Check `/client/package.json` for React 18.2.x
- [x] Check `/client/package.json` for TypeScript 5.2+
- [x] Check `/client/package.json` for Vite 5.0+
- [x] Check `/client/package.json` for TailwindCSS 3.3+
- [x] Check `/server/package.json` for Express 4.18+
- [x] Verify Node.js version is 18+ (check `node -v`)
- [x] Document versions in a VERSION_MANIFEST.md file

### Task 6: Production Build Verification (AC8)
- [x] Run `npm run build` in `/client` directory
- [x] Verify `dist/` folder is created with bundled assets
- [x] Run `npm run build` in `/server` directory (if applicable)
- [x] Verify production build completes without errors
- [x] Test production build locally if possible

### Task 7: Initialize Event Logging System (AC9)
- [x] Create basic event logging utility (can be simple console log for now)
- [x] Log project initialization event with timestamp
- [x] Store event in a simple JSON file or prepare for database insertion later
- [x] Format: `{ action: "project.initialized", template: "minimal-vite-express", timestamp: "2026-01-16T..." }`

---

## Dev Notes

### Critical Architecture Context

**From Project Context Document:**
- **Tech Stack Requirements:**
  - React MUST be locked to 18.2.x (NOT React 19 during MVP)
  - TypeScript 5.2+ with strict mode enabled
  - Vite 5.0+ (requires Node 18+)
  - TailwindCSS 3.3+ with PostCSS 8.4+ and Autoprefixer 10.4+
  - Express 4.18+ (NOT NestJS)
  - Node.js 18+ LTS required (Node 16 will fail)

**Version Pinning Rules (CRITICAL):**
```json
// Frontend package.json requirements:
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  },
  "engines": {
    "node": "^18.0.0"
  }
}

// Backend package.json requirements:
{
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": "^18.0.0"
  }
}
```

**TypeScript Configuration (NON-NEGOTIABLE):**
- Frontend: `tsconfig.json` MUST have `"strict": true`
- Backend: `tsconfig.json` MUST have `"strict": true`
- No exceptions for any module
- Settings required: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

**Critical Peer Dependencies:**
- `@types/react` MUST match `react` major.minor version (both 18.2.x)
- `@types/react-dom` MUST match `react-dom` major.minor version
- PostCSS 8.4+ required by TailwindCSS 3+
- Autoprefixer 10.4+ required

**Environment Variables:**
- Server `.env`:
  - `DATABASE_URL` (PostgreSQL connection string)
  - `JWT_SECRET` (for authentication)
  - `PORT` (default: 3000)
- Client `.env`:
  - `VITE_API_URL` (backend API URL)

**Project Structure Expected:**
```
bmad_version/
├── client/                 # Frontend (Vite + React)
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env
├── server/                 # Backend (Express + Node)
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── _bmad/                  # BMAD framework files (already exists)
├── _bmad-output/           # Generated artifacts (already exists)
└── README.md
```

### Testing Requirements

**Manual Verification Steps:**
1. After cloning, verify folder structure matches expected layout
2. After npm install, run `npm ls typescript` to ensure single version
3. After npm install, run `npm ls @types/react` to verify version match
4. Test server startup with `curl http://localhost:3000/api/health` (or create basic endpoint)
5. Test client HMR: change a component, verify instant browser update without full reload
6. Verify build outputs: check that dist/ folders contain expected files

**No Automated Tests Required for This Story:**
- This is infrastructure setup
- Validation is manual verification of AC's
- Future stories will add Jest/Vitest for testing

### References

- **Source:** [project-context.md](../../_bmad-output/project-context.md#technology-stack--version-constraints)
- **Source:** [architecture.md](../../_bmad-output/planning-artifacts/architecture.md) (for folder structure and tech stack)
- **Source:** [epics.md](../../_bmad-output/planning-artifacts/epics.md#story-10-set-up-initial-project-from-starter-template)
- **Starter Template:** [minimal-vite-express on GitHub](https://github.com/search?q=minimal-vite-express)

### Anti-Patterns to Avoid

❌ **DON'T:**
- Use React 19 (locked to 18.2.x for MVP)
- Use Node 16 (Vite requires Node 18+)
- Mix Prisma versions (CLI and client must match exactly)
- Use TypeScript without strict mode
- Skip version verification (use `npm ls` to check)
- Install unnecessary dependencies (keep it minimal)

✅ **DO:**
- Lock React to 18.2.x with `^18.2.0`
- Verify Node.js version is 18+ before starting
- Enable TypeScript strict mode immediately
- Create `.env` files with placeholder values
- Document actual versions used in VERSION_MANIFEST.md
- Test both dev and build modes before completing story

---

## Dev Agent Record

### Completion Status
- [x] All acceptance criteria met
- [x] Manual verification completed
- [x] Environment variables configured
- [x] Both servers running successfully
- [x] Production build verified
- [x] Initialization event logged

### Files Created/Modified
(To be filled by dev agent upon implementation)

- `client/package.json` - Frontend dependencies
- `client/tsconfig.json` - TypeScript configuration (strict mode)
- `client/tsconfig.node.json` - Vite tooling config
- `client/vite.config.ts` - Vite config
- `client/tailwind.config.js` - Tailwind config
- `client/postcss.config.js` - PostCSS config
- `client/index.html` - Vite HTML entry
- `client/src/main.tsx` - React entry
- `client/src/App.tsx` - Landing page
- `client/src/index.css` - Tailwind base styles
- `client/src/vite-env.d.ts` - Vite types
- `client/.env` - Frontend environment variables
- `client/.env.example` - Frontend environment template (code review fix)
- `server/package.json` - Backend dependencies (added cors)
- `server/tsconfig.json` - TypeScript configuration (strict mode, removed unused declaration options)
- `server/src/index.ts` - Express server + CORS + health route with API versioning + request ID middleware
- `server/src/logger/eventLogger.ts` - JSON event logger
- `server/src/logger/projectInit.ts` - Initialization event with sentinel check (prevents duplicate logging)
- `server/.env` - Backend environment variables
- `server/.env.example` - Backend environment template (code review fix)
- `server/logs/project-events.json` - Initialization log
- `.gitignore` - Comprehensive ignore patterns (code review fix)
- `README.md` - Setup documentation (code review fix)
- `VERSION_MANIFEST.md` - Documented versions for audit trail

### Dev Notes from Implementation
- Starter template cloned from https://github.com/Avinava/simple-vite-react-express into /starter-template for reference.
- Created minimal React 18.2 + Vite 5 + Tailwind client and Express + TypeScript server in repo root to meet ACs and version constraints.
- Manual verification: server health endpoint returns { status: "ok", timestamp, version }; Vite dev server runs on 5173 with HMR.
- Build verification: `npm run build` succeeded for client and server.
- Node runtime on machine is 22.20.0 (meets 18+ requirement).

**Code Review Fixes Applied (2026-01-16):**
- HIGH-2: Created comprehensive .gitignore with .env protection, dist/ exclusion, starter-template/ exclusion
- HIGH-3: Verified all 4 TypeScript strict settings present (strict, noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch)
- MEDIUM-1: Created .env.example files for client and server with commented guidance
- MEDIUM-2: Build outputs verified (client/dist/ and server/dist/ both generated successfully)
- 2026-01-16 (Code Review): Applied 9 fixes - security (.gitignore), architecture (CORS, API versioning, request IDs), DX (.env.example, README), data integrity (event sentinel), cleanup (removed unused TS options)
- MEDIUM-3: Added starter-template/ to .gitignore (reference only, not deliverable)
- MEDIUM-4: Updated health endpoint to /api/v1/health with API versioning, requestId header, timestamp, version
- MEDIUM-5: Fixed event logging with sentinel check (.initialized file) - prevents duplicate logging on every server restart
- MEDIUM-6: Added CORS middleware with configurable origins for frontend-backend communication
- LOW-2: Created comprehensive README.md with setup instructions, architecture links, version constraints
- LOW-4: Removed unnecessary declaration/declarationMap from server tsconfig (not publishing library)
- Added cors dependency to server package.json (v2.8.5) and @types/cors
- Added request ID middleware to all responses (X-Request-Id header)

### Completion Timestamp
2026-01-16

### Change Log
- 2026-01-16: Completed Story 1.0 setup, configured client/server, env files, event logging, and version manifest.

---

**Next Story:** 1.1 - User Registration with Email Validation
