# Story 7.4: Define and Validate Instance Environment Contracts (stu, hms, elia)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want explicit env profiles for each instance,
so that ports and identifiers are deterministic and validated before deployment.

## Acceptance Criteria

1. **Given** Story 7.3 isolation patterns are in place
   **When** I define env contracts for `stu`, `hms`, and `elia`
   **Then** each profile has explicit deterministic identifiers for `INSTANCE_KEY`, `COMPOSE_PROJECT_NAME`, and `POSTGRES_DB`
   **And** all three profiles follow one shared contract template.

2. **Given** the deployment baseline for instance ports
   **When** I inspect profile contracts
   **Then** port assignments are deterministic and match the expected baseline:
   - `stu`: frontend `5173`, backend `3000`
   - `hms`: frontend `5174`, backend `3001`
   - `elia`: frontend `5175`, backend `3002`
   **And** PostgreSQL host ports are unique across profiles (current baseline: `5543`, `5544`, `5545`).

3. **Given** operators prepare deployment through repository scripts
   **When** they run contract validation commands
   **Then** collisions across `COMPOSE_PROJECT_NAME`, `POSTGRES_DB`, and host ports are detected before runtime
   **And** missing required contract values fail fast with actionable messages.

4. **Given** contract values can drift during updates
   **When** contracts are reviewed for production-readiness
   **Then** `JWT_SECRET` and `POSTGRES_PASSWORD` are treated as required per-instance secrets
   **And** documentation makes clear that production values must be unique and non-placeholder.

5. **Given** upcoming automation stories (7.5-7.7)
   **When** CI or release scripts consume env contracts
   **Then** profile files and validation commands are deterministic and script-friendly
   **And** no compose redesign is needed to add or validate `elia`.

## Tasks / Subtasks

- [x] Task 1: Formalize instance env contract schema and required keys (AC: 1, 3)
  - [x] Subtask 1.1: Define and document mandatory keys in `deploy/compose/.env.instance.example`.
  - [x] Subtask 1.2: Ensure profile comments and examples clearly encode deterministic naming rules.
  - [x] Subtask 1.3: Ensure required-key validation behavior aligns with script expectations (`compose-instance.ps1` and shell parity script).

- [x] Task 2: Align concrete profiles for `stu`, `hms`, and `elia` (AC: 1, 2)
  - [x] Subtask 2.1: Verify `deploy/compose/stu.env` contract values match baseline identity and ports.
  - [x] Subtask 2.2: Verify `deploy/compose/hms.env` contract values match baseline identity and ports.
  - [x] Subtask 2.3: Promote `deploy/compose/elia.env.example` to active `elia` profile flow (or equivalent validated profile) without changing compose architecture.

- [x] Task 3: Implement and verify preflight collision validation (AC: 3, 5)
  - [x] Subtask 3.1: Confirm `validate-isolation` detects collisions by numeric host port across all services and profiles.
  - [x] Subtask 3.2: Confirm collisions on `COMPOSE_PROJECT_NAME` and `POSTGRES_DB` are surfaced with profile ownership details.
  - [x] Subtask 3.3: Confirm validation exits non-zero when collisions or missing required fields are detected.

- [x] Task 4: Harden secret and runtime URL contract rules (AC: 4)
  - [x] Subtask 4.1: Ensure profiles use non-placeholder values where required for active environments.
  - [x] Subtask 4.2: Ensure `FRONTEND_RUNTIME_API_URL` aligns with each profile's backend host port.
  - [x] Subtask 4.3: Ensure docs clearly separate local-dev convenience values from production requirements.

- [x] Task 5: Document and operationalize contract validation workflow (AC: 3, 5)
  - [x] Subtask 5.1: Update deployment runbook docs with explicit per-profile contract table including `elia`.
  - [x] Subtask 5.2: Add/confirm reproducible validation commands for local and CI usage.
  - [x] Subtask 5.3: Capture story completion trace in `docs/09-changelog.md` after implementation.

## Dev Notes

- Epic 7 sequence for deployment track:
  - Story 7.1: production container baseline
  - Story 7.2: parameterized multi-instance compose architecture
  - Story 7.3: network/storage/database isolation hardening
  - Story 7.4: explicit env contracts and validation for `stu`, `hms`, `elia`
  - Stories 7.5-7.7: deployment automation and CI checks consume these contracts
- Existing assets indicate the contract baseline already exists in draft form:
  - `deploy/compose/stu.env`
  - `deploy/compose/hms.env`
  - `deploy/compose/elia.env.example`
  - `deploy/compose/.env.instance.example`
- Sprint status currently marks this story as `backlog`; create-story transitions it to `ready-for-dev`.

### Technical Requirements

- Preserve one root compose file (`docker-compose.yml`) and keep all instance differences in env profiles.
- Enforce deterministic identity per profile:
  - `INSTANCE_KEY`
  - `COMPOSE_PROJECT_NAME`
  - `POSTGRES_DB`
- Enforce deterministic port baseline for this story:
  - `stu`: frontend `5173`, backend `3000`
  - `hms`: frontend `5174`, backend `3001`
  - `elia`: frontend `5175`, backend `3002`
- Keep PostgreSQL host ports unique per profile (current documented pattern: `5543`, `5544`, `5545`).
- Keep Story 7.1 runtime contracts intact:
  - backend requires `DATABASE_URL` and `JWT_SECRET`
  - backend health endpoint `/api/v1/health`
  - frontend runtime API injection through `VITE_API_URL`/`FRONTEND_RUNTIME_API_URL`

### Architecture Compliance

- Conforms to architecture requirement for per-team/per-instance isolation using Docker Compose and explicit environment configuration.
- Conforms to Epic 7 requirement for deterministic, scriptable multi-instance operations on a single host.
- Maintains env-driven provisioning model and avoids per-instance compose-file duplication.
- Keeps contracts automation-ready for upcoming SSH deploy and CI pipeline stories.

### Library & Framework Requirements

- Docker Compose V2 commands (`docker compose`) only.
- Keep image lines consistent with current deployment baseline unless explicitly changed by a later architecture decision:
  - backend: `aapr-backend:7.1`
  - frontend: `aapr-frontend:7.1`
  - database: `postgres:14`
- No application-layer framework migration in this story.

### File Structure Requirements

- Primary implementation targets:
  - `deploy/compose/.env.instance.example`
  - `deploy/compose/stu.env`
  - `deploy/compose/hms.env`
  - `deploy/compose/elia.env.example` (and/or promoted active profile file)
  - `scripts/compose-instance.ps1`
  - `scripts/compose-instance.sh`
- Supporting runtime contract source:
  - `docker-compose.yml`
- Documentation targets:
  - `docs/07-infrastructure.md`
  - `docs/08-development-guide.md`
  - `docs/09-changelog.md`

### Testing Requirements

- Profile contract validation:
  - `npm run compose:validate-isolation` passes when profiles are valid.
  - Introduced collision cases fail validation with non-zero exit code.
- Compose rendering validation:
  - `docker compose --env-file deploy/compose/stu.env -f docker-compose.yml config`
  - `docker compose --env-file deploy/compose/hms.env -f docker-compose.yml config`
  - `docker compose --env-file deploy/compose/elia.env -f docker-compose.yml config` (or equivalent validated profile path)
- Runtime compatibility checks:
  - `npm run compose:health:stu`
  - `npm run compose:health:hms`
- Isolation check compatibility:
  - `npm run compose:verify-isolation` remains consistent with contract rules.

### Previous Story Intelligence

From Story 7.3 (`_bmad-output/implementation-artifacts/7-3-provision-isolated-data-storage-and-network-per-instance.md`):

- Isolation naming conventions are already enforced in compose and profile templates:
  - network: `<COMPOSE_PROJECT_NAME>-net`
  - volume: `<COMPOSE_PROJECT_NAME>-postgres-data`
  - container names: `<COMPOSE_PROJECT_NAME>-<service>`
- Validation tooling exists and should be extended/refined rather than replaced:
  - `scripts/compose-instance.ps1 -Action validate-isolation`
  - `scripts/verify-isolation.ps1`
- Story 7.4 should formalize and lock explicit profile contracts for `stu`, `hms`, and `elia` with deterministic values; it should not redesign the compose topology.

### Git Intelligence Summary

Recent commits (latest first):
- `1f5466b`: feat: Implement Story 7.3 for isolated data, storage, and network per instance
- `593c1cf`: feat: Implement parameterized multi-instance Docker Compose architecture with validation scripts
- `28b7973`: feat: Containerize frontend and backend for production runtime
- `c5924c9`: feat: implement CLI for exporting events with CSV and JSON formats
- `a726263`: feat: Implement event immutability and audit trail completeness

Actionable implications for Story 7.4:
- Reuse and tighten existing deployment contract tooling instead of introducing parallel scripts.
- Keep Story 7.4 changes constrained to deployment contract files/scripts/docs to reduce regression risk in application domains.
- Preserve deterministic outputs and command shapes so upcoming CI/CD stories can consume them directly.

### Latest Tech Information

- Current in-repo deployment baseline already defines relevant technology versions and commands:
  - Docker Compose V2 (`docker compose`)
  - PostgreSQL image line: `postgres:14`
  - backend image tag: `aapr-backend:7.1`
  - frontend image tag: `aapr-frontend:7.1`
- No external version migration is required for this story; focus is contract explicitness and validation reliability.

### Project Context Reference

Follow `_bmad-output/project-context.md` constraints:
- Keep environment contracts explicit and validated.
- Preserve deterministic, reproducible operations and script-first workflows.
- Keep production security posture explicit (no implicit defaults for secrets in production profiles).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7: Deployment Architecture & CI/CD Automation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.4: Define and Validate Instance Environment Contracts (stu, hms, elia)]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/implementation-artifacts/7-3-provision-isolated-data-storage-and-network-per-instance.md]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]
- [Source: docker-compose.yml]
- [Source: deploy/compose/.env.instance.example]
- [Source: deploy/compose/stu.env]
- [Source: deploy/compose/hms.env]
- [Source: deploy/compose/elia.env.example]
- [Source: scripts/compose-instance.ps1]
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

- Loaded BMAD config, workflow engine, create-story workflow, template, and checklist.
- Parsed user input `7.4` and resolved story key `7-4-define-and-validate-instance-environment-contracts-stu-hms-elia`.
- Loaded sprint status and confirmed source status was `backlog` before context generation.
- Loaded Epic 7 requirements and extracted Story 7.4 acceptance baseline for deterministic ports.
- Loaded architecture, project context, compose contract files, prior story artifacts, and current scripts.
- Collected git intelligence from recent commits to preserve implementation conventions.
- Produced implementation-ready story context with explicit contract guardrails and validation commands.
- Updated sprint tracking status to `in-progress` before implementation.
- Added active profile `deploy/compose/elia.env` and aligned deterministic values for stu/hms/elia.
- Tightened contract template requirements in `deploy/compose/.env.instance.example` for required keys and runtime URL alignment guidance.
- Hardened `validate-isolation` in both PowerShell and shell scripts with additional required key checks (`POSTGRES_PASSWORD`, `FRONTEND_RUNTIME_API_URL`), per-profile numeric port validation, and localhost runtime URL/backend port contract validation.
- Added npm scripts for deterministic `elia` operations (`compose:config/up/down/ps/health/inspect:elia`).
- Updated deployment/development docs and changelog entries for the Story 7.4 contract baseline.
- Validation runs completed: `npm run compose:validate-isolation` (pass), `npm run compose:config:stu|hms|elia` (pass), collision and missing-key negative preflight checks (expected non-zero failures).
- Runtime compatibility note: `npm run compose:verify-isolation` failed in this session because Docker runtime/resources were unavailable.

### Completion Notes

- Implemented all Story 7.4 acceptance criteria using existing compose architecture with env-driven contracts.
- Promoted `elia` to active profile flow without compose redesign and ensured deterministic identity/port baseline across `stu`, `hms`, and `elia`.
- Enforced fail-fast validation for collisions and missing required fields with actionable profile-level output.
- Strengthened secret/runtime URL contract rules and documented production guidance versus local-dev convenience values.
- Added reproducible local/automation commands for `elia` parity with existing profiles.

### File List

- _bmad-output/implementation-artifacts/7-4-define-and-validate-instance-environment-contracts-stu-hms-elia.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- deploy/compose/.env.instance.example
- deploy/compose/stu.env
- deploy/compose/hms.env
- deploy/compose/elia.env
- deploy/compose/elia.env.example
- scripts/compose-instance.ps1
- scripts/compose-instance.sh
- package.json
- docs/07-infrastructure.md
- docs/08-development-guide.md
- docs/09-changelog.md

## Change Log

- 2026-03-13: Created Story 7.4 implementation context and set status to `ready-for-dev`.
- 2026-03-13: Implemented Story 7.4 env contract hardening for `stu`, `hms`, and `elia`; added active `elia` profile, stricter script validations, and documentation updates.
- 2026-03-13: Validated contract baseline with positive and negative preflight checks (`compose:validate-isolation`, `compose:config:*`), and recorded runtime verification blocker (`compose:verify-isolation` requires available Docker runtime/resources).
