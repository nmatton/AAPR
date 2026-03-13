# Story 7.7: Add Server-Focused Smoke and Resilience Checks in Pipeline Scope

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As QA,
I want CI checks focused on deployment/server behavior,
so that pipeline coverage targets production risks while broader app tests remain local.

## Acceptance Criteria

1. **Given** Story 7.6 established that GitHub-hosted runners cannot reach the deployment server due to trusted-IP SSH restrictions
   **When** server-focused pipeline checks are designed for Story 7.7
   **Then** checks are executable only from trusted execution contexts (operator machine or trusted self-hosted runner on an allowlisted IP)
   **And** no dependency is introduced on GitHub-hosted runner network reachability.

2. **Given** a trusted execution context can SSH to the deployment server
   **When** the smoke pipeline is executed for an instance (`stu`, `hms`, `elia`)
   **Then** it runs server-focused checks only:
   - compose config validation
   - deployment status (`docker compose ... ps`)
   - backend health (`/api/v1/health`)
   - frontend availability check (`/`)
   **And** it produces a deterministic pass/fail outcome for each instance.

3. **Given** smoke checks may encounter transient startup conditions
   **When** backend or frontend checks fail initially
   **Then** the pipeline performs bounded retry/backoff before final failure
   **And** final output distinguishes transient-recovered vs hard-failed outcomes.

4. **Given** Story 7.5 already defines deterministic deployment exit codes and machine-readable output
   **When** Story 7.7 integrates smoke checks
   **Then** it reuses existing script contracts (`scripts/deploy-remote.sh`, `scripts/compose-instance.sh`) instead of duplicating deployment logic
   **And** check summaries are machine-readable for operator triage.

5. **Given** one instance fails smoke checks while others pass
   **When** multi-instance checks complete
   **Then** the overall smoke run is marked failed
   **And** per-instance results are still emitted for all instances (`stu`, `hms`, `elia`).

6. **Given** CI scope in Epic 7 excludes full functional app regression suites
   **When** Story 7.7 is implemented
   **Then** pipeline checks remain strictly server/deployment-focused
   **And** broader frontend/backend functional test suites continue to run locally.

7. **Given** this story operationalizes a trusted-runner smoke flow
   **When** implementation is complete
   **Then** operations documentation is updated with run commands, trusted-network constraints, failure interpretation, and remediation guidance.

## Tasks / Subtasks

- [x] Task 1: Define trusted execution model for smoke pipeline (AC: 1, 7)
  - [x] Subtask 1.1: Document execution boundary: GitHub-hosted runners are unsupported for deployment smoke due to SSH allowlist.
  - [x] Subtask 1.2: Define supported execution contexts (operator workstation on trusted IP and/or self-hosted runner in trusted network).
  - [x] Subtask 1.3: Add explicit preflight check/output that reports unsupported execution context as a clear non-success state.

- [x] Task 2: Implement per-instance smoke command orchestration (AC: 2, 4, 5)
  - [x] Subtask 2.1: Build a reusable smoke orchestration command/script that iterates `stu`, `hms`, `elia`.
  - [x] Subtask 2.2: Reuse existing contracts:
    - `docker compose --env-file deploy/compose/<instance>.env -f docker-compose.yml config --quiet`
    - `bash scripts/deploy-remote.sh ...` outputs (including `DEPLOY_RESULT=success` when applicable)
    - `bash scripts/compose-instance.sh health deploy/compose/<instance>.env`
  - [x] Subtask 2.3: Capture per-instance result artifact with status, failed stage, and relevant exit code/label.

- [x] Task 3: Add bounded resilience checks for startup timing (AC: 3)
  - [x] Subtask 3.1: Add retry/backoff wrapper around health checks (for example: max attempts + sleep interval contract).
  - [x] Subtask 3.2: Record attempt counts and whether final pass required retries.
  - [x] Subtask 3.3: Mark hard failure only after retry budget exhaustion.

- [x] Task 4: Produce deterministic smoke summary output (AC: 4, 5)
  - [x] Subtask 4.1: Emit machine-readable lines per instance (`SMOKE_RESULT=<pass|fail> instance=<key> stage=<stage> code=<label-or-number>`).
  - [x] Subtask 4.2: Emit human-readable markdown/table summary for operators.
  - [x] Subtask 4.3: Ensure overall exit status fails when any instance fails.

- [x] Task 5: Documentation and runbook updates (AC: 7)
  - [x] Subtask 5.1: Update `docs/07-infrastructure.md` with trusted execution model and smoke run steps.
  - [x] Subtask 5.2: Update `docs/08-development-guide.md` with troubleshooting and retry interpretation guidance.
  - [x] Subtask 5.3: Update `docs/09-changelog.md` with Story 7.7 completion trace.

## Dev Notes

- Story 7.7 must be implemented with the infrastructure reality from Story 7.6:
  - GitHub-hosted runners are not trusted/allowlisted for SSH access to deployment host.
  - Deployment smoke checks cannot depend on direct server access from those runners.
- Pipeline scope in this story means deployment/server checks executable from trusted network contexts, not broad CI test matrices.
- Reuse existing deployment tooling from Story 7.5 and avoid introducing parallel deployment/smoke stacks.

### Technical Requirements

- Keep smoke execution deployment-focused and deterministic.
- Must support all current instances: `stu`, `hms`, `elia`.
- Must preserve existing exit-code contract semantics from `scripts/deploy-remote.sh`.
- Must use existing compose/env topology (`docker-compose.yml`, `deploy/compose/*.env`).
- Must include bounded resilience behavior for transient startup failures.

### Architecture Compliance

- Aligns with Epic 7 objective: reliable multi-instance deployment operations with explicit constraints.
- Preserves architecture boundary where full app validation remains local.
- Preserves environment-driven compose contract and instance isolation model.

### Library & Framework Requirements

- Docker Compose V2 (`docker compose`) only.
- OpenSSH-compatible execution path only.
- No migration of app framework stack (React/Express/Prisma) in this story.

### File Structure Requirements

Primary likely targets for implementation:
- `scripts/` (smoke orchestration helper and/or wrappers)
- `scripts/deploy-remote.sh` (reuse contract; avoid logic duplication)
- `scripts/compose-instance.sh` (health checks reused)
- `deploy/compose/*.env` (consumed, not redesigned)

Documentation targets:
- `docs/07-infrastructure.md`
- `docs/08-development-guide.md`
- `docs/09-changelog.md`

### Testing Requirements

- Trusted execution preflight must fail clearly in unsupported contexts.
- Smoke checks validate compose config + service health for each instance.
- Retry/backoff behavior tested with simulated delayed readiness.
- Aggregate output verified for mixed outcomes (some pass, some fail).
- Broader app test suites explicitly excluded from this story scope.

### Previous Story Intelligence

From Story 7.6 (`invalid`) and 7.5 (`done`):

1. **Critical constraint:** GitHub-hosted Actions runners are not allowlisted for SSH access; hosted CI cannot perform remote deployment/smoke operations.
2. **Deployment contract exists and is reusable:** `scripts/deploy-remote.sh` already provides deterministic step flow and exit code labels.
3. **Health hook exists:** `scripts/compose-instance.sh health` already checks backend and frontend availability per instance env profile.
4. **Machine-readable deployment output exists:** `DEPLOY_RESULT=success ...` can be consumed by smoke orchestration summaries.
5. **Do not duplicate deployment logic:** Story 7.7 should compose existing contracts and add resilience/result aggregation behavior.

### Git Intelligence Summary

Recent Epic 7 implementation flow (from story artifacts):
- Story 7.1: production container runtime baseline and health-check readiness.
- Story 7.2: parameterized multi-instance compose architecture.
- Story 7.3: isolation guarantees and validation commands.
- Story 7.4: deterministic env contracts for `stu`, `hms`, `elia`.
- Story 7.5: SSH deployment script with deterministic exits and machine-readable success lines.
- Story 7.6: GitHub-hosted CI deployment orchestration marked invalid due to trusted-IP network constraint.

Actionable implication:
- Story 7.7 should target trusted-network smoke orchestration and reporting, not hosted-runner deployment automation.

### Latest Tech Information

- Current in-repo operational baseline already supports this story:
  - Docker Compose V2 commands (`docker compose`)
  - health endpoint contract (`GET /api/v1/health`)
  - SSH deployment script with deterministic exit codes
- No external framework upgrade required for Story 7.7.

### Project Context Reference

Follow `_bmad-output/project-context.md` constraints:
- Keep operational flows deterministic and script-first.
- Keep security assumptions explicit (trusted network boundaries, no secret leakage).
- Keep documentation updates mandatory for infrastructure stories.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7: Deployment Architecture & CI/CD Automation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.7: Add Server-Focused Smoke and Resilience Checks in Pipeline Scope]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md#4.3 CI/CD Pipeline Proposal]
- [Source: _bmad-output/implementation-artifacts/7-6-add-ci-cd-workflow-for-deployment-validation-and-rollout.md]
- [Source: _bmad-output/implementation-artifacts/7-5-build-ssh-based-deployment-scripts-for-merge-triggered-updates.md]
- [Source: scripts/deploy-remote.sh]
- [Source: scripts/compose-instance.sh]
- [Source: scripts/verify-isolation.ps1]
- [Source: docker-compose.yml]
- [Source: deploy/compose/stu.env]
- [Source: deploy/compose/hms.env]
- [Source: deploy/compose/elia.env]
- [Source: docs/07-infrastructure.md]
- [Source: docs/08-development-guide.md]

## Story Completion Status

- Story context creation complete.
- Story is now ready for implementation by `dev-story`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Loaded BMAD config, workflow engine, create-story workflow, instructions, template, and checklist.
- Parsed user-provided story identifier `7.7` and resolved story key `7-7-add-server-focused-smoke-and-resilience-checks-in-pipeline-scope`.
- Loaded sprint status and confirmed source status for story 7.7 was `backlog`.
- Extracted Epic 7 scope and Story 7.7 intent from planning artifacts.
- Integrated Story 7.6 infrastructure limitation: GitHub-hosted runners cannot SSH due to trusted-IP access controls.
- Analyzed Story 7.5 and current deployment scripts for reusable health/deployment contracts.
- Produced a trusted-network-compatible implementation guide for server-focused smoke and resilience checks.
- Implemented `scripts/smoke-remote.sh` with trusted-context preflight, per-instance orchestration, bounded retries, and deterministic machine-readable output.
- Added optional deploy output contract consumption via `--deploy-results-file` for `DEPLOY_RESULT=success` validation.
- Added `scripts/test-smoke-remote.sh` with mocked SSH scenarios for unsupported context, transient recovery, and mixed outcome aggregation.
- Added npm entrypoints `deploy:smoke` and `deploy:smoke:test`.
- Updated infrastructure and development runbooks with trusted-network constraints, usage examples, and remediation guidance.
- Updated changelog with Story 7.7 delivery trace.

### Completion Notes List

- Story 7.7 context is constrained to feasible infrastructure paths under SSH allowlist restrictions.
- Hosted-runner CI assumptions are explicitly prohibited to prevent implementation dead-ends.
- Reuse of existing scripts is mandated to reduce regression risk and avoid duplicated deployment logic.
- Added a dedicated trusted-network smoke runner covering `stu`, `hms`, and `elia` with deterministic per-instance result lines.
- Added bounded retry/backoff for backend/frontend health probes and explicit transient recovery signal.
- Added aggregate summary/exit semantics so one failing instance fails the run while preserving full per-instance output.
- Added script contract tests and npm command aliases for operator/dev workflows.

### File List

- _bmad-output/implementation-artifacts/7-7-add-server-focused-smoke-and-resilience-checks-in-pipeline-scope.md (added)
- scripts/smoke-remote.sh (added)
- scripts/test-smoke-remote.sh (added)
- package.json (updated)
- docs/07-infrastructure.md (updated)
- docs/08-development-guide.md (updated)
- docs/09-changelog.md (updated)

## Change Log

- 2026-03-13: Implemented trusted-context remote smoke orchestration and resilience behavior for `stu`, `hms`, `elia`.
- 2026-03-13: Added smoke contract tests and npm entrypoints for execution and validation.
- 2026-03-13: Updated infrastructure/development docs and project changelog for Story 7.7 operational guidance.
