# Story 5.1: Record Adaptation Decision on Issue

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want to record what adaptation decision we've made for a practice difficulty,
So that the decision is documented and we can track if it worked.

## Acceptance Criteria

- **Given** I'm viewing an issue with discussion
  **When** we've agreed on an adaptation
  **Then** I click [Record Decision] button

- **Given** the decision form opens
  **When** I describe the decision (e.g., "Switch to async standups")
  **Then** I capture the decision text

- **Given** I've written the decision
  **When** I click [Save Decision]
  **Then** the issue status changes to "Adaptation in Progress" and decision is recorded

- **Given** a decision is recorded
  **When** I view the issue detail
  **Then** I see the decision prominently with: decision text, who recorded it, when, and "Implementation in progress" status

- **Given** I record a decision
  **When** the decision is saved
  **Then** an event is logged: `{ action: "issue.decision_recorded", issueId, teamId, decision_text, timestamp }`

## Tasks / Subtasks

- [x] Task 1: Backend Database and Schema Updates 
  - [x] Subtask 1.1: Update the DB schema (Prisma/DBML) to support `decision_text`, `decision_recorded_by`, `decision_recorded_at` in `issues` table and status value `'adaptation_in_progress'`
  - [x] Subtask 1.2: Generate and apply migrations for the issue schema

- [x] Task 2: Backend API Implementation 
  - [x] Subtask 2.1: Add Zod schema validation for the decision payload (decision text, min 10 chars)
  - [x] Subtask 2.2: Implement the `recordDecision` service method handling optimistic locking (using atomic `updateMany` with version WHERE clause) and transactionally saving the decision/status update alongside the event log
  - [x] Subtask 2.3: Implement the controller and route (`POST /api/v1/teams/:teamId/issues/:issueId/decisions`)
  - [x] Subtask 2.4: Ensure event logging strictly logs `{ action: "issue.decision_recorded", issueId, teamId, decision_text, timestamp }`

- [x] Task 3: Frontend UX / UI Updates
  - [x] Subtask 3.1: Add a `[Record Decision]` button on the Issue Detail view for open/discussed issues
  - [x] Subtask 3.2: Create a decision capture form/modal to enter the decision
  - [x] Subtask 3.3: Submit decision to the API, displaying inline spinners and appropriately dispatching actions/mutations 
  - [x] Subtask 3.4: Add error handling specifically for 409 Conflict with toast user feedback (replacing alert())
  - [x] Subtask 3.5: Update Issue Detail display to prominently show the recorded decision (text, author, time) and status "Implementation in progress"

- [x] Task 4: Testing & Verification
  - [x] Subtask 4.1: Write co-located API tests verifying issue state transitions and event emission
  - [x] Subtask 4.2: Add unit tests for the frontend component displaying the new states and modal interaction

## Dev Notes

- **Architecture Rules Compliance**: 
  - Naming: Snake_case in DB with Prisma mapping to camelCase in API/TS.
  - Structure: Frontend feature-first (components/hooks/state). Backend layers (Routes -> Controllers -> Services -> Repositories).
  - State: Optimistic mutations require a `version` field from the DB. Use appropriate conflict resolution if a 409 is returned. 
  - Event Logging: Always include `teamId`, `requestId`, and proper payload schema on events. This must be an append-only creation. Event action should be `issue.decision_recorded`.

### Project Structure Notes

- Frontend: Updates will be required in the `features/issues` feature folder. Components should be co-located.
- Backend: Update `issues` module. Service logic goes to `issues.service.ts` or `decisions.service.ts` (depending on current issue boundary pattern). Route and Controller should remain thin.

### References

- [Source: epics.md#Epic 5]
- [Source: architecture.md#Decision 2: Event Logging Architecture]
- [Source: architecture.md#Decision 5: Optimistic Concurrency Control Implementation]

## Dev Agent Record

### Agent Model Used

Antigravity 

### Debug Log References

N/A

### Completion Notes List

- Implemented standard story document gathering details from epics file. 
- Aligned terminology to architectural guidelines concerning optimistic locking and explicit action event payloads.

### Change Log

- **2026-03-10 (Initial Implementation):** Implemented backend (schema, Zod, service, controller, route) and frontend (DecisionModal, IssueDetailView integration, API client).
- **2026-03-10 (Code Review Fixes - Antigravity):**
  - **[H1]** Added `decision_recorded_by` and `decision_recorded_at` columns to Issue model; updated service, repository, API types, and UI to display who recorded the decision and when.
  - **[H2]** Fixed TOCTOU race condition in optimistic locking: switched from read-then-update to atomic `updateMany` with version in WHERE clause per Architecture Decision 5.
  - **[M2]** Replaced native `alert()` with inline toast notifications (success/warning/error) matching project patterns.
  - **[L1]** Aligned backend Zod min-length validation from 1 to 10 chars to match frontend.
  - **[L2]** Added `ADAPTATION_IN_PROGRESS` to `getIssueStats` status mapping to prevent silent data loss in stats.
  - **[H3+M1]** Updated story task checkboxes and File List to reflect actual implementation.
- **2026-03-10 (Post-completion Bug Fixes - Antigravity):**
  - **[B1]** Added `ADAPTATION_IN_PROGRESS` to `StatusSelect` type and config so status badge displays correctly instead of falling back to "Open".
  - **[B2]** Added `eventTypeLabels` map to `IssueTimeline` for user-friendly history text (e.g., "recorded a decision" instead of raw "issue.decision_recorded").
  - **[B3]** Added ✏️ Edit button on the decision green box; `DecisionModal` now accepts `initialText` prop to pre-fill when editing.
  - **[B4]** Removed status guard so "Record Decision" button is always visible regardless of issue status.

### File List
- _bmad-output/implementation-artifacts/5-1-record-adaptation-decision-on-issue.md
- server/prisma/schema.prisma
- server/src/schemas/issue.schema.ts
- server/src/services/issue.service.ts
- server/src/services/issue.service.test.ts
- server/src/controllers/issues.controller.ts
- server/src/routes/issues.routes.ts
- server/src/repositories/issue.repository.ts
- client/src/features/issues/api/issuesApi.ts
- client/src/features/issues/components/DecisionModal.tsx
- client/src/features/issues/components/__tests__/DecisionModal.test.tsx
- client/src/features/issues/components/IssueDetailView.tsx
