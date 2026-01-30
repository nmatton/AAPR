# Story 4.5: Issue Management Dashboard

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **view all submitted issues in a centralized dashboard with filtering and sorting**,
so that **I can manage the team's backlog of impediments and identify key areas for adaptation**.

## Acceptance Criteria

1.  **Issues Dashboard Navigation**
    - [ ] **Given** I'm on the global navigation
    - [ ] **When** I click [Issues]
    - [ ] **Then** I'm taken to the Issues Dashboard for my current team.
    - [ ] **And** an event is logged: `{ action: "issues_dashboard.viewed", teamId, timestamp }`.

2.  **Issue List Display**
    - [ ] **Given** I'm on the Issues Dashboard
    - [ ] **When** the page loads
    - [ ] **Then** I see a list of all issues submitted by my team.
    - [ ] **And** each card shows:
        - Practice Name
        - Description (preview/truncated)
        - Status (Submitted, Discussed, Adaptation in Progress, Evaluated)
        - Author
        - Created Date
        - Comment Count

3.  **Issue Detail Navigation**
    - [ ] **Given** I'm viewing the list
    - [ ] **When** I click on an issue
    - [ ] **Then** I'm navigated to the Issue Detail view (Story 4.2).

4.  **Filtering**
    - [ ] **Given** I want to find specific issues
    - [ ] **When** I use the filters
    - [ ] **Then** I can filter by:
        - **Status** (Dropdown: All, Submitted, Discussed, Adaptation in Progress, Evaluated)
        - **Practice** (Dropdown: All, [List of team practices])
        - **Author** (Dropdown: All, [List of team members])

5.  **Sorting**
    - [ ] **Given** I want to see issues in a specific order
    - [ ] **When** I change the sort order
    - [ ] **Then** I can sort by:
        - **Date** (Newest First / Oldest First)
        - **Comments** (Most Comments / Least Comments)

6.  **Submission Entry Point**
    - [ ] **Given** I'm on the Issues Dashboard
    - [ ] **When** I click [+ Submit Issue]
    - [ ] **Then** the Issue Submission modal/page opens (Story 4.1).

7.  **Empty State**
    - [ ] **Given** the list is empty (no issues match filters or team has no issues)
    - [ ] **When** I view the page
    - [ ] **Then** I see an empty state message (e.g., "No issues found" or "Submit your first issue").

## Tasks / Subtasks

- [ ] **Backend: Issues Query API**
    - [ ] Update `issues.controller.ts` and `issues.service.ts`:
        - Ensure `getIssues` supports query parameters: `status`, `practiceId`, `authorId`, `sortBy` (date/comments), `sortDir` (asc/desc).
    - [ ] Update `issue.repository.ts`:
        - Implement dynamic Prisma query construction based on filters.
        - Add sorting logic (join with comments for comment count sorting if needed, or use relation count).
    - [ ] Ensure `commentCount` is returned with the issue list (using `_count` in Prisma).
    - [ ] update `issues.routes.ts` validation schema for query params.

- [ ] **Frontend: Issues Dashboard UI**
    - [ ] Create `IssuesDashboard` page component.
    - [ ] Add `Issues` link to the main navigation (if not present).
    - [ ] Implement `IssueFilters` component:
        - Select for Status.
        - Select for Practice (fetch team practices).
        - Select for Author (fetch team members).
    - [ ] Implement `IssueSort` component (dropdown for Newest/Oldest/Most Comments).
    - [ ] Create `IssueList` and `IssueCard` components (reuse existing if available, ensure all fields are shown).
    - [ ] Integrate `useIssues` hook with query parameters.
    - [ ] Implement Empty State.

- [ ] **Testing**
    - [ ] **Backend Integration Test**:
        - Test filtering by status.
        - Test filtering by practice.
        - Test sorting by date (newest/oldest).
        - Test sorting by comment count.
    - [ ] **Frontend Component Test**:
        - Render dashboard with mock data.
        - Verify filters trigger API calls with corect params.
        - Verify sorting triggers API calls.
        - Verify empty state rendering.

## Dev Notes

### Architecture Patterns
-   **API Design**: Use standard query parameters for filtering/sorting (camelCase).
    -   `GET /api/v1/teams/:teamId/issues?status=submitted&sortBy=createdAt&sortDir=desc`
-   **State Management**: Use `useIssues` hook (TanStack Query or useEffect+State) to manage listing data. Avoid global Zustand store for search results if possible to keep it fresh, or standard "server state" pattern.
-   **Components**: Re-use existing UI components where possible (e.g., specific filter dropdowns, cards).

### Source Tree
-   `server/src/controllers/issues.controller.ts`
-   `server/src/services/issue.service.ts`
-   `server/src/repositories/issue.repository.ts`
-   `client/src/features/issues/pages/IssuesDashboard.tsx` (New)
-   `client/src/features/issues/components/IssueFilters.tsx` (New)
-   `client/src/features/issues/components/IssueSort.tsx` (New)

## Dev Agent Record

### Agent Model Used
-   Antigravity (simulated SM)

### Debug Log References
-   N/A
