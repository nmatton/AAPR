# Story 1.5: Email-Based Team Member Invitations

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want to invite teammates by email and have them notified,
so that they can join the team and contribute.

## Acceptance Criteria

1. **Invite new user (pending)**
   - Given I'm on the Team Dashboard
   - When I click [Invite Members] and enter a valid email of a NEW user (doesn't exist in system)
   - Then an invite is created with status: "Pending"
   - And an email is sent to that address with:
     - Subject: "You're invited to join [Team Name] on bmad_version"
     - Body: "You've been invited to join the team '[Team Name]' on bmad_version. Please sign up using this email address to access the platform."
     - CTA: [Create Account] button/link
   - And an event is logged: `{ action: "invite.created", inviteId, teamId, email, isNewUser: true }`

2. **Invite existing user (auto add)**
   - Given I'm on the Team Dashboard
   - When I click [Invite Members] and enter a valid email of an EXISTING user
   - Then the user is added to the team immediately, status: "Added"
   - And an email is sent to them with:
    - Subject: "You've been added to the team [Team Name]"
     - Body: "You've been added to the team '[Team Name]' on bmad_version. Click the link to access it now."
     - CTA: [View Team] button/link
   - And an event is logged: `{ action: "team_member.added", teamId, userId }`

3. **Invalid email format**
   - Given I enter an invalid email format
   - When I try to send the invite
   - Then I see an error: "Invalid email format" and the invite is not sent

4. **Auto-resolve invite on signup**
   - Given I've sent an invite to a new user email
   - When that user signs up with the same email
   - Then they're automatically added to the team (invite auto-resolves)
   - And an event is logged: `{ action: "invite.auto_resolved", inviteId, userId }`

5. **Invite list + resend**
   - Given I've invited multiple users
   - When I see the invite list
   - Then I can see all invites with statuses: Added, Pending (new users), Failed (email send errors)
   - And I can [Resend Email] for Pending or Failed invites

6. **Idempotent invites for existing members**
   - Given I invite a user who's already on the team
   - When I send the invite
   - Then I see a warning: "User is already a team member" and the invite is not created

7. **Email send failure**
   - Given an invite email fails to send (e.g., SMTP error, invalid address)
   - When the system detects the failure
   - Then the invite status is set to "Failed"
   - And I see [Retry] option to resend the email
   - And an event is logged: `{ action: "invite.email_failed", inviteId, teamId, error }`

## Tasks / Subtasks

- [x] **Backend: schema + models**
  - [x] Add `team_invites` table/model (team_id, email, status, invited_by, invited_user_id?, created_at, updated_at, last_sent_at, error_message?)
  - [x] Unique constraint: `(team_id, email)` to enforce idempotent invites
  - [x] Prisma mappings with snake_case → camelCase

- [x] **Backend: invite service + repository**
  - [x] `invites.repository.ts`: create/find/update invites (DB-only)
  - [x] `invites.service.ts`: business rules (existing member check, existing user lookup, pending invite handling)
  - [x] Transactional flow: invite create + event logging; if email send fails, update status to Failed and log event
  - [x] Auto-resolve on signup: in auth/register flow, check pending invites by email and add membership + update invite status

- [x] **Backend: routes + controllers**
  - [x] `POST /api/v1/teams/:teamId/invites` (requireAuth + team isolation)
  - [x] `GET /api/v1/teams/:teamId/invites` (requireAuth + team isolation)
  - [x] `POST /api/v1/teams/:teamId/invites/:inviteId/resend` (requireAuth + team isolation)
  - [x] Validation via Zod: email format, teamId param, inviteId param
  - [x] Structured errors `{code, message, details?, requestId}`

- [x] **Backend: email sending adapter**
  - [x] SMTP config from env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - [x] Central mailer utility with retry-safe API
  - [x] Email templates for: invite pending (new user), added to team (existing user)

- [x] **Frontend: invite UI**
  - [x] Invite modal/panel on Team Dashboard with email input + submit
  - [x] Invite list view with status chips (Added/Pending/Failed)
  - [x] Resend/Retry button per invite (Pending/Failed)
  - [x] Inline validation error for invalid email
  - [x] Toasts for success/failure

- [x] **Testing**
  - [x] Unit tests for invite service (new user, existing user, already member, email failure)
  - [x] Integration tests for invite endpoints
  - [x] Auth register test: pending invite auto-resolves
  - [x] Frontend component tests (invite form + list + resend)

## Developer Context

This story extends Epic 1 team onboarding by adding a robust invite system with email notifications, idempotent membership rules, and research-grade event logging.

### Technical Requirements

- **API error format:** `{ code, message, details?, requestId }`
- **RequestId:** generated by middleware and returned in every response (success + error)
- **Team isolation:** every invite and membership query must include `teamId` filter
- **Event logging:** every mutation logged in `events` table (transactional)
- **TypeScript strict:** no `any`, no implicit types
- **Prisma mapping:** snake_case DB columns mapped to camelCase via `@map/@@map`

### Architecture Compliance

- **Layered backend:** routes → controllers → services → repositories
- **Repositories are DB-only:** no business logic or branching
- **Transactions required:** invite create + event log + (if existing user) team_member insert must be atomic
- **Structured validation:** Zod schemas at controller boundary

### Library / Framework Requirements

- **Nodemailer 7.0.12** for SMTP email sending; TypeScript types via `@types/nodemailer`
- **Prisma 5.0+** and `@prisma/client` versions must match
- **Express 4.18+**, **Node 18+**, **TypeScript 5.2+**
- **JWT auth** via existing middleware

### File Structure Requirements

- Backend:
  - `server/src/routes/teams.routes.ts` (new invite routes)
  - `server/src/controllers/invites.controller.ts`
  - `server/src/services/invites.service.ts`
  - `server/src/repositories/invites.repository.ts`
  - `server/src/lib/mailer.ts` (or `utils/mailer.ts`)
- Frontend:
  - `client/src/features/teams/components/InviteMembersPanel.tsx`
  - `client/src/features/teams/api/invitesApi.ts`
  - `client/src/features/teams/state/invitesSlice.ts` (optional, keep local if small)

### Testing Requirements

- **Backend**: service unit tests (new user, existing user, already member, email failure)
- **Backend**: route tests (validation, auth, resend, list)
- **Auth flow**: registration auto-resolves pending invites
- **Frontend**: invite form validation, status list, resend action

### Previous Story Intelligence (1.4)

- Transaction atomicity is mandatory; all related inserts/updates must succeed or rollback.
- Pre-validation should be outside transactions (faster error response, fewer locks).
- Structured errors + requestId already established; reuse the same patterns.

### Git Intelligence Summary

Recent work indicates active focus on team management, requestId handling, and team creation flow. Keep new invite features consistent with these patterns and filenames.

### Latest Tech Information

- **Nodemailer latest**: v7.0.12 (npm). Set `secure: true` only for port 465; otherwise `secure: false` and allow TLS upgrade. Node 18+ supports TLS 1.2+.
- **TypeScript types** for Nodemailer are provided by `@types/nodemailer`.

### Project Context Reference

- See `_bmad-output/project-context.md` for locked versions, strict TypeScript, structured error shape, team isolation, and transaction+event logging requirements.

## Story Completion Status

- **Status:** review
- **Completion Note:** Ultimate context engine analysis completed - comprehensive developer guide created

## Dev Notes

- **Single-role model**: All team members can invite; no owner-only permission in MVP.
- **Team isolation**: Every invite query and membership write must include `teamId` filtering and middleware.
- **Transactional event logging**: Invite creation and event log must be in the same transaction (no audit gaps). For email failures, update invite status to Failed and log `invite.email_failed` (also in transaction if possible).
- **Email sending**: Use SMTP only (external dependency). Avoid UI blocking—send asynchronously but still mark invite state correctly.
- **Idempotency**: If user is already a member, return 409 with `code: "already_team_member"` and do not create a new invite.
- **Auto-resolve**: On signup, if pending invites exist for the email, add user to team and mark invite as Added; log `invite.auto_resolved`.
- **RequestId**: Include `requestId` in success and error responses; ensure middleware propagates it.

### Project Structure Notes

- **Backend**
  - `server/src/routes/teams.routes.ts` → add invite routes
  - `server/src/controllers/invites.controller.ts` → new controller
  - `server/src/services/invites.service.ts` → new service
  - `server/src/repositories/invites.repository.ts` → new repository
  - `server/src/lib/mailer.ts` (or `utils/mailer.ts`) → email adapter
- **Frontend**
  - `client/src/features/teams/components/InviteMembersPanel.tsx`
  - `client/src/features/teams/api/invitesApi.ts`
  - `client/src/features/teams/state/invitesSlice.ts` (if needed; keep local state if small)

### References

- PRD: FR5 (invites), FR6 (invite status), NFR12-14 (API + error format)
- Architecture: events, team isolation, structured errors, layered services
- UX spec: clear status chips + non-intrusive feedback

## Dev Agent Record

### Agent Model Used

GPT-5.2-Codex

### Completion Notes List

- Story drafted from epics, architecture, UX, and project context.
- Git patterns and previous story learnings incorporated.
- ✅ Added TeamInvite schema with snake_case mappings and uniqueness; added schema test and validated full Jest suite.
- ✅ Implemented invite repository/service flows, auto-resolve on signup, and invite service tests; full Jest suite passing.
- ✅ Added invite controllers/routes with Zod validation and route tests; full Jest suite passing.
- ✅ Implemented Nodemailer SMTP adapter with templates and mailer tests; full Jest suite passing.
- ✅ Built invite panel UI, invite API client, and component tests; full Vitest suite passing.
- ✅ Completed invite service, route, auth auto-resolve, and frontend invite panel tests across Jest/Vitest suites.
- ✅ **CODE REVIEW COMPLETED (2026-01-19)**: Fixed 12 issues identified in adversarial code review
  - Added SMTP configuration to .env
  - Created validateTeamMembership middleware for team isolation enforcement
  - Fixed repository updateInvite to require teamId parameter
  - Made email failure event logging fully transactional
  - Added x-request-id headers to all success responses
  - Added HTML escaping to prevent XSS in email templates
  - Replaced magic strings with typed constants
  - Added comprehensive JSDoc to all public API functions
  - Updated tests to mock new middleware
  - All 79 backend tests passing, 55 frontend tests passing

### File List

- _bmad-output/implementation-artifacts/1-5-email-based-team-member-invitations.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- server/prisma/schema.prisma
- server/src/__tests__/prisma.schema.test.ts
- server/src/lib/mailer.ts
- server/src/lib/__tests__/mailer.test.ts
- server/src/repositories/invites.repository.ts
- server/src/controllers/invites.controller.ts
- server/src/middleware/validateTeamMembership.ts
- server/src/routes/__tests__/invites.routes.test.ts
- server/src/routes/teams.routes.ts
- server/src/services/__tests__/auth.service.test.ts
- server/src/services/__tests__/invites.service.test.ts
- server/src/services/auth.service.ts
- server/src/services/invites.service.ts
- server/.env
- client/src/features/teams/api/invitesApi.ts
- client/src/features/teams/components/InviteMembersPanel.test.tsx
- client/src/features/teams/components/InviteMembersPanel.tsx
- client/src/features/teams/components/TeamDashboard.tsx
- client/src/features/teams/types/invite.types.ts
- server/package-lock.json
- server/package.json
