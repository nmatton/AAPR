# Story 2.1.1: Optimize Coverage Visualization (3 Categories per Row)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want coverage by category displayed in a compact 3-then-2 grid with drill-down,
so that I can scan strengths and gaps quickly and open details without losing context.

## Acceptance Criteria

1. Coverage details render five category cards in a grid: first row shows three categories, second row shows two, with graceful fallback to 2/row and 1/row on narrower viewports.
2. Each card shows category name, coverage percent, compact progress bar, and optional tiny pillar indicators; cards use color coding (≥75% green, 50–74% yellow, <50% red) and warning icon for <50%.
3. Clicking a card expands or opens a popover with full pillar breakdown (covered vs gaps), including which practices cover each pillar and a link to view available practices in that category.
4. Grid and cards update in real time when practices are added/removed; loading states and errors surface from `useCoverageStore` without leaving stale data.
5. CTA to filter catalog (`View Available Practices`) is present when coverage <50% for a category and routes to catalog filtered by that category.
6. Interactions are keyboard-accessible (focus order, role/aria-label where needed) and covered by component tests for layout, color logic, and warning rendering thresholds.

## Tasks / Subtasks

- [x] UI: Implement responsive grid (3/2 layout, fallback to 2/1) around category cards in coverage detail view.
- [x] Card content: Ensure category name, percent, bar, and mini pillar markers are compact; keep existing badge/warning logic aligned with color thresholds.
- [x] Interaction: Card click toggles expanded detail or popover with covered/gap pillars and practices; wire `View Available Practices` to catalog filter for the category.
- [x] Data flow: Keep `useCoverageStore` as source; ensure `categoryBreakdown` and updates from `/api/v1/teams/{teamId}/coverage/pillars` drive the UI without stale state.
- [x] Accessibility: Add aria labels/roles for cards, progress, and buttons; ensure keyboard activation works.
- [x] Tests: Extend `CategoryCoverageBreakdown.test.tsx` for grid rendering counts, color thresholds, warning display (<50%), CTA visibility, and navigation handler.

## Dev Notes

- Existing components and state to reuse: [client/src/features/teams/components/CategoryCoverageBreakdown.tsx](client/src/features/teams/components/CategoryCoverageBreakdown.tsx), [client/src/features/teams/components/CoverageSidebar.tsx](client/src/features/teams/components/CoverageSidebar.tsx), [client/src/features/teams/state/coverageSlice.ts](client/src/features/teams/state/coverageSlice.ts), [client/src/features/teams/api/coverageApi.ts](client/src/features/teams/api/coverageApi.ts), [client/src/features/teams/types/coverage.types.ts](client/src/features/teams/types/coverage.types.ts).
- Data contract: `getTeamPillarCoverage` returns `categoryBreakdown` with `coveragePct`, `coveredPillars`, `gapPillars`, and optional `practices`; keep requestId if surfaced for tracing.
- Navigation: `CoverageSidebar` currently links to `/teams/{teamId}/practices/manage`; ensure any new detail view or CTA routes there or to catalog filter without breaking existing route guards.
- Performance: Keep interactions light—reuse existing store data, avoid redundant fetches, and preserve loading/error states already in the slice.
- Accessibility/UX: Maintain sticky sidebar for summary, but ensure expanded detail respects desktop-first layout; include focus styles and aria labels on interactive cards and buttons.
- Documentation: If UI/route changes affect coverage views or catalog filters, update `docs/06-frontend.md` and `docs/09-changelog.md` with layout, routes, and interaction changes.

### Project Structure Notes

- Feature-first: keep coverage UI within `features/teams/components` with state in `features/teams/state` and API in `features/teams/api`.
- Tests co-located: extend [client/src/features/teams/components/CategoryCoverageBreakdown.test.tsx](client/src/features/teams/components/CategoryCoverageBreakdown.test.tsx).
- Styling: TailwindCSS 3.3+ utilities; avoid inline styles except dynamic widths for bars; prefer semantic containers for grid.

### References

- Coverage API and state: [client/src/features/teams/api/coverageApi.ts](client/src/features/teams/api/coverageApi.ts), [client/src/features/teams/state/coverageSlice.ts](client/src/features/teams/state/coverageSlice.ts).
- Architecture guardrails and tech constraints: [_bmad-output/project-context.md](_bmad-output/project-context.md), [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md), [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md), [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

- N/A (implementation completed successfully)

### Completion Notes List

- ✅ Implemented responsive grid layout (3 columns desktop, 2 tablet, 1 mobile) using Tailwind classes
- ✅ Refactored category cards for compact design with large percentage, compact progress bar (h-2), and tiny pillar indicators (2x2px dots)
- ✅ Maintained existing drill-down interaction with improved card-based UI
- ✅ [View Available Practices] CTA displays only for categories <50% coverage
- ✅ Added comprehensive accessibility features: aria-labels, aria-expanded, keyboard navigation (Enter/Space), progress bar attributes
- ✅ Extended test suite to 18 tests covering grid layout, color thresholds, warning display, keyboard interaction, CTA visibility, and aria attributes
- ✅ All tests passing (18/18)
- ✅ Documentation updated in docs/06-frontend.md and docs/09-changelog.md
- ✅ Component maintains existing data flow via useCoverageStore with real-time updates
- ✅ UX improvements: faster visual scanning, clearer information hierarchy, better responsiveness
- 🔧 Added Coverage Details route/page with `useCoverageStore` loading/error handling
- 🔧 Wired Coverage sidebar and CTA navigation to category-filtered catalog view
- 🔧 Added category query filter handling in Manage Practices view
- 🔧 Simplified keyboard interaction to native button semantics
- 🔧 Updated component tests and documentation to reflect coverage drill-down flow

### File List

- client/src/features/teams/components/CategoryCoverageBreakdown.tsx (modified)
- client/src/features/teams/components/CategoryCoverageBreakdown.test.tsx (modified)
- client/src/features/teams/components/CoverageSidebar.tsx (modified)
- client/src/features/teams/pages/CoverageDetailsView.tsx (added)
- client/src/features/teams/pages/ManagePracticesView.tsx (modified)
- client/src/App.tsx (modified)
- docs/06-frontend.md (modified)
- docs/09-changelog.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/2-1-1-optimize-coverage-visualization-3-categories-per-row.md (modified)
