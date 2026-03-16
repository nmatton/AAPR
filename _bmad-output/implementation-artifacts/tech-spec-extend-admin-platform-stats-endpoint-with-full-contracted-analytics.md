---
title: 'Extend Admin Platform Stats Endpoint with Full Contracted Analytics'
slug: 'extend-admin-platform-stats-endpoint-with-full-contracted-analytics'
created: '2026-03-16T10:34:43+01:00'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Node.js', 'Express', 'TypeScript', 'Prisma', 'Zod', 'Jest', 'Supertest']
files_to_modify: [
  'server/src/routes/admin-stats.routes.ts',
  'server/src/controllers/admin-stats.controller.ts',
  'server/src/services/admin-stats.service.ts',
  'server/src/services/issue.service.ts',
  'server/src/services/coverage.service.ts',
  'server/src/repositories/coverage.repository.ts',
  'server/src/repositories/practice.repository.ts',
  'server/src/routes/events.routes.ts',
  'server/src/controllers/events.controller.ts',
  'server/src/middleware/requireExportApiKey.ts',
  'server/src/routes/admin-stats.routes.test.ts',
  'server/src/services/admin-stats.service.test.ts',
  'server/src/services/coverage.service.test.ts',
  'server/prisma/schema.prisma',
  'docs/raw_practices/agile_pillars.md',
  '_bmad-output/implementation-artifacts/admin-platform-stats-contract.md'
]
code_patterns: [
  'Route -> controller -> service layering with AppError and global errorHandler',
  'Service-layer aggregation via Prisma groupBy/findMany/count and Promise.all',
  'Controller query validation with Zod safeParse + structured validation_error details',
  'Canonical issue status normalization via issue.service helpers (open/in_progress/adaptation_in_progress/evaluated/done)',
  'Coverage service computes pillar/category coverage from coverage.repository and logs coverage.by_category.calculated event',
  'Practice lifecycle emits events: practice.created and practice.edited; issue lifecycle stores decision/evaluation timestamps',
  'Route-level API key protection via requireExportApiKey middleware',
  'Admin/event operator routes share X-API-KEY guard and environment-based ADMIN_API_KEY validation'
]
test_patterns: [
  'Jest route tests with mocked service',
  'Jest service tests with mocked Prisma client',
  'Controller validation tests follow validation_error contract with issue path/code/message details',
  'Coverage service tests assert deterministic percentages and event logging payload shape',
  'Validation of canonical status keys and unsupported status handling'
]
---

# Tech-Spec: Extend Admin Platform Stats Endpoint with Full Contracted Analytics

**Created:** 2026-03-16T10:34:43+01:00

## Overview

### Problem Statement

The current GET /api/v1/admin/stats endpoint returns a limited payload (basic totals, status counts, and per-team summary) that does not satisfy the richer research-oriented contract defined in admin-platform-stats-contract.md.

### Solution

Replace the current response with the full contract shape (meta, platform, teams, quality), add request-level time-window support, compute the defined aggregate metrics for this contract version, and enforce strict runtime JSON Schema validation plus contract tests.

### Scope

**In Scope:**
- Replace endpoint response shape with contract version 1.0.0.
- Add window query support and map it to meta.window.
- Implement full platform, team, and quality sections, including exhaustive method distribution and taxonomy coverage objects.
- Keep canonical status keys always present with zero defaults.
- Enforce strict runtime schema validation and expand automated tests for required/forbidden field behavior.
- Preserve current security model (X-API-KEY + ADMIN_API_KEY).

**Out of Scope:**
- Any non-aggregated or row-level export endpoints.
- Admin dashboard/UI work.
- Authentication model changes beyond existing API key guard.

## Context for Development

### Codebase Patterns

- Existing admin stats endpoint is wired through route -> controller -> service, with AppError bubbling to global error middleware.
- Query validation pattern uses Zod safeParse in controllers and returns structured validation errors (code/message/details).
- Aggregation logic is centralized in services and uses Prisma count/groupBy/findMany with Promise.all for parallel reads.
- Canonical issue status normalization already exists in issue.service and should remain the single source of truth for all status-count payloads.
- Coverage taxonomy computation already exists in coverage.service + coverage.repository and can be adapted to contract-required exhaustive category/subpillar shape.
- Teams/practices domain already emits eventType/action pairs for practice.created and practice.edited, enabling window-based activity counters.
- Route tests mock service boundaries, while service tests mock Prisma and assert exact response structures.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| server/src/routes/admin-stats.routes.ts | Admin stats route wiring and middleware chain |
| server/src/controllers/admin-stats.controller.ts | Controller entry point for GET /stats |
| server/src/services/admin-stats.service.ts | Existing aggregation logic to be extended |
| server/src/services/issue.service.ts | Canonical status normalization and issue lifecycle timestamp fields |
| server/src/services/coverage.service.ts | Existing pillar/category coverage computation and event logging |
| server/src/repositories/coverage.repository.ts | Data access for team practices with pillars and complete pillar taxonomy |
| server/src/repositories/practice.repository.ts | Method distribution and distinct method utilities |
| server/src/routes/events.routes.ts | Existing operator export route sharing X-API-KEY middleware |
| server/src/controllers/events.controller.ts | Example of Zod query validation and filter parsing for from/to semantics |
| server/src/middleware/requireExportApiKey.ts | Exact X-API-KEY / ADMIN_API_KEY contract behavior |
| server/prisma/schema.prisma | Source schema for issue/comment/event/practice/team relationships and timestamps |
| server/src/services/admin-stats.service.test.ts | Service-level aggregation test pattern |
| server/src/routes/admin-stats.routes.test.ts | API key + route response behavior tests |
| server/src/services/coverage.service.test.ts | Taxonomy coverage and precision expectations to mirror in contract shape tests |
| _bmad-output/implementation-artifacts/admin-platform-stats-contract.md | Source-of-truth contract and schema |
| docs/raw_practices/agile_pillars.md | Taxonomy source for exhaustive coverage map |

### Technical Decisions

- Use breaking-response payload replacement with no migration strategy required because the previous version was never deployed.
- Implement full team contract in this phase, not staged.
- Include window query support in this implementation.
- Enable runtime schema validation in addition to test validation.
- Maintain admin key auth contract using X-API-KEY header.
- Keep status-key generation centralized through normalizeIssueStatusCounts to avoid drift from issue API semantics.
- Reuse existing coverage taxonomy anchors but adapt percentage semantics to contract rates in [0,1] where required.
- Use controller-level query parsing for window label/from/to while keeping heavy aggregation in service, with inclusive boundaries on both from and to.
- Derive activity counters from existing eventType/action conventions (practice.created/practice.edited/issue.created etc.) within selected window.

## Implementation Plan

### Tasks

- [x] Task 1: Install `ajv` for runtime JSON Schema Draft 2020-12 validation
  - File: `server/package.json`
  - Action: Run `npm install ajv` in `server/`; add `ajv` to `dependencies`.
  - Notes: Ajv v8+ supports Draft 2020-12 natively. Use `import Ajv from 'ajv/dist/2020'`.

- [x] Task 2: Create TypeScript types for the full contract response
  - File: `server/src/types/admin-stats.types.ts` *(new file)*
  - Action: Define and export all interfaces matching the contract shape: `WindowLabel`, `WindowParams`, `AdminStatsResponse`, `MetaSection`, `PlatformSection`, `TeamStats`, `ExhaustiveCoverageMap`, `CoverageCategoryEntry`, `QualitySection`. Rate fields typed as `number` (0–1). `lastActivityAt` as `string | null`.
  - Notes: These types are the single source of truth for the TypeScript compiler. Import them in service, controller, and tests.

- [x] Task 3: Create window resolver utility
  - File: `server/src/utils/admin-stats-window.ts` *(new file)*
  - Action: Export `resolveWindow(label?: string, from?: string, to?: string): WindowParams`. Logic: if `label` is a known enum value (`last_7_days`, `last_30_days`, `last_90_days`, `all_time`), compute `from`/`to` from `new Date()` offset; if `from`+`to` provided without label, set label to `"custom"`; default (no params) falls back to `"all_time"` with `from = new Date(0).toISOString()` and `to = new Date().toISOString()`.
  - Notes: Returns `{ from: string, to: string, label: WindowLabel }`. All dates are ISO 8601 UTC strings. Window filtering must be inclusive (`>= from` and `<= to`).

- [x] Task 4: Add extended issue stats helpers to `issue.service.ts`
  - File: `server/src/services/issue.service.ts`
  - Action: Add and export three new functions:
    1. `computeIssueFlowRates(byStatus: NormalizedIssueStatusCounts)` → `{ open_to_in_progress_rate, in_progress_to_adaptation_in_progress_rate, adaptation_in_progress_to_evaluated_rate, evaluated_to_done_rate }` — each rate = count(next_status) / max(count(prior_status), 1), clamped to [0,1].
    2. `computeMeanDurationsHours(window: WindowParams, prisma: PrismaClient)` → `{ meanTimeToFirstComment, meanTimeToDecision, meanTimeToEvaluation }` — query issues in window; compute mean hours from issue `createdAt` to first comment `createdAt`, to `decisionRecordedAt`, to `evaluationRecordedAt`; return 0 when no qualifying rows.
    3. `computeBacklogHealth(prisma: PrismaClient)` → `{ openOlderThan14d, inProgressOlderThan30d }` — Prisma `count` with status filter + `createdAt < now - N days`; `inProgressOlderThan30d` counts `IN_DISCUSSION` only.
  - Notes: Keep `normalizeIssueStatusCounts` and `createEmptyIssueStatusCounts` untouched; only add. Rate computation is at-call time using the current `byStatus` snapshot.

- [x] Task 5: Add `buildExhaustiveCoverageMap` to `coverage.service.ts`
  - File: `server/src/services/coverage.service.ts`
  - Action: Add and export `buildExhaustiveCoverageMap(teamId: number, prisma: PrismaClient): Promise<ExhaustiveCoverageMap>`. Use `coverage.repository.findTeamPracticesWithPillars(teamId)` and `findAllPillars()`. Build a map keyed by category name with all 4 categories and their exhaustive subpillar entries always present (default `practices: 0`). Compute `coveredPillarsCount` (distinct subpillar codes with ≥1 practice), `coveredCategoriesCount`, and `coveragePct` = coveredPillarsCount / 13.
  - Notes: The existing `getTeamPillarCoverage` function is not replaced — `buildExhaustiveCoverageMap` is a new export alongside it. `coveragePct` must be in [0,1] (not 0–100). All 13 subpillar codes (1.1–1.4, 2.1–2.4, 3.1–3.3, 4.1–4.2) and all 4 category keys must always appear even if `practices: 0`.

- [x] Task 6: Verify `coverage.repository.ts` Prisma includes for full taxonomy
  - File: `server/src/repositories/coverage.repository.ts`
  - Action: Read `findAllPillars()` — confirm it includes `{ category: { select: { name: true } }, code: true, name: true }`. If `code` field is missing from the Prisma include, add it. If pillar model has no `code` field, use the pillar `id` as a lookup key and maintain a static code-map constant in coverage.service.ts mapping pillar id → subpillar code string.
  - Notes: The contract requires subpillar codes like `"1.1"` as object keys. If Prisma schema stores these as `code` on the Pillar model, use that directly. Check `schema.prisma` Pillar model field names.

- [x] Task 7: Rewrite `getGlobalPlatformStats` in `admin-stats.service.ts`
  - File: `server/src/services/admin-stats.service.ts`
  - Action: Replace the existing function with `getGlobalPlatformStats(window: WindowParams): Promise<AdminStatsResponse>`. Implement using `Promise.all` for parallel Prisma queries. Compute:
    - `meta`: `generatedAt = new Date().toISOString()`, `window`, `aggregationLevel: "platform"`, `privacy`, `version: "1.0.0"`.
    - `platform.overview`: counts for users, activeUsers (joined ≥1 team with activity in window), teams, activeTeams, issues, teamPractices, comments, events.
    - `platform.issues`: `createdInWindow` count; `byStatus` via `normalizeIssueStatusCounts`; `flow` via `computeIssueFlowRates`; `durationsHours` via `computeMeanDurationsHours`; `backlogHealth` via `computeBacklogHealth`.
    - `platform.practices`: `avgPracticesPerTeam` = total teamPractices / max(teamCount, 1); `medianPracticesPerTeam` from sorted per-team counts; `customPractice` = Event count with `eventType='practice.created'` in window; `practiceEdited` = Event count with `eventType='practice.edited'` in window; `topAdoptedPractices` = top 5 practices by TeamPractice count; `methodDistribution` = counts per method string normalized to [0,1] using `findDistinctMethodsAvailableForTeam` result pattern — query all TeamPractice→Practice.method, aggregate counts, normalize to ratios; all 10 keys always present with 0 default.
    - `platform.teamLandscape.sizeDistribution`: bucket teams by `TeamMember` count per team; `platform.teamLandscape.dormancy`: bucket by last activity date.
    - `platform.research`: `workflowCompletionRatio` = issues with status `done` / max(total issues, 1); `practiceIssueLinkDensity` = total IssuePractice count / max(issues, 1).
    - `teams[]`: per-team loop using pre-fetched team list; compute `issuesByStatus`, `lastActivityAt`, `practices.count`, `practices.customPractice`, `practices.practiceEdited` (window-scoped), `practices.coverage` via `buildExhaustiveCoverageMap`, and `collaboration` metrics.
    - `quality`: `metricFreshnessMinutes = 0` (computed on-demand), `warnings = []`, `dataCompleteness` from subquery counts.
  - Notes: Do NOT call old aggregation helpers that return the old shape. Remove old `GlobalPlatformStats` type after migration. Run `Promise.all` in waves to respect dependency ordering (team list first, then parallel per-team queries).

- [x] Task 8: Update `admin-stats.controller.ts` — window query parsing + runtime schema validation
  - File: `server/src/controllers/admin-stats.controller.ts`
  - Action:
    1. Add Zod schema `windowQuerySchema = z.object({ label: z.enum([...]).optional(), from: z.string().optional(), to: z.string().optional() })` patterned after `events.controller.ts` exportQuerySchema.
    2. `safeParse(req.query)` at top of `getGlobalStats`; on failure return 400 `validation_error` with details array.
    3. Call `resolveWindow(label, from, to)` to get `WindowParams`.
    4. Pass `window` to `getGlobalPlatformStats(window)`.
    5. After service returns, validate response against JSON Schema using Ajv; if invalid, call `next(new AppError('schema_error', 'Response failed contract schema validation', 500))`.
    6. On success, `res.status(200).json(response)`.
  - Notes: Load Ajv and import the JSON Schema as a constant (copy schema object directly into a `src/schemas/admin-stats-response.schema.ts` file); avoid fs.readFileSync for schema loading in Express controllers to keep it synchronous and testable.

- [x] Task 9: Create `server/src/schemas/admin-stats-response.schema.ts`
  - File: `server/src/schemas/admin-stats-response.schema.ts` *(new file)*
  - Action: Export `ADMIN_STATS_RESPONSE_SCHEMA` as a typed `const` object containing the full JSON Schema Draft 2020-12 object (copied verbatim from section 5 of `admin-platform-stats-contract.md`). Export type `AdminStatsSchemaValidator = ReturnType<typeof ajv.compile>`.
  - Notes: This keeps the schema in a version-controlled TypeScript file, importable in both controller and tests without file I/O.

- [x] Task 10: Rewrite `admin-stats.service.test.ts`
  - File: `server/src/services/admin-stats.service.test.ts`
  - Action: Replace old test suite. New test groups:
    1. **Window default**: no args → `meta.window.label = "all_time"`.
    2. **Method distribution**: mock returns practices with some methods; assert all 10 keys present; assert ratios sum to ≤1.
    3. **Taxonomy coverage**: mock returns team with practices linked to only cat1 subpillars; assert all 4 categories and 13 subpillars present; un-linked subpillars have `practices: 0`.
    4. **Status zero-fill**: no in_progress issues → `platform.issues.byStatus.in_progress = 0`.
    5. **Inclusive window filtering**: objects exactly at `from` and `to` boundaries are included in counts.
    6. **meanTimeToFirstComment semantics**: duration is computed from issue `createdAt` to first comment `createdAt`.
    7. **topAdoptedPractices cardinality**: result length is max 5 and ordered descending by `teamsUsing`.
    8. **Quality section**: `metricFreshnessMinutes = 0`, `warnings` is array.
  - Notes: Keep mock Prisma pattern from current test. Assert with `expect.objectContaining` for partial checks and exact shape for required contract fields.

- [x] Task 11: Update `admin-stats.routes.test.ts`
  - File: `server/src/routes/admin-stats.routes.test.ts`
  - Action: Keep existing API key auth tests. Add:
    1. **Window label query**: `GET /stats?label=last_30_days` → service called with `{ label: "last_30_days", ... }`.
    2. **Window custom from/to**: `GET /stats?from=2026-01-01T00:00:00.000Z&to=2026-02-01T00:00:00.000Z` → `meta.window.label = "custom"`.
    3. **Invalid label**: `GET /stats?label=yesterday` → 400 `validation_error`.
    4. **Schema validation failure**: mock service returns object missing `quality` → controller returns 500.
    5. **Full contract shape**: mock service returns valid contract → response is 200 with `meta`, `platform`, `teams`, `quality` keys.
  - Notes: Service mock must return an object matching full `AdminStatsResponse` shape for happy-path tests.

- [x] Task 12: Create contract shape test suite
  - File: `server/src/services/admin-stats-contract.test.ts` *(new file)*
  - Action: Import `ADMIN_STATS_RESPONSE_SCHEMA` and Ajv. Write tests:
    1. **Valid minimal response** (all required keys, all method distribution keys, all taxonomy keys) → `ajv.validate` returns true.
    2. **Missing top-level key** (`quality` absent) → `ajv.validate` returns false.
    3. **Extra unknown property** → `ajv.validate` returns false (additionalProperties strict).
    4. **Method distribution missing key** (`"Scrum"` absent) → false.
    5. **Coverage missing category** → false.
    6. **Rate out of bounds** (`coveragePct: 1.5`) → false.
    7. **Null lastActivityAt** → true (anyOf null is valid).
  - Notes: These tests validate the schema itself and confirm Ajv is wired correctly, independent of service logic.

### Acceptance Criteria

- [ ] AC 1: Given no query parameters when `GET /api/v1/admin/stats` is called with a valid `X-API-KEY`, then the response status is 200 and `meta.window.label` equals `"all_time"` with `from` and `to` as valid ISO 8601 date-time strings.

- [ ] AC 2: Given `?label=last_30_days` query parameter, when `GET /api/v1/admin/stats` is called, then `meta.window.label = "last_30_days"` and `meta.window.from` is approximately 30 days before `meta.window.to`.

- [ ] AC 3: Given `?from=2026-01-01T00:00:00.000Z&to=2026-02-01T00:00:00.000Z`, when `GET /api/v1/admin/stats` is called, then `meta.window.label = "custom"`, `meta.window.from = "2026-01-01T00:00:00.000Z"`, and `meta.window.to = "2026-02-01T00:00:00.000Z"`.

- [ ] AC 4: Given `?label=yesterday` (not in the allowed enum), when `GET /api/v1/admin/stats` is called, then the response is 400 with `code = "validation_error"` and a `details` array identifying the `label` field.

- [ ] AC 5: Given a valid request and a correctly-built service response, when the response is validated against the JSON Schema Draft 2020-12 at runtime, then validation passes and the response is returned as-is.

- [ ] AC 6: Given a bug causes the service to omit the `quality` key in its return value, when the controller validates the response against the schema, then a 500 AppError with `code = "schema_error"` is thrown instead of a malformed JSON response being sent.

- [ ] AC 7: Given that no practices in the system have the `"Scrum"` method, when `GET /api/v1/admin/stats` is called, then `platform.practices.methodDistribution.Scrum` equals `0` and all other 9 method keys are also present (possibly also `0`).

- [ ] AC 8: Given a team with practices only mapped to `"Technical Quality & Engineering Excellence"` subpillars, when the team's `practices.coverage` is computed, then all 4 category keys appear in `pillars`, and all subpillar entries in `"Team Culture & Psychology"`, `"Process & Execution"`, and `"Product Value & Customer Alignment"` have `practices: 0`.

- [ ] AC 9: Given no issues exist in `"adaptation_in_progress"` status, when `GET /api/v1/admin/stats` is called, then `platform.issues.byStatus.adaptation_in_progress` equals `0` (not absent).

- [ ] AC 10: Given no `X-API-KEY` header is provided, when `GET /api/v1/admin/stats` is called, then the response is 401 (unchanged from current behavior).

- [ ] AC 11: Given an incorrect `X-API-KEY` value, when `GET /api/v1/admin/stats` is called, then the response is 401 (unchanged from current behavior).

- [ ] AC 12: Given `practice.created` events exist both inside and outside the `last_7_days` window, when `GET /api/v1/admin/stats?label=last_7_days` is called, then `platform.practices.customPractice` counts only the events whose `createdAt` falls within the last 7 days.

- [ ] AC 13: Given records that occur exactly at `meta.window.from` and exactly at `meta.window.to`, when `GET /api/v1/admin/stats` is called, then both boundary records are included in all window-scoped aggregations.

- [ ] AC 14: Given an issue created at `2026-03-01T10:00:00.000Z` and its first comment at `2026-03-01T16:00:00.000Z`, when `meanTimeToFirstComment` is computed, then this issue contributes exactly `6.0` hours to the mean duration metric.

- [ ] AC 15: Given the response top-level object, when the JSON body is parsed, then it contains exactly `meta`, `platform`, `teams`, and `quality` keys (no extra top-level keys due to `additionalProperties: false`).

- [ ] AC 16: Given a platform with no teams, when `GET /api/v1/admin/stats` is called, then `teams` is an empty array `[]` (not absent, not null).

- [ ] AC 17: Given platform practices adoption counts across teams, when `GET /api/v1/admin/stats` is called, then `platform.practices.topAdoptedPractices` contains at most 5 entries ordered by highest `teamsUsing`.

## Additional Context

### Dependencies

- **`ajv` (v8+)**: New npm dependency in `server/`. Required for Draft 2020-12 JSON Schema validation. Import via `import Ajv from 'ajv/dist/2020'`.
- **`ajv` types**: `@types/ajv` not needed (Ajv v8 ships its own TypeScript types).
- **`ajv-formats`**: Added in `server/` to enforce JSON Schema `date-time` format validation at runtime and in contract tests.
- **No other new dependencies**: Zod (already installed) handles input query validation; Ajv handles output schema validation.
- **Prisma schema unchanged**: All required fields (`decisionRecordedAt`, `evaluationRecordedAt`, `evaluationOutcome`, `Comment.createdAt`, `Event.eventType`, `Practice.method`) already exist in `schema.prisma`.

## Review Notes

- Adversarial review completed
- Findings: 13 total, 13 resolved
- Resolution approach: auto-fix
- **No route changes**: `admin-stats.routes.ts` route wiring and middleware order do not change; only the controller logic changes.

### Testing Strategy

**Unit Tests (Jest, mocked Prisma):**
- `admin-stats.service.test.ts`: Full rewrite targeting new `getGlobalPlatformStats(window)` signature. Cover window defaults, method distribution exhaustiveness, taxonomy coverage exhaustiveness, status zero-fill, and index computations.
- `admin-stats-contract.test.ts`: Schema validity tests using Ajv directly. Cover valid payloads, missing keys, extra keys, rate bounds, null values.

**Integration Tests (Supertest, mocked service):**
- `admin-stats.routes.test.ts`: Window query parsing (label, custom, invalid), API key auth (keep existing), schema validation error path.

**Manual Smoke Test:**
1. Start server locally with `ADMIN_API_KEY=test`.
2. `curl -H "X-API-KEY: test" http://localhost:3000/api/v1/admin/stats` → verify 200 and JSON shape.
3. `curl ... ?label=last_7_days` → verify `meta.window.label`.
4. `curl ... ?label=invalid` → verify 400.

### Notes

- **High-risk**: `computeMeanDurationsHours` requires querying comments per issue in a window — potential N+1 query. Mitigate by using a single Prisma query with `include: { comments: { orderBy: { createdAt: 'asc' }, take: 1 } }` rather than per-issue queries.
- **Taxonomy assumption**: subpillar `code` field on Prisma `Pillar` model must be populated (e.g., `"1.1"`, `"1.2"`). If the schema uses only `id` + `name`, a static lookup table mapping name → code must be added to `coverage.service.ts`. Verify in Task 6.
- **Coverage percentage**: contract `coveragePct` is in [0,1] (not 0–100). The existing `coverage.service.ts` may return 0–100 format. Normalize in `buildExhaustiveCoverageMap`.
- **Decision**: `topAdoptedPractices` is capped at 5 most-used practices among all teams for this implementation.
- **Decision**: Window boundaries are inclusive for all window-scoped metrics.
- **Decision**: `meanTimeToFirstComment` is defined as elapsed time between issue creation and first comment timestamp.
- **Decision**: No consumer migration strategy is required because the previous version was never deployed.
- **Future**: Response caching (e.g., Redis TTL) would improve performance for large datasets. Out of scope; `quality.metricFreshnessMinutes = 0` signals on-demand computation.

