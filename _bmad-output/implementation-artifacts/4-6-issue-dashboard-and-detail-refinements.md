# Story 4.6: Issue Dashboard & Detail Refinements

Status: done

## Story

As a **team member**,
I want to **have a polished and consistent experience when managing issues**,
So that **I can navigate smoothly, quickly view statuses, and access related practices without dead ends**.

## Acceptance Criteria

### 1. Dashboard Stats Card
- [x] **Given** I'm on the Team Dashboard
- [x] **When** I view the Overview section
- [x] **Then** I see an "Issues" card (similar style to Coverage card).
- [x] **And** it displays:
    - Total issue count.
    - A mini-bar chart (or visual distribution) of issues by status (Open, In Progress, Done).

### 2. "All Issues" Page Navigation
- [x] **Given** I'm on the "All Issues" page (Issues Dashboard)
- [x] **When** I click the "Submit Issue" button/link
- [x] **Then** the `IssueSubmissionModal` opens (same behavior as on Team Dashboard).
- [x] **And** I am NOT redirected to a broken/black page.

### 3. Quick Edit Status & Priority
- [x] **Given** I'm viewing an Issue Detail
- [x] **When** I see the Priority and Status badges
- [x] **Then** they appear interactive (hover effect).
- [x] **When** I click a badge
- [x] **Then** a dropdown or popover appears allowing me to select a new value.
- [x] **When** I select a value
- [x] **Then** the issue updates immediately (optimistic update) and persists to backend.

### 4. Detail "Back" Navigation
- [x] **Given** I'm viewing an Issue Detail
- [x] **When** I click "Back to issues"
- [x] **Then** I navigate to the "All Issues" list (Issues Dashboard).
- [x] **And** I am NOT sent to the Team Dashboard (unless I came from there, but preference is All Issues list).

### 5. Linked Practice Navigation
- [x] **Given** I'm viewing an Issue Detail
- [x] **When** I click the "Linked Practice" link
- [x] **Then** the Practice Detail Sidebar opens.
- [x] **And** the context remains the current page (Issue Detail remains visible, sidebar overlays or shifts layout).
- [x] **Or** (Fallback if complex) Navigate to Team Dashboard with that practice pre-selected/open.

### 6. Practice List Issue Counts & Linked Issues
- [x] **Given** I'm on the Team Dashboard Practice List
- [x] **When** I view the rows
- [x] **Then** each practice shows a badge/count of Open Issues.
- [x] **When** I open a Practice Detail Sidebar
- [x] **Then** I see a "Linked Issues" section at the bottom.
- [x] **And** it lists issues linked to this practice.
- [x] **When** I click an issue in that list
- [x] **Then** I navigate to the Issue Detail view.

## Tasks

- [x] **Backend: API Updates**
    - [x] **Stats Endpoint**: Create `GET /api/v1/teams/:teamId/issues/stats` returning counts by status.
    - [x] **Practice Issue Counts**: Update `GET /api/v1/teams/:teamId/practices` to include `_count: { issues: true }` (or similar).
    - [x] **Linked Issues**: Ensure `GET /api/v1/practices/:id` (or team practice get) includes or allows fetching linked issues.


- [x] **Frontend: Dashboard Stats**
    - [x] Create `components/TeamIssueStatsCard.tsx`.
    - [x] Integrate into `TeamDashboard`.

- [x] **Frontend: Navigation Fixes**
    - [x] Fix `IssuesDashboard` "New Issue" action to open Modal.
    - [x] Update `IssueDetailView` back button `to="/teams/:teamId/issues"`.

- [x] **Frontend: Interactive Badges**
    - [x] Create `StatusSelect` and `PrioritySelect` components.
    - [x] Integrate into `IssueDetailView`.
    - [x] Wire up to `useUpdateIssue` mutation.

- [x] **Frontend: Practice Integration**
    - [x] Update `TeamPracticesPanel` to display issue count badge.
    - [x] Update `PracticeDetailSidebar` to fetch and list linked issues using `useIssues` hook.
    - [x] Fix "Linked Practice" link in Issue Detail to trigger sidebar using URL query params.

## Architecture & Guardrails
- **Sidebar State**: Ensure Practice Sidebar state is accessible from Issue Detail. If sidebar is tied strictly to Team Dashboard layout, routing might be tricky.
    - *Recommendation*: Use a URL query param `?practiceId=...` or a global Zustand UI slice to control sidebar visibility.
- **Optimistic Updates**: Ensure quick-edit badges feel instant.
- **Consistency**: Use same color scheme for status/priority in Badges as in the rest of the app.

## Testing Strategy
- Unit test `TeamIssueStatsCard` (rendering).
- Integration test for `IssueDetailView` (updates).
- Verify navigation flows manually or via E2E (Back button, Linked Practice).
