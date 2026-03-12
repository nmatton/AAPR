# Story 6.3: Event Export & Filtering Capability (Research Use)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authorized researcher/operator with server access,
I want to run server-side CLI exports of events filtered by type, date range, and team,
so that I can analyze specific periods or events for research without exposing export capabilities in the web UI.

## Acceptance Criteria

1. **Given** I'm on the server with access to project scripts and environment
   **When** I run the export command with valid parameters (`--team-id`, `--from`, `--to`, optional `--event-type`, `--format csv|json`)
   **Then** the export process validates parameters and starts successfully

2. **Given** I run an export for date range `2026-01-15` to `2026-01-22`
   **When** the command completes
   **Then** a file is generated in a server-side export directory with all matching events in that date range

3. **Given** I export events
   **When** the output is generated in CSV format
   **Then** columns are properly structured: `actor_id`, `team_id`, `entity_type`, `entity_id`, `action`, `payload_json`, `created_at`
   **And** the data is escaped properly for CSV format

4. **Given** I export events
   **When** the output is generated in JSON format
   **Then** each record preserves canonical event fields and deterministic ordering for research analysis

5. **Given** I export events with PII-sensitive data (e.g., email in payload)
   **When** the export runs
   **Then** PII is redacted or excluded from export (per research protocol)
   **And** emails are masked as `redacted@example.com`, names as `REDACTED`

6. **Given** I'm exporting a large dataset (1000+ events)
   **When** I run the export command
   **Then** the system streams results efficiently
   **And** the export completes without timeout

7. **Given** the export completes successfully
   **When** the output file is written on the server
   **Then** the file has proper naming: `team-events-2026-01-15-to-2026-01-22.csv`
   **And** the CLI prints a confirmation message: `Exported X events`

8. **Given** I attempt an export with invalid parameters (e.g., future date range)
   **When** I run the export command
   **Then** a clear error message is returned: `Invalid date range` or `No events found in date range`
   **And** the command exits with a non-zero status

## Tasks / Subtasks

- [x] Task 1: Implement a dedicated server-side export workflow for research events (AC: 1, 2, 7, 8)
  - [x] Subtask 1.1: Add a new CLI script under `server/src/scripts/` for event export, parallel to the existing purge and restore verification scripts.
  - [x] Subtask 1.2: Add an export service under `server/src/services/` to own parameter validation, export directory resolution, file naming, and orchestration.
  - [x] Subtask 1.3: Expose an `npm` script in `server/package.json` such as `events:export` that invokes the CLI entry point.
  - [x] Subtask 1.4: Validate `--team-id`, `--from`, `--to`, optional repeated `--event-type`, and `--format` before any query starts.
  - [x] Subtask 1.5: Reject invalid ranges, future dates, unsupported formats, and empty required values with `AppError`-style messages and non-zero exit codes.

- [x] Task 2: Reuse and extend the current event repository for export-grade filtering and deterministic reads (AC: 1, 2, 4, 6)
  - [x] Subtask 2.1: Build on `server/src/repositories/event.repository.ts#findByTeamForExport` rather than adding direct Prisma queries in the CLI script.
  - [x] Subtask 2.2: Extend repository filtering to support one or more event types while preserving deterministic ordering by `createdAt asc, id asc`.
  - [x] Subtask 2.3: Ensure date filtering semantics are explicit and reproducible, especially for day-boundary inputs such as `2026-01-15` and `2026-01-22`.
  - [x] Subtask 2.4: Implement a scalable read strategy for 1000+ rows, preferably chunked iteration or cursor/batch processing, so the export path does not rely on loading an unbounded result set into memory.

- [x] Task 3: Implement safe CSV and JSON export writers with payload redaction (AC: 3, 4, 5, 6, 7)
  - [x] Subtask 3.1: Add a reusable serializer that emits canonical fields from the `events` table: `actor_id`, `team_id`, `entity_type`, `entity_id`, `action`, `payload_json`, `created_at`, and keep `event_type` available if needed for internal consistency.
  - [x] Subtask 3.2: For CSV output, escape commas, quotes, line breaks, and JSON payload content correctly.
  - [x] Subtask 3.3: For JSON output, preserve canonical event structure and chronological ordering.
  - [x] Subtask 3.4: Add payload redaction that masks emails as `redacted@example.com`, names as `REDACTED`, and removes or redacts other directly identifying fields before data is written to disk.
  - [x] Subtask 3.5: Keep redaction centralized in one utility so future export flows and audit reviews do not duplicate masking logic.

- [x] Task 4: Add operational safeguards and research telemetry for export execution (AC: 2, 5, 7, 8)
  - [x] Subtask 4.1: Write exports only to a controlled server-side directory such as `server/exports/` or an environment-configured equivalent.
  - [x] Subtask 4.2: Ensure the CLI reports start, completion, output path, format, and exported row count in plain console output suitable for operators.
  - [x] Subtask 4.3: Add export-related event telemetry for start/completion/failure if compatible with the existing event logging policy, addressing the Story 6.1 follow-up on CLI export observability.
  - [x] Subtask 4.4: Fail safely when no events match the filter, returning a clear operator message and non-zero exit code rather than creating a misleading empty export silently.

- [x] Task 5: Cover repository, service, and CLI behavior with tests and docs (AC: 1-8)
  - [x] Subtask 5.1: Extend `server/src/repositories/event.repository.test.ts` for export filters and ordering expectations.
  - [x] Subtask 5.2: Add service-level tests for validation, file naming, redaction, and output formatting.
  - [x] Subtask 5.3: Add CLI-focused tests for argument parsing, success output, empty-result handling, and failure exit codes.
  - [x] Subtask 5.4: Update `docs/research/event-coverage-documentation.md` with export-domain coverage and any new export telemetry.
  - [x] Subtask 5.5: Update infrastructure or ops documentation with the exact command, expected environment variables, export directory, and sample output.

## Dev Notes

Story 6.3 completes Epic 6 by turning the now-queryable event log into a controlled research export capability. The current codebase already has the core building blocks: a persisted `Event` model, deterministic repository reads for export, and existing CLI script patterns for batch event operations. The work here is to add a production-safe export path without introducing any web UI surface.

### Technical Requirements

- Export remains server-side only. Do not add a frontend route, page, modal, or panel for this story.
- Reuse the existing `Event` persistence model and repository layering. Avoid placing direct Prisma export logic in the script entry point.
- Preserve chronological ordering using `createdAt asc` and `id asc` exactly as established in `findByTeamForExport`.
- Keep parameter validation strict and reproducible:
  - `teamId` must be numeric,
  - `from` and `to` must be valid dates,
  - future ranges must be rejected,
  - `from` must be less than or equal to `to`,
  - `format` must be `csv` or `json`.
- Treat date-only CLI inputs consistently. Define whether the script normalizes them to inclusive day boundaries and document that behavior in code and docs.
- Redact PII before serialization. Do not write raw emails or names from payloads into exported files.
- Prefer streaming or chunked writing for large exports so operator workflows remain stable for 1000+ events.

### Architecture Compliance

- Follow the current backend architecture: `routes/controllers -> services -> repositories -> Prisma`. This story uses only service/repository/script layers; no HTTP route is required.
- Keep structured error handling aligned with the existing `AppError` contract and CLI-friendly console output.
- Respect Epic 6 immutability constraints: exports are read-only and must not mutate event rows.
- Apply team-scoped filtering on export queries. Do not allow cross-team exports without an explicit team filter in this story.
- Follow the UX decision that export operations have no UI surface even though older PRD narrative text mentions a data export panel. The UX specification and story scope override that earlier narrative.

### Library & Framework Requirements

- Current server stack is the source of truth for this story:
  - Node.js 18+
  - Express 4.22.1
  - Prisma 7.2.0
  - PostgreSQL via `pg` 8.17.1
  - Zod 4.3.5
  - `tsx` 4.7.0 for CLI execution
- No new framework is required.
- Add a CSV library only if the manual serializer becomes error-prone; otherwise keep dependencies minimal.
- If additional validation is needed, prefer the existing Zod-based validation style already used in the server.

### File Structure Requirements

- Existing extension points already in place:
  - `server/src/repositories/event.repository.ts`
  - `server/src/repositories/event.repository.test.ts`
  - `server/src/services/events.service.ts`
  - `server/src/scripts/purge-events-batch.ts`
- Recommended implementation targets for Story 6.3:
  - `server/src/services/event-export.service.ts`
  - `server/src/services/event-export.service.test.ts`
  - `server/src/scripts/export-events.ts`
  - `server/src/scripts/export-events.test.ts` or equivalent script-level coverage
  - `server/src/repositories/event.repository.ts`
  - `server/src/repositories/event.repository.test.ts`
  - `server/package.json`
  - `docs/research/event-coverage-documentation.md`
  - `docs/07-infrastructure.md`
- Export artifacts should be written outside source directories, preferably under a dedicated runtime folder such as `server/exports/` that is ignored from source control if needed.

### Testing Requirements

- Repository tests must prove export filtering preserves deterministic ordering and correct `where` clauses.
- Service tests must cover:
  - valid parameter sets,
  - invalid date ranges,
  - unsupported formats,
  - future-date rejection,
  - empty result handling,
  - file naming,
  - payload redaction,
  - CSV escaping,
  - JSON structure.
- CLI tests must cover:
  - repeated `--event-type` arguments or the chosen multi-value convention,
  - success messages,
  - non-zero exit codes on validation or no-result conditions,
  - export path reporting.
- Add at least one test that exercises a large-result export path through chunking/streaming logic rather than only tiny in-memory datasets.

### Previous Story Intelligence

- Story 6.1 established mutation-event coverage and explicitly left CLI export execution/completion/failure telemetry as a follow-up for Story 6.3.
- Story 6.2 hardened event immutability, deterministic ordering, purge controls, and backup verification. Reuse those guardrails rather than inventing separate export-specific rules.
- The repository already exposes `findByTeamForExport(teamId, { from, to, eventTypes })`, so the export flow should extend this path instead of introducing a parallel query implementation.
- Existing CLI script conventions in `server/src/scripts/purge-events-batch.ts` provide the right pattern for argument parsing, console reporting, and non-zero exit behavior.

### Git Intelligence Summary

- `a726263` feat: Implement event immutability and audit trail completeness
- `5da5005` feat: Implement event logging for Big Five questionnaire and enrich issue mutation payloads
- `bf45575` feat: enhance issue statistics aggregation and improve error handling
- `c108e8e` feat: Implement Team Dashboard issue status visualization with new statuses and updated tests
- `d7518d4` feat: Enhance tooltip functionality for tag descriptions with hover and focus support

Implication for 6.3: recent work has concentrated the event logic in stable service/repository patterns, so the main risk is not event persistence itself but export correctness, redaction quality, and operational ergonomics.

### Latest Technical Information

- The live repository uses Prisma 7.2.0 rather than older architecture examples that still mention Prisma 5.x. Follow the installed packages in `server/package.json`, not older template text.
- The server already includes dedicated CLI scripts for event maintenance (`events:purge`, `events:verify-restore`), which is the correct implementation style for this story.
- The `Event` Prisma model currently stores `payload` as JSON and indexes `teamId + eventType`, `entityType + entityId`, and `eventType`, which supports filtered exports without schema redesign.
- No external dependency or platform upgrade is required to implement Story 6.3.

### Project Structure Notes

- The architecture document uses illustrative `frontend/` and `backend/` folders, but this repository uses `client/` and `server/`. Implement Story 6.3 in the real `server/` tree.
- The UX specification includes an explicit `Export Operations (No UI Surface)` section. Do not implement the earlier PRD journey text as a product-facing export panel.
- Keep the change additive. No architectural refactor is needed.

### Project Context Reference

- Follow `_bmad-output/project-context.md` for strict TypeScript, repo-pinned dependency versions, and documentation updates when operational behavior changes.
- Follow `_bmad-output/planning-artifacts/architecture.md` Decision 2 for event logging architecture and immutable audit expectations.
- Follow `_bmad-output/planning-artifacts/ux-design-specification.md` export operations guidance to keep exports server-side only.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3]
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 4: Data Export — Research Audit Trail]
- [Source: _bmad-output/planning-artifacts/prd.md#Reliability & Compliance]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 2: Event Logging Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Export Operations (No UI Surface)]
- [Source: _bmad-output/implementation-artifacts/6-1-log-all-db-affecting-events-excluding-auth-composition.md]
- [Source: _bmad-output/implementation-artifacts/6-2-ensure-event-immutability-and-audit-trail-completeness.md]
- [Source: server/package.json]
- [Source: server/prisma/schema.prisma]
- [Source: server/src/repositories/event.repository.ts]
- [Source: server/src/scripts/purge-events-batch.ts]

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Loaded BMAD config, workflow engine, and create-story workflow assets.
- Parsed user-requested story identifier `6.3` and matched it to sprint story key `6-3-event-export-and-filtering-capability-research-use`.
- Analyzed Epic 6 and Story 6.3 acceptance criteria from planning artifacts.
- Loaded prior story context from Stories 6.1 and 6.2 implementation artifacts.
- Reviewed architecture, PRD, UX, and project-context materials relevant to research export behavior.
- Reviewed current event model, repository export query, CLI patterns, and server package scripts.
- Reviewed recent git commit history for continuity with recent event logging work.
- Implemented `events:export` CLI flow, batch export service, cursor-based repository reads, centralized payload redaction, and export telemetry.
- Added repository, service, and CLI tests for filtering, redaction, CSV/JSON output, invalid ranges, empty results, and large batched exports.
- Verified the implementation with `npm run build` and the full server Jest suite (`340` tests passed).
- Ran the BMAD code-review workflow for Story 6.3, fixed the identified export redaction/error-shape/JSON-shape issues, and revalidated the full server suite.

### Completion Notes List

- Created the Story 6.3 implementation guide with concrete export architecture, file targets, and operational guardrails.
- Captured the key scope constraint that exports remain server-side CLI only with no web UI surface.
- Anchored implementation guidance to current repository reality: Prisma 7.2.0, existing event repository, and existing CLI script patterns.
- Highlighted PII redaction, deterministic ordering, and chunked export processing as the main risk areas to address during implementation.
- Implemented a dedicated server-side export workflow with `server/src/scripts/export-events.ts`, `server/src/services/event-export.service.ts`, and `npm run events:export`.
- Added deterministic batched export reads, inclusive UTC day-boundary normalization, CSV/JSON writers, and centralized payload redaction for research-safe output.
- Added immutable export telemetry events for start/completion/failure and updated the research coverage and infrastructure runbook documentation.
- Tightened PII redaction to cover nested arrays and free-text names while preserving non-sensitive sentence context.
- Standardized unsupported-format failures to return a clear operator message (`Invalid export format`) instead of raw validator output.
- Adjusted JSON export records so `payload_json` remains canonical JSON data rather than a double-encoded string.
- Validated the change with `npm run build`, focused export tests, and the full server Jest suite (`340/340` passing).

### File List

- .gitignore
- _bmad-output/DOCUMENTATION_UPDATES_2026-01-15.md
- _bmad-output/IMPLEMENTATION_READY_CHECKLIST.md
- _bmad-output/implementation-artifacts/6-1-log-all-db-affecting-events-excluding-auth-composition.md
- _bmad-output/implementation-artifacts/6-3-event-export-and-filtering-capability-research-use.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-readiness-report-2026-01-15.md
- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/ux-design-specification.md
- docs/07-infrastructure.md
- docs/research/event-coverage-documentation.md
- server/package.json
- server/src/repositories/event.repository.test.ts
- server/src/repositories/event.repository.ts
- server/src/scripts/export-events.test.ts
- server/src/scripts/export-events.ts
- server/src/services/event-export.service.test.ts
- server/src/services/event-export.service.ts
- server/src/services/events.service.test.ts
- server/src/services/events.service.ts

## Senior Developer Review (AI)

### Outcome

Approve

### Summary

- Fixed incomplete export redaction so names and emails are masked across keyed payload fields, nested arrays, nested person-context objects, and free-text strings.
- Fixed unsupported-format handling so operators receive a clear `Invalid export format` message instead of raw validator output.
- Fixed JSON export serialization so `payload_json` is emitted as canonical JSON data rather than a double-encoded string.
- Reconciled the story `File List` with the current worktree so the implementation record matches the actual set of changed files.

### Evidence

- `npm run build`
- `npm test -- src/services/event-export.service.test.ts src/scripts/export-events.test.ts src/repositories/event.repository.test.ts src/services/events.service.test.ts`
- `npm test` (`340/340` passing)

## Change Log

- 2026-03-12: Created Story 6.3 implementation artifact via BMAD create-story workflow execution.
- 2026-03-12: Implemented Story 6.3 server-side event export CLI, deterministic batched export reads, centralized redaction, export telemetry, tests, and operator documentation.
- 2026-03-12: Completed BMAD code review follow-up fixes for redaction coverage, invalid-format error messaging, canonical JSON export payloads, and story record alignment.