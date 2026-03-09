# Story 4.1.2: Calculate Team Practice Affinity Score

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Scrum Master,
I want the system to calculate a team-level affinity score for each practice,
so that adaptation discussions can use a group-level fit signal without exposing teammates' raw personality profiles.

## Acceptance Criteria

1. Team member eligibility and filtering
   - [x] Load all team members from the team roster
   - [x] Filter to only members with complete Big Five profiles (all five trait scores present)
   - [x] Track included and excluded member counts for transparency

2. Individual score computation or reuse
   - [x] For each eligible member, compute or retrieve their individual practice affinity score
   - [x] Reuse the existing individual affinity calculation engine from Story 4.1.1
   - [x] Handle cases where individual calculation returns non-success statuses gracefully

3. Team score aggregation
   - [x] Calculate team practice affinity score as the arithmetic mean of all eligible individual scores
   - [x] Ensure the final team score remains in `[-1, 1]`
   - [x] Return `insufficient_profile_data` status if no eligible members exist

4. Privacy enforcement
   - [x] Team responses must never expose raw Big Five trait values of any member
   - [x] Only include aggregated team-level context in response
   - [x] Explanation payload contains only aggregate insights (top positive/negative tags)

5. API contract implementation
   - [x] Implement endpoint: `GET /api/v1/teams/:teamId/practices/:practiceId/affinity/team`
   - [x] Success payload includes:
     - `status: "ok"`
     - `teamId`, `practiceId`
     - `score` (rounded to 4 decimals)
     - `scale: { min: -1, max: 1 }`
     - `aggregation: { includedMembers, excludedMembers }`
     - `explanation: { topPositiveTags[], topNegativeTags[] }`
     - `requestId`
   - [x] Insufficient profile response when no eligible members:
     - `status: "insufficient_profile_data"`
     - `score: null`
     - `aggregation: { includedMembers: 0, excludedMembers: N }`

6. Response explanation generation
   - [x] Identify top positive tags (tags with highest average contributions across team)
   - [x] Identify top negative tags (tags with lowest average contributions across team)
   - [x] Include up to 3 top positive and 3 top negative tags in explanation
   - [x] If practice has unmapped tags, those do not appear in top lists

7. Downstream compatibility
   - [x] Ensure team affinity endpoint can be consumed by recommendation views
   - [x] Keep response format compatible with coverage-first, affinity-second ordering rule
   - [x] Support fallback to coverage-only recommendations when team affinity unavailable

## Tasks / Subtasks

- [x] Extend affinity service with team aggregation logic (AC: 1-3)
  - [x] Create `getTeamPracticeAffinity()` service function
  - [x] Load team members with Big Five profile completion check
  - [x] Call individual affinity calculation for each eligible member
  - [x] Aggregate individual scores to team score
  - [x] Handle edge cases (no eligible members, all members excluded)

- [x] Implement explanation payload builder (AC: 6)
  - [x] Create helper to compute average tag contributions across team
  - [x] Sort tags by average contribution (positive to negative)
  - [x] Select top 3 positive and top 3 negative tags
  - [x] Build explanation object with tag names only (no member details)

- [x] Add team affinity controller and route (AC: 5)
  - [x] Create `getTeamPracticeAffinity` controller function
  - [x] Add route: `GET /api/v1/teams/:teamId/practices/:practiceId/affinity/team`
  - [x] Wire existing middleware: `requireAuth`, `validateTeamMembership`
  - [x] Return structured response following API contract

- [x] Privacy validation (AC: 4)
  - [x] Audit response payload for any member-specific trait values
  - [x] Ensure only aggregated data appears in explanation
  - [x] Add privacy-focused assertion in tests

- [x] Testing (AC: 1-7)
  - [x] Unit tests for team aggregation logic:
    - All members eligible → correct average
    - Some members missing profiles → correct exclusion
    - No members eligible → `insufficient_profile_data` status
  - [x] Unit tests for explanation builder:
    - Correct top positive/negative tag identification
    - Handle practices with few tags (<3)
  - [x] Controller integration tests for response statuses:
    - `ok` with valid team data
    - `insufficient_profile_data` with no eligible members
  - [x] Privacy tests: verify no individual traits exposed

## Dev Notes

### Story Dependencies

**Prerequisite:** Story 4.1.1 (Calculate Individual Practice Affinity Score) MUST be complete.

This story builds directly on the individual affinity calculation engine. The following components from 4.1.1 are reused:

- `server/src/services/affinity/affinity-scoring.ts` - Pure scoring engine
- `server/src/services/affinity/affinity-reference-data.ts` - CSV data loader
- `server/src/services/affinity/affinity.types.ts` - Type definitions
- `server/src/services/affinity.service.ts` - Application service layer

### Technical Contract Compliance

This story is bound by the same technical contract as 4.1.1:

- `_bmad-output/planning-artifacts/affinity-scoring-technical-contract.md`

**Critical rules from the contract:**

1. **Team score formula:** `teamScore = average(individualScore_1, ..., individualScore_N)` for N eligible members
2. **Eligibility:** Only members with complete Big Five profiles (all 5 traits present)
3. **Privacy:** Never expose raw trait values of any member in team responses
4. **Status handling:** Return `insufficient_profile_data` when no eligible members exist
5. **Range guarantee:** Final team score must remain in `[-1, 1]`
6. **Explanation payload:** Only aggregated context (top positive/negative tags)

### Formula Specification

**Team Practice Affinity Score:**

```
teamScore = (sum of all eligible individual practice scores) / (count of eligible members)
```

**Where:**
- Eligible member = member with complete Big Five profile (all 5 traits present)
- Individual practice score = computed via existing `computeIndividualPracticeAffinity()` from 4.1.1

**Edge Cases:**
- If 0 eligible members → return `status: "insufficient_profile_data"`, `score: null`
- If 1 eligible member → return that member's individual score as team score
- If N eligible members → return arithmetic mean of N individual scores

**Top Tag Identification:**

```
For each tag in practice:
  1. Collect all eligible members' individual tag scores
  2. Compute average tag score across team
  3. Sort tags by average score (descending)
  4. Top positive tags: first 3 tags with highest average scores
  5. Top negative tags: last 3 tags with lowest average scores
```

### Architecture Compliance

**Backend Layering:**
- Routes → Controllers → Services → Repositories
- Keep team aggregation logic in `affinity.service.ts`
- Reuse individual scoring logic from Story 4.1.1
- No database queries inside pure aggregation functions

**API Conventions:**
- Follow existing structured error shape: `{ code, message, details, requestId }`
- Use camelCase for API responses
- Respect `X-Request-Id` header propagation
- Return proper HTTP status codes (200 OK, 404 Not Found, 500 Internal Server Error)

**State Management:**
- No Zustand state changes for this backend-only story
- Frontend consumption (practice cards with affinity badges) handled in Story 4.1.3

### File Structure Requirements

**New files for this story:**
- None - extend existing files from 4.1.1

**Modified files:**
- `server/src/services/affinity.service.ts` - Add `getTeamPracticeAffinity()` function
- `server/src/controllers/affinity.controller.ts` - Add `getTeamPracticeAffinity` controller
- `server/src/routes/affinity.routes.ts` - Add team endpoint route

**Test files:**
- `server/src/services/affinity.service.test.ts` (new or extend existing)
- `server/src/controllers/affinity.controller.test.ts` (extend existing)
- `server/src/routes/affinity.routes.test.ts` (extend existing)

### Database Schema Notes

**No schema changes required for this story.**

The existing database schema from Story 4.1.1 provides all necessary data:

- `big_five_scores` table (user trait values)
- `team_members` table (team roster)
- `practices` table (practice tags)
- `team_practices` table (team-practice associations)

### Testing Requirements

**Minimum test coverage:**

1. **Service layer tests:**
   - All members eligible (N=3) → correct average
   - Some members missing profiles (N=5, eligible=2) → correct exclusion count
   - No members eligible (N=4, eligible=0) → `insufficient_profile_data` status
   - Single member eligible (N=1) → team score equals individual score
   - Practice with unmapped tags → unmapped tags not in top lists

2. **Explanation builder tests:**
   - Practice with 5+ tags → top 3 positive and top 3 negative selected
   - Practice with 2 tags → return all tags in appropriate lists
   - Tags with equal scores → stable sorting (alphabetical tie-breaker)

3. **Controller integration tests:**
   - Success case (200 OK) with valid team data
   - Insufficient profile case (200 OK) with no eligible members
   - Team membership validation (403 Forbidden if not member)
   - Practice not found (404 Not Found)

4. **Privacy validation tests:**
   - Verify response contains no `traitContributions` for any member
   - Verify response contains no individual member IDs in explanation
   - Verify only aggregated tag context appears in explanation

### Privacy Implementation Checklist

**Critical privacy requirements from NFR4 and technical contract:**

1. ✅ Team affinity response MUST NOT include:
   - Raw Big Five trait values of any member
   - Per-member individual affinity scores
   - Member-specific trait contributions
   - Member identifiers in explanation payload

2. ✅ Team affinity response MAY include:
   - Aggregated team score (single number)
   - Included/excluded member counts (totals only)
   - Top positive/negative tags (aggregate context)
   - Practice-level metadata

3. ✅ Implementation safeguards:
   - Build response object from scratch (don't reuse individual response)
   - Audit serialization for accidental member data leakage
   - Add explicit privacy-focused test assertions

### Integration with Existing Features

**Recommendation Engine (Epic 5):**
- Team affinity will be used as a secondary signal (after coverage) for practice recommendations
- Recommendation views will call this team endpoint to get fit signals
- Coverage-first rule remains: affinity only adjusts ordering within same coverage tier
- Compatibility assumption: recommendation candidate practices are global (`isGlobal = true`) or associated with the team via `team_practices`

**Frontend Display (Story 4.1.3):**
- Practice cards will display both individual and team affinity badges
- Individual badge calls `/affinity/me` endpoint (Story 4.1.1)
- Team badge calls `/affinity/team` endpoint (this story)
- Both badges shown side-by-side for comparison

### Implementation Strategy

**Step 1: Service Layer (Core Logic)**
1. Create `getTeamPracticeAffinity()` in `affinity.service.ts`
2. Load team members, filter by Big Five completion
3. For each eligible member, call existing individual affinity logic (reuse `getMyPracticeAffinity` internals)
4. Aggregate individual scores → team score
5. Build aggregation metadata (included/excluded counts)

**Step 2: Explanation Builder (Helper Function)**
1. Create `buildTeamAffinityExplanation()` helper
2. Collect all eligible members' tag-level scores
3. Compute average score per tag across team
4. Sort tags by average score
5. Select top 3 positive and top 3 negative
6. Return explanation object

**Step 3: Controller and Route**
1. Add `getTeamPracticeAffinity` controller function
2. Extract `teamId` and `practiceId` from route params
3. Call service layer with validated inputs
4. Return structured response (200 OK or 500 Internal Server Error)

**Step 4: Testing**
1. Write service layer unit tests (team aggregation edge cases)
2. Write explanation builder unit tests (tag sorting edge cases)
3. Write controller integration tests (route-level HTTP tests)
4. Write privacy validation tests (response payload auditing)

### Potential Gotchas

1. **Members without profiles:** Don't assume all team members have Big Five data - check for null/undefined trait values
2. **Division by zero:** If no eligible members, return `insufficient_profile_data` status (don't divide by zero)
3. **Rounding consistency:** Round final team score to 4 decimals (same as individual score rounding)
4. **Privacy leakage:** Audit response object carefully - easy to accidentally include member-specific data
5. **Tag score collection:** When collecting tag scores for explanation, ensure you're using normalized tag keys (same as individual calculation)
6. **Empty tag list:** Practice may have zero mapped tags - handle gracefully (empty top positive/negative arrays)

### Performance Considerations

**Expected Load:**
- Team size: 4-8 members per team (per PRD)
- Practices per team: ~10-30 practices
- API calls: Low frequency (practice catalog browsing, issue discussion views)

**Optimization Notes:**
- Individual affinity calculations are independent → could be parallelized (future optimization)
- For MVP, sequential calculation is acceptable (team size is small)
- Reference data (bounds, tag relations) already cached from Story 4.1.1
- No database queries inside pure aggregation logic (already optimized in 4.1.1)

**Caching Strategy (Post-MVP):**
- Team affinity scores could be cached with TTL (invalidate on profile updates)
- For MVP, compute on-demand (simplicity over performance)

### Reference Paths

**Epic Source:**
- `_bmad-output/planning-artifacts/epics.md` (Epic 4.1, Story 4.1.2)

**Product Requirements:**
- `_bmad-output/planning-artifacts/prd.md` (FR12B, affinity constraints)

**Architecture Guidance:**
- `_bmad-output/planning-artifacts/architecture.md` (affinity engine and API conventions)

**Technical Contract:**
- `_bmad-output/planning-artifacts/affinity-scoring-technical-contract.md` (Section 10.2 - Team API contract)

**Previous Story:**
- `_bmad-output/implementation-artifacts/4-1-1-calculate-individual-practice-affinity-score.md` (prerequisite)

**Affinity Module Code:**
- `server/src/services/affinity/affinity-scoring.ts` (pure scoring engine)
- `server/src/services/affinity/affinity-reference-data.ts` (CSV loader)
- `server/src/services/affinity/affinity.types.ts` (type definitions)
- `server/src/services/affinity.service.ts` (application service)
- `server/src/controllers/affinity.controller.ts` (existing controller to extend)
- `server/src/routes/affinity.routes.ts` (existing routes to extend)

**Database Schema:**
- `server/prisma/schema.prisma` (existing schema - no changes needed)

**Test Data:**
- `docs/tag_personality_affinity/personality_score_bounds.csv` (trait bounds)
- `docs/tag_personality_affinity/tags_personality_relation.csv` (tag-trait relations)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (via GitHub Copilot)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Implemented `getTeamPracticeAffinity()` in affinity.service.ts: loads team members, filters by Big Five profile completeness, computes individual affinity per eligible member via existing `computeIndividualPracticeAffinity()`, averages scores
- Implemented `buildTeamAffinityExplanation()` helper: collects tag scores across all eligible members, computes average per tag, returns top 3 positive and top 3 negative tags (sorted with alphabetical tie-breaker)
- Added `getTeamPracticeAffinity` controller function in affinity.controller.ts
- Added `GET /:practiceId/affinity/team` route in affinity.routes.ts (inherits `requireAuth` + `validateTeamMembership` from parent router)
- Privacy enforced by design: team response built from scratch with only aggregated data (score, counts, tag names). No traitContributions, no member IDs, no per-member scores
- Story delivered with 27 implementation tests across service/controller/route layers (16 + 6 + 5)
- Code-review follow-up fixes applied:
   - Added empty practice tags edge-case test at team level (`insufficient_profile_data`)
   - Added service contract test for global-or-team practice visibility query shape
   - Added route-level downstream contract test for coverage-first, affinity-second consumers
- Current affinity suite status after follow-up: 72 passed, 0 failed

### Change Log

- 2026-03-09: Story 4.1.2 implementation complete. Added team affinity aggregation service, controller, route, and 16 tests across 3 test files.
- 2026-03-09: Code review remediation applied. Added 3 tests (service edge case + service contract + downstream route contract), clarified recommendation compatibility assumptions, and finalized story status.

### File List

**Modified:**
- `server/src/services/affinity.service.ts` — Added `getTeamPracticeAffinity()` and `buildTeamAffinityExplanation()` helper
- `server/src/controllers/affinity.controller.ts` — Added `getTeamPracticeAffinity` controller
- `server/src/routes/affinity.routes.ts` — Added `/:practiceId/affinity/team` route
- `server/src/controllers/affinity.controller.test.ts` — Added 6 team controller tests
- `server/src/routes/affinity.routes.test.ts` — Added 5 team route integration tests, added `findMany` to prisma mock
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Status updated to review
- `_bmad-output/implementation-artifacts/4-1-2-calculate-team-practice-affinity-score.md` — Story file updated
- `server/src/routes/affinity.routes.test.ts` — Added downstream compatibility contract assertion for recommendation consumers

**New:**
- `server/src/services/affinity.service.test.ts` — 12 unit tests for team aggregation + privacy + explanation builder (including empty tags and global/team visibility contract)
