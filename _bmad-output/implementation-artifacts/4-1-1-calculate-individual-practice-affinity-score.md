# Story 4.1.1: Calculate Individual Practice Affinity Score

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a researcher,
I want the system to calculate an individual affinity score for each practice from a user's Big Five profile and the practice's tags,
so that personality-practice fit can be used consistently in later recommendation and analysis workflows.

## Acceptance Criteria

1. Reference data loading and validation
   - [x] Load trait bounds from `docs/tag_personality_affinity/personality_score_bounds.csv`.
   - [x] Parse decimal commas as decimal points (example: `2,6` -> `2.6`).
   - [x] Load tag-trait pole relations from `docs/tag_personality_affinity/tags_personality_relation.csv`.
   - [x] Validate trait set is exactly `E`, `A`, `C`, `N`, `O`.
   - [x] Validate bound config with `highBound > lowBound` for each trait; fail fast otherwise.

2. Symbol mapping and normalization
   - [x] Map relation symbols with exact mapping: `- -> -1`, `0 -> 0`, `+ -> 1`.
   - [x] Normalize tag matching using trim + whitespace collapse + case-insensitive comparison.
   - [x] Report any unmapped practice tags in response explanation payload.

3. Trait contribution formula with strict clamping
   - [x] For each tag and each trait, compute contribution with mandatory piecewise behavior:
     - `userValue <= lowBound`: return `lowEndpoint` exactly.
     - `userValue >= highBound`: return `highEndpoint` exactly.
     - Otherwise, linearly interpolate between low and high endpoints.
   - [x] No extrapolation is allowed outside bounds.
   - [x] Ensure contribution remains in `[-1, 1]`.

4. Aggregation rules
   - [x] Tag score equals arithmetic mean of the five trait contributions.
   - [x] Individual practice score equals arithmetic mean of all mapped tag scores.
   - [x] If no tags map, return status `no_tag_mapping` and `score: null`.
   - [x] If user Big Five profile is incomplete, return status `insufficient_profile_data` and `score: null`.

5. Individual affinity API contract
   - [x] Implement endpoint: `GET /api/v1/teams/:teamId/practices/:practiceId/affinity/me`.
   - [x] Success payload includes:
     - `status: "ok"`
     - `teamId`, `practiceId`
     - `score` (rounded to 4 decimals)
     - `scale: { min: -1, max: 1 }`
     - `explanation` with `mappedTags`, `unmappedTags`, `tagScores[]`, and per-tag `traitContributions`
     - `requestId`
   - [x] Non-success payloads follow structured status contract:
     - `insufficient_profile_data`
     - `no_tag_mapping`

6. Determinism and precision
   - [x] Keep full floating-point precision during calculations.
   - [x] Round only at serialization time:
     - intermediate values up to 6 decimals if returned,
     - final public score to 4 decimals.
   - [x] Same input must produce same output.

7. Privacy and recommendation compatibility constraints
   - [x] This story must not expose raw traits of other members.
   - [x] Keep output compatible with later team aggregation story (4.1.2).
   - [x] Preserve recommendation ordering rule: coverage-first, affinity-second (when available).

## Tasks / Subtasks

- [x] Implement affinity domain types and parser utilities
  - [x] Create `server/src/services/affinity/affinity.types.ts` for traits, bounds, relation rows, statuses.
  - [x] Create `server/src/services/affinity/affinity-reference-data.ts` to load/validate CSV reference data.
  - [x] Add robust tag normalization helper (`trim`, collapse whitespace, lowercase compare key).

- [x] Implement pure scoring engine
  - [x] Create `server/src/services/affinity/affinity-scoring.ts` with pure functions:
    - `computeTraitContribution(...)`
    - `computeTagScore(...)`
    - `computeIndividualPracticeAffinity(...)`
  - [x] Encode strict clamp behavior exactly as contract requires.
  - [x] Add function-level unit tests for each piecewise branch and edge case.

- [x] Integrate with repositories and existing models
  - [x] Add repository helpers to fetch:
    - authenticated user Big Five profile (`big_five_scores`),
    - team membership validation,
    - target practice with tags.
  - [x] Read tags from `Practice.tags` JSON safely and normalize to string array.

- [x] Add application service for endpoint orchestration
  - [x] Create `server/src/services/affinity.service.ts` to:
    - validate preconditions,
    - call pure scoring engine,
    - build API response shape,
    - include `mappedTags` and `unmappedTags`.
  - [x] Reuse `AppError` and structured error strategy already used in controllers.

- [x] Add route + controller
  - [x] Add `server/src/controllers/affinity.controller.ts` with `getMyPracticeAffinity`.
  - [x] Add `server/src/routes/affinity.routes.ts`.
  - [x] Mount under teams routing to keep team membership guardrails:
    - `GET /api/v1/teams/:teamId/practices/:practiceId/affinity/me`
  - [x] Wire middleware:
    - `requireAuth`
    - `validateTeamMembership`

- [x] Testing
  - [x] Add unit tests: `server/src/services/affinity/affinity-scoring.test.ts` covering all contract test vectors.
  - [x] Add unit tests for CSV parsing and validation: decimals, symbols, invalid bounds.
  - [x] Add controller/service integration tests for response statuses:
    - `ok`
    - `insufficient_profile_data`
    - `no_tag_mapping`
  - [x] Verify final response score rounding to 4 decimals only at serialization.

## Dev Notes

### Mandatory Technical Contract

This story is bound by:

- `_bmad-output/planning-artifacts/affinity-scoring-technical-contract.md`

Non-negotiable implementation rules from that contract:

1. Clamp outside bounds, do not extrapolate.
2. Interpolate only strictly between bounds.
3. Keep final scores in `[-1, 1]`.
4. Return explicit statuses for missing data/unmapped tags.
5. Maintain deterministic explainable output.

### Formula Specification (Implementation Source of Truth)

For one trait contribution:

```
if userValue <= lowBound: contribution = lowEndpoint
else if userValue >= highBound: contribution = highEndpoint
else:
  contribution = lowEndpoint + ((userValue - lowBound) / (highBound - lowBound)) * (highEndpoint - lowEndpoint)
```

Tag score:

```
tagScore = (contributionE + contributionA + contributionC + contributionN + contributionO) / 5
```

Individual practice score:

```
individualPracticeScore = average(tagScore_i for mapped tags only)
```

### Architecture Compliance

- Follow existing backend layering:
  - routes -> controllers -> services -> repositories
- Keep scoring engine pure and deterministic (no Prisma calls inside pure scoring functions).
- Use existing structured error shape from global error middleware:
  - `{ code, message, details, requestId }`
- Respect camelCase API output and current `requestId` propagation.

### File Structure Requirements

Expected server-side files for this story:

- `server/src/routes/affinity.routes.ts`
- `server/src/controllers/affinity.controller.ts`
- `server/src/services/affinity.service.ts`
- `server/src/services/affinity/affinity.types.ts`
- `server/src/services/affinity/affinity-reference-data.ts`
- `server/src/services/affinity/affinity-scoring.ts`
- `server/src/services/affinity/affinity-scoring.test.ts`

### Testing Requirements

Minimum test vectors to implement exactly:

- Clamp below lower bound: expect exact low endpoint.
- Clamp above upper bound: expect exact high endpoint.
- Interpolation mid-point case.
- Neutral-neutral relation always returns `0`.
- No mapped tags -> `no_tag_mapping`.
- Missing user traits -> `insufficient_profile_data`.

### Reference Paths

- Epic story source: `_bmad-output/planning-artifacts/epics.md` (Epic 4.1, Story 4.1.1)
- Product requirements: `_bmad-output/planning-artifacts/prd.md` (FR12A, affinity constraints)
- Architecture guidance: `_bmad-output/planning-artifacts/architecture.md` (affinity engine and API conventions)
- Technical contract: `_bmad-output/planning-artifacts/affinity-scoring-technical-contract.md`
- Tag canonical list: `server/src/constants/tags.constants.ts`
- Affinity input data:
  - `docs/tag_personality_affinity/personality_score_bounds.csv`
  - `docs/tag_personality_affinity/tags_personality_relation.csv`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- N/A

### Completion Notes List

- Story context generated with explicit contract-driven formulas, statuses, API shape, and test vectors.
- Previous story intelligence not applicable (`story_num = 1` in Epic 4.1).
- Implemented full affinity scoring module: types, CSV parser/validator, pure scoring engine, application service, controller, and routes.
- Pure scoring engine (`affinity-scoring.ts`) has zero side effects — all DB calls isolated in `affinity.service.ts`.
- BigFiveScore stored sums are converted to 1-5 averages (dividing by item count) before comparison with bounds.
- Reference data (bounds CSV + tag relations CSV) loaded once and cached in memory via singleton pattern.
- Tag matching uses `normalizeTagKey()`: trim + collapse whitespace + lowercase.
- Route mounted under teams router with `requireAuth` + `validateTeamMembership` middleware via `mergeParams: true`.
- 35 tests total: 29 unit tests for scoring engine + CSV parsing, 6 controller integration tests.
- All contract test vectors (12.1–12.6) covered: clamp below, clamp above, interpolation, neutral-neutral, no tag mapping, insufficient profile.
- Score rounding: final score to 4 decimals, intermediate trait contributions to 6 decimals, only at serialization time.
- Pre-existing test failure in `teams.routes.test.ts` (empty practiceIds returns 201 instead of 400) — not related to this story.

### File List

- `server/src/services/affinity/affinity.types.ts` (new)
- `server/src/services/affinity/affinity-reference-data.ts` (new)
- `server/src/services/affinity/affinity-scoring.ts` (new)
- `server/src/services/affinity/affinity-scoring.test.ts` (new)
- `server/src/services/affinity.service.ts` (new)
- `server/src/controllers/affinity.controller.ts` (new)
- `server/src/controllers/affinity.controller.test.ts` (new)
- `server/src/routes/affinity.routes.ts` (new)
- `server/src/routes/teams.routes.ts` (modified — mounted affinity router)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status updated)
- `_bmad-output/implementation-artifacts/4-1-1-calculate-individual-practice-affinity-score.md` (modified)

## Change Log

- 2026-03-09: Implemented full individual affinity scoring module (Story 4.1.1). Added pure scoring engine with piecewise clamp/interpolation, CSV reference data parser with validation, application service, controller, and route. 35 tests added covering all contract test vectors. Route mounted at `GET /api/v1/teams/:teamId/practices/:practiceId/affinity/me`.
- 2026-03-09: Senior code review remediation applied. Fixed team-scoped practice access in affinity service, hardened bounds CSV parsing against malformed numeric cells and duplicate traits, and added route-level controller/service integration tests for `ok`, `insufficient_profile_data`, and `no_tag_mapping` statuses.

## Senior Developer Review (AI)

Reviewer: Nmatton (AI)
Date: 2026-03-09
Outcome: Changes Requested (resolved)

### Findings Addressed

1. HIGH - Team isolation gap on practice lookup
  - Fixed by scoping practice query to `(isGlobal = true) OR (teamPractices contains current teamId)` in `server/src/services/affinity.service.ts`.

2. HIGH - Controller/service integration testing missing
  - Added route-level integration tests in `server/src/routes/affinity.routes.test.ts` covering `ok`, `insufficient_profile_data`, and `no_tag_mapping` with real controller + service path.

3. MEDIUM - Non-strict numeric parsing in bounds CSV loader
  - Fixed parser to reject malformed numeric input rather than accepting partial parse values.

4. MEDIUM - Trait set exactness not enforced for duplicates
  - Added duplicate trait rejection in bounds loader.

### Verification

- Targeted test suite passed after fixes:
  - `src/services/affinity/affinity-scoring.test.ts`
  - `src/controllers/affinity.controller.test.ts`
  - `src/routes/affinity.routes.test.ts`
