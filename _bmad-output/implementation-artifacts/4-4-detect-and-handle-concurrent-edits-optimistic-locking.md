# Story 4.4: Detect and Handle Concurrent Edits (Optimistic Locking)

Status: done

> [!CAUTION]
> **Feature Removed**: Per strategic decision on 2026-01-29, the issue editing feature (and thus optimistic locking) has been completely removed. Issues are now immutable after creation. Only comments are allowed. This story is considered "done" in terms of processing, but the implementation was reverted.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want the **system to detect if someone else has edited an issue I'm working on and help me resolve the conflict**,
so that **we don't accidentally overwrite each other's work and lose data**.

## Acceptance Criteria

1.  **Optimistic Locking Mechanism**
    - [ ] **Given** an issue exists with version `v`
    - [ ] **When** a user attempts to update the issue sending version `v`
    - [ ] **Then** the update succeeds, the issue content is updated, and the version becomes `v+1`.
    - [ ] **And** an event `issue.updated` is logged transactionally.

2.  **Conflict Detection (409 Conflict)**
    - [ ] **Given** an issue exists with version `v+1` (updated by another user)
    - [ ] **When** I attempt to update the issue sending old version `v`
    - [ ] **Then** the server rejects the request with HTTP 409 Conflict.
    - [ ] **And** the response body includes:
        - `error: "conflict"`
        - `server_state`: The current issue data on the server.
        - `user_version`: The version I tried to submit (`v`).
        - `entity`: `{ id, version: v+1 }`.

3.  **Conflict Resolution UI**
    - [ ] **Given** I receive a 409 Conflict while saving
    - [ ] **Then** a **Conflict Resolution Modal** appears (blocking interaction with the underlying form).
    - [ ] **And** I see a diff view showing **My Changes** vs **Server Version**.
    - [ ] **And** I see three resolution options:
        1.  **"Overwrite Server Version"**: Forces my changes to save (incrementing version to `v+2`).
        2.  **"Discard My Changes"**: Reloads the page with server data (losing my edits).
        3.  **"Save My Edits as Comment"**: Creates a new comment with my draft content and reloads the issue content.

4.  **Draft Preservation (Safety)**
    - [ ] **Given** I am editing an issue
    - [ ] **When** I close the tab or reload accidentally
    - [ ] **Then** my edits are preserved in `localStorage` and restored when I return.
    - [ ] **Given** a conflict occurs
    - [ ] **Then** my local draft is **NOT** cleared until I successfully resolve the conflict.

## Tasks / Subtasks

- [ ] **Backend: Update Issue Service with Locking**
    - [ ] Review `server/src/services/issue.service.ts` - currently missing `updateIssue`.
    - [ ] Implement `updateIssue(issueId, teamId, userId, data: { title, description, priority, status, version })`.
    - [ ] Logic:
        - Fetch current issue.
        - Check `currentIssue.version === data.version`.
        - **If mismatch**: Throw `AppError` (409) with `details: { serverState: currentIssue, yourVersion: data.version }`.
        - **If match**: Update issue, increment version, log `issue.updated` event in `$transaction`.
    - [ ] Update `issues.controller.ts` to handle the update request and catch the 409 error structure if needed (middleware might handle generic AppError, but ensure payload fits AC).
    - [ ] Update `issues.routes.ts`: `PUT /:issueId`.

- [ ] **Frontend: Issue Edit & Conflict Handling**
    - [ ] Refactor `IssueDetailView` to support editing mode (Title/Description inputs).
    - [ ] Create `useIssueEditor` hook:
        - Manages form state.
        - Persists to `localStorage` (key: `issue_draft_${issueId}`).
    - [ ] Create `ConflictResolutionModal` component:
        - Props: `isOpen`, `localDraft`, `serverState`, `onResolve`.
        - UI: Side-by-side diff (use a library like `diff` or simple text comparison if preferred, keeping it lightweight per NFR15).
        - Actions: Overwrite (call update with `serverState.version`), Discard, Save as Comment.
    - [ ] Integrate update flow:
        - Call `api.updateIssue(..., version)`.
        - `try/catch`: Check for status 409.
        - On 409: Open ConflictModal with `error.details.serverState`.

- [ ] **Testing**
    - [ ] **Backend Integration Test**:
        - Simulate two concurrent requests.
        - Request A reads version 1.
        - Request B reads version 1.
        - Request A writes (v1 -> v2) -> Success.
        - Request B writes (v1 -> v2) -> Fail (409).
    - [ ] **Frontend Manual Test**:
        - Open issue in Tab 1 and Tab 2.
        - Edit in Tab 1 -> Save.
        - Edit in Tab 2 -> Save -> Verify Conflict Modal appears.
        - Test "Overwrite" option.
        - Test "Save as Comment" option.

## Dev Notes

### Architecture Patterns
-   **Optimistic Locking**: The `version` column is the source of truth.
-   **Error Handling**: Use the standard `AppError` class. for 409, ensure the `details` object is populated correctly so the FE can consume it.
-   **Security**: Ensure `team_id` is validated during update (users can only update issues in their team).

### Source Tree
-   `server/src/services/issue.service.ts`
-   `server/src/controllers/issues.controller.ts`
-   `client/src/features/issues/components/ConflictResolutionModal.tsx` (New)
-   `client/src/features/issues/hooks/useIssueEditor.ts` (New)

### Dependencies
-   No new npm packages required for backend (Prisma handles simple types).
-   Frontend: Check if a diff library is needed or if simple string comparison is enough for MVP. Standard text diff is recommended for descriptions.

## Dev Agent Record

### Agent Model Used
-   Antigravity (simulated SM)

### Debug Log References
-   N/A
