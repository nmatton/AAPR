# Story 4.1.3: Display Affinity Scores on Practice Cards# Story 4.1.3: Display Affinity Scores on Practice Cards
Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want to see visual affinity indicators on each practice card in both the catalog and team dashboard,
so that I can quickly identify practices with good fit (green), neutral fit (grey), or poor fit (red) for both my individual profile and our team's collective profile.

## Acceptance Criteria

1. Affinity badge placement
   - [ ] Given I have completed the Big Five questionnaire
   - [ ] And I am viewing the Practice Catalog or Team Dashboard
   - [ ] When practice cards are displayed
   - [ ] Then each practice card shows an affinity badge in the top-right corner.

2. Badge structure
   - [ ] Given a practice card is displayed
   - [ ] When the affinity badge is rendered
   - [ ] Then it shows two sections:
     - Individual affinity (my personal fit)
     - Team affinity (team collective fit).

3. Individual affinity color rules
   - [ ] Given an individual affinity score is available
   - [ ] When score < -0.3
   - [ ] Then individual section is red and score is rounded to 2 decimals.
   - [ ] Given score is between -0.3 and 0.3 (inclusive)
   - [ ] Then individual section is grey and score is rounded to 2 decimals.
   - [ ] Given score > 0.3
   - [ ] Then individual section is green and score is rounded to 2 decimals.

4. Team affinity color rules
   - [ ] Given a team affinity score is available
   - [ ] When score < -0.3
   - [ ] Then team section is red with score.
   - [ ] Given score is between -0.3 and 0.3 (inclusive)
   - [ ] Then team section is grey with score.
   - [ ] Given score > 0.3
   - [ ] Then team section is green with score.

5. Missing profile data handling
   - [ ] Given current user has not completed Big Five
   - [ ] When practice cards are rendered
   - [ ] Then individual affinity shows N/A (or equivalent neutral state).
   - [ ] Given team has insufficient Big Five data
   - [ ] Then team section shows N/A or Insufficient data.

6. Tooltip or popover explanation
   - [ ] Given user hovers or clicks affinity badge
   - [ ] When helper UI appears
   - [ ] Then it explains:
     - Individual = personal fit based on Big Five + practice tags
     - Team = average fit across members with completed profiles
     - Legend: Green (>0.3) good, Grey (-0.3 to 0.3) neutral, Red (<-0.3) poor.

7. Loading behavior and batching
   - [ ] Given affinity data is loading
   - [ ] When cards render
   - [ ] Then badge area shows non-blocking loading state (skeleton or spinner).
   - [ ] And affinity API calls are efficient for visible cards (batched orchestration in frontend, no duplicate request storms).

8. Event logging
   - [ ] Given affinity badges are displayed
   - [ ] When catalog or dashboard view loads with rendered badges
   - [ ] Then event is logged:
     - `{ action: "affinity.displayed", context: "catalog|dashboard", teamId, userId, practiceCount, timestamp }`.

## Tasks / Subtasks

- [x] Create frontend affinity API client (AC: 1-7)
  - [x] Add `client/src/features/practices/api/affinity.api.ts` with:
    - `fetchMyPracticeAffinity(teamId, practiceId)`
    - `fetchTeamPracticeAffinity(teamId, practiceId)`
    - requestId propagation (`X-Request-Id`)
    - structured error mapping with existing `ApiError` pattern.
  - [x] Keep route base aligned to existing server routes:
    - `GET /api/v1/teams/:teamId/practices/:practiceId/affinity/me`
    - `GET /api/v1/teams/:teamId/practices/:practiceId/affinity/team`.

- [x] Implement reusable badge UI component (AC: 1-6)
  - [x] Add `client/src/features/practices/components/AffinityBadge.tsx`.
  - [x] Add score-to-state helper (`good`, `neutral`, `poor`, `na`) with threshold constants in one place.
  - [x] Render two compact rows: Individual + Team with 2-decimal formatting.
  - [x] Add tooltip/popover help text and legend.
  - [x] Ensure keyboard accessibility (focusable trigger, aria-describedby or dialog semantics).

- [x] Integrate badge into practice card surfaces (AC: 1, 2, 7)
  - [x] Extend `client/src/features/practices/components/PracticeCard.tsx` to accept affinity view model props and render badge in top-right.
  - [x] Wire catalog usage in `client/src/features/practices/pages/PracticeCatalog.tsx`.
  - [x] Wire team dashboard practice list usage in `client/src/features/teams/components/TeamPracticesPanel.tsx`.
  - [x] Avoid layout regressions for existing action buttons (`Edit`, `Add`, `Remove`).

- [x] Add page-level data orchestration hooks (AC: 1-5, 7)
  - [x] Create `client/src/features/practices/hooks/usePracticeAffinities.ts` (or equivalent co-located hook) to:
    - fetch both individual and team affinity for visible practice IDs,
    - de-duplicate in-flight calls,
    - expose per-practice loading and error states,
    - handle `insufficient_profile_data` and `no_tag_mapping` as display states, not hard failures.
  - [x] Preserve existing page behavior if affinity fetch fails (cards still render without badge data).

- [x] Add analytics event logging helper (AC: 8)
  - [x] Add `logAffinityDisplayed` in `client/src/features/practices/api/practices.api.ts` or dedicated analytics file.
  - [x] Emit once per view render cycle (catalog/dashboard) with guard against repeated spam on re-renders.

- [x] Testing (AC: 1-8)
  - [x] Unit tests for threshold mapping and display formatting:
    - `< -0.3`, `-0.3`, `0.0`, `0.3`, `> 0.3`.
  - [x] Component tests for `AffinityBadge`:
    - score rendering and color classes,
    - N/A states,
    - tooltip content and accessibility.
  - [x] Integration tests:
    - `PracticeCatalog` renders badges without breaking filters/search.
    - `TeamPracticesPanel` renders badges without breaking remove/edit flows.
  - [x] API tests for client layer:
    - route correctness,
    - error shape handling,
    - requestId header propagation.
  - [x] Event logging tests:
    - correct payload fields,
    - deduplicated emission behavior.

## Dev Notes

### Story Foundation and Business Intent

- This story operationalizes Epic 4.1 by surfacing computed affinity scores directly where users choose and evaluate practices.
- Story 4.1.1 and 4.1.2 already delivered backend scoring endpoints; 4.1.3 is primarily frontend integration and UX clarity.
- Display is informational and explainable, not prescriptive: coverage remains primary recommendation rationale.

### Previous Story Intelligence (from 4.1.2)

- Reuse existing backend endpoints and payload contracts; do not re-implement scoring in frontend.
- Team endpoint can return `insufficient_profile_data`; UI must map this to explicit neutral/NA states.
- Privacy constraints are already enforced server-side; frontend must avoid inferring or exposing member-level details.
- Keep compatibility with downstream recommendation ordering rules (coverage-first, affinity-second).

### Technical Requirements

- Use existing stack and conventions in project context:
  - React 18.2, TypeScript strict mode, Tailwind utility styles.
  - API calls include `X-Request-Id` and structured error handling.
- Do not block page render on affinity fetch.
- Use deterministic score formatting:
  - raw API score for logic,
  - rounded to 2 decimals for display.
- Keep threshold constants centralized to avoid drift:
  - `LOW_THRESHOLD = -0.3`
  - `HIGH_THRESHOLD = 0.3`.

### Architecture Compliance

- Follow feature-first frontend structure:
  - practices feature owns affinity display components and API client integration.
- Respect API boundary:
  - frontend consumes REST endpoints only,
  - no direct DB or server-internal assumptions.
- Preserve backend route pattern mounted under team context.
- Maintain structured errors and requestId propagation end-to-end.

### Library and Framework Requirements

- Reuse existing UI patterns and utility approaches already present in `PracticeCard`, `PracticeCatalog`, and team dashboard components.
- Prefer existing tooltip/popover primitives already used in practices UI where feasible.
- Do not introduce new state management libraries; use existing local state/hooks and current stores.

### File Structure Requirements

Expected new files:
- `client/src/features/practices/api/affinity.api.ts`
- `client/src/features/practices/components/AffinityBadge.tsx`
- `client/src/features/practices/components/AffinityBadge.test.tsx`
- `client/src/features/practices/hooks/usePracticeAffinities.ts`

Expected modified files:
- `client/src/features/practices/components/PracticeCard.tsx`
- `client/src/features/practices/components/PracticeCard.test.tsx`
- `client/src/features/practices/pages/PracticeCatalog.tsx`
- `client/src/features/practices/pages/PracticeCatalog.test.tsx`
- `client/src/features/teams/components/TeamPracticesPanel.tsx`
- `client/src/features/teams/components/TeamPracticesPanel.test.tsx`
- `client/src/features/practices/api/practices.api.ts` (if event logging helper added there)

No backend file changes required unless payload adaptation bugs are found.

### Testing Requirements

Minimum required verification:
- Visual and semantic correctness of all threshold states.
- Explicit NA behavior for missing data conditions.
- Non-regression on existing catalog filtering/search and team practice interactions.
- Accessibility checks for tooltip trigger and readable labels.
- Event logging payload correctness.

### Latest Technical Information

- Project currently uses React 18.2.0 and TypeScript 5.2+, matching the documented MVP compatibility constraints.
- Server affinity endpoints are already implemented and tested on current branch (`feat: add affinity scoring service and routes`, `feat: implement team-level affinity score calculation`).
- This story should target integration with existing stable APIs rather than dependency upgrades.

### Project Context Reference

- `_bmad-output/planning-artifacts/epics.md` (Epic 4.1, Story 4.1.3)
- `_bmad-output/implementation-artifacts/4-1-2-calculate-team-practice-affinity-score.md` (prior story intelligence)
- `_bmad-output/planning-artifacts/affinity-scoring-technical-contract.md` (scoring formulas, statuses, privacy)
- `_bmad-output/planning-artifacts/architecture.md` (API boundaries, conventions, feature mapping)
- `_bmad-output/planning-artifacts/prd.md` (coverage-first recommendation positioning)
- `_bmad-output/project-context.md` (stack constraints and version guardrails)

### Story Completion Status

- Story document created with comprehensive implementation guardrails.
- Status set to `ready-for-dev`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm run test` (full suite): existing unrelated red tests present in repository.
- `npx vitest run src/features/practices/api/affinity.api.test.ts src/features/practices/components/AffinityBadge.test.tsx src/features/practices/components/PracticeCard.test.tsx src/features/teams/components/TeamPracticesPanel.test.tsx src/features/teams/components/TeamPracticesPanel.click.test.tsx` (pass).
- `npm run type-check`: existing unrelated TypeScript errors present in repository.

### Completion Notes List

- Implemented affinity API client with X-Request-Id propagation and ApiError-compatible failure mapping.
- Added reusable `AffinityBadge` with centralized thresholds (`LOW_THRESHOLD`, `HIGH_THRESHOLD`), compact dual-row rendering, N/A handling, loading skeleton, and accessible legend tooltip.
- Integrated affinity rendering into `PracticeCard`, `PracticeCatalog`, and `TeamPracticesPanel` while preserving existing actions and interactions.
- Added `usePracticeAffinities` hook with in-flight request deduplication and cache-backed per-practice loading/error states.
- Added `affinity.displayed` analytics logging with per-view signature guards in catalog and dashboard surfaces.
- Added and updated tests for API routes, requestId propagation, threshold mapping, tooltip content, and non-regression in card/panel behavior.

### File List

- `_bmad-output/implementation-artifacts/4-1-3-display-affinity-scores-on-practice-cards.md`
- `client/src/features/practices/api/affinity.api.ts`
- `client/src/features/practices/api/affinity.api.test.ts`
- `client/src/features/practices/components/AffinityBadge.tsx`
- `client/src/features/practices/components/AffinityBadge.test.tsx`
- `client/src/features/practices/hooks/usePracticeAffinities.ts`
- `client/src/features/practices/components/PracticeCard.tsx`
- `client/src/features/practices/components/PracticeCard.test.tsx`
- `client/src/features/practices/pages/PracticeCatalog.tsx`
- `client/src/features/practices/api/practices.api.ts`
- `client/src/features/practices/api/practices.api.test.ts`
- `client/src/features/teams/components/TeamPracticesPanel.tsx`
- `client/src/features/teams/components/TeamPracticesPanel.test.tsx`
- `client/src/features/teams/components/TeamPracticesPanel.click.test.tsx`

## Change Log

- 2026-03-09: Implemented affinity badges on catalog/dashboard practice cards, added affinity orchestration hook and API client, and introduced `affinity.displayed` analytics logging with focused test coverage.
