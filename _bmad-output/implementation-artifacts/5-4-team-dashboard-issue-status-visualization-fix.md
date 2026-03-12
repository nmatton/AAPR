# Story 5.4: Team Dashboard Issue Status Visualization Fix

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want to see the "Adaptation in progress" and "Evaluated" statuses correctly rendered on the Dashboard,
So that the issue status bar and legend accurately reflect reality.

## Acceptance Criteria

1. **Given** I view the Team Dashboard
   **When** the issue status bar renders
   **Then** the legend includes "Adaptation in progress" and "Evaluated"
   **And** the bar correctly colors these sections instead of leaving them gray

2. **Given** an issue transitions to "Evaluated"
   **When** I view the dashboard
   **Then** the aggregation logic correctly counts and displays it

## Tasks / Subtasks

- [x] Task 1: Fix Team Dashboard issue stats visualization for all statuses
  - [x] Subtask 1.1: Update `client/src/features/teams/components/TeamIssueStatsCard.tsx` to render five bar segments, not three.
  - [x] Subtask 1.2: Add visual segments for `adaptation_in_progress` and `evaluated` using distinct colors.
  - [x] Subtask 1.3: Expand legend labels to include counts for both statuses.
  - [x] Subtask 1.4: Ensure the width math includes all status buckets and remains safe for `total = 0`.

- [x] Task 2: Align front-end stats typing and assumptions with backend contract
  - [x] Subtask 2.1: Verify `IssueStats.byStatus` contract in `client/src/features/issues/api/issuesApi.ts` remains `{ open, in_progress, adaptation_in_progress, evaluated, done }`.
  - [x] Subtask 2.2: Verify `server/src/services/issue.service.ts#getIssueStats` mapping still maps `ADAPTATION_IN_PROGRESS` and `EVALUATED` correctly.
  - [x] Subtask 2.3: If drift is found, fix mapping/tests before UI changes to avoid false dashboard values.

- [x] Task 3: Add and update tests to prevent regression
  - [x] Subtask 3.1: Update `client/src/features/teams/components/TeamIssueStatsCard.test.tsx` fixtures to include `adaptation_in_progress` and `evaluated`.
  - [x] Subtask 3.2: Add assertions that legend text includes both statuses.
  - [x] Subtask 3.3: Add assertions that all status counts are represented when data includes non-zero values.
  - [x] Subtask 3.4: Keep existing navigation and error-state tests green.

- [x] Task 4: Optional backend safety tests (if gaps are identified)
  - [x] Subtask 4.1: Ensure `server/src/services/issue.service.test.ts` covers `getIssueStats` mapping for all five status buckets.
  - [x] Subtask 4.2: Ensure no status is silently dropped when new enum values are introduced.

### Review Follow-ups (AI)

- [x] [AI-Review][High] Replace abbreviated legend labels with the required human-readable labels for `adaptation_in_progress` and `evaluated` in `client/src/features/teams/components/TeamIssueStatsCard.tsx` so AC1 is satisfied.
- [x] [AI-Review][Medium] Make bar width calculation resilient to `total`/bucket drift, and add assertions that verify rendered segment coverage instead of only legend text in `client/src/features/teams/components/TeamIssueStatsCard.tsx` and `client/src/features/teams/components/TeamIssueStatsCard.test.tsx`.
- [x] [AI-Review][High] Implement and test a non-silent handling strategy for future unmapped issue statuses in `server/src/services/issue.service.ts` / `server/src/services/issue.service.test.ts`.

## Dev Notes

- Story 5.2 already introduced `EVALUATED` in backend stats mapping and API shape, but dashboard visualization currently only renders three categories (`open`, `in_progress`, `done`) in `TeamIssueStatsCard`.
- This story is a presentation and consistency fix across dashboard UI and tests, with a light backend verification pass.
- Maintain architecture conventions:
  - Frontend feature-first updates under `client/src/features/teams` and `client/src/features/issues`.
  - Backend business logic remains in service layer (`server/src/services/issue.service.ts`), repositories DB-only.
  - Keep structured typing, no `any` additions, and no ad hoc status strings.

### Technical Requirements

- Preserve status source-of-truth from Prisma enum in `server/prisma/schema.prisma`:
  - `OPEN`, `IN_DISCUSSION`, `ADAPTATION_IN_PROGRESS`, `EVALUATED`, `RESOLVED`.
- Preserve stats API contract consumed by dashboard:
  - `open`, `in_progress`, `adaptation_in_progress`, `evaluated`, `done`.
- Dashboard card must visually represent all buckets returned by API.
- Avoid breaking existing Team Dashboard composition in `client/src/features/teams/components/TeamDashboard.tsx`.

### Architecture Compliance

- Keep DB naming and API naming conventions intact (snake_case DB, camelCase TS/API fields as already mapped).
- Keep route/controller/service/repository boundaries unchanged.
- No schema migration needed for this story.

### Library & Framework Requirements

- Frontend: React 18.2.0 + TypeScript + Vitest.
- Backend: Node 18+, Express 4.x, Prisma 7.2.x.
- Reuse existing UI patterns and Tailwind status color approach already used in issue components.

### File Structure Requirements

- Primary expected file changes:
  - `client/src/features/teams/components/TeamIssueStatsCard.tsx`
  - `client/src/features/teams/components/TeamIssueStatsCard.test.tsx`
- Potential verification-only touch points:
  - `client/src/features/issues/api/issuesApi.ts`
  - `server/src/services/issue.service.ts`
  - `server/src/services/issue.service.test.ts`

### Testing Requirements

- Run frontend unit tests for the card and surrounding issue dashboard behavior.
- If backend files are edited, run backend unit tests for issue service status mapping.
- Validate that legend labels and segment widths match returned counts.

### Previous Story Intelligence

- From Story 5.1 and 5.2:
  - Status lifecycle and labels were extended, including `ADAPTATION_IN_PROGRESS` and `EVALUATED`.
  - Stats mapping was updated server-side in 5.2, so this story should avoid duplicating backend logic and focus on dashboard rendering parity.
  - Existing fix patterns favor explicit status mapping and test updates to avoid silent regressions.

### Git Intelligence Summary

- Recent commits mostly target practice/catalog UX and tooltip behavior, not issue dashboard stats.
- This indicates low overlap risk but increases need for story-local tests because issue dashboard can regress unnoticed while unrelated frontend work progresses.

### Latest Technical Information

- No external upgrade or migration is required for this story.
- Current workspace versions are compatible with this change scope:
  - React 18.2.0, Vite 5.x, Vitest 0.34.x
  - Express 4.22.x, Prisma 7.2.x

### Project Context Reference

- Follow project context constraints in `_bmad-output/project-context.md`:
  - Strict TypeScript mode
  - Co-located tests
  - Feature-first frontend and layered backend boundaries

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- RED phase: `npm run test -- TeamIssueStatsCard.test.tsx` initially failed on missing `adaptation_in_progress` and `evaluated` rendering/legend entries.
- GREEN phase: Updated `TeamIssueStatsCard.tsx` to render all five status buckets and safe zero-total width handling.
- Validation: `npm run test -- TeamIssueStatsCard.test.tsx` passed (5/5).
- Backend contract verification: `npm test -- issue.service.test.ts` passed (16/16), including `getIssueStats` all-bucket mapping assertions.
- Regression context: full `client` and `server` test suite runs include pre-existing failures unrelated to this story.

### Completion Notes List

- Implemented five-segment status bar rendering on Team Dashboard issue stats card (`open`, `in_progress`, `adaptation_in_progress`, `evaluated`, `done`).
- Expanded legend to include counts for all five statuses, including adaptation-in-progress and evaluated buckets.
- Updated unit tests to include full five-status fixtures and assertions for legend coverage.
- Verified frontend API typing contract already matched expected five-bucket shape.
- Verified backend `getIssueStats` mapping and tests already cover `ADAPTATION_IN_PROGRESS` and `EVALUATED` without drift.
- Applied code review fixes to use human-readable legend labels, normalize bar widths from rendered bucket totals, and fail loudly on unmapped backend statuses.
- Added regression tests covering bar segment width distribution and unsupported backend status aggregation.

### File List

- _bmad-output/implementation-artifacts/5-4-team-dashboard-issue-status-visualization-fix.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- client/src/features/teams/components/TeamIssueStatsCard.tsx
- client/src/features/teams/components/TeamIssueStatsCard.test.tsx
- server/src/services/issue.service.ts
- server/src/services/issue.service.test.ts

## Change Log

- 2026-03-12: Implemented story 5.4 dashboard status visualization fix with five-status rendering and regression tests; verified backend status contract/mapping.
- 2026-03-12: Addressed code review findings by restoring full legend labels, hardening segment width calculations, and rejecting unmapped backend status buckets with regression coverage.

## Senior Developer Review (AI)

### Reviewer

- Nmatton

### Date

- 2026-03-12

### Outcome

- Approved

### Acceptance Criteria Review

- AC1: Implemented. The card renders all five segments and the legend includes `Adaptation in progress` and `Evaluated` with counts.
- AC2: Implemented. The frontend contract and backend mapping both include `evaluated` correctly.

### Resolved Review Items

1. [Resolved] The legend now uses human-readable labels for all five statuses, including `Adaptation in progress` and `Evaluated`, and the frontend tests assert those labels.
2. [Resolved] Segment widths are now computed from the rendered bucket totals and covered by a regression test that catches drift between `total` and the bucket sum.
3. [Resolved] Backend issue stats aggregation now throws on unmapped statuses and includes a regression test proving future enum additions are not silently ignored.
