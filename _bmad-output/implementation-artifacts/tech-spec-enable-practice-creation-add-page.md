---
title: 'Enable Practice Creation from Add Practices Page'
slug: 'enable-practice-creation-add-page'
created: '2026-03-11'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Frontend: React 18 + TypeScript + Zustand + Tailwind + React Router DOM'
  - 'Testing: Vitest + Testing Library'
files_to_modify:
  - 'client/src/App.tsx'
  - 'client/src/features/teams/pages/AddPracticesView.tsx' (Delete or empty)
  - 'client/src/features/teams/pages/AddPracticesView.test.tsx' (Delete or merge)
  - 'client/src/features/teams/components/TeamDashboard.tsx'
code_patterns:
  - 'Routing uses React Router DOM in App.tsx'
  - 'ManagePracticesView already reads ?category= URL param correctly'
test_patterns:
  - 'Frontend tests use Vitest with MemoryRouter for testing navigation'
  - 'Extensive mock setup in ManagePracticesView.test.tsx'
---

# Tech-Spec: Enable Practice Creation from Add Practices Page

**Created:** 2026-03-11

## Overview

### Problem Statement

Currently, there are two distinct pages for managing a team's practices: the "Add Practices" page (`/teams/:teamid/practices/add`) and the "Manage Practices" page (`/teams/:teamid/practices/manage`). The "Add Practices" page is accessible via navigation but lacks the ability to create new custom practices. The "Manage Practices" page has all the required functionality (including creating and removing practices, and tabs for available vs. selected) but is no longer linked in the navigation flow. This creates a disconnected and incomplete user experience.

### Solution

Consolidate the team practice management experience by replacing the current `AddPracticesView` with the `ManagePracticesView`. The `ManagePracticesView` already contains the full feature set the user needs (filtering, adding, removing, and creating practices). We will route the existing `/teams/:teamId/practices/add` navigation to use the `ManagePracticesView` component (or rename it appropriately) and deprecate the old, limited `AddPracticesView`.

### Scope

**In Scope:**
- Updating the router (`App.tsx`) to map the `/teams/:teamId/practices/add` route to `ManagePracticesView`.
- Removing or deprecating the old `AddPracticesView.tsx` component.
- Ensuring that any "category" query parameters from previous navigation links still work correctly with the consolidated view.
- Keeping the "Create New Practice" modal and all existing tab functionality intact.

**Out of Scope:**
- Backend API changes.
- Modifying the closed tag taxonomy or backend schemas.

## Context for Development

### Codebase Patterns

- The application uses `react-router-dom` in `App.tsx` for routing. Currently `/teams/:teamId/practices/add` and `/teams/:teamId/practices/manage` point to different components (`AddPracticesView` and `ManagePracticesView`).
- `ManagePracticesView` already fully supports the `?category=` query parameter that was previously the main feature of `AddPracticesView`, meaning it is a complete superset of the old page's functionality.
- State management for team practices is handled by `useManagePracticesStore` and `useAddPracticesStore`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `client/src/App.tsx` | Router definition. Will need to point the `/add` path to `ManagePracticesView` or remove it. |
| `client/src/features/teams/pages/AddPracticesView.tsx` | The redundant component to be removed. |
| `client/src/features/teams/components/TeamDashboard.tsx` | Contains navigation links to the `/add` page that may need updating. |

### Technical Decisions

- The most robust approach is to physically remove `AddPracticesView.tsx` and map the existing `/teams/:teamId/practices/add` route in `App.tsx` directly to `ManagePracticesView`. This preserves any external or bookmarked links to the `/add` page while immediately serving the unified UX.
## Implementation Plan

### Tasks

1. **Update Application Routing**
   - File: `client/src/App.tsx`
   - Action: Locate the route `path="/teams/:teamId/practices/add"`. Change its `element` to render `<ManagePracticesView />` instead of `<AddPracticesView />`.
   - Notes: Ensure that `ManagePracticesView` is imported if not already handled by existing routes.

2. **Remove Redundant Components**
   - File: `client/src/features/teams/pages/AddPracticesView.tsx`
   - Action: Delete this file completely.
   - Notes: Since the route now points to `ManagePracticesView`, this component is no longer used.

3. **Remove Redundant Tests**
   - File: `client/src/features/teams/pages/AddPracticesView.test.tsx`
   - Action: Delete this file completely.
   - Notes: All functionality is covered by `ManagePracticesView.test.tsx`.

4. **Update Navigation Links (if necessary)**
   - File: `client/src/features/teams/components/TeamDashboard.tsx` (and any other files found during implementation that link to `/add`)
   - Action: Verify that the links to `/teams/:teamId/practices/add` still make contextual sense. If they pass a `?category=` query parameter, leave them as-is (since `ManagePracticesView` handles it). If the terminology "Add Practices" is heavily used, consider changing the link text to "Manage Practices" or simply keep it as an alias.
   - Notes: The routing change makes the actual link destination correct functionally.

### Acceptance Criteria

- [x] AC 1: Given a user is on the Team Dashboard, when they click "Add Practices" or navigate to `/teams/:teamId/practices/add`, then they should see the Manage Practices view containing both "Available" and "Selected" tabs and the "Create New Practice" button.
- [x] AC 2: Given a user navigates to `/teams/:teamId/practices/add?category=agile`, then the Manage Practices view should load with the "Available Practices" tab active and the category filter pre-applied.
- [x] AC 3: Given a user is on the consolidated Manage Practices view, when they click "Create New Practice", then the creation modal should open and function properly (allowing creation from scratch or template).
- [x] AC 4: Given the codebase is built and tests are run, then there should be no compilation errors, unused imports, or failing tests introduced by the removal of `AddPracticesView`.

## Review Notes
- Adversarial review completed
- Findings: 10 total, 4 fixed, 6 skipped
- Resolution approach: auto-fix

## Additional Context

### Dependencies
- None. This is a purely frontend routing and consolidation change reusing existing backend endpoints and UI components.

### Testing Strategy
- **Unit/Component Tests**: Rely on the existing `ManagePracticesView.test.tsx` which extensively covers the functionality. Ensure it passes.
- **Manual QA**:
  1. Login and go to a team dashboard.
  2. Click any link that goes to the "Add practices" flow.
  3. Verify you land on the Manage Practices page.
  4. Verify that the "Create New Practice" button is visible and works.
  5. If clicking a specific category card on the dashboard, verify the filter is applied on the destination page.

### Notes
- This consolidation significantly reduces technical debt by deleting an entire duplicated page and its tests, while improving the UX.
