# Story 2.1:6: Catalog - Advanced Filtering (Tag, Method/Framework, Category)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **filter the practice catalog by tag, method/framework, and category**,
so that **I can quickly find practices matching our team's interests or constraints**.

## Acceptance Criteria

1. **Given** I'm on the Practice Catalog page
   **When** I view the filter panel
   **Then** I see filter options:
     - Search (existing)
     - Pillar (existing)
     - Category (new) - checkboxes for 5 categories
     - Method/Framework (new) - checkboxes for: Scrum, XP, Kanban, Lean, SAFe, Custom
     - Tags (new) - multi-select or comma-separated text input

2. **Given** I click on the Category filter
   **When** I see the options
   **Then** I can check/uncheck: VALEURS HUMAINES, FEEDBACK & APPRENTISSAGE, EXCELLENCE TECHNIQUE, ORGANISATION & AUTONOMIE, FLUX & RAPIDITÉ

3. **Given** I select Category "EXCELLENCE TECHNIQUE"
   **When** the filter is applied
   **Then** the practice list shows only practices in that category

4. **Given** I click on the Method/Framework filter
   **When** I see the options
   **Then** I can check/uncheck: Scrum, XP, Kanban, Lean, SAFe, Custom

5. **Given** I select Method "Scrum"
   **When** the filter is applied
   **Then** the practice list shows only practices tagged with Scrum method

6. **Given** I click on the Tags filter
   **When** I enter or select tags
   **Then** I can filter by multiple tags (OR logic: practices with ANY selected tag)

7. **Given** I've applied multiple filters (e.g., Category + Method + Tag)
   **When** the filters are applied
   **Then** practices matching ALL selected criteria are shown
   **And** filter indicators show active filters with [X] to remove each

8. **Given** I apply a filter with 0 results
   **When** the filter is applied
   **Then** I see: "No practices match these filters. Try adjusting your selection."
   **And** I can [Clear All Filters] to reset

9. **Given** I apply filters
   **When** results update
   **Then** an event is logged: `{ action: "catalog.filtered", teamId, filters: { category, method, tags }, resultCount, timestamp }`

## Tasks / Subtasks

- [x] Backend: Update Practice API to support new filters (AC 3, 5, 6)
  - [x] Update `PracticeRepository.findMany` (or equivalent) to accept `categories`, `methods`, `tags`
  - [x] Implement Prisma `where` clauses for filtering
    - Category: `IN` clause
    - Method: `IN` clause
    - Tags: JSON array filtering (Postgres `array_ops` or Prisma `json` filter)
  - [x] Update Controller to parse query parameters
- [x] Frontend: Update `practices.slice.ts` (Store)
  - [x] Add state for `selectedCategories`, `selectedMethods`, `selectedTags`
  - [x] Update `loadPractices` thunk to pass these filters to API
  - [x] Add actions: `toggleCategory`, `toggleMethod`, `setTags`, `clearAllFilters`
- [x] Frontend: Create Filter Components (AC 1, 2, 4, 6)
  - [x] `CategoryFilter` (Checkboxes)
  - [x] `MethodFilter` (Checkboxes)
  - [x] `TagFilter` (Input/Select)
  - [x] `ActiveFilters` component (Display chips)
- [x] Frontend: Update `PracticeCatalog` Page (AC 1, 7, 8)
  - [x] Integrate new filter components into sidebar or filter panel
  - [x] Update Empty State message logic
- [x] Frontend: Update `PracticeEditForm` (Critical for Testing)
  - [x] Add `Method` dropdown (Scrum, XP, etc.)
  - [x] Add `Tags` input (Text input with comma separation)
  - [x] Ensure validation allows saving these fields
- [x] Analytics: Implement event logging (AC 9)

## Dev Notes

### Architecture & Data Model
- **Schema**: `Practice` table already has `categoryId` (String), `method` (String?), and `tags` (Json?).
- **Legacy Note**: The schema `schema.prisma` defines `categoryId` as string ID. `CATEGORY_COLORS` in frontend uses underscored keys (e.g., `VALEURS_HUMAINES`). Ensure the API values match the database values.
- **Prisma JSON Filtering**: Filtering by tags (Json array) in Prisma/Postgres:
  ```typescript
  // Example Prisma where clause for tags
  // Note: JSON filtering syntax depends on Prisma version and DB structure
  // If tags is ["tag1", "tag2"], and we want practices containing specifically "tag1":
  where: {
    path: ['tags'],
    array_contains: 'tag1' // or use raw query if complex OR logic needed
  }
  ```
- **Store Updates**: Build upon `usePracticesStore` in `client/src/features/practices/state/practices.slice.ts`.

### Project Structure Notes
- **Filters Location**: `client/src/features/practices/components/`
- **Component Naming**: Follow existing pattern `PillarFilterDropdown`. Maybe create a `SidebarFilterPanel` to house them all.

### References
- [schema.prisma](file:///server/prisma/schema.prisma) - DB Model
- [PracticeCatalog.tsx](file:///client/src/features/practices/pages/PracticeCatalog.tsx) - Main Page
- [practices.slice.ts](file:///client/src/features/practices/state/practices.slice.ts) - State Management

## Dev Agent Record

### Agent Model Used

Antigravity (Google Deepmind)

### Known Issues / Risks
- **Frontend Discrepancy**: `PracticeEditForm.tsx` (from previous Story 2.1.4) does NOT appear to have fields for editing `Method` or `Tags`. While the backend supports them, you may not be able to easy Create/Edit data to TEST this filtering without either:
  1. Manually seeding data in DB.
  2. Briefly updating `PracticeEditForm` to support these inputs (Recommended).
### Senior Developer Review (AI)

**Date:** 2026-01-23
**Reviewer:** Antigravity (Code Review Agent)
**Status:** Approved

**Findings & Fixes:**
- **Critical Fix**: Fixed missing dependencies in `PracticeCatalog.tsx` useEffect which prevented filters from triggering data reloads.
- **Cleanup**: Added untracked new component files to git.
- **Verification**: Verified implementation of backend repositories, API endpoints, store logic, and UI components against ACs. All ACs appear to be met.
- **Process**: Updated story tasks to reflect actual completion state.
