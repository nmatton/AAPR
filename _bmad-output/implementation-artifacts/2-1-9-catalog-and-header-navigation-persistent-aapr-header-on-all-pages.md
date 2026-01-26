# Story 2.1.9: Catalog & Header Navigation (Persistent AAPR Header)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to **see the AAPR branding, catalog access, and logout button on every page**,
So that **I can navigate between core sections and log out from anywhere**.

## Acceptance Criteria

1. **Persistent Header:**
   - **Given** I'm on any page in the application (dashboard, catalog, members, issues, etc.)
     **When** I look at the top of the page
     **Then** I see a persistent header with:
       - AAPR logo/branding (clickable, links to home/dashboard)
       - [Practice Catalog] link (always visible)
       - [Team Dashboard] link (visible only in team context)
       - [Members] link (visible only in team context)
       - User Profile/Avatar with name
       - [Logout] button

2. **Team Context Awareness:**
   - **Given** I'm inside a specific team (URL contains `/teams/:teamId`)
     **When** the header displays
     **Then** the [Team Dashboard] and [Members] links are active and point to the current team
   - **Given** I'm on a page without a team context (e.g., Teams list, Catalog in browse mode)
     **When** the header displays
     **Then** the [Team Dashboard] and [Members] links are disabled or hidden

3. **Navigation Behavior:**
   - **Given** I click the AAPR logo
     **When** I'm logged in
     **Then** I'm taken to `/teams` (My Teams list)
   - **Given** I click [Practice Catalog]
     **When** I'm inside a team
     **Then** it navigates to `/teams/:teamId/practices/manage` (if that's the catalog view for adding)
     **OR** it navigates to `/practices` (Global Catalog) - *Clarification: Story implies global catalog availability.*

4. **Mobile Responsiveness:**
   - **Given** I'm on a mobile device
     **When** I view the header
     **Then** links collapse into a hamburger menu or simplified layout
     **And** AAPR logo and Logout remain accessible

## Tasks / Subtasks

- [x] Task 1: Create `AuthenticatedLayout` component
  - [x] Create `client/src/components/ui/Layout.tsx` (or `AuthenticatedLayout.tsx`)
  - [x] Implement the persistent header structure (Logo, Links, User info, Logout)
  - [x] Implement responsive behavior (hamburger menu or stacking)
- [x] Task 2: Implement Navigation Logic
  - [x] Use `useLocation` or `useParams` to detect `teamId`
  - [x] Conditionally render "Team Dashboard" and "Members" links
  - [x] Ensure "Practice Catalog" link works globally (`/practices`)
  - [x] Ensure Logout works (call `useAuthStore` logout)
- [x] Task 3: Refactor `App.tsx`
  - [x] Wrap all protected routes with the new Layout
  - [x] Ensure `TeamsPage` uses the Layout (remove its internal header)
  - [x] Ensure `TeamDashboard`, `PracticeCatalog`, etc. render inside the Layout
- [x] Task 4: Cleanup
  - [x] Remove duplicate header code from `TeamsPage` (lines 29-50 of App.tsx) or other pages
  - [x] verify all routes render correctly

## Dev Notes

- **Architecture:**
  - Create a shared Layout component. This is a standard React pattern.
  - Avoid prop drilling; use `react-router-dom` hooks (`useParams`, `useLocation`) for context.
  - Use `NavLink` for active state styling (e.g. bold or colored when on that page).

- **Current Code Analysis:**
  - `App.tsx` currently has a hardcoded header in `TeamsPage` component. This should be extracted.
  - Other pages like `TeamDashboard` likely lack a header or strictly use the page content. They will now inherit the header from Layout.
  - `useAuthStore` is already used in `TeamsPage` for logout; reuse this logic.

- **Design:**
  - Standard Tailwind navigation bar.
  - "Teal Focus" design direction (from Architecture).
  - Use `bg-white shadow` as seen in `TeamsPage`.

### Project Structure Notes

- New file: `client/src/components/ui/AuthenticatedLayout.tsx` (or `Layout.tsx`)
- Modified: `client/src/App.tsx`

### References

- [Source: planning-artifacts/epics.md#Story-2.1.9](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/epics.md)
- [Source: client/src/App.tsx](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/client/src/App.tsx)

## Dev Agent Record

### Agent Model Used

Antigravity (simulated SM agent)

### Debug Log References

- Verified `App.tsx` structure.
- Confirmed `2-1-9` backlog status.

### Completion Notes List

- Created `AuthenticatedLayout.tsx` component with persistent header
- Implemented team-aware navigation using `useParams` to detect team context
- Added user avatar with first letter of user name
- Integrated layout into all protected routes in `App.tsx`
- Removed duplicate header code from `TeamsPage` component
- Created comprehensive test suite with 11 test cases
- All tests passing
- Fixed all lint errors

### File List

- client/src/components/ui/AuthenticatedLayout.tsx [NEW]
- client/src/components/ui/AuthenticatedLayout.test.tsx [NEW]
- client/src/App.tsx [MODIFY]
