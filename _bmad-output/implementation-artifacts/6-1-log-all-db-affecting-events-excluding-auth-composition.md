# Story 6.1: Log All DB-Affecting Events (Excluding Auth/Composition)

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a researcher,
I want to capture an immutable event log of all DB-affecting actions,
So that I can analyze personality-practice relationships and verify data integrity.

## Acceptance Criteria

1. **Given** a user creates a team
   **When** the team is saved to the database
   **Then** an event is logged: { actor_id, team_id, entity_type: "team", entity_id, action: "created", payload, created_at }

2. **Given** a user submits an issue
   **When** the issue is saved
   **Then** an event is logged with full issue details in payload

3. **Given** a user adds a comment
   **When** the comment is saved
   **Then** an event is logged: { action: "issue.comment_added", payload: { issueId, commentText, actor_id }, ... }

4. **Given** a user completes the Big Five questionnaire
   **When** responses are saved
   **Then** an event is logged: { action: "big_five.completed", payload: { responses: [...], scores: {...} }, ... }

5. **Given** events are logged
   **When** I query the event table
   **Then** ALL DB-affecting events are present (except auth login/team composition events per research rules)

6. **Given** an event is logged
   **When** it's saved to the database
   **Then** it's append-only (no updates or deletes except manual batch purge at experiment end)

7. **Given** events are captured
   **When** they're stored
   **Then** the sequence is maintained: events from the same transaction have ordered timestamps (precision: milliseconds)

## Tasks / Subtasks

- [x] Task 1: Close Story 6.0 event coverage gaps for DB mutations in scope (AC: 4, 5)
  - [x] Subtask 1.1: Add `big_five.completed` event in `saveResponses` when questionnaire is first completed.
  - [x] Subtask 1.2: Add `big_five.retaken` event in `saveResponses` when prior responses exist and are replaced.
  - [x] Subtask 1.3: Ensure Big Five event payload includes `teamId` when resolvable, `userId`, full trait scores, response metadata (count and item IDs), timestamp, and schema version.

- [x] Task 2: Improve issue mutation event payload completeness (AC: 2, 3, 5)
  - [x] Subtask 2.1: Enrich `issue.created` payload with complete creation context (issue ID, title, description summary, priority, status, linked practice IDs, actor/user and team references).
  - [x] Subtask 2.2: Enrich `issue.comment_added` payload with explicit `issueId`, `commentId`, `commentText` (or bounded safe excerpt), `actorId`, `teamId`, and timestamp.
  - [x] Subtask 2.3: Keep payload naming consistent with camelCase API conventions; avoid mixed `decision_text` style for new fields.

- [x] Task 3: Enforce transactional and ordering guarantees on new logging paths (AC: 5, 6, 7)
  - [x] Subtask 3.1: Ensure all newly added event writes occur in the same transaction as the DB mutation.
  - [x] Subtask 3.2: Preserve existing append-only guarantees (no update/delete logic added for events).
  - [x] Subtask 3.3: Ensure event timestamps are explicit and ISO-formatted in payload where required, while DB `createdAt` remains the ordering source of truth.

- [x] Task 4: Add test coverage for Story 6.1 behavior (AC: 1, 2, 3, 4, 5, 7)
  - [x] Subtask 4.1: Extend `server/src/services/big-five.service.test.ts` to assert `big_five.completed` and `big_five.retaken` events and payload structure.
  - [x] Subtask 4.2: Extend `server/src/services/issue.service.test.ts` to assert enriched payloads for `issue.created` and `issue.comment_added`.
  - [x] Subtask 4.3: Add regression tests confirming transaction rollback semantics when event persistence fails.

- [x] Task 5: Keep observability artifact aligned after implementation (AC: 5)
  - [x] Subtask 5.1: Update `docs/research/event-coverage-documentation.md` statuses and payload notes for Story 6.1 changes.
  - [x] Subtask 5.2: Record any intentionally deferred payload harmonization items for Story 6.2.

## Dev Notes

Story 6.1 follows Story 6.0, which established the event coverage baseline and identified concrete mutation gaps. The implementation focus here is to close missing DB-mutation telemetry (especially Big Five completion/retake) and improve payload completeness for issue mutations, while preserving append-only and transactional guarantees.

### Technical Requirements

- Event naming must remain `domain.action` (lowercase, dot-separated).
- For new/updated mutation events, include payload fields needed for research traceability:
  - `teamId` (when team-scoped or resolvable),
  - `actorId`/`userId`,
  - mutation-specific identifiers (issueId, commentId, etc.),
  - timestamp,
  - schema version marker.
- Big Five logging must avoid storing sensitive free-form data beyond research needs; keep payload bounded and explicit.
- Respect Story scope exclusion: auth login and team-composition event expansion are not required in this story.

### Architecture Compliance

- Keep event writes append-only and immutable per architecture Decision 2.
- Keep mutation + event write atomic via transaction boundaries.
- Preserve layered architecture: route/controller -> service -> repository; logging via `event.create`/event service from service layer.
- Maintain API/TS camelCase conventions for new payload properties.

### Library & Framework Requirements

- No new dependencies are required.
- Use existing Prisma transaction patterns and service-layer logging helpers.
- Keep TypeScript strict compatibility in all touched files.

### File Structure Requirements

- Primary implementation files:
  - `server/src/services/big-five.service.ts`
  - `server/src/services/issue.service.ts`
  - `server/src/services/events.service.ts` (if shared typing is extended)
- Primary test files:
  - `server/src/services/big-five.service.test.ts`
  - `server/src/services/issue.service.test.ts`
- Observability artifact update after implementation:
  - `docs/research/event-coverage-documentation.md`

### Testing Requirements

- Unit tests must validate:
  - correct event type (`big_five.completed`, `big_five.retaken`, `issue.created`, `issue.comment_added`),
  - payload field presence and naming,
  - transaction rollback when event logging fails.
- Integration-level validation should confirm new events are persisted in the `events` table for corresponding DB mutations.
- Confirm no regressions for existing excluded telemetry scope (auth/session and team composition).

### Previous Story Intelligence

- Story 6.0 produced a complete coverage matrix in `docs/research/event-coverage-documentation.md` and identified high-priority gaps directly relevant to 6.1:
  - missing Big Five mutation events,
  - partial issue mutation payloads,
  - metadata consistency risks.
- Reuse Story 6.0 matrix methodology and evidence discipline when validating implementation.

### Git Intelligence Summary

- Recent commits are centered on issue dashboard/status UX and practice detail enhancements.
- Direct overlap with Story 6.1 is mainly in issue service/tests; risk is moderate for shared issue-related files and low elsewhere.

### Latest Technical Information

- No external version upgrade is required for this story.
- Existing Prisma + service-layer event logging patterns are sufficient to implement Story 6.1 requirements.

### Project Context Reference

- Follow `_bmad-output/project-context.md` rules:
  - strict TypeScript,
  - structured event payload discipline,
  - team-aware traceability and PII-conscious logging.
- Align with `_bmad-output/planning-artifacts/architecture.md` Decision 2 and Critical Risk #6 controls.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 2: Event Logging Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Critical Risk #6: Event Logging Gaps - Missing Events]
- [Source: docs/research/event-coverage-documentation.md]
- [Source: server/src/services/big-five.service.ts]
- [Source: server/src/services/issue.service.ts]
- [Source: server/src/services/events.service.ts]

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Loaded BMAD config, workflow engine, and create-story workflow assets.
- Parsed user-requested story identifier 6.1 and validated sprint status entry.
- Analyzed Epic 6 requirements, architecture constraints, Story 6.0 artifact, relevant service code, and recent git commits.

### Completion Notes List

- Created Story 6.1 implementation guide with acceptance criteria, concrete tasks, and codebase-specific file targets.
- Scoped 6.1 to DB-affecting event coverage improvements and transactional integrity, with deferred harmonization notes for 6.2.
- Included explicit test and traceability expectations to reduce implementation ambiguity.
- **Implementation (2026-03-12):**
  - Added `big_five.completed` and `big_five.retaken` event logging to `saveResponses` in `big-five.service.ts`. Both events are written inside the Prisma transaction for atomicity. Detects first vs. retake by counting existing responses before deletion.
  - Payload includes: `userId`, `teamId` (when provided, else `null`), all 5 trait scores, `responseCount`, `itemIds`, ISO `timestamp`, `schemaVersion: '1.0'`.
  - `saveResponses` signature extended with optional `teamId?: number` parameter; backward-compatible, no controller change required.
  - Enriched `issue.created` payload: added `issueId`, `descriptionSummary` (bounded to 100 chars), `priority`, `status`, `actorId`, `teamId`, `timestamp`.
  - Enriched `issue.comment_added` payload: replaced `contentSnippet` with `commentText` (bounded to 200 chars), added explicit `issueId`, `actorId`, `teamId`, `timestamp`.
  - All new fields use camelCase per API conventions (AC: 2.3).
  - Added `big_five.completed` and `big_five.retaken` to `EventType` union in `events.service.ts`.
  - Added 14 new tests across `big-five.service.test.ts` (5 new: completed event, retaken event, rollback) and `issue.service.test.ts` (enriched payload assertions, rollback test). All 312 tests pass (1 pre-existing unrelated failure in `teams.routes.test.ts` confirmed pre-Story 6.1).
  - Updated `docs/research/event-coverage-documentation.md`: Big Five rows Missing→Logged, Issues rows Partial→Logged, coverage ratio updated to ≈59.5%.
  - Deferred for Story 6.2: `team.created`, `team.name_updated`, `invite.auto_resolved` payload `teamId` harmonization; `issue.status_changed`/`priority_changed` timestamp enrichment; `issue.decision_recorded` naming normalization.
  - **Review fixes (2026-03-12):**
    - Updated `issue.comment_added` event action to `issue.comment_added` for AC alignment.
    - Added `responses` array to Big Five event payload for AC alignment.
    - Added/updated tests to assert the new action and payload shape.
  - **Telemetry harmonization pass (2026-03-12):**
    - Added explicit payload metadata (`teamId`, `actorId`, `issueId`, `timestamp`) to `issue.status_changed` and `issue.priority_changed`.
    - Normalized `issue.decision_recorded` payload to camelCase (`decisionText`) and added explicit metadata.
    - Added explicit payload metadata to `issue.evaluated`.
    - Added `teamId`/`actorId` metadata to `team.name_updated` payload and `teamId`/`timestamp` to `team.created` payload.
    - Added `teamId`/`timestamp` to `invite.auto_resolved` payload.
    - Updated tests and coverage documentation to reflect these changes.

### Senior Developer Review (AI)

- Reviewer: Nmatton (GPT-5.3-Codex)
- Date: 2026-03-12
- Outcome: Changes Requested
- Summary:
  - Fixed: comment event action semantics (`issue.comment_added`).
  - Fixed: Big Five event payload now contains `responses` along with computed scores.
  - Fixed: metadata harmonization for remaining mutation event payloads in issue/team/invite flows.
  - Fixed: Story artifact formatting issue where file list entries were incorrectly placed under Change Log.
  - Remaining: uncovered items are primarily non-mutation telemetry and planned flows (export and future endpoint work).

### Review Follow-ups (AI)

- [ ] [AI-Review][Medium] Implement explicit event for adaptation decision modify/update flow when endpoint is introduced (currently not implemented). [docs/research/event-coverage-documentation.md]
- [ ] [AI-Review][Medium] Implement export request/download telemetry in Story 6.3 scope. [docs/research/event-coverage-documentation.md]

### File List

- _bmad-output/implementation-artifacts/6-1-log-all-db-affecting-events-excluding-auth-composition.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- server/src/services/big-five.service.ts
- server/src/services/big-five.service.test.ts
- server/src/services/invites.service.ts
- server/src/services/teams.service.ts
- server/src/services/issue.service.ts
- server/src/services/issue.service.test.ts
- docs/research/event-coverage-documentation.md

## Change Log

- 2026-03-12: Story 6.1 implementation - added `big_five.completed`/`big_five.retaken` event logging to Big Five questionnaire service (transactional, retake-aware); enriched `issue.created` and `issue.comment_added` payloads with full metadata context; updated EventType union; extended test coverage (14 new tests); updated event coverage documentation (coverage improved from ~54.8% to ~59.5%).
- 2026-03-12: Review remediation pass - aligned `issue.comment_added` action semantics, added `responses` payload to Big Five events, updated unit tests, fixed story file-list formatting, and moved story status to `in-progress` pending AC5 closure.
- 2026-03-12: Telemetry harmonization pass - completed metadata alignment for `team.created`, `team.name_updated`, `invite.auto_resolved`, `issue.status_changed`, `issue.priority_changed`, `issue.decision_recorded`, and `issue.evaluated`; updated tests and coverage matrix.
