# Changelog

**Implementation History for AAPR Platform**

Last Updated: January 19, 2026

---

## Epic 1: Authentication & Team Onboarding

**Status:** ✅ COMPLETE (7/7 stories)  
**Duration:** January 15-19, 2026  
**Team:** Bob (SM), Elena (Dev), Marcus (Dev)

---

## Epic 2: Practice Catalog & Coverage

**Status:** 🔄 IN PROGRESS  
**Start Date:** January 19, 2026  
**Team:** Nicolas (Dev)

### Story 2-0: Import Practice Data from JSON

**Status:** 🔄 In Review  
**Date:** January 19, 2026  
**Developer:** Nicolas

**What Was Built:**

**Backend:**
- Practice catalog schema updates (categories, pillars, practices, practice_pillars)
- Seed scripts for categories/pillars and practices
- Practice JSON import service with validation, idempotency, and event logging
- Practice repository for catalog queries (Story 2.1 readiness)

**Testing:**
- Manual validation of seed/import flows

**Documentation Updated:**
- Database schema documentation
- Development guide version constraints


---

### Story 1-0: Set Up Initial Project from Starter Template

**Status:** ✅ Done  
**Date:** January 16, 2026  
**Developer:** Marcus

**What Was Built:**
- Initialized project from `starter-template/`
- Set up TypeScript configuration (strict mode)
- Configured ESLint + Prettier
- Created `client/` and `server/` directories
- Set up Vite for frontend build
- Configured TailwindCSS for styling
- Created Docker PostgreSQL container
- Initialized Prisma ORM
- Set up environment variables (`.env` files)

**Technical Decisions:**
- **React 18.2:** Locked version for stability (no auto-upgrades)
- **TypeScript 5.2+:** Strict mode enforced across both client and server
- **PostgreSQL 14+:** Running in Docker for local development
- **Prisma 5.0+:** Type-safe ORM with schema-first approach

**Files Created:**
- `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`
- `server/package.json`, `server/tsconfig.json`, `server/prisma/schema.prisma`
- `server/.env`, `client/.env`
- Docker compose configuration

**Testing:**
- Verified frontend dev server runs (`npm run dev`)
- Verified backend dev server runs (`npm run dev`)
- Verified PostgreSQL connection

**Documentation Updated:**
- README.md with setup instructions
- Initial project structure diagram

---

### Story 1-1: User Registration with Email Validation

**Status:** ✅ Done  
**Date:** January 17, 2026  
**Developer:** Elena

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/auth/signup`
- **Validation:** Email format (RFC 5322), password ≥ 8 characters, name 1-100 characters
- **Security:** Bcrypt password hashing (10 rounds minimum)
- **Response:** JWT token set in HTTP-only cookie (`token`, 24-hour expiry)
- **Database:** `users` table with `id`, `name`, `email`, `password`, `created_at`, `updated_at`
- **Event Logging:** `user.registered` event with `actor_id`, `email`, `created_at`

**Frontend:**
- **Component:** `SignupForm.tsx` (React functional component)
- **Fields:** Name, email, password inputs
- **Validation:** Client-side email format check, password length check
- **State:** Zustand `authSlice` with `signup` action
- **Routing:** Redirect to `/teams` on success

**Architecture Decisions:**
- **ADR-003:** JWT stored in HTTP-only cookies (not localStorage for XSS protection)
- **ADR-007:** Bcrypt with 10+ salt rounds for password hashing

**Testing:**
- Unit tests for `AuthService.signup`
- Integration test for `/api/auth/signup` endpoint
- Frontend tests for `SignupForm` component
- Coverage: 87% (backend), 82% (frontend)

**Files Created:**
- `server/src/routes/authRoutes.ts`
- `server/src/controllers/authController.ts`
- `server/src/services/authService.ts`
- `server/src/repositories/userRepository.ts`
- `server/src/repositories/eventRepository.ts`
- `client/src/features/auth/SignupForm.tsx`
- `client/src/features/auth/authSlice.ts`
- `client/src/features/auth/authApi.ts`

**Database Migration:**
- `20260116142444_add_users_and_events_tables.sql`

---

### Story 1-2: User Login with Session Management

**Status:** ✅ Done  
**Date:** January 17, 2026  
**Developer:** Marcus

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/auth/login`
- **Validation:** Email exists, password matches (bcrypt compare)
- **Response:** JWT token set in HTTP-only cookie
- **Middleware:** `authMiddleware` to validate JWT on protected routes
  - Extracts token from cookie
  - Verifies JWT signature
  - Attaches `req.userId` for downstream use
- **Logout:** `POST /api/auth/logout` clears cookie

**Frontend:**
- **Component:** `LoginForm.tsx`
- **Fields:** Email, password
- **State:** `authSlice.login` action
- **Routing:** Redirect to `/teams` on success, redirect to `/login` if unauthorized

**Event Logging:**
- `user.login_success` with `actor_id`, `timestamp`

**Security:**
- Password never sent in response
- JWT includes: `userId`, `email`, `iat`, `exp`
- Cookie flags: `httpOnly=true`, `secure=false` (dev), `sameSite=Lax`

**Testing:**
- Unit tests for `AuthService.login`
- Integration test for login → protected route → logout flow
- Frontend tests for `LoginForm` component
- Coverage: 89% (backend), 85% (frontend)

**Files Created:**
- `server/src/middleware/authMiddleware.ts`
- `client/src/features/auth/LoginForm.tsx`

**Architecture Decisions:**
- **ADR-003:** JWT authentication with 24-hour expiry

---

### Story 1-3: Teams List View with Multi-Team Support

**Status:** ✅ Done  
**Date:** January 18, 2026  
**Developer:** Elena

**What Was Built:**

**Backend:**
- **Endpoint:** `GET /api/teams`
- **Response:** Array of teams with:
  - `id`, `name`, `createdAt`
  - `memberCount` (count of `team_members`)
  - `pillars_covered` (distinct pillars from team's practices)
  - `coverage` (percentage: `pillars_covered / 19 * 100`)
- **Authorization:** Only return teams where user is a member
- **Database:**
  - `teams` table: `id`, `name`, `created_at`, `updated_at`
  - `team_members` table: `id`, `team_id`, `user_id`, `role`, `joined_at`
  - Unique constraint on `(team_id, user_id)`

**Frontend:**
- **Component:** `TeamsList.tsx`
- **Display:** Grid of team cards with:
  - Team name
  - Member count
  - Coverage badge (color-coded: red < 33%, yellow 33-66%, green > 67%)
  - "View Team" button
- **Empty State:** "You're not in any teams yet" with "Create Team" CTA

**State Management:**
- `teamsSlice` with `fetchTeams` action
- Fetch teams on component mount

**Testing:**
- Unit tests for `TeamService.getTeamsForUser`
- Integration test for `/api/teams` endpoint
- Frontend tests for `TeamsList` component (empty state, team cards)
- Coverage: 86% (backend), 83% (frontend)

**Files Created:**
- `server/src/routes/teamRoutes.ts`
- `server/src/controllers/teamController.ts`
- `server/src/services/teamService.ts`
- `server/src/repositories/teamRepository.ts`
- `client/src/features/teams/TeamsList.tsx`
- `client/src/features/teams/teamsSlice.ts`
- `client/src/features/teams/teamsApi.ts`

**Database Migration:**
- `20260119_add_teams_and_members.sql`

**Architecture Decisions:**
- **ADR-005:** Team isolation (all queries filter by `team_id`)
- **ADR-002:** Layered backend (routes → controllers → services → repositories)

---

### Story 1-4: Team Creation with Practice Selection

**Status:** ✅ Done  
**Date:** January 18, 2026  
**Developer:** Marcus

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/teams`
- **Request Body:** `{ name: string, practices: number[] }`
- **Validation:**
  - Team name: 3-50 characters, unique across platform
  - Practice IDs: Must exist in `practices` table (validated)
- **Behavior:**
  - Create team in `teams` table
  - Add creator as team member (`role = 'owner'`)
  - Add practices to `team_practices` junction table
- **Response:** `{ id, name, createdAt }`

**Frontend:**
- **Component:** `CreateTeamForm.tsx`
- **Fields:**
  - Team name input
  - Practice selection checkboxes (grouped by category)
- **State:** `teamsSlice.createTeam` action
- **Routing:** Redirect to `/teams` on success

**Database:**
- **Tables Added:**
  - `practices`: `id`, `title`, `goal`, `category`, `is_global`, `created_at`
  - `team_practices`: `id`, `team_id`, `practice_id`, `added_at`
  - Unique constraint on `(team_id, practice_id)`

**Event Logging:**
- `team.created` with `team_id`, `name`, `actor_id`, `practice_ids`
- `team_member.added` with `team_id`, `user_id`, `role`

**Testing:**
- Unit tests for `TeamService.createTeam`
- Integration test for `/api/teams` POST endpoint
- Validation tests (duplicate name, invalid practice IDs)
- Frontend tests for `CreateTeamForm` component
- Coverage: 88% (backend), 84% (frontend)

**Files Created:**
- `client/src/features/teams/CreateTeamForm.tsx`

**Database Migration:**
- `20260119_add_practices_and_pillars.sql`

**Architecture Decisions:**
- **ADR-005:** Creator automatically becomes team owner

---

### Story 1-5: Email-Based Team Member Invitations

**Status:** ✅ Done  
**Date:** January 19, 2026  
**Developer:** Elena

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/teams/:teamId/invites`
- **Request Body:** `{ emails: string[] }` (1-10 emails)
- **Behavior:**
  1. Check if email belongs to existing user:
     - **Yes:** Immediately add to `team_members`, status = `Added`
     - **No:** Create `team_invites` row, send invitation email, status = `Pending`
  2. Send email via Nodemailer (SMTP configured in `.env`)
  3. Log events (`invite.created`, `invite.auto_resolved`, `invite.email_failed`)
- **Idempotency:** Duplicate emails return existing invite status (no error)

**Frontend:**
- **Component:** `InviteMembersPanel.tsx`
- **UI:**
  - Textarea for comma-separated or newline-separated emails
  - "Send Invitations" button
  - Results display (success/failure per email)

**Database:**
- **Table:** `team_invites`
  - `id`, `team_id`, `email`, `status`, `invited_by`, `invited_user_id`, `created_at`, `updated_at`, `last_sent_at`, `error_message`
  - Unique constraint on `(team_id, email)`
  - Status values: `Pending`, `Added`, `Failed`

**Email Template:**
```
Subject: You've been invited to join [Team Name]

Hi,

You've been invited to join the team "[Team Name]" on AAPR Platform.

Sign up here: http://localhost:5173/signup

If you already have an account, just log in and you'll see the team.

Best,
AAPR Team
```

**Event Logging:**
- `invite.created` (team_id, email, invited_by)
- `invite.auto_resolved` (team_id, email, user_id) - if existing user
- `invite.email_failed` (team_id, email, error_message)

**Testing:**
- Unit tests for `InviteService.inviteMembers`
- Integration tests:
  - Invite existing user (auto-added)
  - Invite new user (email sent)
  - Duplicate invite (idempotent)
  - Email send failure (status = `Failed`)
- Frontend tests for `InviteMembersPanel`
- Coverage: 87% (backend), 81% (frontend)

**Files Created:**
- `server/src/services/inviteService.ts`
- `server/src/repositories/inviteRepository.ts`
- `server/src/utils/emailService.ts`
- `client/src/features/teams/InviteMembersPanel.tsx`

**Database Migration:**
- `20260119_add_invites.sql`

**Dependencies Added:**
- `nodemailer` (email sending)

---

### Story 1-6: Invite Status Management and Membership View

**Status:** ✅ Done  
**Date:** January 19, 2026  
**Developer:** Marcus

**What Was Built:**

**Backend:**
- **Endpoint:** `GET /api/teams/:teamId/members`
- **Response:** Array combining:
  1. Active members from `team_members` (status = `Added`)
  2. Pending invites from `team_invites` (status = `Pending` or `Failed`)
- **Response Format:**
  ```json
  [
    { "id": 1, "name": "Jane", "email": "jane@example.com", "joinedAt": "...", "status": "Added" },
    { "id": null, "name": null, "email": "alice@example.com", "joinedAt": "...", "status": "Pending" }
  ]
  ```
- **Endpoint:** `DELETE /api/teams/:teamId/members/:userId`
- **Behavior:** Remove user from `team_members` (does NOT delete user account)

**Frontend:**
- **Component:** `TeamMembersPanel.tsx`
- **Display:**
  - List of members with name, email, status badge
  - "Remove" button for each member (except current user)
  - Status badges:
    - `Added`: Green badge
    - `Pending`: Yellow badge
    - `Failed`: Red badge with "Retry" button

**Event Logging:**
- `team_member.removed` (team_id, user_id, actor_id)

**Testing:**
- Unit tests for `TeamService.getTeamMembers`, `TeamService.removeMember`
- Integration tests for GET/DELETE endpoints
- Authorization tests (non-members cannot access)
- Frontend tests for `TeamMembersPanel`
- Coverage: 89% (backend), 86% (frontend)

**Files Created:**
- `client/src/features/teams/TeamMembersPanel.tsx`

**Architecture Decisions:**
- **ADR-005:** Team isolation enforced via `teamMembershipMiddleware`

---

## Epic 1 Summary

### Statistics

**Stories:** 7/7 complete  
**Duration:** 4 days (Jan 16-19, 2026)  
**Lines of Code:**
- Backend: ~3,500 lines
- Frontend: ~2,200 lines
- Tests: ~1,800 lines

**Test Coverage:**
- Backend: 87% (target: 85%)
- Frontend: 84% (target: 80%)

**Database Schema:**
- Tables: 8 (users, teams, team_members, team_invites, practices, team_practices, pillars, practice_pillars, events)
- Migrations: 4
- Indexes: 12

---

### What We Delivered

**Authentication:**
- User registration with email validation
- User login with JWT sessions
- Logout functionality

**Team Management:**
- Create teams with practice selection
- View teams list with coverage metrics
- Multi-team support per user

**Team Onboarding:**
- Invite members via email
- Auto-add existing users
- View invite status (Pending/Added/Failed)
- Remove team members

**Research Integrity:**
- Event logging for all significant actions
- Immutable audit trail
- Team isolation enforced

---

### Technical Achievements

**Architecture:**
- Feature-first frontend organization
- Layered backend (routes → controllers → services → repositories)
- Type-safe database access (Prisma)
- Structured error handling

**Security:**
- Bcrypt password hashing (10+ rounds)
- JWT in HTTP-only cookies (XSS protection)
- Team-based authorization
- Input validation on all endpoints

**DevEx:**
- TypeScript strict mode enforced
- ESLint + Prettier configured
- Automated testing (Jest, Vitest)
- Hot module reload (Vite)

---

### Known Limitations

**Epic 1:**
- No password reset functionality (future enhancement)
- No email verification (invited users can signup with any email)
- No rate limiting on auth endpoints (vulnerable to brute force)
- No pagination on teams list (assumes < 100 teams per user)
- No search/filter on teams
- No team deletion
- No user profile editing

**Deferred to Epic 2+:**
- Practice catalog browsing
- Coverage visualization
- Practice recommendations
- Team settings (rename, transfer ownership)

---

## Next: Epic 2 - Practice Catalog & Coverage

**Planned Features:**
- Browse practice catalog (grouped by category)
- View pillar mappings for each practice
- Add/remove practices from team
- Detailed coverage breakdown (by category)
- Coverage visualization (bar chart)
- Practice search and filtering

**Start Date:** January 20, 2026

---

**Last Updated:** January 19, 2026
