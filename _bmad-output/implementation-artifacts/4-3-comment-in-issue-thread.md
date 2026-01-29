# Story 4.3: Comment in Issue Thread

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **add comments to an issue discussion**,
so that **I can share my perspective and help the team decide on adaptations**.

## Acceptance Criteria

1.  **Comment Submission**
    - [ ] **Given** I am viewing an issue detail page, **When** I scroll to the discussion section, **Then** I see a text area to type a comment.
    - [ ] **Given** I have typed a comment, **When** I click "Post Comment", **Then** the comment is saved to the backend and immediately appears in the timeline without a full page reload.
    - [ ] **Given** I try to post an empty comment, **Then** the "Post Comment" button is disabled or show an error.

2.  **Comment Display**
    - [ ] **Given** an issue has comments, **When** I view the issue, **Then** I see all comments listed chronologically (Oldest first).
    - [ ] Each comment displays: **Author Name**, **Timestamp** (relative, e.g., "2 hours ago"), and **Content** (Markdown supported).

3.  **Draft Preservation (Local)**
    - [ ] **Given** I am typing a comment, **When** I reload the page or navigate away and return, **Then** my typed text is preserved (using localStorage).
    - [ ] **Given** I post the comment, **When** successful, **Then** the draft is cleared.

4.  **Real-time / Refresh**
    - [ ] **Given** I posted a comment, **Then** it persists on refresh.
    - [ ] **Given** another user posts a comment, **When** I refresh the page, **Then** I see the new comment. (No WebSocket required per NFR11).

5.  **Event Logging**
    - [ ] **When** a comment is created, **Then** an event `issue.comment_added` is logged in the `events` table (transactionally).

## Tasks / Subtasks

- [ ] **Database Schema Update**
    - [ ] Create `Comment` model in `schema.prisma` with:
        - `id` (Int, PK)
        - `content` (Text)
        - `issueId` (Int, FK to Issue)
        - `authorId` (Int, FK to User)
        - `createdAt` (DateTime)
        - `updatedAt` (DateTime)
    - [ ] Add relation `comments Comment[]` to `Issue` and `User`.
    - [ ] Run migration `npx prisma migrate dev --name add_comments_table`.

- [ ] **Backend Implementation**
    - [ ] Create `server/src/repositories/comment.repository.ts` (create, findByIssueId).
    - [ ] Update `server/src/services/issue.service.ts` to handle `addComment(issueId, userId, content)`.
        - Should record `Event` (`issue.comment_added`) transactionally.
    - [ ] Update `server/src/controllers/issues.controller.ts` with `addComment` handler.
    - [ ] Update `server/src/routes/issues.routes.ts`: `POST /:issueId/comments`.

- [ ] **Frontend Implementation**
    - [ ] Create `CommentForm` component (Textarea, Post button, draft logic).
    - [ ] Create `CommentList` and `CommentItem` components.
    - [ ] Update `IssueDetailView` to include the `CommentSection`.
    - [ ] Implement `issues.api.ts`: `createComment(issueId, content)`.

- [ ] **Testing**
    - [x] Backend: `comment.repository.test.ts`, integration test for `POST /comments`.
    - [x] Frontend: Test `draft` preservation behavior (requires mocking localStorage or integration test).

## Dev Notes

### Architecture Patterns
-   **Team Isolation:** Comments must implicitly belong to the team via the Issue. Ensure repository checks permissions (Issue belongs to User's Team).
-   **Transactions:** Saving a comment and logging the event MUST be in a single Prisma transaction (`$transaction`).
-   **Drafts:** Use `localStorage` key like `issue_comment_draft_${issueId}`.

### Source Tree
-   `server/prisma/schema.prisma`
-   `server/src/features/issues/` (Service, Controller, Routes)
-   `client/src/features/issues/components/` (Components)

## Dev Agent Record

### Agent Model Used
-   Antigravity (simulated SM)

### Debug Log References
-   N/A
