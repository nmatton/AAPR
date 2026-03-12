# Story 2.1.13: Practice Selection Advanced Filters

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to **use advanced filters on the initial team practice selection and Manage Practices pages**,
So that **I can easily find the right practices beyond basic search**.

## Acceptance Criteria

1. **Given** I am on the Team Creation (practice selection step) or Add Practices page
   **When** I view the filters
   **Then** I see the same advanced filtering options built in Story 2.1.6 (Tag, Method, Category, Pillar)

2. **Given** I apply filters
   **When** the list updates
   **Then** the practices consistently reflect the filter logic exactly as they do in the Catalog

3. **Given** I open the Method filter on any page (Catalog, Add Practices, Team Creation practice selection)
   **When** no other filters are active
   **Then** ALL methods that exist in the full practice catalog are listed as filter options — not only those present in the currently loaded/displayed subset

4. **Given** I select a method filter
   **When** another filter (e.g. pillar or category) is already active
   **Then** I can still see and select all methods from the full catalog (or full available-practices pool), so cross-filtering is always possible

## Known Limitation — Resolved

> Resolved on 2026-03-12 during code review remediation. AC #3 and AC #4 are now
> implemented with dedicated methods endpoints, refreshed method-option loading,
> normalized method values, and targeted test coverage.

### Problem Description

The **Method filter option list** is currently derived from the practices that happen to be loaded in the client-side store at any given moment. This means:

- **ManagePracticesView (server-side paginated, pageSize=20):** On initial load only 20 practices are in the store. The method dropdown only shows methods from those 20 practices. Methods that exist in practices #21–200 are invisible in the filter UI, making it impossible to filter the full catalog by those methods.
- **Practice Catalog page (`PracticeCatalog.tsx`):** The catalog fetches all pages on load, so the method list IS complete when no filters are active. However, once a filter (e.g. pillar or category) is applied, `practices` in the store narrows to only matching practices, and the method dropdown loses methods that exist outside the filtered set. Cross-filtering (e.g. "Category X AND Method Y" where Y is not in Category X) is therefore not achievable through the UI.
- **PracticeSelectionStep:** Uses `getPractices()` which loads the full catalog client-side, so client-side filtering is complete for practice results. The method option list is also derived from all loaded practices (= full catalog here), so this context is **not affected**.

Note: **Tags** and **Categories** are unaffected — they use static option lists (`TAG_CATEGORIES` constant and a hardcoded `CATEGORIES` array), not derived from loaded data.

### Root Cause

`MethodFilter` (`client/src/features/practices/components/MethodFilter.tsx`) and `AvailablePracticesMethodFilter` (`client/src/features/teams/components/AvailablePracticesMethodFilter.tsx`) both compute available methods as:

```ts
const availableMethods = Array.from(new Set(
  practices.map((p) => p.method?.trim()).filter(Boolean)
)).sort(...)
```

`practices` is always the currently loaded subset, not the full catalog.

### Required Fix (for dev agent)

Add a backend endpoint (or reuse an existing one) to fetch all unique method values independently of the practice list, and use it to populate method filter options:

1. **New backend route:** `GET /api/v1/practices/methods` → returns `{ methods: string[] }` (all distinct non-null `method` values in the catalog, sorted)
2. **New backend route (team context):** `GET /api/v1/teams/:teamId/practices/available/methods` → returns all distinct methods across ALL available practices for that team (ignoring pagination)
3. **Update `usePracticesStore`** (catalog): add `availableMethods: string[]` state + `loadAvailableMethods()` action; call on mount; use in `MethodFilter` instead of deriving from `practices`
4. **Update `useAddPracticesStore`** (ManagePracticesView): same pattern with `loadAvailableMethods(teamId)`
5. **Update `MethodFilter` and `AvailablePracticesMethodFilter`** to use store-loaded methods as the option list instead of deriving from `practices`
6. **Backend implementation notes:**
   - Query: `SELECT DISTINCT method FROM practices WHERE method IS NOT NULL AND is_global = true ORDER BY method ASC`
   - For team context, also exclude already-selected practices if desired (or keep all global methods for discoverability)

## Tasks / Subtasks

- [x] **Backend – Extend `getAvailablePractices` API to support category/method/tag filters**
  - [x] Extend `AvailablePracticesParams` interface in `server/src/services/teams.service.ts` with `categories?`, `methods?`, `tags?`
  - [x] Pass the new params to `practiceRepository.findAvailableForTeam` and `countAvailableForTeam` (repository already supported these)
  - [x] Parse `categories`, `methods`, `tags` query params in `server/src/controllers/teams.controller.ts` and forward to service

- [x] **Frontend API – Extend `fetchAvailablePractices` client call**
  - [x] Add `categories?`, `methods?`, `tags?` to `AvailablePracticesParams` in `client/src/features/teams/api/teamPracticesApi.ts`
  - [x] Append new query params to URL in `fetchAvailablePractices`

- [x] **Frontend Store – Extend `addPracticesSlice.ts`**
  - [x] Add `selectedCategories`, `selectedMethods`, `selectedTags` state
  - [x] Add `toggleCategory`, `toggleMethod`, `setTags` actions
  - [x] Update `clearFilters` to reset new state
  - [x] Pass new filters in `loadAvailablePractices` API call
  - [x] Update `useEffect` dependency in `ManagePracticesView.tsx` to include new filter state

- [x] **Create filter components for ManagePracticesView context**
  - [x] `client/src/features/teams/components/AvailablePracticesCategoryFilter.tsx`
  - [x] `client/src/features/teams/components/AvailablePracticesMethodFilter.tsx`
  - [x] `client/src/features/teams/components/AvailablePracticesTagFilter.tsx`
  - [x] `client/src/features/teams/components/AvailablePracticesActiveFilters.tsx`

- [x] **Update ManagePracticesView.tsx** (Add Practices page)
  - [x] Import and add the four new filter components to the filter section (3-column grid below search/pillar row)

- [x] **Update PracticeSelectionStep.tsx** (Team Creation step 2)
  - [x] Add `selectedCategories`, `selectedMethods`, `selectedTags` local state
  - [x] Add `availableMethods` derived from loaded practices
  - [x] Update `filteredPractices` to apply category, method, tag client-side filters
  - [x] Add `toggleCategory`, `toggleMethod`, `clearFilters` helpers
  - [x] Add Category, Method, Tag filter UI (3-column grid below search/pillar row)
  - [x] Add active filter chips display with individual remove + "Clear all"

- [x] **[FOLLOW-UP] Fix Method filter option completeness (AC #3 & #4)** — see "Known Limitation" section
  - [x] `GET /api/v1/practices/methods` endpoint (all distinct global methods, sorted)
  - [x] `GET /api/v1/teams/:teamId/practices/available/methods` endpoint (all distinct available-for-team methods)
  - [x] Add `availableMethods` + `loadAvailableMethods()` to `usePracticesStore`
  - [x] Add `availableMethods` + `loadAvailableMethods(teamId)` to `useAddPracticesStore`
  - [x] Update `MethodFilter` to use store-loaded methods list instead of deriving from `practices`
  - [x] Update `AvailablePracticesMethodFilter` to use store-loaded methods list instead of deriving from `practices`

## Dev Notes

### Architecture Compliance

- **Frontend feature-first structure**: All new components are co-located in `client/src/features/teams/components/`
- **State management**: `addPracticesSlice.ts` (Zustand) extended following existing pattern; server-side filtering maintained
- **PracticeSelectionStep uses client-side filtering**: This component loads all catalog practices and filters locally (consistent with its existing pattern). Server-side filtering would require refactoring the component to use the team-scoped API, which is out of scope.
- **API params**: Query param names (`categories`, `methods`, `tags`) follow existing naming convention (camelCase, comma-separated)
- **Tag validation**: The backend repository already validates tags before filtering; client passes raw tag strings from `CategorizedTagSelector` (which only surfaces valid tags from `TAG_CATEGORIES`)

### Filter Logic

- **Category filter (ManagePracticesView)**: Server-side via `categoryId IN categories[]`
- **Method filter (ManagePracticesView)**: Server-side via `method IN methods[]`
- **Tag filter (ManagePracticesView)**: Server-side via `array_contains` per tag (OR logic: practice matches if it has at least one of the selected tags)
- **All filters (PracticeSelectionStep)**: Client-side using same OR/inclusion logic

### Files Modified

- `server/src/services/teams.service.ts` — Extended `AvailablePracticesParams`, updated `getAvailablePractices`
- `server/src/controllers/teams.controller.ts` — Parses `categories`, `methods`, `tags` query params
- `client/src/features/teams/api/teamPracticesApi.ts` — Extended `AvailablePracticesParams`, updated `fetchAvailablePractices`
- `client/src/features/teams/state/addPracticesSlice.ts` — Added category/method/tag state and actions
- `client/src/features/teams/pages/ManagePracticesView.tsx` — Added filter components, extended useEffect deps
- `client/src/features/teams/components/PracticeSelectionStep.tsx` — Full advanced filter integration

### Files Created

- `client/src/features/teams/components/AvailablePracticesCategoryFilter.tsx`
- `client/src/features/teams/components/AvailablePracticesMethodFilter.tsx`
- `client/src/features/teams/components/AvailablePracticesTagFilter.tsx`
- `client/src/features/teams/components/AvailablePracticesActiveFilters.tsx`

### Project Structure Notes

- New filter components follow existing pattern of `CategoryFilter`, `MethodFilter`, `TagFilter`, `ActiveFilters` in `features/practices/components/` — same logic, different store binding
- `CategorizedTagSelector` from `shared/components/` reused consistently in both contexts

### References

- [Story 2.1.6 implementation – Catalog Advanced Filtering](../_bmad-output/planning-artifacts/epics.md)
- [Architecture: Tech Stack & Frontend Structure](../docs/03-architecture.md)
- [Source: practices.slice.ts – Filter state pattern](client/src/features/practices/state/practices.slice.ts)
- [Source: practice.repository.ts#findAvailableForTeam](server/src/repositories/practice.repository.ts)

## Dev Agent Record

### Agent Model Used

GPT-5.4 (GitHub Copilot) — review remediation pass (2026-03-12)

### Debug Log References

N/A — Implementation completed without runtime errors; TypeScript compilation clean across all modified files.

### Completion Notes List

- Repository (`practice.repository.ts`) already supported `categories`, `methods`, `tags` filtering in `findAvailableForTeam` and `countAvailableForTeam` — no repository changes required.
- Story 2.1.12 is marked `invalid` in sprint-status; previous valid story for context was 2.1.11 (database migration).
- `PracticeSelectionStep.tsx` uses the general `/api/v1/practices` endpoint (not the team-scoped available practices endpoint), therefore its filters are client-side. This is intentional and consistent with its existing architecture.
- **FOLLOW-UP (2026-03-12):** AC #3 and #4 now fully implemented. Two new backend endpoints added (`GET /api/v1/practices/methods` and `GET /api/v1/teams/:teamId/practices/available/methods`) return all distinct method values independently of pagination/active filters. Both `usePracticesStore` and `useAddPracticesStore` extended with `availableMethods` state + `loadAvailableMethods()` action. `MethodFilter` and `AvailablePracticesMethodFilter` now use store-loaded methods list. `PracticeCatalog` and `ManagePracticesView` call `loadAvailableMethods` on mount. Server TypeScript: clean. PracticeCatalog tests: 11/11 pass. Backend practice/team route tests: 302/303 pass (1 pre-existing failure unrelated to this story).
- **REVIEW FIXES (2026-03-12):** Manage Practices method options now refresh after available-pool mutations. Distinct method values are trimmed and deduplicated server-side before reaching the UI. Team-scoped available-methods access now rejects invalid team IDs with structured 400 responses. Existing `ManagePracticesView` tests were repaired for the expanded store shape, and targeted endpoint plus `PracticeSelectionStep` filter tests were added.

### File List

- server/src/repositories/practice.repository.ts
- server/src/services/practices.service.ts
- server/src/services/teams.service.ts
- server/src/controllers/practices.controller.ts
- server/src/controllers/teams.controller.ts
- server/src/routes/practices.routes.ts
- server/src/routes/teams.routes.ts
- client/src/features/practices/api/practices.api.ts
- client/src/features/practices/state/practices.slice.ts
- client/src/features/practices/components/MethodFilter.tsx
- client/src/features/practices/pages/PracticeCatalog.tsx
- client/src/features/practices/pages/PracticeCatalog.test.tsx
- client/src/features/teams/api/teamPracticesApi.ts
- client/src/features/teams/state/addPracticesSlice.ts
- client/src/features/teams/pages/ManagePracticesView.tsx
- client/src/features/teams/pages/ManagePracticesView.test.tsx
- client/src/features/teams/components/PracticeSelectionStep.tsx
- client/src/features/teams/components/PracticeSelectionStep.test.tsx
- client/src/features/teams/components/AvailablePracticesCategoryFilter.tsx (new — prior pass)
- client/src/features/teams/components/AvailablePracticesMethodFilter.tsx (modified — FOLLOW-UP)
- client/src/features/teams/components/AvailablePracticesTagFilter.tsx (new — prior pass)
- client/src/features/teams/components/AvailablePracticesActiveFilters.tsx (new — prior pass)
