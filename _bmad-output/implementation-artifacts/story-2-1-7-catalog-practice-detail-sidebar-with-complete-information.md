# Story 2.1.7: Catalog - Practice Detail Sidebar with Complete Information

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **see all practice details (description, steps, tags, roles, benefits, pitfalls, workproducts, version info) when I click a practice**,
so that **I have comprehensive information before adding it to our team**.

## Acceptance Criteria

1. **Given** I click on a practice in the catalog or team list
   **When** the detail sidebar opens
   **Then** it displays on the right side and shows all relevant practice information:
     - Title (large, clear)
     - Goal/Objective (prominent)
     - Detailed Description (if available)
     - Pillars Covered (colored badges, clickable - see Story 2.1.8)
     - Category (shown as a tag/badge)
     - Tags/Framework (e.g., "Scrum", "Agile", "Communication")
     - Method/Framework (e.g., "Scrum", "XP", "Kanban")
     - Steps/Procedure (if available, as numbered list)
     - Roles (if available, list of roles involved)
     - Benefits (list or paragraph)
     - Pitfalls (list or paragraph)
     - Work Products (list or paragraph, outputs of the practice)
     - Version info: "v1.2.3"
     - Last Updated: "2026-01-15 by [User Name]"
     - Created: "2025-12-01"
     - [Edit] button (if editable)
     - [Add to Team] button (if not already in team portfolio)
     - [Remove from Team] button (if already in team)

2. **Given** the sidebar shows practice details
   **When** some fields are empty (e.g., no steps, no work products)
   **Then** those sections are either hidden or shown as "Not specified"
   **And** the sidebar doesn't look empty (compact layout)

3. **Given** the practice detail is displayed
   **When** I see the "category" field
   **Then** it should NOT appear as "category_id" or raw database values
   **And** only JSON-defined fields from the practice are shown (database metadata like hash, raw JSON are hidden)

4. **Given** the sidebar is open
   **When** the information loads
   **Then** I see a loading skeleton while data is fetched

5. **Given** I'm viewing practice details
   **When** the page loads
   **Then** an event is logged: `{ action: "practice.detail_viewed", teamId, practiceId, timestamp }`

## Tasks / Subtasks

- [ ] 1. Create/Update `SidebarPanel` generic component (AC 1)
  - [ ] Ensure fixed right positioning (~280px-350px width)
  - [ ] Implement slide-in/out animation
  - [ ] Add close button (X) and overlay click-to-close
- [ ] 2. Create `PracticeDetailSidebar` component (AC 1, AC 2)
  - [ ] Fetch detailed practice data (if not fully available in list view)
  - [ ] Map all JSON fields to UI elements (Title, Goal, Pillars, etc.)
  - [ ] Implement "Add to Team" / "Remove from Team" actions
  - [ ] Implement "Edit" action (navigation to edit form)
- [ ] 3. Integrate Sidebar into `PracticeCatalog` and `TeamDashboard` (AC 1)
  - [ ] Handle "onPracticeClick" events to open sidebar
  - [ ] Ensure sidebar overlays content correctly without shifting layout (or pushes if desired, but overlay is standard for this spec)
- [ ] 4. Implement Loading State (AC 4)
  - [ ] Create skeleton loader matching sidebar layout
- [ ] 5. Implement Loading Event Logging (AC 5)
  - [ ] Log `practice.detail_viewed` on open
- [ ] 6. Styling and Polish
  - [ ] Use Tailwind badges for Pillars and Tags
  - [ ] Ensure typography hierarchy (Title > Headers > Body)

## Dev Notes

- **Architecture Pattern**: 
  - Frontend: `client/src/features/practices/components/PracticeDetailSidebar.tsx`
  - Reusable UI: `client/src/components/ui/SidebarPanel.tsx` (if reusable)
  - State: Use local state or URL param (e.g. `?practiceId=123`) to control sidebar visibility. URL param is preferred for deep linking and navigation history.
- **Data Source**: 
  - Practice list/catalog might have summary data. Detail view might require `GET /api/v1/practices/:id` if the list payload is lightweight. Check if full JSON is already in browser cache/state.
- **Styling**:
  - Use `fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50` class pattern for the sidebar.
  - Animations: `transition-transform duration-300` for slide-in.

### Project Structure Notes

- **Feature Directory**: `client/src/features/practices`
- **Components**: 
  - `PracticeDetailSidebar.tsx`
  - `PracticeKeyInfo.tsx` (optional sub-component for pillars/tags)
- **API**: Ensure `practices.api.ts` has `getPracticeById` if needed.

### References

- [UX Design Spec: SidebarPanel](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/ux-design-specification.md#Component-Strategy)
- [Epics: Story 2.1.7](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/epics.md#Story-2.1.7:-Catalog---Practice-Detail-Sidebar-with-Complete-Information)

## Dev Agent Record

### Agent Model Used

Antigravity (Google DeepMind)

### Debug Log References

### Completion Notes List

### File List
