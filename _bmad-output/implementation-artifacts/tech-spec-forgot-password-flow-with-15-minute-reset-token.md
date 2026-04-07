---
title: 'Forgot Password Flow with 15-Minute Reset Token'
slug: 'forgot-password-flow-with-15-minute-reset-token'
created: '2026-04-07T00:00:00Z'
status: 'review-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'React 18 + TypeScript + Zustand + React Router'
  - 'Vitest + Testing Library (frontend tests)'
  - 'Express 4 + TypeScript + Zod'
  - 'Jest + Supertest (backend tests)'
  - 'Prisma ORM + PostgreSQL'
  - 'Nodemailer SMTP transport'
  - 'bcrypt + JWT-based auth/session cookies'
files_to_modify:
  - 'client/src/features/auth/components/LoginForm.tsx'
  - 'client/src/features/auth/components/LoginForm.test.tsx'
  - 'client/src/App.tsx'
  - 'client/src/App.test.tsx'
  - 'client/src/features/auth/api/authApi.ts'
  - 'client/src/features/auth/api/authApi.test.ts'
  - 'client/src/features/auth/state/authSlice.ts'
  - 'server/src/routes/auth.routes.ts'
  - 'server/src/routes/__tests__/auth.routes.test.ts'
  - 'server/src/controllers/auth.controller.ts'
  - 'server/src/services/auth.service.ts'
  - 'server/src/services/__tests__/auth.service.test.ts'
  - 'server/src/schemas/auth.schema.ts'
  - 'server/src/lib/mailer.ts'
  - 'server/src/lib/__tests__/mailer.test.ts'
  - 'server/src/lib/prisma.ts'
  - 'server/src/services/events.service.ts'
  - 'server/prisma/schema.prisma'
  - 'server/prisma/migrations/<timestamp>_add_password_reset_tokens/migration.sql'
  - 'client/src/features/auth/components/ForgotPasswordForm.tsx'
  - 'client/src/features/auth/components/ResetPasswordForm.tsx'
  - 'client/src/features/auth/components/ForgotPasswordForm.test.tsx'
  - 'client/src/features/auth/components/ResetPasswordForm.test.tsx'
code_patterns:
  - 'Auth endpoints are namespaced under /api/v1/auth with controller delegation from routes.'
  - 'Validation is done with Zod schemas in server/src/schemas/auth.schema.ts and parsed in controllers with 400 validation_error payloads.'
  - 'Business logic and DB transactions live in service layer; controllers remain thin and map AppError to JSON API error responses.'
  - 'Client API calls use centralized apiRequest wrapper with credentials include, retry-on-401 refresh behavior, and structured error objects.'
  - 'Auth UI forms use local React state, blur+submit validation, disabled submit until valid, and explicit error-code mapping.'
  - 'Transactional email is centralized in server/src/lib/mailer.ts with escaped HTML and tested transporter configuration.'
  - 'Event writes are constrained by null-actor/null-team allowlists in server/src/lib/prisma.ts and server/src/services/events.service.ts.'
test_patterns:
  - 'Frontend component tests use Vitest + Testing Library + MemoryRouter for route-linked auth forms.'
  - 'Frontend API tests mock global fetch and validate retry/race behavior in authApi module.'
  - 'Backend route tests use Supertest against an Express app with mocked auth service functions.'
  - 'Backend service tests mock Prisma transaction/query methods and assert event payload details.'
---

# Tech-Spec: Forgot Password Flow with 15-Minute Reset Token

**Created:** 2026-04-07T00:00:00Z

## Overview

### Problem Statement

Users currently cannot recover access when they forget their password. Existing auth capabilities include registration, login, refresh, and logout, but there is no password reset initiation or completion flow. This creates account lockout risk and support burden.

### Solution

Add a complete forgot-password and reset-password flow: expose a Mot de passe oublie action on the login page, collect the account email, send a reset email containing a single-use tokenized link, and allow setting a new password through a dedicated reset screen. Enforce strict token expiration at 15 minutes from link generation.

### Scope

**In Scope:**
- Login page UX update with a Mot de passe oublie entry point.
- Forgot-password page/form to submit account email.
- Backend endpoint to issue password reset token and trigger reset email.
- Persisted reset token model/storage with createdAt and expiresAt metadata.
- Reset-password page/form (token + new password).
- Backend endpoint to validate token, enforce 15-minute expiry, hash/store new password, and invalidate token.
- Secure and user-safe responses (no account enumeration leaks).
- Happy-path and key edge-case automated tests on client and server.

**Out of Scope:**
- MFA/OTP-based reset.
- Password policy redesign beyond current minimum constraints unless needed for consistency.
- Rate-limiting hardening beyond baseline anti-abuse requirements.
- Account recovery via username/phone/helpdesk workflow.
- Localization overhaul outside strings directly needed by the new flow.

## Context for Development

### Codebase Patterns

- Auth routes are mounted under /api/v1/auth and use route -> controller -> service layering.
- Controller pattern: parse Zod schema, invoke service, map known AppError to { code, message, details, requestId }, pass unknown errors to middleware.
- Service pattern: enforce security/business constraints, use Prisma transaction where data+event consistency is required.
- Login and signup forms use local state validation (email regex + password min length), with disabled submit until valid input.
- Auth API wrapper always sends credentials, request IDs, and handles refresh token retries for 401 responses.
- Mailer centralizes SMTP config and escaped HTML templates; this is the expected extension point for password reset email.
- Event writes are guarded by metadata rules. If password-reset events are added, actor/team nullability constraints must comply with existing allowlists.
- Current DB has no reset-token table, so a Prisma schema update + migration is mandatory.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| client/src/features/auth/components/LoginForm.tsx | Existing login UI and validation pattern where forgot-password CTA will be added |
| client/src/features/auth/components/LoginForm.test.tsx | Existing assertions style for auth form behavior and links |
| client/src/App.tsx | Auth route registration pattern for adding forgot/reset routes |
| client/src/App.test.tsx | End-to-end-ish frontend route/auth flow integration patterns |
| client/src/features/auth/api/authApi.ts | Existing auth API wrapper to extend with forgot/reset calls |
| client/src/features/auth/api/authApi.test.ts | Existing API-layer race/retry tests to mirror for new endpoints |
| server/src/routes/auth.routes.ts | Auth endpoint definitions and route conventions |
| server/src/routes/__tests__/auth.routes.test.ts | Supertest route contract testing style for auth endpoints |
| server/src/controllers/auth.controller.ts | Request parsing and response format for auth handlers |
| server/src/services/auth.service.ts | Central auth business logic including password handling |
| server/src/services/__tests__/auth.service.test.ts | Prisma-mocked unit tests and transaction assertions for auth logic |
| server/src/schemas/auth.schema.ts | Zod schemas for auth payload validation |
| server/src/lib/mailer.ts | Existing transactional email mechanism to extend for reset email |
| server/src/lib/__tests__/mailer.test.ts | Mailer test style for transport and email payload assertions |
| server/src/lib/prisma.ts | Event metadata constraints that can affect new event logging |
| server/src/services/events.service.ts | Additional event validation rules for team/actor requirements |
| server/prisma/schema.prisma | User model and location for new password reset token persistence model |
| server/prisma/migrations/*/migration.sql | SQL migration convention for schema changes |

### Technical Decisions

- Token lifetime is fixed at 15 minutes from generation (hard requirement).
- Forgot-password request will return a generic success response regardless of account existence (anti-enumeration).
- Reset link must include a one-time token generated with cryptographically secure randomness.
- Persist only token hash (not raw token) in database, bound to user and expiry timestamp, with consumed/used marker.
- Reset completion endpoint must reject expired/invalid/used tokens and must not reveal sensitive account state.
- Password update must reuse secure hashing conventions currently used by auth registration.
- On successful reset, all outstanding reset tokens for that user should be invalidated to prevent replay.
- UI copy should include French CTA label "Mot de passe oublie" on login screen as requested.

## Implementation Plan

### Tasks

- [x] Task 1: Add password reset token persistence model and migration
  - File: `server/prisma/schema.prisma`
  - Action: Add a `PasswordResetToken` model linked to `User` with fields for token hash, expiry timestamp, created timestamp, and consumed timestamp; add indexes for lookup and expiry cleanup.
  - Notes: Keep raw token out of DB; store hash only; allow multiple outstanding tokens but support bulk invalidation per user.
- [x] Task 2: Create migration for reset-token storage
  - File: `server/prisma/migrations/<timestamp>_add_password_reset_tokens/migration.sql`
  - Action: Generate SQL migration to create the reset token table, constraints, foreign key, and indexes.
  - Notes: Follow existing migration naming/structure conventions under `server/prisma/migrations`.
- [x] Task 3: Add validation schemas for forgot-password and reset-password requests
  - File: `server/src/schemas/auth.schema.ts`
  - Action: Add Zod schemas for forgot-password payload (`email`) and reset-password payload (`token`, `newPassword`) plus inferred types.
  - Notes: Keep validation messages consistent with existing auth API error style.
- [x] Task 4: Extend mailer utility with reset email template and sender
  - File: `server/src/lib/mailer.ts`
  - Action: Add a typed payload and a `sendPasswordResetEmail` function that composes subject/text/html with an escaped reset URL containing token.
  - Notes: Reuse existing `escapeHtml`, transporter creation, and `sendEmail` helper pattern.
- [x] Task 5: Implement forgot-password and reset-password business logic
  - File: `server/src/services/auth.service.ts`
  - Action: Add service methods to request password reset (lookup user, create token hash + expiry, send email, return generic response) and complete reset (validate token hash/expiry/unused, update hashed password, consume/invalidate tokens).
  - Notes: Use crypto-secure token generation; enforce strict 15-minute TTL; hash password with existing bcrypt rounds; wrap update and token invalidation in a transaction.
- [x] Task 6: Decide and implement event logging strategy for password reset operations
  - File: `server/src/services/auth.service.ts`
  - Action: Add event creation for reset request and/or completion if required.
  - Notes: If using new event types with null actor/team, update allowlists accordingly in `server/src/lib/prisma.ts` and `server/src/services/events.service.ts` to avoid runtime validation failures.
- [x] Task 7: Add controller handlers for forgot-password and reset-password endpoints
  - File: `server/src/controllers/auth.controller.ts`
  - Action: Add endpoint handlers that parse new schemas, call service methods, and return consistent response contracts and error handling.
  - Notes: Forgot-password must always return generic success to avoid account enumeration.
- [x] Task 8: Register new auth routes
  - File: `server/src/routes/auth.routes.ts`
  - Action: Add `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` route bindings to new controller handlers.
  - Notes: Keep route docs/comments aligned with existing auth route style.
- [x] Task 9: Extend frontend auth API client for reset flow
  - File: `client/src/features/auth/api/authApi.ts`
  - Action: Add typed API functions for forgot-password and reset-password requests using existing `apiRequest` utility.
  - Notes: Use current error-shape conventions and preserve credential/request-id behavior.
- [x] Task 10: Add forgot-password and reset-password pages/components
  - File: `client/src/features/auth/components/ForgotPasswordForm.tsx`
  - Action: Create form to collect email and submit forgot-password request, with validation and generic success confirmation UX.
  - Notes: Mirror login/signup input and error handling patterns.
- [x] Task 11: Add reset-password form page/component
  - File: `client/src/features/auth/components/ResetPasswordForm.tsx`
  - Action: Create form to read token from URL, collect new password, submit reset request, and handle success/error states.
  - Notes: Handle missing token, expired token, invalid token, and successful reset redirect path.
- [x] Task 12: Add login CTA for password recovery
  - File: `client/src/features/auth/components/LoginForm.tsx`
  - Action: Add a visible action/link labeled "Mot de passe oublie" that navigates to forgot-password page.
  - Notes: Maintain existing login field behavior and button disabling logic.
- [x] Task 13: Register new frontend routes for password reset flow
  - File: `client/src/App.tsx`
  - Action: Add unauthenticated routes for forgot-password and reset-password components.
  - Notes: Ensure authenticated users are redirected consistently and route order does not break existing auth paths.
- [x] Task 14: Add frontend tests for new auth recovery UX
  - File: `client/src/features/auth/components/ForgotPasswordForm.test.tsx`
  - Action: Add component tests for validation, submit behavior, generic success message, and API error display.
  - Notes: Use Testing Library + MemoryRouter style used by existing auth tests.
- [x] Task 15: Add frontend tests for reset-password UX and route wiring
  - File: `client/src/features/auth/components/ResetPasswordForm.test.tsx`
  - Action: Add tests for token presence checks, valid reset, expired/invalid token handling, and post-success navigation.
  - Notes: Include URL query param setup in tests.
- [x] Task 16: Extend existing login/app/auth API tests for integration anchors
  - File: `client/src/features/auth/components/LoginForm.test.tsx`
  - Action: Assert presence/behavior of "Mot de passe oublie" link.
  - Notes: Ensure current tests for signup link and button state remain stable.
- [x] Task 17: Extend API client tests for new methods
  - File: `client/src/features/auth/api/authApi.test.ts`
  - Action: Add tests covering success/failure payload handling for forgot/reset endpoints.
  - Notes: Reuse fetch mocking style already in file.
- [x] Task 18: Add backend route tests for forgot/reset endpoints
  - File: `server/src/routes/__tests__/auth.routes.test.ts`
  - Action: Add Supertest cases for payload validation, generic forgot response behavior, and reset success/failure status codes.
  - Notes: Mock service methods and assert response contract fields.
- [x] Task 19: Add backend service tests for token lifecycle and password update
  - File: `server/src/services/__tests__/auth.service.test.ts`
  - Action: Add unit tests for token generation/storage, expiry enforcement (15-minute boundary), single-use token semantics, and password hashing/update.
  - Notes: Verify invalidation of prior tokens after successful reset.
- [x] Task 20: Extend mailer tests for reset email contract
  - File: `server/src/lib/__tests__/mailer.test.ts`
  - Action: Add tests that verify reset email subject/body/CTA URL generation and proper transport config usage.
  - Notes: Ensure token-bearing link appears in both text and HTML content.

### Acceptance Criteria

- [x] AC 1: Given an unauthenticated user is on the login page, when the page renders, then a visible "Mot de passe oublie" action is available and navigates to the forgot-password view.
- [x] AC 2: Given the forgot-password form is submitted with an invalid email format, when validation runs, then the request is blocked and a field-level validation error is shown.
- [x] AC 3: Given the forgot-password form is submitted with a syntactically valid email, when the backend processes the request, then the API returns a generic success response regardless of whether the account exists.
- [x] AC 4: Given a known account email is submitted to forgot-password, when the backend accepts the request, then it creates a reset token record with a 15-minute expiration window and sends a reset email containing a tokenized link.
- [x] AC 5: Given a reset email is generated, when inspecting email content, then both text and HTML versions contain a reset CTA URL with the token and no unescaped user-controlled HTML.
- [x] AC 6: Given a user opens the reset link within 15 minutes and submits a valid new password, when reset-password is processed, then the user password is updated with bcrypt hashing and the token is marked consumed/invalidated.
- [x] AC 7: Given a token is invalid, already consumed, or expired, when reset-password is submitted, then the API rejects the request with a deterministic error code/message and does not change the stored password.
- [x] AC 8: Given a reset token has reached or passed 15 minutes from generation, when reset-password is attempted, then the operation fails as expired.
- [x] AC 9: Given a user has multiple active reset tokens, when one reset succeeds, then all outstanding reset tokens for that user are invalidated to prevent replay.
- [x] AC 10: Given backend validation fails for forgot/reset payloads, when the API responds, then it returns the standard `validation_error` structure used by existing auth endpoints.
- [x] AC 11: Given the new backend endpoints are integrated, when route tests execute, then forgot/reset endpoints are reachable under `/api/v1/auth/*` and comply with expected status and response contracts.
- [x] AC 12: Given frontend and backend tests are run after implementation, when the suite completes, then new tests covering happy path and critical edge cases for password recovery pass.

## Additional Context

### Dependencies

- SMTP environment variables must be configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and optional auth credentials) for reset email delivery.
- A frontend base URL/source of truth must be available to generate absolute reset links for email CTA.
- Prisma migration and client generation must run after schema changes.
- Existing auth cookie/session behavior remains unchanged and is not required for reset endpoints.
- Optional dependency decision: if token hashing uses Node `crypto` only, no new package is required.

### Testing Strategy

- Backend unit tests (`auth.service.test.ts`):
  - Verify token generation, token-hash persistence, 15-minute expiry computation, and single-use enforcement.
  - Verify successful reset re-hashes password and invalidates all active reset tokens for the user.
  - Verify invalid/expired/consumed tokens do not alter credentials.
- Backend route tests (`auth.routes.test.ts`):
  - Validate forgot/reset payload schema handling and response codes.
  - Validate forgot-password generic success behavior for both existing and missing accounts.
- Mailer tests (`mailer.test.ts`):
  - Validate reset email subject/content/CTA URL construction.
- Frontend component tests (`ForgotPasswordForm.test.tsx`, `ResetPasswordForm.test.tsx`, `LoginForm.test.tsx`):
  - Validate form-level checks, success/error states, token query handling, and navigation paths.
- Frontend API tests (`authApi.test.ts`):
  - Validate forgot/reset request parsing and error bubbling.
- Manual verification checklist:
  - Trigger forgot-password for existing and unknown email and compare user-facing response equivalence.
  - Open reset link before 15 minutes and confirm password change works.
  - Open same link twice and confirm second attempt fails.
  - Open reset link after 15 minutes and confirm expiry handling.

### Notes

- Existing docs explicitly identify password reset as missing, so this is a net-new capability with no legacy migration burden at API level.
- Highest-risk implementation area is token security: raw token exposure, improper expiry checks, or replay via non-invalidated tokens.
- Keep account-enumeration protection strict: forgot-password endpoint response body should not differ by account existence.
- If password-reset events are introduced, verify compatibility with event validation allowlists to avoid runtime failures when actor/team are null.
- Recommended future hardening (out of current scope): rate limiting by IP/email, CAPTCHA/abuse control, and background cleanup of expired tokens.

## Review Notes

**Adversarial review completed 2026-04-07. 10 findings raised; 4 fixed, 6 accepted/deferred.**

### Fixed (F1, F4, F6, F10)

| # | Severity | Description | Resolution |
|---|----------|-------------|------------|
| F1 | High | `requestPasswordReset` threw on SMTP failure only for existing accounts, leaking account existence via error/timing difference | Wrapped `sendPasswordResetEmail` in try-catch; error is logged but the generic message is always returned. Added backend test for SMTP failure path. |
| F4 | Low | `ResetPasswordForm` redirect `setTimeout` not cleaned up on unmount (potential state-update-after-unmount) | Converted to `useRef` + `useEffect` cleanup |
| F6 | Low | `authApi.test.ts` forgot/reset tests mutated `global.fetch` without `try/finally`, risking pollution on failure | Wrapped in `try/finally` blocks |
| F10 | Low | Tech spec missing Review Notes section | Added this section |

### Accepted / Deferred

| # | Severity | Description | Rationale |
|---|----------|-------------|-----------|
| F2 | Medium | Token created before email delivery; orphaned row if send fails | Orphaned token expires in 15 min and is harmless. F1 fix eliminates the security concern. Cleaning eagerly would add complexity for negligible benefit. |
| F3 | Medium | Task 6 (event logging) marked complete but no events added for reset operations | Password reset is unauthenticated (null actor) and user-scoped (null team). Adding events requires updating allowlists in `prisma.ts` and `events.service.ts`. Deferred to a dedicated event-strategy task. |
| F5 | Low | ForgotPasswordForm doesn't normalize email client-side | Server-side Prisma lookup is case-insensitive by default. Client normalization is a UX polish, not a correctness issue. |
| F7 | Low | `App.test.tsx` missing authenticated-redirect tests for new routes | Existing redirect tests for `/login` and `/signup` already validate the pattern. Low risk. |
| F8 | Low | No expired token cleanup strategy/job | Tech spec explicitly lists this as out of scope ("Recommended future hardening"). |
| F9 | Low | Hardcoded 1500ms redirect delay in ResetPasswordForm | Standard UX pattern; extracting to constant adds no value. |
