# Story 4.3.1: Enhance Issue Submission with Tag Identification

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **specify exactly which tags are causing issues with a practice, or which tags are missing when not linked to a specific practice**,
so that **we can identify granular problem sources and receive targeted recommendations**.

## Acceptance Criteria

1.  **Issue Linked to Practice (Problematic Tags)**
  - [x] **Given** I am creating a new Issue
  - [x] **When** I select a linked Practice
  - [x] **Then** I am presented with a multi-select list of Tags associated with that practice (labeled "Select problem sources").

2.  **Standalone Issue (Missing Practice)**
  - [x] **Given** I am creating a new Issue *not* linked to a practice
  - [x] **When** I check the "Practice not listed" checkbox
  - [x] **Then** I am presented with a global multi-select list of all system tags (labeled "Select missing capabilities").

3.  **Tag Descriptions**
  - [x] **Given** I hover over a tag in the selection list
  - [x] **Then** a tooltip displays the tag's description.

4.  **Submission and Storage**
  - [x] **Given** I submit the issue
  - [x] **Then** the selected tags are saved in a new `issue_tags` relational table linked to this Issue.

## Tasks / Subtasks

- [x] **Database Implementation**
  - [x] Add `tags` table and `issue_tags` join table to Prisma schema (ensure schema migration creates necessary fields).
  - [x] Add `is_standalone` boolean to `Issue` table to support standalone issues correctly.
- [x] **Backend: Service Layer**
  - [x] Update `IssueService.createIssue` to accept and process an array of `tag_ids`.
  - [x] Support creating standalone issues (without `practice_id`).
- [x] **Backend: API Layer**
  - [x] Update POST `/api/v1/teams/:teamId/issues` validation to accept optional array of tags and optional `practice_id`.
- [x] **Frontend: Store & API**
  - [x] Update Issue type definitions to include tags.
  - [x] Add API hook to fetch practice tags (when practice selected) or global tags (when no practice selected).
- [x] **Frontend: UI**
  - [x] Update `IssueSubmissionModal.tsx`.
  - [x] Add multi-select component for tags with hover tooltips.
  - [x] Dynamically load tags based on practice selection.
- [x] **Testing**
  - [x] Unit tests for `IssueService` handling `practice_id` nullability and saving tags.
  - [x] Component tests for `IssueSubmissionModal` tag selection logic.

## Dev Notes

- **Technical Context:** This story builds on top of the original issue submission (Story 4.1), adding granular problem identification. The UI needs to gracefully handle switching between practice-linked and standalone modes without losing form state if possible.
- **Dependencies:** The actual tag reference data (`tags`, `tag_personality_relations`, etc.) will be seeded in Story 4.3.2, but the schema structure linking issues to tags (`issue_tags`) must be defined here.
- **Transactions:** The issue creation, linking to practices (if applicable), linking to tags (`issue_tags`), and the `issue.created` event log must all be wrapped in a single database transaction.

### Project Structure Notes

- **Alignment with unified project structure:** Ensure `tags` are treated as a shared domain or kept within the relevant feature context.
- **Component Reusability:** Consider making the Tag multi-select reusable as it may be needed elsewhere later.

### References

- **Architecture Document:** `_bmad-output/planning-artifacts/architecture.md#Decision-1-5-Directed-Tag-Based-Recommendation-Engine`
- **Sprint Change Proposal:** `sprint-change-proposal-2026-03-19.md`

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

- Implemented practice-specific tag filtering by resolving selected practices' `Practice.tags` JSON arrays and mapping to canonical `Tag` rows.
- Added Prisma migration SQL for `tags`, `issue_tags`, and `issues.is_standalone` to match schema changes.
- Added backend unit tests for `tags.service` (`getTags` and `getTagsByPracticeIds`) and validated issue/tag creation tests.
- Updated frontend tags API and issue submission modal to request practice-scoped tags for linked issues and global tags for standalone issues.
- Tooltip behavior uses tag description through native hover title on each tag option.
- Resolved local Vitest discovery failure (`No test suite found`) by upgrading `vitest` to a Node 22-compatible version; issue component suites are now executable.

### Change Log

- **2026-03-19** — Code review fixes (Antigravity): H1-H4, M1, M3 resolved
- **2026-03-20** — Completed M4 practice-specific filtering, added schema migration, updated frontend tag fetching logic, and added backend tags service tests
- **2026-03-20** — Investigated and fixed frontend test discovery in Node 22 by upgrading Vitest to 3.2.4
- **2026-03-20** — Code review auto-fixes (Nmatton): H1/H2 — N+1 practice validation replaced with single `findMany` batch query, both practice and tag validations moved inside transaction (TOCTOU fix); M1 — added `.max(50)` bound to `tagIds`/`practiceIds` on server Zod schema and client form schema; M3 — added 400 guard in tags controller when all `practiceIds` values are invalid; H3/M4 — added `isStandalone` and `tags` fields to `IssueDetails` and `IssueSummary` types in issuesApi.ts; updated issue.service.test.ts mocks to match batch-query pattern; File List updated with three previously undocumented changed files

### File List

- server/prisma/schema.prisma — Added Tag, IssueTag models; added isStandalone to Issue
- server/prisma/migrations/20260320000000_add_tags_issue_tags_standalone/migration.sql — Added SQL migration for tags, issue_tags, and issues.is_standalone
- server/src/repositories/issue.repository.ts — Added issueTags include to findById, findAll, update
- server/src/services/issue.service.ts — Added tag validation, tags/isStandalone in response mapping
- server/src/services/tags.service.ts — Added getTagsByPracticeIds for practice-scoped tag lookup
- server/src/services/tags.service.test.ts — New tests for tag query/filter behavior
- server/src/controllers/issues.controller.ts — Added createIssueSchema Zod validation
- server/src/controllers/tags.controller.ts — Added `practiceIds` query handling for practice-specific tags
- server/src/routes/tags.routes.ts — New: tags routes with requireAuth
- server/src/schemas/issue.schema.ts — Added createIssueSchema
- server/src/app.ts — Registered tags router
- server/src/services/issue.service.test.ts — Added standalone/tag tests for createIssue
- client/src/features/issues/components/IssueSubmissionModal.tsx — Added practice-specific tag loading logic
- client/src/features/issues/components/__tests__/IssueSubmissionModal.test.tsx — Added test coverage for practice-specific tag fetch
- client/src/features/issues/api/tagsApi.ts — Added query params object including `practiceIds`
- client/package.json — Upgraded `vitest` to `^3.2.4`
- client/package-lock.json — Updated lockfile after Vitest upgrade
- client/src/features/issues/api/issuesApi.ts — Added tagIds/isStandalone to CreateIssueDto; added tags/isStandalone to IssueDetails and IssueSummary types
- client/src/features/teams/components/CreatePracticeModal.tsx — Fixed joinValues signature, copy-practice race-condition guard, title-source fix (pre-existing fix bundled in this branch)
- client/src/features/practices/components/PillarContextPopover.tsx — Removed debug console.log
