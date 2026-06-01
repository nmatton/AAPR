---
title: 'Fix Manage Practices Pillar Filter Coverage'
slug: 'fix-manage-practices-pillar-filter-options'
created: '2026-04-23'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'React 18', 'Zustand', 'Vite', 'Vitest', 'Node.js', 'Express', 'Prisma', 'Jest']
files_to_modify: [
	'client/src/features/teams/state/addPracticesSlice.ts',
	'client/src/features/teams/pages/ManagePracticesView.tsx',
	'client/src/features/teams/state/addPracticesSlice.test.ts',
	'client/src/features/teams/pages/ManagePracticesView.test.tsx'
]
code_patterns: [
	'Zustand slice async actions for load/fetch and local filter state',
	'React page-level orchestration with useEffect-driven data loading',
	'Shared filter UI component with behavior injected via props',
	'Paginated API consumption with append-on-load-more semantics'
]
test_patterns: [
	'Vitest + React Testing Library for page/component behavior',
	'Vitest store unit tests with vi.mocked API modules',
	'Jest + Supertest backend route tests when endpoint behavior changes'
]
---

# Tech-Spec: Fix Manage Practices Pillar Filter Coverage

**Created:** 2026-04-23

## Overview

### Problem Statement

On `/teams/:teamId/practices/manage`, the pillar filter options are currently derived from practices loaded on the current page. This causes missing pillar options when a pillar is not represented in the loaded subset, which prevents users from filtering by those pillars.

### Solution

Align the Manage Practices pillar-filter source with the working catalog principle: build filter options from the full available-practices dataset (not page-limited card data), while preserving existing multi-filter behavior and keeping dropdown clear behavior as a full filter reset.

### Scope

**In Scope:**
- Ensure the pillar dropdown in Manage Practices exposes the full expected pillar set for available practices, independent of currently loaded cards.
- Keep current pillar filter semantics (multi-select OR behavior).
- Keep dropdown clear behavior as "clear all active filters" (search, pillars, category, method, tags).
- Preserve existing interactions with search/category/method/tag filters and pagination/load-more behavior.
- Add or update automated tests for this regression.

**Out of Scope:**
- Redesigning the filter UI component.
- Changing backend filter semantics beyond what is strictly needed to support parity.
- Modifying unrelated pages outside Manage Practices and directly shared filter logic.

## Context for Development

### Codebase Patterns

- `ManagePracticesView` currently computes `availablePillars` with a local `useMemo` over `availablePractices`, which only reflects currently fetched pages and can miss valid pillar options.
- `useAddPracticesStore.loadAvailablePractices()` is paginated and filter-aware (`search`, `pillars`, `categories`, `methods`, `tags`), with page-1 replace and later-page append behavior; this is correct for card rendering but not for authoritative pillar-option discovery.
- `PracticeCatalog` implements the expected reference behavior via a dedicated `availablePillars` state and `loadAvailablePillars()` action in `usePracticesStore` that scans the full dataset and deduplicates/sorts pillars.
- Team creation (`PracticeSelectionStep`) uses full-dataset retrieval (`getPractices()` loops pages) before deriving filter options, reinforcing the same principle.
- The backend available-practices route already supports paginated retrieval and all current filters (`GET /api/v1/teams/:teamId/practices/available`), so a frontend-only aggregation approach is feasible without API contract changes.
- Clear behavior is intentionally centralized through `clearFilters` and must continue clearing search + pillar + category + method + tag filters.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `client/src/features/teams/pages/ManagePracticesView.tsx` | Current source of bug (`availablePillars` derived from loaded subset); integration point for dedicated pillar loading |
| `client/src/features/teams/state/addPracticesSlice.ts` | Add-practices state/actions; anchor to add `availablePillars` state and a full-dataset loading action |
| `client/src/features/teams/api/teamPracticesApi.ts` | Existing available-practices API client with pagination/filter params reused for pillar aggregation |
| `client/src/features/teams/state/addPracticesSlice.test.ts` | Store tests pattern for async actions and filter resets |
| `client/src/features/teams/pages/ManagePracticesView.test.tsx` | Page-level RTL tests with mocked Zustand stores; anchor for regression test |
| `client/src/features/practices/pages/PracticeCatalog.tsx` | Reference implementation of full pillar option loading pattern |
| `client/src/features/practices/state/practices.slice.ts` | Reference slice pattern (`availablePillars` + full scan action) |
| `client/src/features/practices/components/PillarFilterDropdown.tsx` | Shared dropdown component; clear behavior remains delegated to parent/store |
| `client/src/features/teams/components/PracticeSelectionStep.tsx` | Secondary reference showing full practices fetch before deriving filters |
| `server/src/controllers/teams.controller.ts` | Confirms route/query parsing for available-practices endpoint |
| `server/src/services/teams.service.ts` | Confirms supported filter parameters and pagination behavior |
| `server/src/repositories/practice.repository.ts` | Confirms search/filter semantics and team-specific availability constraints |
| `server/src/routes/teams.practices.routes.test.ts` | Existing backend test pattern for available-practices endpoint behavior |

### Technical Decisions

- Apply catalog principle directly in team manage flow: pillar options must be loaded from the full team-available practice universe, not the currently rendered subset.
- Keep this fix frontend-first: add a dedicated pillar-loading action in `useAddPracticesStore` that fetches all pages (unfiltered for pillar dimension) and derives a unique, sorted pillar list.
- Preserve existing available-practices list behavior (`loadAvailablePractices` + load more) and existing backend contracts.
- Preserve clear semantics per product decision: dropdown Clear must trigger `clearFilters` and clear all active filters.
- Add regression coverage at store and page level to ensure pillar options remain complete regardless of pagination state.

## Implementation Plan

### Tasks

- [ ] Task 1: Add dedicated full-dataset pillar loading in team add-practices store
	- File: `client/src/features/teams/state/addPracticesSlice.ts`
	- Action: Extend `AddPracticesState` with `availablePillars` and `isPillarsLoading` plus a new async action (for example `loadAvailablePillars(teamId)`), then initialize/reset these fields in `initialState` and `reset()`.
	- Notes: Implement this action using existing `fetchAvailablePractices` pagination (`page`, `pageSize`) to retrieve all available practices for the team, aggregate unique pillars by `id`, and sort by pillar name. Do not reuse currently loaded `practices` subset as source of truth.

- [ ] Task 2: Preserve current available list loading behavior and filter semantics
	- File: `client/src/features/teams/state/addPracticesSlice.ts`
	- Action: Keep `loadAvailablePractices`, `togglePillar`, `toggleCategory`, `toggleMethod`, `setTags`, and `clearFilters` behavior unchanged for result-list fetching and filter reset semantics.
	- Notes: `clearFilters` must continue clearing search + pillars + categories + methods + tags and reset page/list state exactly as today.

- [ ] Task 3: Wire Manage Practices page to store-driven complete pillar options
	- File: `client/src/features/teams/pages/ManagePracticesView.tsx`
	- Action: Replace local `availablePillars` derivation from `availablePractices` with `availablePillars` and `isPillarsLoading` from `useAddPracticesStore`; call the new store action in a `useEffect` tied to `numericTeamId`.
	- Notes: Keep existing dropdown clear wiring to `clearFilters`. Keep existing list loading and load-more behavior unchanged.

- [ ] Task 4: Ensure dropdown loading/empty state reflects pillar-loading lifecycle
	- File: `client/src/features/teams/pages/ManagePracticesView.tsx`
	- Action: Pass store-level pillar loading state to `PillarFilterDropdown` and ensure the dropdown can show loading/empty states independently from currently visible cards.
	- Notes: Avoid tying pillar loading indicator to `isLoadingAvailable && availablePillars.length === 0` based on paginated card results.

- [ ] Task 5: Add store-level regression tests for full pillar aggregation
	- File: `client/src/features/teams/state/addPracticesSlice.test.ts`
	- Action: Add tests for the new pillar-loading action covering multi-page aggregation, deduplication by pillar ID, name sorting, and failure fallback.
	- Notes: Mock `fetchAvailablePractices` for multiple pages where later pages introduce additional pillars not found in page 1.

- [ ] Task 6: Add page-level regression tests for Manage Practices pillar filter completeness
	- File: `client/src/features/teams/pages/ManagePracticesView.test.tsx`
	- Action: Add/extend tests to validate pillar options come from complete store-driven pillar set even when `practices` contains only a subset.
	- Notes: Include an assertion that dropdown clear still clears all active filters via `clearFilters`.

- [ ] Task 7: Validate no backend contract changes are required
	- File: `server/src/controllers/teams.controller.ts`
	- Action: Confirm endpoint contract remains unchanged (`GET /api/v1/teams/:teamId/practices/available` with pagination/filter query params).
	- Notes: Only touch backend code if implementation reveals a contract gap; otherwise no backend code change.

### Acceptance Criteria

- [ ] AC 1: Given a team with available practices spanning multiple pages and additional pillars only present after page 1, when a user opens `/teams/:teamId/practices/manage` and opens the pillar dropdown, then the dropdown includes the complete deduplicated pillar set across all available practices.
- [ ] AC 2: Given the currently visible cards do not include pillar `P`, when pillar `P` is shown in the dropdown and selected, then the available-practices list reloads with pillar filter `P` applied and shows matching results.
- [ ] AC 3: Given active filters across search, pillars, categories, methods, and tags, when the user clicks Clear in the pillar dropdown, then all active filters are reset and the available-practices list returns to unfiltered page-1 state.
- [ ] AC 4: Given pillar aggregation request fails (network or API error), when the manage page is loaded, then the page remains usable (no crash), available-practices loading still works, and the pillar dropdown shows safe fallback state (loading cleared, no stale values).
- [ ] AC 5: Given available pillars include duplicates across practices/pages, when pillar options are built, then each pillar appears once and options are sorted consistently by name.
- [ ] AC 6: Given no backend contract changes, when frontend requests available practices for pillar aggregation, then existing endpoint query shape and authentication behavior remain unchanged.

## Additional Context

### Dependencies

- Existing `fetchAvailablePractices()` API client in `client/src/features/teams/api/teamPracticesApi.ts`.
- Existing shared `PillarFilterDropdown` component contract (`pillars`, `selectedPillars`, `onToggle`, `onClear`, `isLoading`).
- Existing team available-practices endpoint (`GET /api/v1/teams/:teamId/practices/available`) with pagination/filter support.
- Existing `Practice` payload shape including `pillars` metadata required for client-side aggregation.
- No new libraries or infrastructure dependencies.

### Testing Strategy

- Unit tests (store):
	- Verify `loadAvailablePillars(teamId)` aggregates pillars across all pages.
	- Verify dedupe by pillar ID and stable sort by name.
	- Verify error path resets `isPillarsLoading` and falls back safely.
- Component/page tests (RTL + Vitest):
	- Verify Manage Practices dropdown renders complete pillar options from store-level `availablePillars`, not current card subset.
	- Verify dropdown Clear calls `clearFilters` and clears all active filters.
	- Verify existing add/remove and advanced filters remain unaffected.
- Manual validation:
	- Open `/teams/4/practices/manage` with known multi-page available practices.
	- Confirm a pillar absent from first loaded page is still selectable in dropdown.
	- Select that pillar and confirm filtered results appear.
	- Trigger Clear from dropdown and confirm all filters reset.
- Backend test impact:
	- None expected for frontend-only implementation.
	- If backend changes become necessary, add route tests following `teams.practices.routes.test.ts` patterns.

### Notes

- High-risk area: full-dataset pillar loading may increase request volume on large datasets; mitigate by using maximum allowed page size and one-time-per-team load behavior.
- Concurrency consideration: avoid race conditions between team switch and async pillar loading (use latest `teamId` context when setting state).
- Maintain strict parity with catalog principle while preserving current Manage Practices UX and filter-reset semantics.
- Future consideration (out of scope): expose a dedicated backend endpoint for available pillars to avoid client-side full-page scans.