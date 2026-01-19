# Project Overview

**AAPR Platform - Agile Adaptation Practice Research**

Last Updated: January 19, 2026  
Status: Epic 1 Complete

---

## What is AAPR?

The AAPR (Agile Adaptation Practice Research) platform is a **research-grade web application** enabling development teams to systematically identify, discuss, and resolve individual friction points with agile practices through personality-informed collective decision-making.

### Research Context

This platform is developed as part of Nicolas Matton's PhD research at the Université de Namur, investigating:
- How personality traits influence agile practice adoption
- Team dynamics in practice adaptation decisions
- Evidence-based agile practice selection
- Systematic tracking of practice friction and resolution

### Core Value Proposition

Teams use AAPR to:
1. **Document their agile practices** and coverage of agile principles (pillars)
2. **Report friction points** with specific practices
3. **Discuss adaptations** collaboratively
4. **Track decisions and outcomes** over time
5. **Receive recommendations** for alternative practices based on coverage gaps

The platform captures all interactions for research analysis while providing immediate value to practicing teams.

---

## Current Implementation Status

### Epic 1: Authentication & Team Onboarding ✅ COMPLETE

**Status:** All 7 stories implemented, tested, and deployed  
**Completion Date:** January 19, 2026

**Delivered Features:**
- User registration with email validation and bcrypt password hashing
- User login with JWT session management (access + refresh tokens)
- Multi-team support (users can belong to multiple teams)
- Team creation with practice selection
- Email-based team member invitations (for new and existing users)
- Team membership management (view, invite, remove members)
- Full event logging for research data integrity

**Key Capabilities:**
- ✅ Users can sign up and log in securely
- ✅ Users can create teams and select practices
- ✅ Users can invite team members via email
- ✅ Users can view and manage team membership
- ✅ All actions logged to events table for research analysis

### Upcoming Epics (Backlog)

- **Epic 2:** Practice Catalog & Coverage (9 stories) - NEXT
- **Epic 3:** Big Five Personality Profiling (2 stories)
- **Epic 4:** Issue Submission & Discussion (4 stories)
- **Epic 5:** Adaptation Decision & Tracking (3 stories)
- **Epic 6:** Research Data Integrity & Event Logging (3 stories)

---

## Technology Stack

### Frontend
- **React 18.2** (locked - NOT React 19 for MVP stability)
- **TypeScript 5.2+** (strict mode enabled)
- **Vite 5.0+** (dev server with HMR)
- **TailwindCSS 3.3+** (utility-first styling)
- **Zustand 4.4+** (state management)
- **React Router** (client-side routing)

### Backend
- **Node.js 18+ LTS**
- **Express 4.18+** (NOT NestJS)
- **TypeScript 5.2+** (strict mode enabled)
- **Prisma 5.0+** with @prisma/adapter-pg (ORM + connection pooling)
- **PostgreSQL 14+** (relational database)
- **bcrypt** (password hashing - 10+ rounds)
- **jsonwebtoken** (JWT authentication)
- **Nodemailer** (email sending)

### Development Tools
- **Jest** (backend testing)
- **Vitest** (frontend testing)
- **Docker & Docker Compose** (local PostgreSQL)
- **ESLint + Prettier** (code quality)
- **Git** (version control)

### Version Constraints (CRITICAL)

**These versions are LOCKED for MVP:**
- React: `^18.2.0` (NOT 19.x)
- Node.js: `^18.0.0` (minimum)
- TypeScript: `^5.2.0` (strict mode required)
- Prisma Client and CLI versions MUST match exactly

**Why?** React 19 breaking changes, Node 18 required by Vite 5, TypeScript strict mode for type safety.

---

## Project Structure (As-Built)

```
bmad_version/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── features/         # Feature-first architecture
│   │   │   ├── auth/        # Authentication (signup, login, session)
│   │   │   └── teams/       # Team management (list, create, invite)
│   │   ├── App.tsx          # Main app component + routing
│   │   ├── main.tsx         # React entry point
│   │   └── index.css        # Global styles (Tailwind base)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json        # TypeScript strict mode
│
├── server/                    # Backend (Express + Node)
│   ├── src/
│   │   ├── routes/          # API route definitions
│   │   ├── controllers/     # Request handlers (thin layer)
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Database access (Prisma only)
│   │   ├── middleware/      # Auth, error handling, requestId
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── lib/            # Utilities (Prisma client, mailer)
│   │   └── index.ts        # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   ├── package.json
│   └── tsconfig.json       # TypeScript strict mode
│
├── docs/                     # As-built documentation (THIS!)
├── _bmad/                    # BMAD framework files
├── _bmad-output/            # Generated artifacts
│   ├── planning-artifacts/  # PRD, architecture, epics (planning)
│   └── implementation-artifacts/  # Story files (implementation)
│
├── .env                     # Environment variables (git ignored)
├── .gitignore
├── README.md                # Quick setup guide
├── VERSION_MANIFEST.md      # Locked dependency versions
└── docker-compose.yml       # PostgreSQL container
```

---

## Key Architectural Decisions

### 1. Feature-First Frontend Architecture
**Decision:** Organize by feature (auth, teams) rather than by type (components, services).  
**Rationale:** Better encapsulation, easier to find related code, scales better.

### 2. Layered Backend Architecture
**Decision:** routes → controllers → services → repositories.  
**Rationale:** Separation of concerns, testability, business logic isolated from infrastructure.

### 3. JWT in HTTP-Only Cookies
**Decision:** Store access/refresh tokens in HTTP-only secure cookies, NOT localStorage.  
**Rationale:** XSS protection - JavaScript cannot access tokens.

### 4. Event Logging for Research
**Decision:** Log all DB-affecting actions to immutable events table.  
**Rationale:** Research data integrity, audit trail, reproducibility.

### 5. Team Isolation via Application Layer
**Decision:** Separate databases per team (tenant isolation) enforced by middleware.  
**Rationale:** Data privacy, regulatory compliance, per-team instances for research.

### 6. Single Normalized Database (MVP)
**Decision:** One PostgreSQL schema (no version tables, no sharding).  
**Rationale:** MVP simplicity; per-team instances provisioned manually for research.

### 7. Prisma ORM (No Raw SQL)
**Decision:** All database queries via Prisma ORM (parameterized by default).  
**Rationale:** SQL injection prevention, type safety, migration management.

### 8. Bcrypt 10+ Rounds
**Decision:** Password hashing with bcrypt, minimum 10 rounds.  
**Rationale:** Security best practice, slows brute-force attacks.

---

## Non-Functional Requirements (Implemented)

### Security (NFR1-4) ✅
- ✅ **NFR1:** All passwords bcrypt-hashed (10+ rounds)
- ✅ **NFR2:** JWT tokens over HTTPS (HTTP-only cookies)
- ✅ **NFR3:** Parameterized queries only (Prisma ORM)
- ✅ **NFR4:** Team isolation enforced at application layer

### Data Integrity (NFR5-7) ✅
- ✅ **NFR5:** Event logs immutable (append-only, no deletion)
- ✅ **NFR6:** All data stored exactly as submitted (no transformations)
- ✅ **NFR7:** Transactional consistency (user creation + event logging atomic)

### Reliability (NFR8-9) ✅
- ✅ **NFR8:** No data loss on server restarts (PostgreSQL ACID)
- ✅ **NFR9:** Manual backup procedure documented

### UX & Performance (NFR10-11) ✅
- ✅ **NFR10:** Desktop-only interface (no responsive design required for MVP)
- ✅ **NFR11:** Page-refresh acceptable (no WebSocket/real-time required)

### API & Data Format (NFR12-14) ✅
- ✅ **NFR12:** REST API with structured errors: `{code, message, details?, requestId}`
- ✅ **NFR13:** Consistent naming: snake_case DB, camelCase API/TS
- ✅ **NFR14:** Pagination format: `{items, page, pageSize, total}`

### Technology Stack (NFR15-17) ✅
- ✅ **NFR15:** Frontend: React 18.2 + TypeScript + TailwindCSS
- ✅ **NFR16:** Backend: Node.js + Express + Prisma 5.0 + PostgreSQL 14+
- ✅ **NFR17:** 3-week MVP delivery timeline (Epic 1 complete on schedule)

### Accessibility (NFR18) ⚠️ PARTIAL
- ⚠️ **NFR18:** WCAG AA compliance (keyboard nav, screen readers, contrast)
  - **Status:** Basic accessibility implemented, not fully audited yet
  - **Note:** Full accessibility audit planned for post-Epic 2

---

## Research Data Collected (Epic 1)

### Event Types Logged
- `project.initialized` - Project setup
- `user.registered` - User signup
- `user.login_success` - Successful login
- `team.created` - Team creation
- `team_member.added` - Member added to team
- `team_member.removed` - Member removed from team
- `invite.created` - Invitation sent
- `invite.auto_resolved` - Invite resolved on signup
- `invite.email_failed` - Email send failure

### Event Schema
```json
{
  "eventType": "string",
  "actorId": "number | null",
  "teamId": "number | null",
  "entityType": "string",
  "entityId": "number",
  "action": "string",
  "payload": "object",
  "schemaVersion": "string (v1)",
  "createdAt": "ISO 8601 timestamp"
}
```

All events stored in immutable `events` table with proper indexing for research queries.

---

## Known Limitations (Epic 1)

### Not Yet Implemented
- Practice catalog display (Epic 2)
- Coverage calculation dashboard (Epic 2)
- Big Five personality questionnaire (Epic 3)
- Issue submission and discussion (Epic 4)
- Adaptation decision tracking (Epic 5)
- Event export for research (Epic 6)

### Technical Debt
- No rate-limiting on login endpoint (acceptable for MVP, add post-MVP)
- No session limit per user (unlimited simultaneous logins acceptable for MVP)
- Basic README only (this comprehensive documentation addresses the gap)
- No OpenAPI/Swagger spec (manual API docs in `05-backend-api.md`)
- No automated accessibility audit (manual testing only)

### Deferred Features
- Password reset flow (not required for research MVP)
- Email verification on signup (not required for research context)
- 2FA/MFA (not required for MVP)
- Admin dashboard (manual database access acceptable for research)

---

## Success Metrics (Epic 1)

- ✅ **100% story completion:** 7/7 stories delivered
- ✅ **Test coverage:** All services and endpoints have unit + integration tests
- ✅ **Security:** All NFR1-4 security requirements met
- ✅ **Research integrity:** All mutations logged to events table
- ✅ **Code review:** All stories reviewed with issues fixed
- ✅ **Manual testing:** All user flows tested in browser
- ✅ **Zero production incidents:** No critical bugs reported

---

## Next Steps

**Immediate:**
1. ✅ Complete Epic 1 retrospective (this session)
2. ✅ Create comprehensive documentation (you are here)
3. 🔄 Plan Epic 2 (Practice Catalog & Coverage)

**Epic 2 Goals:**
- Import practice data from JSON
- Display practice catalog with search/filter
- Calculate and display team coverage (pillar level + category level)
- Allow adding/removing practices from team portfolio
- Enable creating custom practices

**Long-Term:**
- Complete all 6 epics
- Conduct research study with real development teams
- Analyze collected event data for PhD research
- Publish findings

---

## Contact & Maintenance

**Project Lead:** Nicolas Matton (PhD Candidate, Université de Namur)  
**Documentation Maintainer:** Development Team  
**Last Updated:** January 19, 2026  
**Next Update:** After Epic 2 completion
