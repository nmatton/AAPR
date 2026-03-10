# Story 4.2.1: Recommendation Engine API

Status: review

## Story

As a team member,
I want the system to recommend alternative practices when my team identifies friction with our current practice,
so that we can make informed adaptation decisions that maintain or improve our agile coverage based on our team's personality affinity.

## Acceptance Criteria

1. **Endpoint Exists**: A `GET /api/v1/teams/:teamId/practices/:practiceId/recommendations` endpoint is created and secured.
2. **Affinity Filtering**: The endpoint must filter alternative practices such that their `Team Affinity Score` is strictly greater than the `Team Affinity Score` of the current practice.
3. **Coverage Maintenance**: The recommended practice must maintain or increase the team's Agile Coverage (it must cover all pillars the current practice covers, taking into account the portfolio).
4. **Prioritization Logic (Ranking)**:
   - **Tier 1 (Highest)**: Practices linked via `practice_associations` with `association_type = 'Equivalence'`.
   - **Tier 2**: Practices in the same category or "type" as the target practice.
   - **Tier 3**: All other practices meeting the affinity and coverage criteria.
5. **Limit**: The endpoint must return a maximum of 3 recommended alternative practices.
6. **Data Contract Compliance**: The API response must follow the standard success format, carrying the practice details and a brief "Why?" reason for the recommendation (e.g., "Covers same pillars, higher team affinity").
7. **Error Handling**: Follows the structured error format `{ code, message, details?, requestId }` for 400 (e.g., invalid ID) and 404 (e.g., practice/team not found).

## Tasks / Subtasks

- [x] Task 1: Create Recommendation Service Logic (AC: 2, 3, 4, 5)
  - [x] Implement `service/recommendation.service.ts`.
  - [x] Write logic to fetch team coverage and affinity scores.
  - [x] Implement query logic to fetch alternative practices meeting the affinity filter.
  - [x] Implement logic to evaluate agile coverage diff.
  - [x] Implement Tier 1/2/3 ranking heuristic.
- [x] Task 2: Expose and Wire API Endpoint (AC: 1, 6)
  - [x] Add `GET /api/v1/teams/:teamId/practices/:practiceId/recommendations` route.
  - [x] Implement controller mapping and request validation (using Zod).
  - [x] Ensure API response strictly matches the camelCase requirement and contains the reasoning payload.
- [x] Task 3: Error Handling and Edge Cases (AC: 7)
  - [x] Return 404 if `practiceId` is invalid or not in the team's portfolio.
  - [x] Return empty array `[]` gracefully if no practices meet the strict criteria.
- [x] Task 4: Testing
  - [x] Write unit tests for `recommendation.service.ts` mocking DB calls.
  - [x] Ensure ranking heuristics are covered under tests.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - The Recommendation Algorithm belongs in the TypeScript Service layer (`services/recommendation.service.ts`) using SQL queries on existing `practice_associations`, `team_coverage`, and `affinity_scores` tables.
  - Do NOT implement the logic in stored procedures.
  - Follow the API naming convention: camelCase API/TS, snake_case DB mappings via Prisma.
  - All errors must use the `{ code, message, details?, requestId }` format.
- **Source tree components to touch**:
  - Backend controllers: `server/src/features/practices/api/` or `server/src/features/recommendations/api/`
  - Backend services: `server/src/features/practices/state/` or `services/recommendation.service.ts`
  - Routes definitions.

### Project Structure Notes

- Keep the new recommendation logic modular, likely under the `practices` domain as a new service since it acts on practice entities, or a dedicated `recommendations` feature folder if it grows. Given the architecture constraints, a Service is sufficient for now.
- **Alignment with unified project structure**: Ensure Prisma maps are respected. Note that `teamId` is passed in URL params, and the backend route handles it accordingly.

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-10.md#4-detailed-change-proposals]
- [Source: _bmad-output/planning-artifacts/architecture.md#decision-1-5-practice-recommendation-engine]

## Dev Agent Record

### Agent Model Used
Antigravity

### Debug Log References
None

### Completion Notes List
- Implemented recommendation engine service (`recommendation.service.ts`) with full algorithm: validates target practice in team portfolio, computes team affinity via existing `affinity.service.ts`, filters candidates by strictly higher affinity score, checks coverage maintenance via swap simulation (exclusive pillar analysis), ranks by 3-tier heuristic (Equivalence > same category > other), limits to 3 results.
- Created thin controller (`recommendation.controller.ts`) following existing pattern with `res.locals.teamId` extraction, param validation, and standard error delegation via `next(error)`.
- Created route definition (`recommendation.routes.ts`) with `mergeParams: true` mounted alongside affinity router on `/:teamId/practices` prefix.
- 12 unit tests covering all ACs: affinity filtering, coverage maintenance, tier ranking, max-3 limit, empty results, 404 errors, reason generation, bidirectional Equivalence associations, and graceful error handling when affinity computation fails.
- Full regression suite: 292/293 tests pass (1 pre-existing failure in `teams.routes.test.ts` unrelated to this story).

### Change Log
- 2026-03-10: Implemented Story 4.2.1 — Recommendation Engine API (all tasks completed)

### File List
- server/src/services/recommendation.service.ts [NEW]
- server/src/services/recommendation.service.test.ts [NEW]
- server/src/controllers/recommendation.controller.ts [NEW]
- server/src/routes/recommendation.routes.ts [NEW]
- server/src/routes/teams.routes.ts [MODIFIED]
- _bmad-output/implementation-artifacts/4-2-1-recommendation-engine-api.md [MODIFIED]
- _bmad-output/implementation-artifacts/sprint-status.yaml [MODIFIED]
- .gitignore [MODIFIED]
- _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-10.md [MODIFIED]
