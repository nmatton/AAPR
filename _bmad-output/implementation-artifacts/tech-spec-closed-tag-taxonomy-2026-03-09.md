---
title: 'Closed Tag Taxonomy Alignment and Categorized Multi-Select UX'
slug: 'closed-tag-taxonomy-alignment-categorized-multiselect-ux'
created: '2026-03-09'
finalized: '2026-03-09'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Frontend: React 18 + TypeScript + Zustand + Vitest + Tailwind'
  - 'Backend: Express + TypeScript + Zod + Prisma + Jest'
  - 'Docs/Data: Markdown taxonomy in docs/raw_practices + JSON practices reference seed pipeline'
files_to_modify:
  - 'docs/raw_practices/tags-description.md'
  - 'docs/PRACTICES_REFERENCE_GUIDE.md'
  - 'client/src/shared/constants/tags.constants.ts'
  - 'server/src/constants/tags.constants.ts'
  - 'client/src/shared/components/CategorizedTagSelector.tsx'
  - 'client/src/shared/components/CategorizedTagSelector.test.tsx'
  - 'client/src/features/practices/components/TagFilter.tsx'
  - 'client/src/features/practices/components/TagFilter.test.tsx'
  - 'client/src/features/practices/state/practices.slice.ts'
  - 'client/src/features/teams/components/CreatePracticeModal.tsx'
  - 'client/src/features/teams/components/PracticeEditForm.tsx'
  - 'client/src/features/teams/api/teamPracticesApi.ts'
  - 'client/src/features/teams/state/managePracticesSlice.ts'
  - 'client/src/features/teams/components/CreatePracticeModal.test.tsx'
  - 'client/src/features/teams/components/PracticeEditForm.test.tsx'
  - 'server/src/controllers/practices.controller.ts'
  - 'server/src/controllers/teams.controller.ts'
  - 'server/src/controllers/teams.controller.test.ts'
  - 'server/src/services/teams.service.ts'
  - 'server/src/services/teams.service.test.ts'
  - 'server/src/repositories/practice.repository.ts'
  - 'server/src/schemas/practice.schema.ts'
  - 'server/src/schemas/practice.schema.test.ts'
  - 'server/src/services/practice-import.service.ts'
code_patterns:
  - 'Catalog filters use slice state with selectedTags: string[] and setTags(tags: string[])'
  - 'Filter UI components are feature-local and mostly checkbox/list based except tags (currently text input)'
  - 'Practice create/edit forms currently parse comma/newline text into string arrays for tags'
  - 'Server query filtering consumes comma-separated query params and repository builds Prisma AND/OR conditions'
  - 'Zod schemas are used at controller/import boundaries; error mapping is centralized in client stores'
  - 'Team practice edit flow currently does not persist method/tags in backend service payload'
test_patterns:
  - 'Frontend: Vitest + Testing Library with label-based interactions and payload assertions'
  - 'Backend: Jest service/controller tests with explicit error code expectations'
  - 'Dedicated tests added for TagFilter and CategorizedTagSelector (including disabled-state behavior)'
---

# Tech-Spec: Closed Tag Taxonomy Alignment and Categorized Multi-Select UX

**Created:** 2026-03-09  
**Finalized:** 2026-03-09

## Overview

### Problem Statement

The project now uses a revised, fixed tag taxonomy, but tag-related logic and UI still rely on free-text entry in multiple places. This creates drift against the canonical definitions and allows deprecated tags to reappear in filters and forms.

### Solution

Enforce a single source of truth for tags from `docs/raw_practices/tags-description.md`, remove deprecated tag mentions and behavior across the project, and replace free-text tag inputs with a categorized, non-searchable multi-select UI aligned with tag categories.

### Scope

**In Scope:**
- Update all tag-dependent UI/logic to use the closed tag list.
- Replace free-text tag inputs with categorized multi-select controls in all relevant areas.
- Remove deprecated/legacy tag references in code/docs where they define or drive behavior.
- Ensure catalog filtering by tags uses controlled selection values only.

**Out of Scope:**
- Reworking non-tag taxonomy fields (methods, categories, practice goals).
- Redesigning unrelated UX or broad layout updates beyond tag selection controls.
- Data migration of old tags in DB (database already cleaned).

## Context for Development

### Codebase Patterns

- Catalog filter architecture is store-driven via `usePracticesStore` with selected arrays for each dimension (`selectedCategories`, `selectedMethods`, `selectedTags`).
- `TagFilter` is currently the only catalog filter still using free-text parsing (`split(',')`) instead of controlled option toggles.
- Team practice create/edit forms accept free-text tag input and normalize to arrays before API submit.
- Server catalog search/filter passes tags as comma-separated query values and applies OR semantics in repository (`array_contains` per selected tag).
- Import pipeline (`seed-practices` -> `practice-import.service` -> `PracticeSchema`) currently accepts any tag strings.
- Important discovered constraint: team practice edit endpoint currently validates/saves title/goal/category/pillars only; method/tags sent by client are not persisted.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| docs/raw_practices/tags-description.md | Canonical source of truth for tag labels and category grouping |
| docs/PRACTICES_REFERENCE_GUIDE.md | Public schema guide containing duplicated tag enum text to align with source-of-truth policy |
| client/src/features/practices/components/TagFilter.tsx | Replace free-text input with categorized non-searchable multi-select |
| client/src/features/practices/state/practices.slice.ts | Keep selectedTags contract; ensure controlled tag values only |
| client/src/features/practices/api/practices.api.ts | Existing tags query contract (`tags=comma,separated`) |
| client/src/features/teams/components/CreatePracticeModal.tsx | Replace form `tags` text entry with categorized multi-select control |
| client/src/features/teams/components/PracticeEditForm.tsx | Replace edit `tags` text entry with categorized multi-select control |
| client/src/features/teams/api/teamPracticesApi.ts | Payload contracts for tags arrays |
| client/src/features/teams/state/managePracticesSlice.ts | Client-side error mapping for create/edit failures |
| client/src/features/teams/components/CreatePracticeModal.test.tsx | Update tests expecting text input and free tags |
| client/src/features/teams/components/PracticeEditForm.test.tsx | Add/adjust assertions for tag selection UX |
| server/src/controllers/practices.controller.ts | Optional defensive validation/sanitization for tag query params |
| server/src/controllers/teams.controller.ts | Add strict tag validation to create/edit schemas |
| server/src/services/teams.service.ts | Persist and normalize tags for edit flow (currently missing), enforce closed list behavior |
| server/src/repositories/practice.repository.ts | Search/filter semantics for tags; validate compatibility with controlled list |
| server/src/schemas/practice.schema.ts | Import-time strict tag enum enforcement |
| server/src/services/practice-import.service.ts | Import handling for deprecated tags removal behavior |

### Technical Decisions

- `docs/raw_practices/tags-description.md` is the only allowed source of truth for tags and category structure.
- Deprecated tags are fully removed from behavior and fixtures; no aliasing, no fallback mapping.
- UX target is categorized multi-select, non-searchable, with visible category headers mirroring `tags-description.md`.
- Closed-list enforcement applies both at UI option level and backend validation boundaries.
- Team practice edit flow must be corrected to actually persist method/tags if included in payload, otherwise UI changes would be misleading.
- Existing DB cleanup allows hard enforcement without legacy migration path.

## Implementation Plan

### Tasks

**Phase 1: Foundation & Backend Enforcement**

1. **Create shared tag constants module**
   - Parse `docs/raw_practices/tags-description.md` to extract canonical tag list and category structure
   - Create `server/src/constants/tags.constants.ts` with:
     - `TAG_CATEGORIES` array defining category names and tag members
     - `VALID_TAGS` flat array of all 20 valid tag strings
     - TypeScript types: `TagCategory`, `ValidTag`
   - Create `client/src/shared/constants/tags.constants.ts` mirroring server structure
   - Ensures single programmatic source of truth across frontend/backend

2. **Update backend validation schemas**
   - In `server/src/schemas/practice.schema.ts`:
     - Replace permissive `z.array(z.string())` at line 76 with `z.array(z.enum(VALID_TAGS))` 
     - Remove "Allow any tags" comment
     - Add validation error message for invalid tag values
   - In `server/src/controllers/teams.controller.ts`:
     - Update `createCustomPracticeSchema` (line 210) to enforce tag enum
     - Update `editPracticeSchema` (line 234) to include tags field with enum validation
   - Ensures import pipeline and API endpoints reject invalid tags

3. **Fix team practice edit flow persistence bug**
   - In `server/src/repositories/practice.repository.ts`:
     - Update `updatePracticeWithVersion` function signature (line 836) to accept optional `method?: string` and `tags?: string[]` parameters
     - Add conditional updates for these fields if provided
   - In `server/src/services/teams.service.ts`:
     - Update `editPracticeForTeam` (line 1018-1280) to pass `method` and `tags` from payload to repository call
     - Ensure normalization via `normalizeStringArray` helper before persistence
   - Critical fix: Without this, UI changes would mislead users that tag edits are saving

4. **Add defensive query param validation**
   - In `server/src/controllers/practices.controller.ts`:
     - Add validation check at tag parsing (line 66) to filter out any tags not in `VALID_TAGS`
     - Log warning for invalid tag attempts (security/audit trail)
   - Prevents malicious or stale client queries from bypassing UI constraints

**Phase 2: Frontend UI Replacement**

5. **Create reusable CategorizedTagSelector component**
   - Create `client/src/shared/components/CategorizedTagSelector.tsx`
   - Props: `selectedTags: string[]`, `onChange: (tags: string[]) => void`, `disabled?: boolean`
   - UI structure:
     - Map over `TAG_CATEGORIES` to render category sections
     - Each category: header + checkbox list for member tags
     - Non-searchable, scrollable container
     - Reflects tags-description.md visual hierarchy
   - Styling: Tailwind with category headers using color/weight to group visually

6. **Replace TagFilter component**
   - In `client/src/features/practices/components/TagFilter.tsx`:
     - Remove text input and comma-parsing logic
     - Replace with `<CategorizedTagSelector>` connected to store
     - Pass `selectedTags` and `setTags` from `usePracticesStore`
   - Maintains existing store contract (string arrays)
   - Add basic snapshot test to new `TagFilter.test.tsx`

7. **Replace CreatePracticeModal tag input**
   - In `client/src/features/teams/components/CreatePracticeModal.tsx`:
     - Remove text input at lines 498-509
     - Replace with `<CategorizedTagSelector>` managing local form state
     - Update FormState type: keep `tags: string[]` (no longer needs intermediate string form)
     - Remove `normalizeListInput` parsing in submit handler (line 245)
   - Template duplication flow automatically inherits controlled selection

8. **Replace PracticeEditForm tag input**
   - In `client/src/features/teams/components/PracticeEditForm.tsx`:
     - Remove text input at lines 326-334
     - Replace with `<CategorizedTagSelector>` managing local state
     - Update dirty tracking (line 70) to compare arrays instead of strings
     - Remove comma-joining/splitting logic in initialization and submit

**Phase 3: Test Updates & Documentation**

9. **Update CreatePracticeModal tests**
   - In `client/src/features/teams/components/CreatePracticeModal.test.tsx`:
     - Replace text input interactions (line 162) with checkbox selection patterns
     - Use `screen.getByRole('checkbox', { name: /async/i })` for tag selection
     - Update assertions to verify selected tags in payload
     - Ensure template duplication tests verify pre-selected checkboxes

10. **Update PracticeEditForm tests**
    - In `client/src/features/teams/components/PracticeEditForm.test.tsx`:
      - Add tag selection coverage (currently missing specific tag tests)
      - Test multi-select interaction, dirty state detection, save payload
      - Verify edit flow persists tags (regression test for fixed bug)

11. **Add backend validation tests**
    - In `server/src/schemas/practice.schema.test.ts` (create if missing):
      - Test `PracticeSchema` rejects invalid tags
      - Test valid tags from `VALID_TAGS` pass validation
    - In `server/src/services/teams.service.test.ts`:
      - Add test verifying `editPracticeForTeam` persists tags when provided
      - Regression test for discovered bug

12. **Update documentation**
    - In `docs/PRACTICES_REFERENCE_GUIDE.md`:
      - Update tags enum section to mirror current `tags-description.md` content
      - Document closed-list policy and removal of deprecated tags
      - Add note about categorized multi-select UX in UI

### Acceptance Criteria

**Functional Requirements:**

- ✅ All tag selection UI (catalog filter, create modal, edit form) presents exactly 20 tags organized in 6 categories matching `tags-description.md`
- ✅ Tag selection UI is non-searchable and uses checkbox/multi-select pattern (no text input)
- ✅ Catalog filter state (`selectedTags`) only contains values from closed list
- ✅ Team practice create/edit payloads only accept tags from `VALID_TAGS` enum
- ✅ Backend validation (import schema, API schemas) rejects any tag not in closed list
- ✅ Practice edit flow correctly persists tags field when modified (bug fixed)
- ✅ Query param filtering sanitizes/ignores invalid tag values

**UI/UX Requirements:**

- ✅ Category headers clearly visible in tag selector (mirroring tags-description.md structure)
- ✅ Selected tags visually indicated with checkmarks/highlights
- ✅ Tag selector is keyboard accessible (tab navigation, spacebar toggle)
- ✅ No free-text input fields for tags anywhere in application

**Technical Requirements:**

- ✅ Shared constants modules (`client/src/shared/constants/tags.constants.ts`, `server/src/constants/tags.constants.ts`) define single source of truth
- ✅ TypeScript types enforce `ValidTag` union type where appropriate
- ✅ Zod schemas use `z.enum(VALID_TAGS)` for strict validation
- ✅ All existing tests pass with updated interaction patterns
- ✅ New TagFilter test provides component coverage
- ✅ Backend validation tests verify schema enforcement

**Quality Requirements:**

- ✅ No console errors or warnings in browser when selecting tags
- ✅ Server logs warning when invalid tag query params detected
- ✅ Practice import pipeline rejects JSON with deprecated tags
- ✅ Documentation (`PRACTICES_REFERENCE_GUIDE.md`) reflects closed taxonomy

## Additional Context

### Dependencies

**Critical Path Dependencies:**

1. **Tag constants modules must exist before UI components**
   - Tasks 5-8 (UI replacements) depend on Task 1 (shared constants creation)
   - Without programmatic tag list, UI components cannot render options
   - Blocking: Create both client and server constants modules first

2. **Backend validation must be updated before frontend changes**
   - Tasks 2-4 (backend enforcement) should complete before Tasks 5-8 (UI changes)
   - Ensures API rejects invalid tags even if UI has bugs
   - Defense-in-depth: server validation is last line of defense

3. **Edit flow bug fix required for meaningful tag edit testing**
   - Task 3 (repository/service update) must complete before Task 10 (edit form tests)
   - Without fix, edit form tag selection would appear to work but silently fail
   - Regression test in Task 11 validates fix

4. **Reusable component before feature-specific replacements**
   - Task 5 (CategorizedTagSelector creation) must complete before Tasks 6-8
   - Shared component ensures consistent UX and reduces duplication
   - Consider co-locating with shared constants module

**External Dependencies:**

- **TypeScript 5.2+**: Required for `satisfies` operator and const type parameters used in constants modules
- **Zod 4.3+**: Required for `z.enum()` validation with array spread
- **React 18**: Required for automatic batching in multi-checkbox updates
- **Vitest/Testing Library**: Checkbox interaction patterns require `getByRole` with name option
- **tags-description.md stability**: Implementation assumes tag list/categories won't change during development; if taxonomy changes mid-work, constants modules must be regenerated

**Risk Mitigation:**

- Phased approach (backend → UI → tests) prevents invalid data from entering system even during partial implementation
- Shared constants reduce risk of frontend/backend drift
- Edit flow fix de-risks user frustration with "saving but not working" scenario

### Testing Strategy

**Unit Test Coverage:**

*Frontend (Vitest + Testing Library):*

- **TagFilter.test.tsx** (NEW):
  - Renders all 6 categories with correct tag options
  - Checkbox selection updates store state
  - Multi-select allows toggling multiple tags
  - Keyboard navigation works (tab, spacebar)
  - Visual indicators for selected state

- **CreatePracticeModal.test.tsx** (UPDATE):
  - Replace text input tests with checkbox interaction tests
  - Verify template duplication pre-selects correct tags
  - Validate submit payload contains only valid tags
  - Test empty selection (no tags) is valid

- **PracticeEditForm.test.tsx** (UPDATE):
  - Add tag selection interaction tests (currently missing)
  - Test dirty state detection when tags change
  - Verify save payload includes updated tags
  - Test unsaved changes prompt includes tag modifications

- **CategorizedTagSelector.test.tsx** (NEW):
  - Snapshot test for structure/styling
  - Test controlled component behavior (selectedTags prop)
  - Test onChange callback with correct payload
  - Test disabled state

*Backend (Jest):*

- **practice.schema.test.ts** (NEW/UPDATE):
  - Test valid tags pass `PracticeSchema` validation
  - Test invalid tag strings rejected with clear error
  - Test empty tags array is valid
  - Test mixed valid/invalid tags rejected

- **teams.service.test.ts** (UPDATE):
  - Add test: `editPracticeForTeam` persists tags when provided (regression test for bug)
  - Add test: `editPracticeForTeam` persists method when provided
  - Verify normalized arrays stored correctly

- **teams.controller.test.ts** (UPDATE):
  - Test createCustomPracticeSchema rejects invalid tags
  - Test editPracticeSchema validates tags field
  - Verify error responses for validation failures

**Integration Test Coverage:**

*End-to-End Scenarios (Manual or E2E Framework):*

1. **Catalog Filtering**:
   - Select multiple tags across categories in TagFilter
   - Verify practices list filters correctly with OR semantics
   - Clear tag selections resets filter

2. **Practice Creation**:
   - Create practice with tags from multiple categories
   - Save and verify tags persisted correctly
   - Create from template, verify inherited tags editable

3. **Practice Editing**:
   - Edit existing practice, modify tag selection
   - Save and verify tags updated in database
   - Test version conflict handling with tag changes

4. **Invalid Data Rejection**:
   - Attempt API call with invalid tag in payload (via curl/Postman)
   - Verify 400 error with clear validation message
   - Confirm practice not created/updated

**Performance Testing:**

- Verify tag selector renders < 100ms with 6 categories × 20 tags
- Test checkbox interaction has no perceptible lag
- Verify store updates batch correctly (no multiple re-renders)

**Regression Testing:**

- Run full existing test suite to ensure no breakage
- Particular attention to:
  - Practice search/filter results (ensure tag filtering still works)
  - Practice import pipeline (ensure validation doesn't break valid imports)
  - Team practice workflows (ensure edit bug fix doesn't introduce new issues)

**Test Execution Order:**

1. Backend unit tests (validate schema enforcement works)
2. Frontend component tests (verify UI behavior)
3. Integration tests (ensure end-to-end flows work)
4. Regression suite (confirm no breakage)

**Success Metrics:**

- All existing tests pass (zero regressions)
- New tests added: minimum 5 frontend, 4 backend
- Test coverage for tag-related code: > 85%
- Zero manual testing needed to verify acceptance criteria

### Notes

**Workflow Complete** — Quick Spec workflow executed through all 4 steps, producing implementation-ready technical specification.

**Critical Findings from Investigation:**
- Team practice edit flow bug discovered: method/tags fields not persisted despite payload acceptance
- Fix required before UI changes to prevent user frustration with "appears to save but doesn't work"
- Phased approach ensures backend enforcement prevents invalid data even during partial implementation

**User Constraints Enforced:**
- All tag entry points aligned to canonical closed list from tags-description.md
- Free-text input deprecated across all forms and filters
- Categorized multi-select UX with non-searchable category view
- Database already cleaned (no legacy migration needed)

**Implementation Ready:** Spec contains 12 ordered tasks, 24 acceptance criteria, comprehensive testing strategy, and clear dependency mapping. Ready for development team handoff.
