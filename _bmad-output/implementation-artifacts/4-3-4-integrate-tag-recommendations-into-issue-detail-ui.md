# Story 4.3.4: Integrate Tag Recommendations into Issue Detail UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want to see directed tag recommendations directly on the Issue Detail page,
so that I can understand which targeted adaptations may address the identified problematic tags.

## Acceptance Criteria

1. Given the Issue Detail page loads, when directed tag recommendations are successfully fetched from the backend, then a new panel appears: "Targeted Adaptations".
2. Given the "Targeted Adaptations" panel, then it displays up to 3 winning Candidate Tags.
3. Given a Candidate Tag recommendation, then the UI shows the specific Recommendation Text and Implementation Options retrieved from the tag recommendation data.
4. Given a Candidate Tag recommendation, then it visually indicates why it was suggested, including which problematic tag it resolves and its Delta Affinity improvement score via a green or grey badge.
5. Given an issue has no candidate recommendations available, then this panel remains hidden gracefully.

## Tasks / Subtasks

- [x] Add a directed-tag recommendation API surface for issue detail consumption (AC: 1, 2, 3, 4, 5)
  - [x] Add a dedicated backend controller action and route under the issue context, not the practice recommendation route.
  - [x] Reuse `getDirectedTagRecommendations(teamId, issueId)` from `server/src/services/recommendation.service.ts` instead of duplicating ranking logic.
  - [x] Extend the service response shape if needed to include recommendation text and implementation options sourced from `tag_recommendations` data.
  - [x] Return a structured API response with `items` and `requestId`, consistent with existing recommendation endpoints.
- [x] Add a frontend API client for directed tag recommendations (AC: 1, 2, 3, 4, 5)
  - [x] Add a typed client in `client/src/features/issues/api/` that fetches issue-scoped recommendations.
  - [x] Keep API/TypeScript fields camelCase and aligned with the backend DTO.
- [x] Build the "Targeted Adaptations" issue detail panel (AC: 1, 2, 3, 4, 5)
  - [x] Add a dedicated component in `client/src/features/issues/components/` instead of overloading `RecommendationWidget.tsx`, which is specific to alternative practices.
  - [x] Show up to 3 recommendation cards with candidate tag name, recommendation text, implementation options, problematic source tag, and delta badge.
  - [x] Hide the panel entirely when the API returns an empty array.
  - [x] Preserve the existing Issue Detail layout and do not regress comments, timeline, decision, evaluation, or alternative-practice widgets.
- [x] Integrate the new panel into `IssueDetailView.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Place the panel in the sidebar area where recommendation-oriented context already exists.
  - [x] Use the current loading/error handling style established by `RecommendationWidget.tsx` and `IssueDetailView.tsx`.
  - [x] Ensure standalone issues without linked practices can still render the panel if issue tags produce directed recommendations.
- [x] Add automated tests for backend and frontend behavior (AC: 1, 2, 3, 4, 5)
  - [x] Add/extend Jest coverage for the issue-scoped recommendation endpoint/controller and service hydration behavior.
  - [x] Add/extend Vitest component tests for loading, populated, and hidden-empty states.

## Dev Notes

- This story builds on Story 4.3.3, where the backend ranking engine already exists in `server/src/services/recommendation.service.ts` as `getDirectedTagRecommendations(teamId, issueId)`.
- The current Issue Detail view already contains a recommendation-oriented sidebar in `client/src/features/issues/components/IssueDetailView.tsx`, but it is wired to practice-level alternatives through `RecommendationWidget.tsx`. Story 4.3.4 should add a separate panel for issue-level, tag-driven adaptations rather than repurpose the alternative-practice widget.
- The issue detail API model in `client/src/features/issues/api/issuesApi.ts` already exposes `issue.tags`, which is a useful signal that issue-tag context is present in the UI layer.
- The directed recommendation engine currently returns explainability fields: candidate tag, source problematic tag, absolute affinity, delta score, and reason. It does not yet expose the recommendation text / implementation options required by this story, so the backend contract likely needs a hydration step against the recommendation data seeded in Story 4.3.2.

### Project Structure Notes

- Follow frontend feature-first structure documented in architecture: `features/issues/{components,api}`.
- Keep backend layering intact: routes -> controllers -> services -> repositories/Prisma access.
- Do not put issue-scoped directed recommendation UI into shared `ui/` unless it becomes multi-feature reuse.
- Preserve snake_case in DB and camelCase in API/TypeScript.

### Technical Requirements

- Reuse the existing directed engine in `server/src/services/recommendation.service.ts`; do not reimplement delta ranking in the controller or frontend.
- Add a new issue-scoped endpoint such as `/api/v1/teams/:teamId/issues/:issueId/recommendations/directed` or equivalent issue-nested path consistent with existing route patterns.
- Validate path params and emit structured errors using `{ code, message, details?, requestId }` conventions already used by recommendation controllers.
- Keep response payloads minimal and action-oriented for the dev agent: top 3 results max, already sorted by service.
- Hydrate recommendation records with the human-readable implementation content from the seeded recommendation source instead of hardcoding UI copy.
- Support issues with zero linked practices. The story is driven by issue tags, not by `issue.practices`.

### Architecture Compliance

- Frontend must remain in React 18.2 + TypeScript strict mode and follow existing component/testing conventions from project context.
- Backend must remain Express + TypeScript with thin controllers and business logic inside services.
- Maintain requestId propagation and structured error handling.
- No new state library or fetch abstraction should be introduced; use the existing `apiClient` pattern.
- Keep desktop-first layout assumptions; no responsive redesign is needed beyond preserving current desktop behavior.

### Library / Framework Requirements

- Frontend: React hooks, existing `apiClient`, Tailwind utility styling, Vitest + Testing Library.
- Backend: Express controller/route pattern, Prisma-backed service access, Jest tests.
- Continue using existing date/rendering/tooling already present in the issue detail feature; do not introduce a new markdown, data-fetching, or state-management dependency.

### File Structure Requirements

- Primary frontend touchpoints:
  - `client/src/features/issues/components/IssueDetailView.tsx`
  - new directed recommendation component under `client/src/features/issues/components/`
  - new API client under `client/src/features/issues/api/`
- Primary backend touchpoints:
  - `server/src/services/recommendation.service.ts`
  - `server/src/controllers/recommendation.controller.ts` or a dedicated issue recommendation controller if clearer
  - issue or recommendation route registration under `server/src/routes/`
- Keep tests co-located with the feature/service patterns already used:
  - `client/src/features/issues/components/__tests__/`
  - `server/src/services/recommendation.service.test.ts`

### Testing Requirements

- Backend tests must cover:
  - empty result when an issue has no tags or no candidates
  - hydration of recommendation text / implementation options
  - sort order preserved from delta engine
  - negative-affinity guardrail remains intact
- Frontend tests must cover:
  - loading state
  - populated state with up to 3 cards
  - hidden or absent panel on empty result
  - rendering of problematic tag provenance and delta badge
- Prefer extending existing recommendation test suites where they already exercise related behavior.

### Previous Story Intelligence

- Story 4.3.3 is not yet represented by a generated implementation artifact file, but the code is present and in `review` in sprint status. Treat its existing service implementation as the source of truth and avoid changing the ranking semantics unless a bug is found.
- The current engine already deduplicates by candidate tag and keeps the best provenance pair, so the UI should assume one displayed problematic tag per candidate tag recommendation.
- The service currently returns all sorted results; the UI or endpoint can clamp to 3, but the contract should stay explicit and tested.

### Git Intelligence Summary

- Existing recommendation work is split cleanly between practice-level alternative recommendations and issue detail UI composition. Preserve that separation.
- Current UI patterns favor isolated widgets with self-contained loading/error states. Matching that pattern will reduce regression risk in `IssueDetailView.tsx`.

### Latest Tech Information

- No external web research is required for this story beyond the project's locked stack. Follow the repository's documented React 18.2, TypeScript 5.2+, Express 4.18+, and Prisma conventions from project context.

### References

- Source story requirements: `_bmad-output/planning-artifacts/epics.md` - Epic 4.3, Story 4.3.4
- Issue detail UI: `client/src/features/issues/components/IssueDetailView.tsx`
- Existing alternative practice widget: `client/src/features/issues/components/RecommendationWidget.tsx`
- Issue detail API types: `client/src/features/issues/api/issuesApi.ts`
- Existing recommendation controller pattern: `server/src/controllers/recommendation.controller.ts`
- Directed tag engine: `server/src/services/recommendation.service.ts`
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md`
- UX guidance: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Project implementation rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Story created from BMAD create-story workflow inputs on 2026-03-24.
- 2026-03-24: Implemented issue-scoped directed recommendation endpoint, UI panel, and automated tests for targeted adaptations.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added an issue-level directed recommendation API that reuses the existing delta engine and hydrates recommendation text plus implementation examples from seeded tag recommendation data.
- Added a dedicated Targeted Adaptations sidebar panel with loading, error, populated, and hidden-empty behavior while preserving the existing practice recommendation widgets.
- Verified targeted validation with 34 passing Jest tests for recommendation services and 7 passing Vitest tests for issue detail and targeted adaptations UI.
- Added dedicated controller coverage for `getIssueDirectedRecommendations`, including validation, requestId propagation, service forwarding, and top-3 response clamping.
- Added frontend error-state coverage for `TargetedAdaptationsPanel` and aligned panel behavior with backend-owned top-3 limiting.
- Updated recommendation hydration so multiline seeded implementation examples are converted into multiple `implementationOptions` entries.

### File List

- _bmad-output/implementation-artifacts/4-3-4-integrate-tag-recommendations-into-issue-detail-ui.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- client/src/features/issues/api/issuesApi.ts
- client/src/features/issues/components/IssueDetailView.tsx
- client/src/features/issues/components/TargetedAdaptationsPanel.tsx
- client/src/features/issues/components/__tests__/IssueDetailView.test.tsx
- client/src/features/issues/components/__tests__/TargetedAdaptationsPanel.test.tsx
- server/src/controllers/recommendation.controller.test.ts
- server/src/controllers/recommendation.controller.ts
- server/src/routes/issues.routes.ts
- server/src/services/recommendation.service.test.ts
- server/src/services/recommendation.service.ts
