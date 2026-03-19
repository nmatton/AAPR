---
title: 'Global Monitoring Admin Account (Excluded from Team Membership Effects)'
slug: 'global-monitoring-admin-account-excluded-from-team-membership-effects'
created: '2026-03-18T00:00:00Z'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Node.js', 'Express', 'Prisma ORM', 'PostgreSQL', 'Zod', 'Jest', 'Supertest']
files_to_modify: ['server/prisma/schema.prisma', 'server/src/middleware/requireAuth.ts', 'server/src/middleware/validateTeamMembership.ts', 'server/src/services/members.service.ts', 'server/src/repositories/members.repository.ts', 'server/src/services/affinity.service.ts', 'server/src/controllers/big-five.controller.ts', 'server/src/services/big-five.service.ts', 'server/src/services/auth.service.ts', 'server/src/routes/teams.routes.test.ts', 'server/src/services/members.service.test.ts', 'server/src/services/affinity.service.test.ts', 'server/src/services/big-five.service.test.ts', 'scripts/set-admin-monitoring-account.sh']
code_patterns: ['Route composition with requireAuth + validateTeamMembership middleware', 'Service-layer business rules with repository abstraction for members domain', 'Prisma transactions for multi-write atomic operations', 'Structured AppError-based error handling and explicit status codes', 'Team affinity aggregation excludes ineligible members via included/excluded counters']
test_patterns: ['Jest unit tests with jest.mock for Prisma/repositories/services', 'Supertest route tests validating status, response shape, and middleware-protected access', 'Deterministic beforeEach mock reset and fixture-driven assertions', 'Security and privacy assertions in affinity response tests']
---

# Tech-Spec: Global Monitoring Admin Account (Excluded from Team Membership Effects)

**Created:** 2026-03-18T00:00:00Z

## Overview

### Problem Statement

The platform needs one global monitoring admin account that can access and operate across all teams for support and monitoring activities. This account must never be treated as an effective team member in team-facing outputs or personality-driven computations.

### Solution

Add a dedicated user-level admin monitor flag and enforce this behavior centrally in backend authorization and domain services so the account can access all teams without explicit team membership rows, while being systematically excluded from member listings, affinity computations, and Big Five questionnaire participation.

### Scope

**In Scope:**
- Introduce a single global admin monitor user capability via a database flag.
- Allow secure cross-team access without per-team membership rows for this account.
- Exclude admin monitor users from team members listing API responses (and therefore the team members page).
- Exclude admin monitor users from all affinity computations.
- Block Big Five questionnaire submission for admin monitor users.
- Preserve existing behavior for all non-admin users.

**Out of Scope:**
- Multi-admin role management UI.
- Broad RBAC redesign.
- Changes to unrelated analytics beyond affinity and member visibility concerns.

## Context for Development

### Codebase Patterns

- Team-scoped APIs are centrally protected at router level via composed middleware (`requireAuth` then `validateTeamMembership`).
- Authentication currently carries `userId` and optional `email` in JWT payload, with request context hydrated in middleware.
- Membership and affinity logic are service-driven: repositories isolate Prisma access for members, while affinity reads directly with privacy-conscious aggregation output.
- Big Five submission/read endpoints are independent authenticated routes (`/api/v1/big-five/*`) with strict Zod payload validation and transactional persistence.
- Error handling follows `AppError` with typed code/message/details/status and is validated at route and service test levels.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/prisma/schema.prisma` | Add persistent admin monitor flag on `User` model and support migration planning. |
| `server/src/middleware/requireAuth.ts` | Request auth context hydration from JWT; potential location to expose authz context fields. |
| `server/src/middleware/validateTeamMembership.ts` | Core team boundary check; best insertion point for secure admin-monitor cross-team bypass. |
| `server/src/routes/teams.routes.ts` | Verifies all team-scoped endpoints are covered by the updated membership gate. |
| `server/src/services/members.service.ts` | Team member list/detail shaping; enforce exclusion of admin-monitor users from members payloads. |
| `server/src/repositories/members.repository.ts` | Prisma member queries; add filtering strategy for admin-monitor users. |
| `server/src/services/affinity.service.ts` | Team aggregation source of truth; enforce admin-monitor exclusion from all computations. |
| `server/src/controllers/big-five.controller.ts` | HTTP entry point for questionnaire submit/read; add explicit admin-monitor guard behavior. |
| `server/src/services/big-five.service.ts` | Transactional write path for questionnaire responses/scores; enforce forbidden path for admin-monitor users. |
| `server/src/services/auth.service.ts` | Login/session user shape and token generation; align auth payload/lookup strategy with admin-monitor flag. |
| `server/src/services/members.service.test.ts` | Existing members service unit test style and mocking pattern to extend. |
| `server/src/services/affinity.service.test.ts` | Existing affinity exclusion assertions and aggregation expectations to extend for admin-monitor users. |
| `server/src/services/big-five.service.test.ts` | Existing questionnaire service tests and transaction/event expectations to extend with guard case. |
| `server/src/routes/teams.routes.test.ts` | Route-level middleware behavior testing using mocked auth and membership checks. |
| `scripts/set-admin-monitoring-account.sh` | Operator utility script to validate/clean account state and set admin-monitor flag safely. |

### Technical Decisions

- Prefer a user-level boolean flag (e.g., `isAdminMonitor`) over role strings for reduced ambiguity and lower error risk.
- Prefer middleware-based bypass for team membership validation when the user is flagged admin monitor, instead of synthetic membership rows in each team.
- Prefer database-backed authorization check for admin-monitor status in the membership middleware to avoid stale JWT authorization if flag changes.
- Keep exclusion logic explicit in members and affinity services so the admin-monitor account is never treated as an effective team member, independent of UI behavior.
- Enforce Big Five write-path blocking in backend (controller/service) to guarantee the admin-monitor account can never produce personality data.
- Preserve existing API contracts for standard users while only changing behavior for flagged admin-monitor accounts.
- Add a script-first operational path in `scripts/` to assign admin-monitor flag safely, with mandatory fresh-state validation and cleanup support.

## Implementation Plan

### Tasks

- [x] Task 1: Add persistent admin-monitor flag in user schema and migration
  - File: server/prisma/schema.prisma
  - Action: Add a boolean field on User (for example `isAdminMonitor Boolean @default(false) @map("is_admin_monitor")`) and keep naming aligned with current Prisma map conventions.
  - Notes: Create Prisma migration and update seed/test fixtures where explicit user insertions rely on full field lists.

- [x] Task 1.5: Add script to provision admin-monitor account with safety checks
  - File: scripts/set-admin-monitoring-account.sh
  - Action: Create a script that accepts an account identifier (email or user id), validates account existence, checks fresh-state constraints (no `team_members`, no Big Five responses/scores), and supports controlled cleanup before enabling admin-monitor flag.
  - Notes: Script should provide clear output, require explicit confirmation for cleanup mode, and be safe to re-run.

- [x] Task 2: Propagate admin-monitor identity into authenticated request context
  - File: server/src/services/auth.service.ts
  - Action: Ensure user lookup exposes admin-monitor flag and that token verification flow can provide/resolve this authorization context without weakening signature or expiry checks.
  - Notes: Prefer DB-backed lookup for authorization-critical checks to avoid stale role/flag decisions.

- [x] Task 3: Enable secure cross-team access for admin-monitor users
  - File: server/src/middleware/validateTeamMembership.ts
  - Action: Keep normal team membership validation for standard users; add explicit bypass for users flagged admin-monitor.
  - Notes: Preserve existing error behavior (`invalid_team_id`, `unauthorized`, `forbidden`) for non-admin-monitor traffic.

- [x] Task 4: Hide admin-monitor users from team member listings
  - File: server/src/repositories/members.repository.ts
  - Action: Update member listing/select queries to exclude users where admin-monitor flag is true.
  - Notes: This must affect API output so UI naturally hides the account without frontend-only filtering.

- [x] Task 5: Preserve member detail/removal safety rules with admin-monitor semantics
  - File: server/src/services/members.service.ts
  - Action: Enforce that admin-monitor accounts are not treated as regular removable team members and are not surfaced in member list payload mapping.
  - Notes: Keep existing self-removal and last-member protections unchanged for real members.

- [x] Task 6: Exclude admin-monitor users from all team affinity aggregation
  - File: server/src/services/affinity.service.ts
  - Action: Filter out admin-monitor users before eligibility checks; ensure aggregation counters remain coherent (included/excluded) and privacy payload shape remains unchanged.
  - Notes: Admin-monitor must never contribute to team score, tag ranking, or member eligibility counts as an effective team member.

- [x] Task 7: Block Big Five submission for admin-monitor users
  - File: server/src/controllers/big-five.controller.ts
  - Action: Add request-level guard that rejects questionnaire submission for admin-monitor users with structured AppError/HTTP response.
  - Notes: Read endpoint can remain available (expected null/not completed), but write path must be forbidden.

- [x] Task 8: Enforce Big Five service-level guard for defense in depth
  - File: server/src/services/big-five.service.ts
  - Action: Add a service check preventing persistence of responses/scores for admin-monitor users even if controller guard is bypassed.
  - Notes: Keep transaction/event behavior unchanged for non-admin-monitor users.

- [x] Task 9: Validate route integration for team-scoped endpoints
  - File: server/src/routes/teams.routes.ts
  - Action: Confirm no route-level regression after middleware update and preserve existing team route composition.
  - Notes: Expected to be mostly verification unless middleware signature requires small routing adjustments.

- [x] Task 10: Extend automated tests for new behavior and regressions
  - File: server/src/routes/teams.routes.test.ts
  - Action: Add tests proving admin-monitor can access team-scoped endpoints without team_members row and standard users still require membership.
  - Notes: Mock auth/membership dependencies consistently with existing test style.

- [x] Task 11: Extend members and affinity service tests
  - File: server/src/services/members.service.test.ts
  - Action: Add assertions that member lists exclude admin-monitor users and existing rules still hold.
  - Notes: Keep fixtures deterministic and aligned with current `jest.mock` usage.

- [x] Task 12: Extend affinity aggregation tests for admin-monitor exclusion
  - File: server/src/services/affinity.service.test.ts
  - Action: Add cases where mixed teams include admin-monitor users and verify score/counters ignore them as effective members.
  - Notes: Maintain privacy guarantees (no per-member leaks) in all expected payloads.

- [x] Task 13: Extend Big Five tests for forbidden admin-monitor submission
  - File: server/src/services/big-five.service.test.ts
  - Action: Add tests that admin-monitor submission is rejected and no responses/scores/events are persisted.
  - Notes: Include regression tests confirming standard user flow remains intact.

- [x] Task 14: Add operational documentation and usage validation for script flow
  - File: scripts/set-admin-monitoring-account.sh
  - Action: Add `--help` usage, parameter validation, and execution summary showing what was checked/cleaned/updated.
  - Notes: Align style with existing scripts in `scripts/` and include examples in comments.

### Acceptance Criteria

- [ ] AC 1: Given a user flagged as admin-monitor, when they call any team-scoped endpoint protected by team membership middleware, then access is granted without requiring a `team_members` row.
- [ ] AC 2: Given a standard user without membership in target team, when they call a team-scoped endpoint, then the API still returns `403 forbidden`.
- [ ] AC 3: Given a team containing standard members plus an admin-monitor account, when `GET /api/v1/teams/:teamId/members` is called, then admin-monitor users are absent from `members` payload.
- [ ] AC 4: Given team affinity is requested for a practice, when admin-monitor users are present in team data, then they contribute nothing to included member count, score aggregation, or explanation tags.
- [ ] AC 5: Given all non-admin users are ineligible for affinity (missing profiles or no mapped tags), when only admin-monitor users remain, then result stays `insufficient_profile_data` with no effective contributors.
- [ ] AC 6: Given an admin-monitor user submits `POST /api/v1/big-five/submit`, when request is processed, then API returns a forbidden error and no response/score rows are written.
- [ ] AC 7: Given a non-admin user submits a valid 44-item Big Five questionnaire, when request is processed, then existing success behavior (scores persisted + event logged) remains unchanged.
- [ ] AC 8: Given existing teams/members features, when regression tests run, then self-removal and last-member protections still behave exactly as before for standard users.
- [ ] AC 9: Given login/session flows for standard users, when authentication is verified, then token verification and current-user responses remain backward-compatible.
- [ ] AC 10: Given an operator runs the admin-monitoring script on a non-fresh account with cleanup confirmation, when execution completes, then team memberships and Big Five data are removed and admin-monitor flag is set.
- [ ] AC 11: Given an operator runs the admin-monitoring script on a fresh account, when execution completes, then no cleanup occurs and admin-monitor flag is set.
- [ ] AC 12: Given an operator runs the script on a non-fresh account without cleanup confirmation, when fresh-state checks fail, then the script exits without changing data and reports required remediation.

## Additional Context

### Dependencies

- Prisma migration tooling and deployment sequence for schema evolution (`User.isAdminMonitor` field).
- Existing Express middleware stack (`requireAuth`, `validateTeamMembership`) and Prisma client regeneration after schema change.
- Existing Jest/Supertest test harness and mocks in server package.
- No new external libraries are required for this feature.
- Script runtime dependency on DB execution path (either `psql` + `DATABASE_URL` or Prisma CLI execution strategy) with transactional ordering.

### Testing Strategy

- Unit tests:
  - Extend `members.service.test.ts` to validate exclusion of admin-monitor users from list payloads.
  - Extend `affinity.service.test.ts` to verify admin-monitor users are never effective contributors.
  - Extend `big-five.service.test.ts` for forbidden submit path and no-write guarantees.
- Integration/route tests:
  - Extend `teams.routes.test.ts` for admin-monitor cross-team access and non-admin forbidden behavior.
  - Add/extend Big Five controller/route tests to validate forbidden submit response for admin-monitor users.
- Script verification:
  - Validate fresh-state detection for memberships and Big Five artifacts.
  - Validate cleanup path when non-fresh account is detected.
  - Validate no-op path for already fresh account.
  - Validate abort behavior when cleanup is required but not confirmed.
- Manual verification:
  - Authenticate as admin-monitor and open multiple team contexts; confirm access works without membership entries.
  - Open members page and verify admin-monitor is not displayed.
  - Trigger affinity displays and verify outputs remain stable and exclude admin-monitor contribution.
  - Attempt Big Five submission as admin-monitor and confirm explicit rejection.

### Notes

- High-risk area: authorization regressions in `validateTeamMembership`; mitigate with targeted route tests and strict fallback behavior for non-admin users.
- High-risk area: accidental re-inclusion via future team queries; mitigate by centralizing exclusion filters in repository/service boundaries and documenting invariant.
- Data integrity consideration: if any admin-monitor Big Five data pre-exists, migration/ops policy should define cleanup or ignore strategy before rollout.
- Future consideration (out of scope now): if multiple monitoring accounts are needed later, evolve to controlled role management while keeping the same exclusion invariants.
- Operational control: use script path as the canonical enablement method to prevent manual database drift and enforce cleanup invariants.

## Review Notes

- Adversarial review completed.
- Findings: 2 total, 2 fixed, 0 skipped.
- Resolution approach: auto-fix.
