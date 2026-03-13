---
title: 'Backend Honeybadger Monitoring Integration (Phase 1)'
slug: 'backend-honeybadger-monitoring-integration-phase-1'
created: '2026-03-13'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Node.js 18+', 'TypeScript 5.x', 'Express 4.x', 'Jest 30 + ts-jest', 'Prisma 7.x', 'Zod 4.x', '@honeybadger-io/js']
files_to_modify: ['server/package.json', 'server/src/index.ts', 'server/src/app.ts', 'server/src/config/runtime-env.ts', 'server/src/middleware/errorHandler.ts']
code_patterns: ['Production-only runtime env validation via validateRuntimeEnv', 'Global requestId propagation via x-request-id header', 'Centralized AppError model with code/details/statusCode', 'Express middleware chain with custom terminal errorHandler', 'Route/controller validation with Zod + structured JSON error responses']
test_patterns: ['Jest + ts-jest with src roots and *.test.ts matching', 'Route tests under server/src/routes and server/src/routes/__tests__ using supertest', 'Service tests under server/src/services/__tests__ with jest.mock and env priming before imports', 'No dedicated app bootstrap or middleware unit tests currently present']
---

# Tech-Spec: Backend Honeybadger Monitoring Integration (Phase 1)

**Created:** 2026-03-13

## Overview

### Problem Statement

The backend currently has no external error monitoring pipeline, which limits production visibility into unhandled exceptions and request-scoped failures. Teams must rely on local logs and manual triage, reducing mean time to detect and diagnose incidents.

### Solution

Integrate Honeybadger in the Node.js/Express backend using the official `@honeybadger-io/js` SDK, wiring request and error middleware into the existing app pipeline and configuring production-only reporting with explicit PII redaction rules derived from current backend data usage.

### Scope

**In Scope:**
- Backend-only Honeybadger integration (frontend deferred).
- Error tracking plus request context and user context enrichment.
- Production-only reporting behavior.
- PII redaction policy extracted from backend codebase fields and environment variables.
- No safe fallback mode: missing/invalid Honeybadger configuration should be treated as a configuration error for this implementation.

**Out of Scope:**
- Frontend/browser Honeybadger integration.
- Uptime/check-ins/log ingestion setup.
- Dashboard/alert policy tuning in Honeybadger UI.
- Non-production reporting rollout.

## Context for Development

### Codebase Patterns

- Express app initialization and middleware wiring live in `server/src/app.ts`; routes are registered before a terminal global error middleware.
- Process startup and runtime env validation live in `server/src/index.ts` + `server/src/config/runtime-env.ts`, with production-only mandatory key enforcement.
- Request correlation is already standardized via `x-request-id` generation and response header propagation in `server/src/app.ts`.
- Authentication context is attached on requests in `server/src/middleware/requireAuth.ts` (`req.user.userId`, `req.user.email`), and team context is attached in `server/src/middleware/validateTeamMembership.ts` (`res.locals.teamId`).
- Error semantics are centralized through `AppError` in `server/src/services/auth.service.ts`, with consistent `code/message/details/requestId` response shape used by controllers and middleware.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/package.json` | Add Honeybadger dependency (`@honeybadger-io/js`) and keep dependency policy consistent. |
| `server/src/index.ts` | Initialize Honeybadger at startup and keep env validation ordering coherent. |
| `server/src/config/runtime-env.ts` | Extend production env contract with Honeybadger key(s). |
| `server/src/app.ts` | Insert Honeybadger `requestHandler` before app middleware/routes and `errorHandler` before custom global error middleware. |
| `server/src/middleware/errorHandler.ts` | Preserve API error payload contract and define interaction with Honeybadger error capture to avoid duplicate reports. |
| `server/src/middleware/requireAuth.ts` | Source of authenticated user context keys to enrich Honeybadger notices. |
| `server/src/middleware/validateTeamMembership.ts` | Source of team context (`res.locals.teamId`) for request-level enrichment. |
| `server/src/services/auth.service.ts` | Canonical `AppError` model and sensitive fields surfaced in auth flows. |
| `server/src/routes/__tests__/auth.routes.test.ts` | Primary route-level test pattern reference for auth/error behaviors. |
| `server/src/services/__tests__/auth.service.test.ts` | Service test pattern reference for env priming and jest mocks. |

### Technical Decisions

- Use official package `@honeybadger-io/js` (Node integration guide).
- Middleware order will follow Honeybadger docs:
  - `Honeybadger.requestHandler` before other app middleware/routes.
  - `Honeybadger.errorHandler` after routes and before custom `errorHandler` middleware.
- Environment rollout: production only.
- Requested behavior: no safe fallback mode if Honeybadger is not configured.
- Keep existing structured API error response shape unchanged (`code`, `message`, `details`, `requestId`) while adding monitoring side effects.
- Use existing request context anchors (`x-request-id`, `req.user`, `res.locals.teamId`) to populate monitoring context consistently.
- Reuse current production env validation approach instead of introducing a parallel configuration path.
- Redact PII/sensitive fields from notices based on existing backend domain data:
  - User identifiers and profile fields: `email`, `name`, `userId`, `invitedBy`, `invitedUserId`
  - Credentials/secrets: `password`, `JWT_SECRET`, `DATABASE_URL`, SMTP credentials
  - Auth/session artifacts: `Authorization` header, cookies, bearer tokens
  - Invite/contact payloads and query values containing emails
- Test approach will extend current Jest patterns (route and service tests) and may add new middleware-focused tests because none currently exist for global middleware behavior.

## Implementation Plan

### Tasks

- [ ] Task 1: Add Honeybadger dependency and configuration contract
  - File: `server/package.json`
  - Action: Add `@honeybadger-io/js` to backend dependencies.
  - Notes: Keep package style aligned with existing dependency declarations; do not add fallback flags.

- [ ] Task 2: Extend runtime environment validation for production
  - File: `server/src/config/runtime-env.ts`
  - Action: Add Honeybadger runtime keys (at minimum API key) to the production mandatory key set and typing contract.
  - Notes: Preserve current behavior where validation is strict in production and bypassed outside production.

- [ ] Task 3: Initialize Honeybadger during backend startup
  - File: `server/src/index.ts`
  - Action: Configure Honeybadger using env-driven settings (api key, environment, revision/version where available) before server listen.
  - Notes: Keep startup ordering coherent with existing validation and avoid changing app boot semantics.

- [ ] Task 4: Wire Honeybadger Express middleware with correct ordering
  - File: `server/src/app.ts`
  - Action: Register `Honeybadger.requestHandler` early in the middleware pipeline and `Honeybadger.errorHandler` after routes but before custom `errorHandler`.
  - Notes: Do not break current request ID middleware and route registrations.

- [ ] Task 5: Integrate context enrichment and PII redaction
  - File: `server/src/middleware/errorHandler.ts`
  - Action: Enrich notices with request/user/team context using existing anchors (`x-request-id`, `req.user`, `res.locals.teamId`) and apply redaction policy for sensitive payloads/headers/fields.
  - Notes: Maintain existing API response contract; avoid exposing new details to clients.

- [ ] Task 6: Prevent duplicate error reporting while preserving API behavior
  - File: `server/src/middleware/errorHandler.ts`
  - Action: Define one consistent reporting path between Honeybadger Express error middleware and custom handler logic so each exception is reported once.
  - Notes: `AppError` conditions should remain expected API errors and not generate noisy duplicate reports.

- [ ] Task 7: Add and update automated tests for integration points
  - File: `server/src/middleware/errorHandler.test.ts`
  - Action: Add middleware-focused tests for redaction, context attachment, and response shape stability.
  - Notes: Use existing Jest style; mock Honeybadger notifier/middleware interactions.

- [ ] Task 8: Verify middleware stack behavior through route-level integration tests
  - File: `server/src/routes/__tests__/auth.routes.test.ts`
  - Action: Add/adjust tests to ensure auth route behavior and error payload format remain unchanged after Honeybadger middleware insertion.
  - Notes: Ensure requestId presence and status/error code contracts are unchanged.

- [ ] Task 9: Add production configuration documentation for operators
  - File: `server/.env.example`
  - Action: Document required Honeybadger env variables and secure usage notes.
  - Notes: Keep production-only stance explicit and align wording with existing env comments.

### Acceptance Criteria

- [ ] AC 1: Given the backend runs in production with valid Honeybadger configuration, when an unhandled exception occurs in an API route, then exactly one error notice is sent to Honeybadger and the client still receives the existing structured JSON error response.
- [ ] AC 2: Given the backend runs in production without required Honeybadger configuration, when the server starts, then startup fails with a clear runtime configuration error.
- [ ] AC 3: Given an authenticated request reaches a failing route, when the error is reported, then monitoring context includes request ID and available user/team identifiers.
- [ ] AC 4: Given a failing request includes sensitive data (authorization headers, cookies, password-like fields, secrets, or email-containing invite payloads), when the notice is sent, then those fields are redacted according to the defined policy.
- [ ] AC 5: Given an `AppError` (for example validation/auth domain errors) is thrown, when it is handled, then API status code and payload contract (`code`, `message`, `details`, `requestId`) remain unchanged.
- [ ] AC 6: Given route and middleware tests are executed, when Honeybadger integration is present, then tests validate middleware ordering, non-regression of route behavior, and redaction/context behavior.
- [ ] AC 7: Given backend execution in non-production environments, when Honeybadger env keys are absent, then production-only validation semantics are unchanged (no production-style mandatory env enforcement).

## Additional Context

### Dependencies

- `@honeybadger-io/js` npm package.
- Honeybadger project API key provisioned in deployment secret store.
- Optional revision/version source from existing release metadata (for deploy correlation).

### Testing Strategy

- Follow existing backend Jest setup (`ts-jest`, `roots: src`, `**/*.test.ts`, `**/__tests__/**/*.ts`).
- Add middleware-focused tests for redaction and context enrichment in the global error flow.
- Extend route-level behavior tests where middleware stack impacts responses.
- Add focused tests for middleware order and non-breaking error response shape.
- Preserve current env-priming test pattern where env-dependent modules are imported only after required test env vars are set.
- Add one manual verification path in production-like environment: trigger a controlled error and confirm single notice creation with redacted fields.

### Notes

- Documentation source validated: Honeybadger JavaScript Node integration guide (`docs.honeybadger.io/lib/javascript/integration/node/`).
- Highest-risk implementation area is duplicate reporting caused by overlap between Honeybadger Express error middleware and custom global error handling.
- Preserve backward compatibility of all current API error envelopes to avoid frontend regressions.
- Frontend Honeybadger integration remains explicitly out of scope for this phase and should be specified in a separate quick spec.
