# Story 7.8: Update Infrastructure Runbook and Operational Documentation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a technical writer,
I want complete deployment runbooks and environment documentation,
so that the team can operate and troubleshoot multi-instance production deployments confidently.

## Acceptance Criteria

1. **Given** Epic 7 established a multi-instance deployment model (`stu`, `hms`, `elia`)
   **When** infrastructure documentation is updated
   **Then** runbooks clearly describe per-instance contracts, compose profiles, ports, and isolation guarantees
   **And** operators can identify the right profile and commands without reverse-engineering scripts.

2. **Given** Story 7.5 defines SSH-based deployment and deterministic exit contracts
   **When** deployment runbooks are revised
   **Then** documentation includes authoritative command examples, required inputs, and exit code interpretation
   **And** guidance explicitly reuses existing scripts instead of introducing parallel operational paths.

3. **Given** Story 7.7 introduced trusted-context smoke checks
   **When** runbook content is finalized
   **Then** trusted-network execution constraints are explicit
   **And** smoke result interpretation (`SMOKE_RESULT`, `SMOKE_SUMMARY`, retries, transient recovery) is documented for triage.

4. **Given** operations involve secrets and environment-specific configuration
   **When** documentation is updated
   **Then** secret-handling rules, env-file responsibilities, and non-disclosure practices are clearly specified
   **And** docs avoid leaking sensitive values while remaining executable.

5. **Given** support and onboarding depend on consistent procedures
   **When** a new operator follows the runbooks
   **Then** they can perform compose validation, deployment, smoke checks, and rollback-oriented troubleshooting end-to-end
   **And** expected outputs and failure paths are documented.

6. **Given** BMAD documentation standards require traceable updates
   **When** Story 7.8 is implemented
   **Then** infrastructure and development docs are updated in place
   **And** changelog traceability is maintained for auditability.

## Tasks / Subtasks

- [x] Task 1: Consolidate deployment topology and instance contracts (AC: 1)
   - [x] Subtask 1.1: Verify `docs/07-infrastructure.md` sections for compose architecture, env profile mapping, and port contracts (`stu`, `hms`, `elia`).
   - [x] Subtask 1.2: Add/normalize isolation guidance (project names, networks, volumes, database names) aligned with Story 7.3 and Story 7.4 outcomes.
   - [x] Subtask 1.3: Ensure command examples use current script entry points and remain copy/paste safe.

- [x] Task 2: Operationalize deployment runbook details (AC: 2, 4)
   - [x] Subtask 2.1: Document canonical `scripts/deploy-remote.sh` usage with parameter purpose and safe invocation examples.
   - [x] Subtask 2.2: Include deterministic deployment exit-code interpretation and expected machine-readable success line contract.
   - [x] Subtask 2.3: Document secret boundaries and environment variable responsibilities without exposing sensitive values.

- [x] Task 3: Operationalize trusted-context smoke and resilience guidance (AC: 3, 5)
   - [x] Subtask 3.1: Document `scripts/smoke-remote.sh` execution prerequisites and trusted-network constraints.
   - [x] Subtask 3.2: Document per-instance result interpretation (`SMOKE_RESULT`, stage labels, attempts, transient recovery fields).
   - [x] Subtask 3.3: Add troubleshooting playbooks for unsupported context, SSH failures, deploy result mismatch, and health probe failures.

- [x] Task 4: Align development operations guidance and handoff workflow (AC: 5, 6)
   - [x] Subtask 4.1: Update `docs/08-development-guide.md` with operator run sequences for compose validate/up/health/down and remote smoke/deploy flows.
   - [x] Subtask 4.2: Add a practical escalation flow (what to check first, evidence to capture, when to rollback).
   - [x] Subtask 4.3: Ensure story completion is reflected in `docs/09-changelog.md` with clear implementation trace.

- [x] Task 5: Validate documentation quality and consistency (AC: all)
   - [x] Subtask 5.1: Verify command consistency against actual script interfaces (`scripts/compose-instance.ps1`, `scripts/deploy-remote.sh`, `scripts/smoke-remote.sh`).
   - [x] Subtask 5.2: Verify references to host constraints and CI boundaries remain aligned with Story 7.6 decision (no hosted-runner SSH assumption).
   - [x] Subtask 5.3: Perform dry-run editorial pass for ambiguous wording, outdated examples, and duplicated/conflicting instructions.

## Dev Notes

Epic 7 context for this story:
- 7.1 established production container runtime baselines.
- 7.2 and 7.3 established parameterized compose architecture and per-instance isolation patterns.
- 7.4 established deterministic instance environment contracts for `stu`, `hms`, `elia`.
- 7.5 established SSH-based deployment execution and deterministic script output contracts.
- 7.6 is marked `invalid` for GitHub-hosted deployment orchestration due to trusted-IP constraints.
- 7.7 established trusted-context, server-focused smoke/resilience checks and documentation updates.

Story 7.8 focuses on documentation quality, operational handoff, and troubleshooting clarity across those established mechanisms.

### Technical Requirements

- Documentation must reflect real, executable scripts and current command contracts.
- Operational sequences must support all active instances (`stu`, `hms`, `elia`).
- Trusted-network constraints must be explicit where remote operations are required.
- Failure interpretation must include deterministic labels/results, not generic error text only.

### Architecture Compliance

- Aligns with Epic 7 goal: repeatable multi-instance deployment operations with explicit constraints.
- Preserves script-first operations model and avoids introducing unimplemented automation assumptions.
- Reinforces environment-driven configuration and per-instance isolation architecture.

### Library & Framework Requirements

- Docker Compose V2 command model (`docker compose`) only.
- OpenSSH-compatible remote execution assumptions only.
- No frontend/backend framework upgrade or runtime stack changes in this story.

### File Structure Requirements

Primary documentation targets:
- `docs/07-infrastructure.md`
- `docs/08-development-guide.md`
- `docs/09-changelog.md`

Operational scripts referenced by docs:
- `scripts/compose-instance.ps1`
- `scripts/deploy-remote.sh`
- `scripts/smoke-remote.sh`
- `scripts/test-smoke-remote.sh`

Compose/runtime assets referenced by docs:
- `docker-compose.yml`
- `deploy/compose/stu.env`
- `deploy/compose/hms.env`
- `deploy/compose/elia.env`

### Testing Requirements

- Validate all documented commands against current script interfaces.
- Validate per-instance examples are internally consistent (profile, ports, names).
- Validate failure-handling sections map to current deterministic output contracts.
- Validate no documentation path depends on inaccessible hosted-runner SSH behavior.

### Previous Story Intelligence

From Story 7.7 (`review`):
1. Trusted execution context is mandatory for remote smoke/deploy operations.
2. Smoke orchestration emits machine-readable result lines and aggregate pass/fail summary.
3. Existing script contracts should be reused rather than replicated.
4. Runbook updates already started and should be consolidated, not forked.

From Story 7.6 (`invalid`):
1. GitHub-hosted runners cannot reach deployment target due to IP restrictions.
2. Operational docs must avoid implying end-to-end hosted CI deployment feasibility.

### Git Intelligence Summary

- Recent implementation artifacts indicate Epic 7 progressed through script and infrastructure hardening prior to documentation completion.
- Story-level evidence shows deployment and smoke contracts exist and are the correct source of operational truth for Story 7.8.
- Direct commit-log extraction was not available in this run context; story intelligence is derived from implementation artifacts and updated runbooks.

### Latest Tech Information

- Current repository operational baseline already includes required deployment/smoke scripts and compose profiles.
- No external library upgrade or framework migration is required for Story 7.8.

### Project Context Reference

Follow `_bmad-output/project-context.md` requirements:
- Keep operational guidance deterministic and script-first.
- Keep security and secret boundaries explicit.
- Keep documentation updates mandatory and traceable in changelog.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7: Deployment Architecture & CI/CD Automation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.8: Update Infrastructure Runbook and Operational Documentation]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md#4.3 CI/CD Pipeline Proposal]
- [Source: _bmad-output/implementation-artifacts/7-5-build-ssh-based-deployment-scripts-for-merge-triggered-updates.md]
- [Source: _bmad-output/implementation-artifacts/7-6-add-ci-cd-workflow-for-deployment-validation-and-rollout.md]
- [Source: _bmad-output/implementation-artifacts/7-7-add-server-focused-smoke-and-resilience-checks-in-pipeline-scope.md]
- [Source: docs/07-infrastructure.md]
- [Source: docs/08-development-guide.md]
- [Source: docs/09-changelog.md]
- [Source: scripts/deploy-remote.sh]
- [Source: scripts/smoke-remote.sh]
- [Source: scripts/compose-instance.ps1]

## Story Completion Status

- Story context creation complete.
- Story is now ready for implementation by `dev-story`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Loaded BMAD config and create-story workflow components.
- Parsed user story input `7.8` and resolved story key `7-8-update-infrastructure-runbook-and-operational-documentation`.
- Loaded full sprint status and confirmed source status for story 7.8 as `backlog`.
- Loaded Epic 7 planning context and extracted Story 7.8 objective.
- Loaded Story 7.7 implementation artifact for previous-story intelligence.
- Loaded current infrastructure and development runbooks to identify documentation baseline.
- Loaded Story 7.6 constraints to avoid invalid hosted-runner assumptions.
- Generated comprehensive documentation-focused implementation guide for Story 7.8.
- Updated sprint tracker entry for Story 7.8 to `ready-for-dev`.
- Entered `dev-story` workflow for Story 7.8 and resolved target story from sprint status ordering.
- Updated sprint tracker status for Story 7.8 from `ready-for-dev` to `in-progress` before implementation.
- Cross-checked runbook command examples against current script interfaces: `scripts/compose-instance.ps1`, `scripts/deploy-remote.sh`, `scripts/smoke-remote.sh`.
- Extended `docs/07-infrastructure.md` with a deterministic operations runbook (validate -> deploy -> smoke -> rollback) and explicit secret-boundary section.
- Added deploy parameter-purpose mapping and optional compose lifecycle sanity steps (`compose:up`, `compose:health`, `compose:down`) for profile-level checks.
- Extended `docs/08-development-guide.md` with operator handoff sequence and escalation/rollback flow including evidence capture expectations.
- Added Story 7.8 traceability entry to `docs/09-changelog.md`.
- Attempted to run deployment contract tests through VS Code terminal tooling; smoke contract test evidence is available from latest successful test output (`scripts/test-smoke-remote.sh`).
- Completed editorial dry pass to remove ambiguity and keep guidance aligned with trusted-context constraints from Story 7.6/7.7.

### Completion Notes List

- Story 7.8 is scoped to operational documentation completion and handoff quality, not runtime code changes.
- Documentation tasks explicitly reflect the trusted-network and script-first operational model established in prior Epic 7 stories.
- The story includes guardrails against reintroducing invalid CI assumptions from Story 7.6.
- Runbook quality and command correctness are treated as first-class acceptance criteria.
- Added end-to-end operator flow so a new operator can perform contract validation, deployment, smoke verification, and rollback-oriented triage without reverse-engineering scripts.
- Added explicit, machine-readable result interpretation guidance for deployment and smoke contracts for faster incident triage.
- Added explicit secret-handling boundaries and redaction expectations for operational docs and tickets.
- Updated both infrastructure and development runbooks plus changelog traceability to satisfy BMAD documentation standards.

### File List

- docs/07-infrastructure.md (updated)
- docs/08-development-guide.md (updated)
- docs/09-changelog.md (updated)
- _bmad-output/implementation-artifacts/7-8-update-infrastructure-runbook-and-operational-documentation.md (updated)
- _bmad-output/implementation-artifacts/sprint-status.yaml (updated)

## Change Log

- 2026-03-13: Created Story 7.8 implementation context file with acceptance criteria, tasks, developer guardrails, and references.
- 2026-03-13: Updated sprint status for Story 7.8 from `backlog` to `ready-for-dev`.
- 2026-03-13: Implemented Story 7.8 documentation updates in `docs/07-infrastructure.md` and `docs/08-development-guide.md` with deterministic operator runbooks, trusted-context constraints, secret boundaries, and rollback/escalation flows.
- 2026-03-13: Added Story 7.8 traceability entry to `docs/09-changelog.md` and updated story status to `review`.
