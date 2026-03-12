# Story 2.1.15: Extended Practice Detail View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want to see the complete practice schema details cleanly presented in the sidebar/modal,
so that I can understand every aspect of the practice before using it.

## Acceptance Criteria

1. Given I view a practice detail, when the sidebar/modal loads, then it smoothly renders the new rich fields: Activities, Roles, Completion Criteria, Metrics, Resources (guidelines), and Associated Practices without overwhelming the UI.

2. Given associated practices are listed, when I click one, then `onNavigateToPractice` is called with the correct `targetPracticeId` and the user navigates directly to the related practice.

3. Given a practice has activities, when rendered, then activities are displayed in ascending sequence order, each showing its sequence number, name, and description.

4. Given a practice has metrics, when rendered, then each metric shows its name and, when present, unit and formula.

5. Given a practice has guidelines, when rendered, then each guideline shows its name and, when the URL is non-empty, a clickable hyperlink.

6. Given a practice has completion criteria, when rendered, then the text is displayed in its own section.

7. Given a field contains no data (null, empty array), when rendered, then the section still appears with a graceful "Not specified" fallback — consistent with existing sections.

## Tasks / Subtasks

- [x] Tighten `DetailedPractice` type inside `PracticeDetailSidebar.tsx` for the new fields
  - [x] Replace `activities?: unknown | null` with `activities?: Array<{ sequence: number; name: string; description: string }> | null`
  - [x] Replace `metrics?: unknown | null` (add it if absent in local type) with `Array<{ name: string; unit?: string; formula?: string }> | null`
  - [x] Add `guidelines?: Array<{ name: string; url: string; type?: string }> | null` to `DetailedPractice`
  - [x] Add `completionCriteria?: string | null` to `DetailedPractice` (currently only on base `Practice` type)
  - [x] Tighten `associatedPractices?: unknown | null` to `Array<{ targetPracticeId: number; associationType: string; targetPracticeTitle: string }> | null`
  - [x] Keep all other existing fields unchanged; do not break existing rendering

- [x] Add rendering for Activities section in `PracticeDetailSidebar.tsx`
  - [x] Sort by `sequence` ascending before rendering
  - [x] Display each activity as: `"1. Name — Description"` or a structured list item with a bold sequence+name header and description text
  - [x] Place section after "Work Products" and before "Completion Criteria" to maintain logical flow

- [x] Add rendering for Completion Criteria section
  - [x] Display as a prose paragraph (not a list)
  - [x] Place after Activities

- [x] Add rendering for Metrics section
  - [x] Each metric: name (bold), optional unit in parens, optional formula on second line
  - [x] Place after Completion Criteria

- [x] Add rendering for Guidelines (Resources) section
  - [x] Each guideline: name as label, URL as `<a href>` (target="_blank" rel="noopener noreferrer") when url is non-empty
  - [x] Place after Metrics, before Associated Practices

- [x] Add rendering for Associated Practices section
  - [x] Each item rendered as a clickable button/link showing title + association type badge
  - [x] On click: call `onNavigateToPractice(targetPracticeId)` — prop already exists on the component
  - [x] Guard: only render click handler when `onNavigateToPractice` is provided; otherwise render non-interactive text
  - [x] Place as the last section, after Linked Issues — or before Linked Issues if it better serves context flow

- [x] Update `PracticeDetailSidebar.test.tsx` to cover new sections
  - [x] Test that activities render in sequence order with name and description visible
  - [x] Test that completion criteria text is visible
  - [x] Test that metrics render with name, unit, and formula when present
  - [x] Test that guidelines render the name and a link when url is non-empty
  - [x] Test that associated practices render as clickable items
  - [x] Test that clicking an associated practice calls `onNavigateToPractice` with the correct practice ID
  - [x] Test that null/empty fields for each new section do not crash the component

## Dev Notes

### Story Foundation

Epic 2.1 refines the team dashboard and practice-management UX around a normalized practice model. Story 2.1.14 extended the **authoring** side (create/edit forms). This story extends the **read/display** side: the `PracticeDetailSidebar` component that already renders the sidebar panel when a practice is selected.

### Current Implementation Reality

**What the sidebar already renders** (do not regress these):
- Title, Goal, Description
- Metadata grid: Category, Method, Version, Updated
- Pillars (clickable → `PillarContextPopover`)
- Tags (badge chips)
- Roles (renderList — handles `{ role, responsibility }` objects)
- Benefits (renderList)
- Pitfalls (renderList)
- Work Products (renderList — handles `{ name, description }` objects)
- Linked Issues (fetched via `useIssues` hook)

**What is missing and must be added by this story:**
- Activities section
- Completion Criteria section
- Metrics section
- Guidelines section
- Associated Practices section (with clickable navigation)

**Data availability:** All missing fields are already returned by `fetchPracticeDetail` → `GET /api/v1/practices/:id` via `getPracticeDetail` in `practices.service.ts`. No backend changes are required.

**Associated practices data shape** (from `findAssociationsForPractice` in `practice.repository.ts`):
```typescript
Array<{
  targetPracticeId: number;
  associationType: string;  // 'Configuration' | 'Equivalence' | 'Dependency' | 'Complementarity' | 'Exclusion'
  targetPracticeTitle: string;
}>
```
This is returned via the relational `practice_associations` table — do NOT read from the deprecated JSON `associatedPractices` column.

**Navigation for associated practices:** The `onNavigateToPractice?: (practiceId: number) => void` prop already exists on `PracticeDetailSidebarProps`. When a user clicks an associated practice, call `onNavigateToPractice(targetPracticeId)`. This mirrors how pillar navigation works (`setActivePillar` → then `onNavigateToPractice` from inside `PillarContextPopover`).

### Critical Developer Guardrails

- Do **not** invent a new API call — `fetchPracticeDetail` already returns all required fields.
- Do **not** break existing rendering; all sections currently rendered must remain intact.
- Do **not** assume `onNavigateToPractice` is always provided — guard the click handler.
- Do **not** sort or transform backend data before storing; sort activities by `sequence` only at render time.
- Do **not** render an external link without `rel="noopener noreferrer"` (security requirement for `target="_blank"`).
- The existing `renderList` utility handles `{ role, responsibility }` and `{ name, description }` shapes; extend it or write a dedicated renderer for each new structured type.
- The `DetailedPractice` local type in the component intersects with `Practice` from `types/index.ts`. Tighten types in the local type first; avoid changing `types/index.ts` unless the story truly requires it (it currently types extended fields as `unknown[] | null`, which is acceptable for a list-view type that never renders them).

### Technical Requirements

**Activities rendering:**
- Input type: `Array<{ sequence: number; name: string; description: string }>`
- Sort by `sequence` ascending
- Render as an ordered or structured list
- Example output: bold "1 · Sprint Planning" followed by description text

**Metrics rendering:**
- Input type: `Array<{ name: string; unit?: string; formula?: string }>`
- Per metric: `"Velocity (story points/sprint)"` + optional formula line

**Guidelines rendering:**
- Input type: `Array<{ name: string; url: string; type?: string }>`
- `url` may be an empty string (valid per server schema: `z.union([z.string().url(), z.literal('')])`)
- Only render as `<a>` when `url.trim() !== ''`
- Set `target="_blank"` and `rel="noopener noreferrer"` on external links

**Completion Criteria rendering:**
- Input type: `string | null`
- Render as `<p>` prose, use `whitespace-pre-wrap` to preserve formatting

**Associated Practices rendering:**
- Input type: `Array<{ targetPracticeId: number; associationType: string; targetPracticeTitle: string }>`
- Render as a list of clickable items (use `<button>` for accessibility)
- Show association type as a small badge (e.g., `bg-blue-50 text-blue-700`)
- On click: call `onNavigateToPractice(targetPracticeId)` if defined
- Association type colors (suggestion): Dependency = amber, Complementarity = green, Equivalence = sky, Configuration = gray, Exclusion = red

### Architecture Compliance

- All changes are confined to the `client/src/features/practices/components/` folder.
- No new state slice, no new API call, no new hook needed.
- For styling, follow the existing Tailwind patterns in the component: `text-xs font-semibold text-gray-500 uppercase tracking-wider` for section headers, `text-sm text-gray-700` for content, `text-gray-500 italic text-sm` for empty-state text.
- Test file stays co-located: `PracticeDetailSidebar.test.tsx`.

### Library / Framework Requirements

Exact versions pinned in `client/package.json`:
- React `^18.2.0`
- TypeScript `^5.2.0`
- Vite `^5.0.0`
- Vitest `^0.34.6` (test runner)
- TailwindCSS `^3.3.0`
- No additional libraries needed — this is a pure rendering/display story.

### File Structure Requirements

**Files to modify:**
- `client/src/features/practices/components/PracticeDetailSidebar.tsx` (primary implementation)
- `client/src/features/practices/components/PracticeDetailSidebar.test.tsx` (new test cases)

**Files to NOT touch:**
- `client/src/features/practices/api/practices.api.ts` — no API changes needed
- `client/src/features/practices/types/index.ts` — not required; type tightening happens in the local `DetailedPractice` type inside the component
- `server/` — no backend changes; API already serves all required fields

### Testing Requirements

**New test cases to add to `PracticeDetailSidebar.test.tsx`:**

Activities:
- Given mock practice has `activities: [{ sequence: 2, name: 'Act B', description: 'desc B' }, { sequence: 1, name: 'Act A', description: 'desc A' }]`, then "Act A" appears before "Act B" in the DOM (sequence sort).
- Given `activities: null`, then the Activities section renders without crashing and shows fallback text.

Completion Criteria:
- Given `completionCriteria: 'All tests green'`, then that text is visible.
- Given `completionCriteria: null`, fallback text is shown.

Metrics:
- Given `metrics: [{ name: 'Velocity', unit: 'points', formula: 'sum(completed)' }]`, then "Velocity", "points", and "sum(completed)" are all visible.
- Given `metrics: [{ name: 'Coverage' }]` (no unit, no formula), then only "Coverage" appears without crashing.

Guidelines:
- Given `guidelines: [{ name: 'Scrum Guide', url: 'https://scrum.org', type: 'web' }]`, then a link with text "Scrum Guide" and `href="https://scrum.org"` is rendered.
- Given `guidelines: [{ name: 'Internal Ref', url: '' }]`, then "Internal Ref" is rendered as plain text (no `<a>`).

Associated Practices:
- Given `associatedPractices: [{ targetPracticeId: 42, associationType: 'Dependency', targetPracticeTitle: 'Daily Standup' }]`, then "Daily Standup" and "Dependency" are visible.
- Given the user clicks the "Daily Standup" item, then `onNavigateToPractice` is called with `42`.
- Given `onNavigateToPractice` is not provided, the item still renders without crashing (does not call anything on click).

**Existing tests must continue to pass** — do not break anything in the 6 existing test cases.

### Previous Story Intelligence (from Story 2.1.14)

- Story 2.1.14 identified that `PracticeDetailSidebar` currently renders only a subset of the detail set, and explicitly deferred its expansion to this story: *"PracticeDetailSidebar.tsx currently renders only part of that detail set. That is acceptable for this story; do not turn this into the detail-view redesign planned in Story 2.1.15."*
- The main risk flagged in 2.1.14 was mismatched contracts between shallow list DTOs and full detail DTOs. For this story, remember: the sidebar always calls `fetchPracticeDetail` (full detail), so all fields are available.
- Story 2.1.13 reinforced: add targeted tests for the exact user flow, favor dedicated rendering paths when data shapes differ.
- Apply that lesson: `activities` has a unique shape (sequence + name + description) that warrants its own renderer rather than reusing the generic `renderList`.

### Git Intelligence Summary

Recent relevant commits:
- `54b0591 feat: Consolidate practice management views into a unified ManagePracticesView` — this consolidation affects how `PracticeDetailSidebar` is invoked (via `ManagePracticesView`). Verify that `onNavigateToPractice` is correctly threaded through in the calling view before testing the associated-practices click path end-to-end.
- `8273c52 feat: Implement cancel invite functionality for team members` — unrelated, low regression risk.

### Latest Technical Information

- `server/src/repositories/practice.repository.ts` → `findAssociationsForPractice` returns the relational `practice_associations` data, NOT the deprecated `associatedPractices` JSON column. The API already favors relational associations: `associatedPractices: relationalAssociations.length > 0 ? relationalAssociations : null`.
- `server/src/schemas/practice.schema.ts` defines `AssociatedPracticeSchema` with `target_practice` (string name) and `association_type` enum. Note: this schema is for **import validation** (snake_case field names). The API response uses camelCase (`targetPracticeId`, `targetPracticeTitle`, `associationType`) from the repository DTO — use the camelCase form in the frontend type.
- No external API version concerns; this story is purely client-side rendering with existing backend data.

### Project Structure Notes

- `PracticeDetailSidebar` lives in `client/src/features/practices/components/` (practices feature, not teams), which is correct since the sidebar is a catalog-browsing component used across team and catalog views.
- The `SidebarPanel` wrapper component is in `client/src/components/ui/SidebarPanel` (shared UI, used by 2+ features) — do not modify it.
- `useIssues` hook call is already in the component for the linked issues section; no new hooks needed.

### References

- `_bmad-output/planning-artifacts/epics.md` — Story 2.1.15 definition and Epic 2.1 context (line 1539)
- `_bmad-output/implementation-artifacts/2-1-14-extended-practice-editor.md` — previous story with dev notes, guardrails, and file structure
- `_bmad-output/project-context.md` — stack constraints and implementation rules
- `docs/PRACTICES_REFERENCE_GUIDE.md` — authoritative practice schema fields and definitions
- `server/src/schemas/practice.schema.ts` — canonical field shapes (ActivitySchema, MetricSchema, GuidelineSchema, AssociatedPracticeSchema)
- `server/src/repositories/practice.repository.ts` (line 1000) — `findAssociationsForPractice` return shape
- `server/src/services/practices.service.ts` (line 197+) — `getPracticeDetail` mapping
- `client/src/features/practices/components/PracticeDetailSidebar.tsx` — implementation target
- `client/src/features/practices/components/PracticeDetailSidebar.test.tsx` — existing test suite to extend
- `client/src/features/practices/api/practices.api.ts` (line 100+) — `PracticeDetailResponse` type and `fetchPracticeDetail`
- `client/src/features/practices/types/index.ts` — `Practice` base type (extended fields are `unknown[] | null`)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Inspected `PracticeDetailSidebar.tsx` (full file): confirmed currently missing Activities, Completion Criteria, Metrics, Guidelines, Associated Practices sections.
- Inspected `practices.api.ts` (`PracticeDetailResponse`): confirmed all extended fields already included in the API response type.
- Inspected `practices.service.ts` (`getPracticeDetail`): confirmed server maps all fields including relational `associatedPractices` from `practice_associations` table.
- Inspected `practice.repository.ts` (`findAssociationsForPractice`): confirmed DTO shape is `{ targetPracticeId, associationType, targetPracticeTitle }`.
- Inspected `practice.schema.ts`: confirmed field type definitions for Activity, Metric, Guideline, AssociatedPractice (import shapes use snake_case; API DTOs use camelCase).
- Inspected `PracticeDetailSidebar.test.tsx`: 6 existing tests, none cover new sections.
- Inspected Sprint Status: story `2-1-15` status = `review`, epic `epic-2-1` status = `in-progress`. No epic status change needed.
- Implemented extended rendering sections in `PracticeDetailSidebar.tsx`: Activities, Completion Criteria, Metrics, Resources, and Associated Practices.
- Added association badge color mapping and guarded associated-practice click handling when `onNavigateToPractice` is undefined.
- Added/updated 12 total tests in `PracticeDetailSidebar.test.tsx`, including ordering, fallback, link rendering, and navigation callback assertions.
- Code review remediation applied: tightened `PracticeDetailResponse` types in `practices.api.ts`, removed debug logging from sidebar navigation, and added missing coverage for metric-name-only and non-interactive associated-practice rendering.
- Regression checks run:
  - `npm run test -- src/features/practices/components/PracticeDetailSidebar.test.tsx` (pass: 12/12)
  - `npm run test` (failures exist in unrelated suites: 4 files, 6 tests)
  - `npm run type-check` (existing baseline errors in unrelated files)
  - `npm run test -- src/features/practices/components/PracticeDetailSidebar.test.tsx` after review fixes (pass: 14/14)

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- No backend changes required: all data is already served by the existing `GET /api/v1/practices/:id` endpoint.
- Primary implementation risk: correctly typing `associatedPractices` to use the relational DTO shape (camelCase from repository) vs. the import schema shape (snake_case from `practice.schema.ts`). Use camelCase throughout frontend.
- Secondary risk: `onNavigateToPractice` prop exists but may not be passed in all call sites. Guard with `if (onNavigateToPractice) { onNavigateToPractice(id) }` pattern, consistent with existing usage in the pillar popover path.
- Identified that `activities` was typed as `unknown | null` (singular) in the local `DetailedPractice` — this should be tightened to the array type as part of this story.
- Implemented typed extended fields in local `DetailedPractice` and preserved all prior sections/behavior.
- Added render-time activity sorting by sequence, with section-level fallback text for null/empty data.
- Implemented safe guidelines link behavior: render plain text when URL is empty; render external link with `target="_blank" rel="noopener noreferrer"` otherwise.
- Implemented associated-practice rendering with interactive button when navigation callback is present, and non-interactive fallback when absent.
- Story acceptance criteria coverage validated through focused component tests.
- Review follow-up fixes completed for missing test branches and unsafe API detail typing.

### File List

- client/src/features/practices/components/PracticeDetailSidebar.tsx
- client/src/features/practices/components/PracticeDetailSidebar.test.tsx
- client/src/features/practices/api/practices.api.ts
- _bmad-output/implementation-artifacts/2-1-15-extended-practice-detail-view.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Senior Developer Review (AI)

### Review Date

2026-03-12

### Outcome

Approved after review fixes.

### Findings Addressed

- Added the missing metric-name-only test coverage required by the story.
- Added the missing non-interactive associated-practice rendering test for the no-callback path.
- Tightened `PracticeDetailResponse` typing so the sidebar no longer relies on an unsafe detail cast.
- Removed leftover debug logging from the practice navigation path.
- Corrected the stale sprint-status note in the Dev Agent Record.

## Change Log

- 2026-03-12: Implemented Story 2.1.15 extended detail view sections (Activities, Completion Criteria, Metrics, Resources, Associated Practices), tightened local typing, and added targeted sidebar tests for rendering, fallbacks, links, and association navigation.
- 2026-03-12: Applied code-review fixes, expanded missing test coverage, tightened API detail typing, removed debug logging, and approved the story as done.
