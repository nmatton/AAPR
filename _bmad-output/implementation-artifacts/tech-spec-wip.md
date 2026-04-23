---
title: 'User Privacy Code for Activity Logging'
slug: 'user-privacy-code-logging'
created: '2026-04-23'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
investigationDate: '2026-04-23'
investigationFindings: 'Centralized event logging via eventService.logEvent(); 7 service files call it; all flow through single validated function'
readyForDevelopment: true
finalizedDate: '2026-04-23'
tech_stack: ['TypeScript', 'Express.js', 'React (TSX)', 'Prisma ORM', 'PostgreSQL', 'Zod', 'Nodemailer', 'JWT/bcrypt', 'Jest']
files_to_modify: [
  'server/prisma/schema.prisma',
  'server/src/schemas/auth.schema.ts',
  'server/src/services/auth.service.ts',
  'server/src/controllers/auth.controller.ts',
  'server/src/routes/auth.routes.ts',
  'server/src/lib/mailer.ts',
  'server/src/repositories/event.repository.ts',
  'client/src/pages/auth/Signup.tsx (or equivalent signup page)',
  'client/src/pages/Main.tsx (or equivalent main page)'
]
code_patterns: ['Zod validation schemas', 'Prisma atomic transactions', 'Nodemailer email builder pattern', 'JWT token generation', 'Event logging via Prisma event.create()', 'Bcrypt password hashing']
test_patterns: ['Jest mocking Prisma (jest.mock())', 'Unit tests for schema validation', 'Integration tests for email sending', 'Controller tests with mock responses']
---

# Tech-Spec: User Privacy Code for Activity Logging

**Created:** 2026-04-23

## Overview

### Problem Statement

Currently, all activity logs in the application use user email as the identifier for tracking who performed each action. For privacy-focused research (pre/post-tests outside the app), you need a persistent, immutable, user-generated identifier that:
- Is set once at signup (blocking)
- Cannot be changed
- Replaces email in all activity/event logs
- Remains private (not visible in UI) but can be emailed to the user on request

This code will be the **only link** between application activity logs and your external research data collection.

### Solution

Implement a **privacy code** field in the user registration flow:

1. **Registration Enhancement**: Add a required `privacyCode` field to the signup schema (user-provided, no restrictions)
2. **Database Schema**: Add `privacyCode` column to `Person` table (unique, immutable)
3. **Activity Logger**: Modify all event logging to use `privacyCode` instead of email
4. **Frontend**: Add blocking "Enter your Privacy Code" step after password in signup
5. **Email Recovery**: Add "Send my Privacy Code by Email" button on main page

### Scope

**In Scope:**
- Add `privacyCode` field to registration flow (blocking, after password entry)
- Store immutably in `Person` table
- Update `eventLogger.ts` to log `privacyCode` in all event entries
- Add email-send endpoint to deliver user's code on request
- Add UI button on main page to trigger email delivery
- Update event repository to include `privacyCode` in activity logs
- Validation: ensure `privacyCode` is unique, non-empty, permanent

**Out of Scope:**
- Displaying `privacyCode` in any UI except email
- Allowing modifications to `privacyCode` post-creation
- Changing database audit columns (`lastUpdateById`) — those remain as userId references
- Adding `privacyCode` to response DTOs or public API payloads
- Migrating existing users' logs to retroactively use codes

## Context for Development

### Codebase Patterns

**Authentication & Registration:**
- Registration flow: `registerSchema` (Zod) → `auth.controller.registerUser()` → `auth.service.registerUser()`
- `registerSchema` validation happens in controller with detailed error responses (Zod validation pattern)
- `auth.service.registerUser()` performs: duplicate email check → password hashing (bcrypt, 10 rounds) → atomic transaction
- Atomic transaction in `registerUser`: `await prisma.$transaction(async (tx) => { ... })` ensures user creation + event logging both succeed or both fail
- JWT tokens generated with payload: `{ userId, email }` (via `generateTokens()`)
- User model defined in `server/prisma/schema.prisma` with fields: id, name, email, password, createdAt, updatedAt, isAdminMonitor

**Event Logging Strategy (CRITICAL FINDING):**
- ✅ **Centralized logging via `eventService.logEvent()`** — All event logging flows through ONE function in `server/src/services/events.service.ts`
- Function signature: `logEvent(data: LogEventInput, tx?: Prisma.TransactionClient)`
- Optional transaction parameter allows both atomic transactions and standalone logging
- Event logging entry points (service files that call `logEvent`):
  - `issue.service.ts`: 6 events (issue.created, issue.comment_added, issue.status_changed, issue.priority_changed, issue.decision_recorded, issue.evaluated)
  - `teams.service.ts`: team creation, practice add/remove, team name updates
  - `big-five.service.ts`: big_five.completed, big_five.retaken
  - `auth.service.ts`: user.registered (within signup transaction)
  - `invites.service.ts`: team_member.added, invite events
  - `coverage.service.ts`: coverage.by_category.calculated
  - `practice-import.service.ts`: practice imports
  - `members.service.ts`: team_member.removed
  
- Event payload structure includes: `actorId`, `teamId`, `entityType`, `entityId`, `action`, plus custom payload fields
- All event payloads currently include `actorId` for reference — privacy code should be added here

**Email Service:**
- `server/src/lib/mailer.ts` uses Nodemailer with SMTP configuration
- Email builders: `buildPasswordResetEmail()`, `buildInviteEmail()`, `buildAddedEmail()` - each returns `{ subject, text, html }`
- Email sender functions: `sendEmail()` and `sendPasswordEmail()` - both create transporter and use `transporter.sendMail()`
- HTML escaping: `escapeHtml()` function prevents XSS in email templates
- SMTP config from env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS`

**Frontend:**
- Auth pages use React form patterns
- Form validation likely integrates with Zod schemas passed from API
- Main page likely has user profile/settings area

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/prisma/schema.prisma` | Add `privacyCode String @unique @db.VarChar(255)` to User model |
| `server/src/schemas/auth.schema.ts` | Add `privacyCode: z.string().min(1, ...)` to `registerSchema`; update `RegisterDto` type |
| `server/src/services/auth.service.ts` | Update `RegisterUserDto` interface; modify `registerUser()` to store privacyCode; create `sendPrivacyCodeEmail()` |
| `server/src/controllers/auth.controller.ts` | Already passes request body to registerSchema - no changes needed for signup validation |
| `server/src/routes/auth.routes.ts` | Add new route: `POST /api/v1/auth/send-privacy-code` with `requireAuth` middleware |
| `server/src/lib/mailer.ts` | Add `buildPrivacyCodeEmail()` and `sendPrivacyCodeEmail()` functions (follow existing pattern) |
| `server/src/repositories/event.repository.ts` | Already uses Prisma transactions; ensure privacy code is captured in event payload |
| `server/prisma/migrations/[timestamp]_add_privacy_code/migration.sql` | Create migration to add column with unique constraint |
| Client auth/signup page | Add `privacyCode` input field after password, validate before submit |
| Client main page | Add button: "Send my personal code by email" → calls `/api/v1/auth/send-privacy-code` |

### Technical Decisions

1. **User-Generated Code**: No format restrictions → accept any non-empty string (Zod: `z.string().min(1)`)
2. **Database Column**: Add to existing `User` model as `privacyCode String @unique @db.VarChar(255)`
3. **Immutability**: No API endpoint to update privacyCode; it's only set at signup. Add code comment in migration.
4. **Unique Constraint**: Database-level unique constraint via `@unique` in Prisma schema
5. **Event Logging - Architecture Decision**: 
   - All event logging flows through **centralized `eventService.logEvent()`** function (no scattered event.create() calls)
   - Keep `actorId` in events for system audit trail (database referential integrity)
   - Add `privacyCode` to event payload alongside `actorId` so research exports can use it as the correlation key
   - When exporting logs for research, queries filter/project payload.privacyCode as the research identifier
6. **Email Service**: Follow existing Nodemailer pattern - create builder + sender function in `mailer.ts`
7. **Auth Endpoint**: `POST /api/v1/auth/send-privacy-code` requires `requireAuth` middleware (extracts userId from JWT → fetches user → sends email)
8. **Frontend Validation**: Privacy code field is required (min 1 char) before form submission
9. **Migration**: Use Prisma migration (run: `npx prisma migrate dev --name add_privacy_code`)

## Implementation Plan

### Tasks

**Task 1: Database Schema & Migration** (Dependency: None)
- Open `server/prisma/schema.prisma`
- Add `privacyCode String @unique @db.VarChar(255)` field to User model (after `password` field)
- Run: `npx prisma migrate dev --name add_privacy_code_to_user`
- Verify migration file created in `server/prisma/migrations/[timestamp]_add_privacy_code_to_user/`
- Ensure unique constraint is in migration SQL

**Task 2: Auth Schema Update** (Dependency: None)
- Update `server/src/schemas/auth.schema.ts`
- Add to `registerSchema`: `privacyCode: z.string().min(1, 'Privacy code is required')`
- Update `RegisterDto` type inference to include `privacyCode: string`
- Keep `loginSchema` unchanged (privacy code only for signup)
- Export updated types

**Task 3: Auth Service Update** (Dependency: Task 1, 2)
- Update `server/src/services/auth.service.ts`
- Update `RegisterUserDto` interface to include `privacyCode: string`
- Modify `registerUser()` function:
  - Destructure `privacyCode` from dto
  - Add privacy code to transaction: `const newUser = await tx.user.create({ data: { name, email, password: hashedPassword, privacyCode } })`
  - Update event logging to include privacyCode in payload: `payload: { email, name, privacyCode, registrationMethod, ... }`
- No changes to JWT generation (tokens already carry userId)

**Task 4: Email Service - Privacy Code Email** (Dependency: None)
- Update `server/src/lib/mailer.ts`
- Add interface: `interface PrivacyCodeEmailPayload { email: string; privacyCode: string }`
- Add builder function: `buildPrivacyCodeEmail()` that returns `{ subject, text, html }` with user's privacy code
- Add sender function: `sendPrivacyCodeEmail(payload: PrivacyCodeEmailPayload): Promise<void>` (follow `sendPasswordResetEmail` pattern)
- Use HTML escaping for privacyCode in template
- Subject: "Your Personal Privacy Code for AAPR Research"
- Include note about never sharing the code

**Task 5: Auth Routes - Privacy Code Email Endpoint** (Dependency: Task 3, 4)
- Update `server/src/routes/auth.routes.ts`
- Add new route: `authRouter.post('/send-privacy-code', requireAuth, authController.sendPrivacyCode)`
- Create handler in `server/src/controllers/auth.controller.ts`:
  - Extract `userId` from JWT token (via `requireAuth` middleware)
  - Query user by ID: `await prisma.user.findUnique({ where: { id: userId }, select: { email, privacyCode } })`
  - Call `sendPrivacyCodeEmail({ email, privacyCode })`
  - Return `{ message: 'Privacy code sent to your email' }` with 200 status
  - Handle errors (user not found, email service fails)

**Task 6: Signup Form - Frontend** (Dependency: Task 2)
- Locate signup component (likely `client/src/pages/auth/Signup.tsx` or similar)
- Add `privacyCode` field to form state (after password field)
- Add input element after password:
  - Label: "Personal Privacy Code"
  - Help text: "Create a unique code you'll use for research tracking. You cannot change this later."
  - Validation: non-empty string
  - Show error if empty on submit
- Pass `privacyCode` to signup API call in form submission: `{ name, email, password, privacyCode }`

**Task 7: Main Page - Privacy Code Button** (Dependency: Task 5)
- Locate main page component (likely `client/src/pages/Main.tsx` or equivalent)
- Add button at bottom of page:
  - Text: "Send my personal code by email"
  - Click handler: POST to `/api/v1/auth/send-privacy-code`
  - Add loading state during request
  - Show success toast: "Check your email for your privacy code"
  - Show error toast if request fails
  - Use authentication token (already in cookies or header)

**Task 8: Centralize Privacy Code in Event Logging** (Dependency: Task 3, 5)
- Update `server/src/services/events.service.ts`:
  - Add `privacyCode?: string` field to `LogEventInput` interface
  - Modify `logEvent()` function to accept privacyCode and pass it to event payload
  - Update validation to ensure actorId + privacyCode mapping is correct (if actorId provided, privacyCode should be provided)
- All existing service files that call `eventService.logEvent()` will need minimal update:
  - When logging an event with a known actor, pass privacyCode: fetch user's privacyCode in the calling service and pass it to logEvent()
  - Services impacted: issue.service.ts, teams.service.ts, big-five.service.ts, invites.service.ts, members.service.ts, coverage.service.ts, practice-import.service.ts
  - Pattern: `await eventService.logEvent({ ..., privacyCode: actor.privacyCode }, tx)`
- CRITICAL: Since all event logging goes through `eventService.logEvent()`, this is a **single architectural change** with ripple updates across 7 service files

### Acceptance Criteria

**AC1: Database Column Created**
- Given: Migration has run
- When: Database schema is queried
- Then: `users` table has `privacy_code` column (VARCHAR 255, UNIQUE, NOT NULL)

**AC2: Signup Schema Validates Privacy Code**
- Given: Frontend submits signup without privacyCode
- When: API validates with `registerSchema`
- Then: Returns 400 with error message "Privacy code is required"

**AC3: Signup - Privacy Code Stored**
- Given: User submits valid signup form with privacyCode "MYCODE123"
- When: Registration succeeds
- Then: User record in database has `privacy_code = 'MYCODE123'`

**AC4: Privacy Code Uniqueness Enforced**
- Given: User1 registered with privacyCode "ABC"
- When: User2 attempts signup with same privacyCode "ABC"
- Then: Signup fails with error "Privacy code already in use" (database unique constraint)

**AC5: Signup Event Includes Privacy Code**
- Given: User registers with privacyCode "USER001"
- When: Signup event is logged
- Then: Event record contains `payload: { privacyCode: "USER001", email, name, ... }`

**AC6: Privacy Code Email Endpoint - Authenticated**
- Given: Authenticated user calls POST `/api/v1/auth/send-privacy-code`
- When: Request includes valid JWT token
- Then: Email sent to user's email with subject containing "Privacy Code"
- And: Response is `{ message: 'Privacy code sent to your email' }` (200 OK)

**AC7: Privacy Code Email Endpoint - Unauthenticated**
- Given: Unauthenticated user calls POST `/api/v1/auth/send-privacy-code`
- When: Request has no JWT token
- Then: Returns 401 Unauthorized (requireAuth middleware blocks)

**AC8: Privacy Code Email Content**
- Given: User receives privacy code email
- When: Email is opened
- Then: Email body clearly displays user's privacy code (e.g., "Your code is: MYCODE123")
- And: Email includes note about keeping code private for research

**AC9: Main Page Button - Send Code**
- Given: Authenticated user is on main page
- When: User clicks "Send my personal code by email" button
- Then: Button enters loading state
- And: Request is sent to `/api/v1/auth/send-privacy-code`
- And: Success toast shown: "Check your email for your privacy code"

**AC10: Main Page Button - Error Handling**
- Given: User clicks button but email service fails
- When: API returns error
- Then: Error toast shown to user
- And: Button returns to normal state (not loading)

## Additional Context

### Dependencies

- **Prisma CLI**: For running migrations (`npx prisma migrate dev`)
- **Database**: PostgreSQL with write permissions to add column
- **Environment Variables**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS` already configured (same as password reset emails)
- **Existing Email Service**: Nodemailer already set up; can reuse transporter creation
- **JWT Authentication**: Middleware `requireAuth` already exists and extracts userId from tokens
- **Frontend Build**: React setup already has form handling and HTTP client configured

### Testing Strategy

1. **Unit Tests - Schema Validation:**
   - Test `registerSchema` accepts privacyCode (non-empty string)
   - Test `registerSchema` rejects empty privacyCode with correct error message
   - Test `privacyCode` field is optional/required as specified

2. **Unit Tests - Email Builder:**
   - Test `buildPrivacyCodeEmail()` returns correct subject, text, html
   - Test HTML escaping of privacyCode in email template
   - Test email content includes user's code clearly

3. **Integration Tests - Signup Flow:**
   - Mock `prisma.$transaction` to test atomic transaction
   - Test user created with privacyCode stored
   - Test unique constraint: second user with same code fails
   - Test event logged with privacyCode in payload
   - Test response contains user data (but NOT privacyCode)

4. **Integration Tests - Email Endpoint:**
   - Test `requireAuth` middleware blocks unauthenticated requests (401)
   - Test authenticated request retrieves correct user's privacyCode
   - Test `sendPrivacyCodeEmail()` called with correct payload
   - Test response returns success message (200 OK)
   - Test error handling if user not found or email fails

5. **E2E Tests - Signup:**
   - Fill signup form with all fields including privacyCode
   - Submit form
   - Verify user account created in database
   - Verify user can log in with email/password (not privacyCode)
   - Verify event logged in database with privacyCode

6. **E2E Tests - Email Recovery:**
   - Log in as existing user
   - Click "Send my personal code by email" button
   - Verify loading state appears
   - Wait for success toast
   - Check email received with privacy code

### Notes

- **Event Logging Architecture Clarification**: All events flow through `eventService.logEvent()` — a single function in `server/src/services/events.service.ts`. This is a centralized, validated entry point. Task 6 updates this one function + its 7 caller services, not scattered direct `event.create()` calls.

- **actorId vs privacyCode Design**: To answer Winston's architectural concern:
  - **Keep `actorId` in events** for internal system audit trail and database referential integrity
  - **Add `privacyCode` to event payload** alongside actorId for research correlation
  - Your research exports should project `payload.privacyCode` as the user identifier, not actorId
  - Event structure: `{ actorId: 42, teamId: 1, payload: { privacyCode: 'RESEARCH_001', actorId: 42, ... } }`
  - This maintains system integrity while giving you privacy-code-only tracking for research

- **Backward Compatibility**: Existing users without `privacyCode` won't have it; new migrations should NOT add NOT NULL constraint immediately. **RECOMMENDATION**: Add column as nullable, then in future add migration to set default codes for existing users if needed.
  
- **Research Correlation**: Ensure signup form guidance is clear (e.g., "This code links your app activity to your research participation. Choose something you'll remember."). Communicate format expectations so codes match your external pre/post-test data.

- **Email Testing**: Ensure `SMTP_` environment variables are set in `.env`. Use Mailtrap for development testing.

- **API Response Security**: Privacy code should NEVER appear in login/profile responses, only in email and event payloads. Controller response DTOs must exclude `privacyCode` field.

- **Logging Immutability**: Add migration comment: `-- IMPORTANT: privacy_code must NEVER be updated. Research data depends on its permanence.`

- **JWT Token**: No changes needed — current `{ userId, email }` payload is sufficient. userId alone fetches privacyCode for email endpoint.

- **Database Indexing**: Unique constraint on `privacyCode` creates index automatically.

- **Error Messaging**: Keep user-facing errors generic: "Privacy code is already in use" (not "UNIQUE constraint violated").
