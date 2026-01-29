# Story 4.2: View Issue Detail with Full History

**Status:** done

## User Story

As a **team member**,
I want to **view the full details of an issue including its linked practices and history timeline**,
so that **I can understand the context, current status, and evolution of the discussion**.

## Acceptance Criteria

1.  **Issue Detail Layout**
    - [ ] Displays **Title** (in large font), **Priority** (Badge: Low/Medium/High), and **Status** (Badge: Open/In Discussion/Resolved).
    - [ ] Displays **Description** rendered from Markdown (supports bold, lists, code blocks).
    - [ ] Displays **Author** name and **Created Date** (relative, e.g., "2 days ago").
    - [ ] Displays linked **Practices** as clickable cards/badges (navigates to Practice Detail).

2.  **History Timeline**
    - [ ] Shows a chronological list of events for this issue (newest first).
    - [ ] Event: **Issue Created** - Displayed at the start/bottom of history.
    - [ ] Future-proofing: Design supports displaying future events like "Status Changed", "Comment Added", "Practice Linked".
    - [ ] Visual indication of timeline (vertical line, nodes).

3.  **Navigation & Actions**
    - [ ] "Back to Issues" button (top left).
    - [ ] Edit/Status Change buttons are **visible but disabled** or **hidden** (implementation in Story 4.3/4.4, but UI placeholder is acceptable).

4.  **Error Handling**
    - [ ] Invalid Issue ID -> Shows 404 "Issue not found" page/message.
    - [ ] Issue belongs to another team -> Shows 403 "Access Denied" or 404 (Team Isolation).

5.  **Performance**
    - [ ] Initial load < 500ms.
    - [ ] Uses Skeletons while loading details.

## 🛠 Technical Requirements

### 1. Database & Data Access

-   **Repositories (Mandatory Layer):**
    -   **`issue.repository.ts`**: Implement `findById(issueId, teamId)` returning issue + linked practices.
    -   **`event.repository.ts`**: Implement `findByEntity(teamId, entityType, entityId)` returning events list.
    -   **Refactor Alert:** Previous story (4.1) implemented `createIssue` in Service directly. This story **MUST** introduce the Repository layer for reads. (Refactoring `createIssue` to use repo is *recommended* but not strictly required if it scope-creeps, but `getIssue` **MUST** use repo).

### 2. API Design

-   **GET** `/api/v1/teams/:teamId/issues/:issueId`
    -   **Auth:** `requireAuth`, `validateTeamIsolation`
    -   **Response:**
        ```json
        {
          "issue": {
            "id": 123,
            "title": "Standup is too long",
            "description": "...",
            "priority": "HIGH",
            "status": "OPEN",
            "createdAt": "2026-01-20T10:00:00Z",
            "author": { "id": 45, "name": "Alice" },
            "practices": [{ "id": 12, "title": "Daily Standup" }]
          },
          "history": [
            {
              "id": 999,
              "eventType": "issue.created",
              "action": "created",
              "actor": { "id": 45, "name": "Alice" },
              "createdAt": "2026-01-20T10:00:00Z",
              "payload": { ... }
            }
          ]
        }
        ```
    -   **Rationale:** Fetch details + history in one call (or parallel logic in service) to minimize RTT.

### 3. Frontend Architecture

-   **Component:** `IssueDetailView.tsx` (Page).
-   **Component:** `IssueTimeline.tsx` (Sub-component).
-   **Component:** `IssuePracticeList.tsx` (Sub-component for linked practices).
-   **Service:** `issues.api.ts` -> `getIssueDetails(teamId, issueId)`.
-   **Route:** `/teams/:teamId/issues/:issueId`.

## 🏗 Architecture Compliance

-   **Layered Architecture (CRITICAL):**
    -   Do **NOT** put Prisma calls in `issues.controller.ts` or `issues.service.ts`.
    -   **Pattern:** `issues.routes.ts` -> `issues.controller.ts` -> `issue.service.ts` -> `issue.repository.ts` / `event.repository.ts`.
-   **Team Isolation:**
    -   Repositories MUST accept `teamId` and include it in `where` clause. `findUnique({ where: { id: issueId, teamId } })`.

## 🧪 Testing Requirements

-   **Backend:**
    -   `issue.repository.test.ts`: Verify `findById` respects `teamId` (returns null if issue exists but different team).
    -   `issues.controller.test.ts` or integration: Verify response structure matches spec.
-   **Frontend:**
    -   `IssueDetailView.test.tsx`:
        -   Renders title/desc correctly.
        -   Renders Markdown content.
        -   Shows 404 state if API returns 404.
        -   Timeline renders "Created" event.

## 📄 References

-   **Architecture - Code Structure:** Enforces Repository pattern.
-   **Schema:** `Issue` and `Event` tables defined in `schema.prisma`.

## 📝 Previous Learnings & Constraints

-   **Validation:** Use `parseInt` for IDs from params, handle `NaN` (400 Bad Request).
-   **Dates:** Format dates on frontend using `date-fns` (Reference: Project Context).
-   **Markdown:** Use a secure Markdown renderer (e.g., `react-markdown`) preventing XSS.

## Tasks / Subtasks

- [x] **Data Access Layer (Repositories)**
    - [x] Create `server/src/repositories/issue.repository.ts` with `findById`
    - [x] Create `server/src/repositories/event.repository.ts` with `findByEntity`
    - [x] Create `server/src/repositories/__tests__/issue.repository.test.ts` (TDD)

- [x] **Backend Service & API**
    - [x] Update `issue.service.ts`: Add `getIssueDetails` using new repositories
    - [x] Update `issues.controller.ts`: Add `getIssue` handler
    - [x] Update `issues.routes.ts`: Add GET route
    - [x] Test API endpoint manually or via integration test

- [x] **Frontend Components**
    - [x] Create `IssueTimeline` component
    - [x] Create `IssueDetailView` page component
    - [x] Add route for detail view
    - [x] Implement `issues.api.ts` fetch function

- [x] **Verification**
    - [x] Verify formatting of Markdown description (Fixed: installed `@tailwindcss/typography`)
    - [x] Verify Team Isolation (verified via `issue.repository.test.ts` test case: "should return null if issue exists but belongs to another team")
