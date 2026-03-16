---
title: 'Global Platform Usage Statistics Endpoint (Admin API Key)'
slug: 'global-platform-usage-statistics-endpoint-admin-api-key'
created: '2026-03-15'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Backend: Node.js 18+, Express 4, TypeScript, Prisma ORM, PostgreSQL 14+'
  - 'API Security: Header-based API key middleware (X-API-KEY)'
  - 'Testing: Jest + Supertest (route tests), unit tests for runtime env validation'
files_to_modify:
  - 'server/src/app.ts'
  - 'server/src/routes/events.routes.ts'
  - 'server/src/routes/issues.routes.ts'
  - 'server/src/routes/events.export.routes.test.ts'
  - 'server/src/middleware/requireExportApiKey.ts'
  - 'server/src/controllers/issues.controller.ts'
  - 'server/src/services/issue.service.ts'
  - 'server/src/config/runtime-env.ts'
  - 'server/src/config/runtime-env.test.ts'
  - 'server/src/index.ts'
  - 'server/.env.example'
  - 'docker-compose.yml'
  - 'deploy/compose/stu.env'
  - 'deploy/compose/hms.env'
  - 'deploy/compose/elia.env'
  - 'docs/07-infrastructure.md'
code_patterns:
  - 'Express router composition with route-level middleware and controller delegation'
  - 'Service-layer aggregation pattern for stats (repository/prisma query + normalized response keys)'
  - 'Header API key validation implemented as reusable middleware (`requireExportApiKey`)'
  - 'Production env validation centralized in `runtime-env.ts` and invoked from server bootstrap (`index.ts`)'
test_patterns:
  - 'Route tests use Jest + Supertest and set X-API-KEY explicitly in request headers'
  - 'Runtime env validation uses focused unit tests asserting mandatory production variables and failure messages'
---

# Tech-Spec: Global Platform Usage Statistics Endpoint (Admin API Key)

**Created:** 2026-03-15

## Overview

### Problem Statement

The platform currently exposes issue statistics at team scope (`/api/v1/teams/:teamId/issues/stats`), but there is no dedicated endpoint for administrator-level usage analytics across the whole platform. This limits visibility into global adoption and operational trends (e.g., total users/teams, team-level breakdowns, issues by status, practices per team, and recent activity).

### Solution

Add a new dedicated admin-only GET endpoint that returns a JSON analytics payload with a minimal MVP metric set covering both platform-wide aggregates and team-level granular statistics. Access to this endpoint will be restricted with the `X-API-KEY` header validated against `ADMIN_API_KEY` from environment configuration.

### Scope

**In Scope:**
- New dedicated backend route for platform usage stats (not reusing existing team issue stats route).
- Admin-only access via `X-API-KEY` request header using `ADMIN_API_KEY`.
- Minimal MVP payload including:
  - Global totals (registered users, teams, total issues, total team-practice links).
  - Issue status distribution at global level.
  - Per-team granular stats (team id/name, members count, practices count, issues count, issues by status, last activity timestamp).
- JSON response designed for direct page/API consumption.

**Out of Scope:**
- Frontend dashboard redesign or advanced visualization implementation.
- CSV export or file export formats.
- Non-MVP advanced dimensions (invite lifecycle analytics, Big Five trait segmentation, deep event taxonomy analytics).
- Changes to existing team-scoped issue stats contract unless required for shared internal helpers.

## Context for Development

### Codebase Patterns

- Existing route pattern uses controller + service separation (`server/src/routes`, `server/src/controllers`, `server/src/services`).
- Existing team issue stats endpoint exists at `GET /api/v1/teams/:teamId/issues/stats` via `issues.controller.getStats` and `issue.service.getIssueStats`.
- Existing operator export endpoint exists at `GET /api/v1/events/export` and is protected by `requireExportApiKey` middleware, which currently validates `X-API-KEY` against `EVENT_EXPORT_API_KEY`.
- Production env validation requires security-critical env vars in `runtime-env.ts` and is invoked from `server/src/index.ts`.
- Prisma models already provide required entities for MVP metrics: `User`, `Team`, `TeamMember`, `TeamPractice`, `Issue`, `Event`, `IssueStatus`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/src/app.ts` | Root router mounting point; likely location to mount dedicated stats route. |
| `server/src/routes/issues.routes.ts` | Existing team issue stats route pattern to mirror for controller/service style. |
| `server/src/controllers/issues.controller.ts` | Existing stats controller style and error handling (`AppError`). |
| `server/src/services/issue.service.ts` | Existing status aggregation logic and status-key mapping for API responses. |
| `server/src/routes/events.routes.ts` | Existing dedicated API-key protected route pattern to mirror for admin-only stats endpoint. |
| `server/src/middleware/requireExportApiKey.ts` | Existing `X-API-KEY` middleware to extend or generalize for admin API key checks. |
| `server/src/config/runtime-env.ts` | Production env validation currently enforcing `EVENT_EXPORT_API_KEY`; must align with rename. |
| `server/src/index.ts` | Runtime env validation callsite currently passing `EVENT_EXPORT_API_KEY`; must align with rename. |
| `server/.env.example` | Example env contract for local/prod setup; must expose `ADMIN_API_KEY`. |
| `docker-compose.yml` | Compose backend env contract currently requires `EVENT_EXPORT_API_KEY`; must align with rename. |
| `server/prisma/schema.prisma` | Data model for global and per-team usage metrics. |
| `deploy/compose/stu.env` | Instance env file currently defines `EVENT_EXPORT_API_KEY` (duplicated key present), must migrate to `ADMIN_API_KEY`. |
| `deploy/compose/hms.env` | Instance env contract for key rename consistency. |
| `deploy/compose/elia.env` | Instance env contract for key rename consistency. |
| `docs/07-infrastructure.md` | Infrastructure runbook contains multiple references to `EVENT_EXPORT_API_KEY` and `X-API-KEY` examples; must update naming to keep docs coherent. |

### Technical Decisions

- Use a dedicated route namespace for platform stats, separate from team issue routes and separate from event export route.
- Keep `X-API-KEY` as the header contract, but rename backing env variable to `ADMIN_API_KEY` for clarity.
- Reuse or generalize current API-key middleware so both existing export endpoint and new stats endpoint can share the same admin credential source.
- Apply variable rename consistently across runtime validation, compose contracts, env examples, and infrastructure docs to avoid startup regressions.
- Keep response intentionally minimal for MVP while preserving extensible structure for future advanced metrics.

## Implementation Plan

### Tasks

- [x] Task 1: Introduce a dedicated admin stats route and mount it in the application
  - File: `server/src/routes/admin-stats.routes.ts`
  - Action: Create a new Express router exposing `GET /api/v1/admin/stats` and protect it with existing API-key middleware (`requireExportApiKey` or renamed equivalent).
  - Notes: Keep route-level responsibility minimal; delegate logic to a controller.

- [x] Task 2: Wire the new admin stats router into app bootstrap
  - File: `server/src/app.ts`
  - Action: Import and mount the new router at `/api/v1/admin`.
  - Notes: Preserve existing route ordering and middleware behavior.

- [x] Task 3: Add controller handler for global platform stats endpoint
  - File: `server/src/controllers/admin-stats.controller.ts`
  - Action: Implement `getPlatformStats` controller with standardized error handling, call service layer, return JSON payload.
  - Notes: Follow existing controller conventions (`try/catch`, `next(error)`, validation through explicit checks where relevant).

- [x] Task 4: Implement service-layer aggregation for MVP global and per-team metrics
  - File: `server/src/services/admin-stats.service.ts`
  - Action: Build a service function that returns:
    - `generatedAt` timestamp
    - `totals`: users, teams, issues, teamPractices
    - `issuesByStatus`: normalized key map (`open`, `in_progress`, `adaptation_in_progress`, `evaluated`, `done`)
    - `teams`: array with `teamId`, `teamName`, `membersCount`, `practicesCount`, `issuesCount`, `issuesByStatus`, `lastActivityAt`
  - Notes: Use Prisma aggregation/groupBy patterns; compute `lastActivityAt` from issue/comment/event activity available per team (choose deterministic fallback behavior for teams with no activity).

- [x] Task 5: Reuse and harden status-normalization logic for issue statuses
  - File: `server/src/services/issue.service.ts`
  - Action: Extract or share status key mapping logic to avoid duplication between team issue stats and global stats service.
  - Notes: Preserve existing `getIssueStats` response contract.

- [x] Task 6: Rename environment variable contract from EVENT_EXPORT_API_KEY to ADMIN_API_KEY in runtime validation
  - File: `server/src/config/runtime-env.ts`
  - Action: Replace mandatory key and type field from `EVENT_EXPORT_API_KEY` to `ADMIN_API_KEY`.
  - Notes: Keep production validation semantics unchanged apart from name.

- [x] Task 7: Update server bootstrap env validation callsite
  - File: `server/src/index.ts`
  - Action: Pass `process.env.ADMIN_API_KEY` into `validateRuntimeEnv` input object.
  - Notes: Ensure no stale reference to old key remains in bootstrap.

- [x] Task 8: Update API-key middleware to read renamed env var
  - File: `server/src/middleware/requireExportApiKey.ts`
  - Action: Read `process.env.ADMIN_API_KEY` and update server-misconfigured details field accordingly.
  - Notes: Keep `X-API-KEY` header contract and 401/500 response shape stable.

- [x] Task 9: Update event export route tests for renamed env variable
  - File: `server/src/routes/events.export.routes.test.ts`
  - Action: Replace test setup references from `EVENT_EXPORT_API_KEY` to `ADMIN_API_KEY`.
  - Notes: Existing security behavior tests should continue passing with same header usage.

- [x] Task 10: Add tests for new admin stats route and service happy/error paths
  - File: `server/src/routes/admin-stats.routes.test.ts`
  - Action: Add route-level tests for success, missing API key, invalid API key, and server misconfiguration.
  - Notes: Use Jest + Supertest conventions from events export route tests.

- [x] Task 11: Add/extend runtime env validation tests for renamed mandatory key
  - File: `server/src/config/runtime-env.test.ts`
  - Action: Update expected missing-variable errors and fixtures to use `ADMIN_API_KEY`.
  - Notes: Ensure test names/messages clearly represent contract change.

- [x] Task 12: Update environment contract files and remove duplicate/conflicting definitions
  - File: `server/.env.example`
  - Action: Rename `EVENT_EXPORT_API_KEY` to `ADMIN_API_KEY` in backend env example.
  - Notes: Keep comments aligned with admin-only route usage.

- [x] Task 13: Update compose runtime contract
  - File: `docker-compose.yml`
  - Action: Rename backend env interpolation to `ADMIN_API_KEY` with matching required-var message.
  - Notes: Ensure startup fails fast when key is missing.

- [x] Task 14: Update per-instance compose env files to new key and resolve duplicate definition
  - File: `deploy/compose/stu.env`
  - Action: Replace both `EVENT_EXPORT_API_KEY` lines with a single `ADMIN_API_KEY` entry and remove duplicate key declaration.
  - Notes: Keep one authoritative value only.
  - File: `deploy/compose/hms.env`
  - Action: Rename key to `ADMIN_API_KEY`.
  - Notes: Preserve value unless explicitly changed.
  - File: `deploy/compose/elia.env`
  - Action: Rename key to `ADMIN_API_KEY`.
  - Notes: Preserve value unless explicitly changed.

- [x] Task 15: Update infrastructure documentation to reflect renamed key and new admin stats endpoint
  - File: `docs/07-infrastructure.md`
  - Action: Replace `EVENT_EXPORT_API_KEY` references with `ADMIN_API_KEY` where describing runtime key contract; add mention of new `GET /api/v1/admin/stats` endpoint secured by `X-API-KEY`.
  - Notes: Keep existing events export route docs intact while updating credential name consistently.

### Acceptance Criteria

- [ ] AC 1: Given the backend is running with valid `ADMIN_API_KEY`, when an admin client calls `GET /api/v1/admin/stats` with `X-API-KEY` set to that value, then the API returns `200` with JSON containing global totals, global issue status distribution, and per-team granular stats.
- [ ] AC 2: Given a request to `GET /api/v1/admin/stats` has no `X-API-KEY` header, when the route is accessed, then the API returns `401` with the standard invalid API key error payload.
- [ ] AC 3: Given a request to `GET /api/v1/admin/stats` has an incorrect `X-API-KEY`, when the route is accessed, then the API returns `401` and does not return any stats payload.
- [ ] AC 4: Given `ADMIN_API_KEY` is missing at runtime, when the protected admin stats route is called, then the API returns `500` with a server misconfiguration error and identifies the missing env field as `ADMIN_API_KEY`.
- [ ] AC 5: Given production startup (`NODE_ENV=production`) with `ADMIN_API_KEY` unset, when server boot validation runs, then startup fails with an explicit missing mandatory env variables error including `ADMIN_API_KEY`.
- [ ] AC 6: Given existing events export endpoint usage, when clients call `GET /api/v1/events/export` with valid `X-API-KEY`, then behavior remains unchanged after env variable rename (still authorized with key sourced from `ADMIN_API_KEY`).
- [ ] AC 7: Given a team has no issues/practices/members or no recent activity records, when included in admin stats, then the team object still appears with `0` counts and `lastActivityAt` set to `null`.
- [ ] AC 8: Given issue statuses include all known enum values, when global and per-team status aggregation is computed, then the response uses normalized API keys (`open`, `in_progress`, `adaptation_in_progress`, `evaluated`, `done`) with deterministic zero defaults.

## Additional Context

### Dependencies

- Existing event export security mechanism and docs are a hard dependency because they already enforce API-key based operator/admin access.
- Compose env contracts and runtime validation are mandatory dependencies for successful production startup after env-key rename.
- Prisma aggregation and grouping capabilities are required for efficient cross-team metric computation.
- Existing issue status mapping contract is a dependency to keep team dashboard compatibility and avoid diverging semantics.

### Testing Strategy

- Add/adjust Jest + Supertest route tests for new stats endpoint (`X-API-KEY` success, missing header, invalid key).
- Update existing export route tests to use renamed env variable source (`ADMIN_API_KEY`) while preserving header behavior.
- Update runtime env validation tests to assert `ADMIN_API_KEY` is mandatory in production.
- Add service-level tests for admin stats aggregation with representative datasets (multiple teams, empty team, mixed statuses).
- Manual verification:
  - Start backend with `ADMIN_API_KEY` configured and call both `/api/v1/admin/stats` and `/api/v1/events/export` using valid/invalid headers.
  - Start backend in production mode without `ADMIN_API_KEY` and verify startup fails with expected message.
  - Validate compose instances (`stu`, `hms`, `elia`) still boot with renamed key.

### Notes

User confirmed quick-spec choices:
- Scope: Global platform stats with team-level granularity.
- Route: New dedicated route.
- Security: Admin-only via `X-API-KEY` and `ADMIN_API_KEY`.
- Scope depth: Minimal MVP.

Additional clarification:
- Rename env variable from `EVENT_EXPORT_API_KEY` to `ADMIN_API_KEY` for clarity.

Risk and limitation notes:
- The env rename has broad blast radius (runtime validation, compose files, docs, tests); partial migration can break production startup and protected endpoints.
- `deploy/compose/stu.env` currently contains duplicate API-key declarations; this must be resolved during implementation to avoid ambiguity.
- MVP intentionally excludes advanced research analytics dimensions; response shape should be designed to allow additive extension without breaking existing clients.
