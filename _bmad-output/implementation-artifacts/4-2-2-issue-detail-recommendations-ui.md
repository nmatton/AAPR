# Story 4.2.2: Issue Detail Recommendations UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer with a practice difficulty,
I want to see system-generated recommendations for alternative practices that cover the same or missing pillars and are compatible with my team's affinity profile when available,
so that I can discuss evidence-informed adaptations with my team without friction.

## Acceptance Criteria

1. **Sidebar Widget**: The Issue Detail view must include a new section titled "Alternative Practices".
2. **Endpoint Integration**: The component must fetch practices using `GET /api/v1/teams/:teamId/practices/:practiceId/recommendations`.
3. **Display Constraints**: Show up to 3 recommended practices.
4. **Content**: Each listed practice must display:
   - Practice name.
   - Affinity score difference (if available/applicable).
   - A brief generated rationale (e.g., "Covers the same pillars, higher team fit").
5. **Interaction**: Clicking a recommendation should open the practice details (via a modal or navigation to the catalog).
6. **Graceful Degradation**: 
   - Handle loading states smoothly (spinners/skeletons).
   - Hide the widget or display a friendly message if no recommendations exist or if the endpoint fails.

## Tasks / Subtasks

- [x] Task 1: Create Recommendations Component (AC: 1, 4)
  - [x] Implement `RecommendationWidget` React component.
  - [x] Design card layout for recommended practices showing name, affinity delta, and rationale using TailwindCSS.
- [x] Task 2: Data Fetching Integration (AC: 2, 3, 6)
  - [x] Integrate fetching from `GET /api/v1/teams/:teamId/practices/:practiceId/recommendations`.
  - [x] Implement loading skeleton and error boundaries.
  - [x] Handle empty states gracefully.
- [x] Task 3: Interaction and Routing (AC: 5)
  - [x] Make recommendation cards clickable.
  - [x] Wire up navigation via React Router to view full practice details.
- [x] Task 4: Testing
  - [x] Write Vitest/React Testing Library component tests for rendering, loading states, and interactions.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - Integrate with the existing UI component library and styling frameworks (React + Tailwind).
  - The endpoint exists at `GET /api/v1/teams/:teamId/practices/:practiceId/recommendations`.
  - Ensure the UI correctly uses `teamId` and `practiceId` from the route params to fetch data.
  - Error handling: ensure UI gracefully handles 404s or empty arrays returned by the API backend.
- **Source tree components to touch**:
  - `client/src/features/issues/components/IssueDetailView.tsx` (modified to integrate widget).
  - New component in `client/src/features/issues/components/` (e.g., `RecommendationWidget.tsx`) — co-located with issues since recommendations are only consumed here.
  - API calling services in `client/src/features/issues/api/`.

### Project Structure Notes

- Widget co-located in `features/issues` rather than `features/recommendations` because it is only used in the issues feature (per architecture: "keep inside feature to prevent coupling").

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-10.md]
- [Source: _bmad-output/planning-artifacts/epics.md]

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

- Created `RecommendationWidget` component with loading skeleton (3 animated placeholders), error state (amber banner), empty state ("No alternative practices available"), and recommendation cards showing practice title, affinity score badge (color-coded ≥75% green, ≥50% blue, <50% gray), and rationale text.
- Created `recommendationsApi.ts` following existing `apiClient` pattern to fetch from `GET /api/v1/teams/:teamId/practices/:practiceId/recommendations`.
- Integrated widget into `IssueDetailView.tsx` sidebar — one widget per linked practice, placed below the timeline panel.
- Clicking a recommendation card opens the existing `PracticeDetailSidebar` via URL search params (same pattern as clicking linked practices).
- Added recommendations API mock to existing `IssueDetailView.test.tsx` to prevent regression.
- 7 comprehensive tests covering: loading skeleton, card rendering (name + affinity% + rationale), max 3 display constraint, empty state, error state, click interaction, correct API params.
- Pre-existing test failure in `IssueDetailView.test.tsx` (`getByText('OPEN')` vs rendered label `'Open'`) is unrelated to this story.

### Change Log

- 2026-03-10: Implemented story 4.2.2 — Alternative Practices widget on Issue Detail view.
- 2026-03-10: Code review fixes — added affinityDelta to API response & UI (AC 4 compliance), fixed isPracticeInTeam derivation for recommendation clicks (AC 5), fixed broken IssueDetailView test assertions, improved test coverage (>3 capping, multi-widget rendering).

### Senior Developer Review (AI)

**Reviewer:** Nmatton on 2026-03-10
**Outcome:** Approved with fixes applied

**Issues Found & Fixed (6 total):**
- [H1] AC 4 partial — affinity score displayed as absolute instead of delta → Added `affinityDelta` to backend + frontend
- [H2] AC 5 fragile — `isPracticeInTeam` hardcoded `true` for sidebar → Derived from linked practices array
- [H3] Pre-existing test failure — `'OPEN'`/`'HIGH'` assertions vs rendered `'Open'`/`'High'` labels → Fixed
- [M1] Feature folder discrepancy — story noted `features/recommendations/` but code in `features/issues/` → Updated docs (co-location justified per architecture)
- [M2] Weak >3 capping test — only 3 items in test data → Added test with 5 items asserting only 3 render
- [M3] No multi-widget test — N widgets per linked practice untested → Added test verifying API calls per practice

**Issues Not Fixed (2 LOW):**
- [L1] AffinityBadge boundary values not exercised in tests
- [L2] `goal`/`categoryId` fields fetched but unused on client

### File List

- client/src/features/issues/api/recommendationsApi.ts [NEW → MODIFIED: added affinityDelta]
- client/src/features/issues/components/RecommendationWidget.tsx [NEW → MODIFIED: delta badge]
- client/src/features/issues/components/__tests__/RecommendationWidget.test.tsx [NEW → MODIFIED: delta mocks, >3 test]
- client/src/features/issues/components/IssueDetailView.tsx [MODIFIED: isPracticeInTeam fix]
- client/src/features/issues/components/__tests__/IssueDetailView.test.tsx [MODIFIED: fixed assertions, multi-widget test]
- server/src/services/recommendation.service.ts [MODIFIED: affinityDelta in response]
