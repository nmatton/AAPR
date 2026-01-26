# Story 2.1.8: Practice Detail - Clickable Pillars with Popover Context

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **click on pillars shown in the practice detail sidebar to see more context**,
so that **I understand what each pillar means and what other practices cover it**.

## Acceptance Criteria

1. **Given** I'm viewing practice details
   **When** I see the "Pillars Covered" section with colored badges
   **Then** each pillar name is clickable (hover effect shows cursor-pointer and slight visual lift/highlight)

2. **Given** I click on a pillar (e.g., "Communication")
   **When** I click it
   **Then** a popover/modal appears showing:
     - Pillar name (large)
     - Pillar description/definition (from architectural coverage metadata)
     - Category (which category does it belong to?)
     - Color coding (matching the pillar's associated color)
     - Other practices **in our team** covering this pillar (list with practice names)
     - Practice coverage indicators (contextual relevance)

3. **Given** the popover is showing pillar details
   **When** I see the list of other practices covering this pillar
   **Then** each practice name is clickable
   **And** clicking a practice closes the current popover and opens the new practice's detail sidebar

4. **Given** the pillar popover is open
   **When** I want to close it
   **Then** I can click [X], click outside the popover, or press Escape

5. **Given** I'm viewing pillar context
   **When** the popover is displayed
   **Then** an event is logged: `{ action: "pillar.detail_viewed", teamId, practiceId, pillarId, timestamp }`

## Tasks / Subtasks

- [ ] 1. Create `PillarContextPopover` Component
  - [ ] Design accessible popover/modal using standard React + Tailwind (no external UI libs unless already present)
  - [ ] Layout: Header (Name + Category), Body (Description), Footer (Related Team Practices)
  - [ ] Implement "Close" logic (Outside click, Esc, Button)

- [ ] 2. Update `PracticeDetailSidebar` to Support Interactive Pillars
  - [ ] Modify pillar badges to be buttons/links
  - [ ] Add `onClick` handler to open the Popover
  - [ ] Pass necessary context (Team ID, Current Practice ID) to the popover

- [ ] 3. Implement Data Fetching for Pillar Metadata
  - [ ] Use `GET /api/v1/coverage/metadata` (or cached store equivalent) to get Pillar Description and Category info
  - [ ] Ensure metadata is available client-side (Store/Context)

- [ ] 4. Implement "Related Practices" Logic
  - [ ] Filter team practices: `teamPractices.filter(p => p.pillars.includes(currentPillarId) && p.id !== currentPracticeId)`
  - [ ] Display list of matching practices

- [ ] 5. Handle Navigation from Popover
  - [ ] Clicking a related practice should switch the Sidebar content to that practice
  - [ ] Ensure navigation history is handled (if sidebar uses URL params) or state updates correctly

- [ ] 6. Implement Event Logging
  - [ ] Log `pillar.detail_viewed` when popover opens

## Dev Notes

- **Architecture Compliance**:
  - **Metadata Source**: Pillar descriptions must come from the canonical source (Architecture Decision 4 defines `GET /api/v1/coverage/metadata`). Do not hardcode descriptions in the frontend if possible, or use the `static/pillars.json` if that's the established pattern (check `pillars_and_categories.json`).
  - **Styles**: Use "Teal Focus" design system colors. Popover should have `z-index` higher than the sidebar (Sidebar likely `z-50`, Popover `z-60`).
  - **State Management**: If using Zustand (`coverage.slice.ts` or similar), ensure pillar metadata is loaded at boot.

### Project Structure Notes

- **Components**:
  - `client/src/features/practices/components/PillarContextPopover.tsx` (NEW)
  - `client/src/features/practices/components/PracticePillarBadge.tsx` (Update or Create if inline)
- **Store**:
  - `client/src/features/coverage/stores/coverage.store.ts` (Check for metadata selectors)

### References

- [Epics: Story 2.1.8](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/epics.md#Story-2.1.8:-Practice-Detail---Clickable-Pillars-with-Popover-Context)
- [Architecture: Coverage Metadata](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/architecture.md#Coverage-Metadata-Synchronization)

## Dev Agent Record

### Agent Model Used

Antigravity (Google DeepMind)

### Debug Log References

### Completion Notes List

### File List
