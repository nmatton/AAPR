# Story 7.2: Implement Parameterized Multi-Instance Docker Compose Architecture

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want one compose template driven by environment variables,
so that I can run multiple isolated instances on the same server without duplicating compose files.

## Acceptance Criteria

1. **Given** Story 7.1 production images and runtime contracts are available
   **When** I use one compose architecture for multiple deployments
   **Then** compose configuration is parameterized by environment variables (no per-instance compose file duplication)
   **And** required variables are explicitly documented with defaults and validation rules.

2. **Given** an instance identifier (for example `stu`, `hms`, or `elia`)
   **When** I start a stack through the parameterized compose workflow
   **Then** all generated service/container names, project name, and exposed host ports are deterministic for that instance
   **And** operators can run multiple instances concurrently on one host without naming collisions.

3. **Given** backend and frontend runtime contracts from Story 7.1
   **When** services are composed together
   **Then** frontend runtime API configuration points to the matching backend for the same instance
   **And** healthcheck/startup dependencies are encoded so startup sequencing is predictable.

4. **Given** this is the compose-architecture story (before full storage/network isolation hardening in Story 7.3)
   **When** I review the resulting compose design
   **Then** it already defines extensibility points for per-instance network/volume/database naming patterns
   **And** those patterns are consumable by Story 7.3 without compose redesign.

5. **Given** this architecture will be consumed by deployment automation in Stories 7.5-7.7
   **When** I run validation commands from repository root
   **Then** there are reproducible commands to bring up/down an instance, inspect health, and clean resources
   **And** these commands are suitable for CI pipeline reuse.

## Tasks / Subtasks

- [x] Task 1: Define compose parameter model and contracts (AC: 1, 2)
  - [x] Subtask 1.1: Define required environment contract for instance-level compose execution (instance key, compose project name, frontend/backend host ports, backend internal port, database host/port/name, container image tags).
  - [x] Subtask 1.2: Define safe defaults and invalid-value behavior (for missing/empty variables and invalid port numbers).
  - [x] Subtask 1.3: Add operator-facing env template(s) with clear comments and examples.

- [x] Task 2: Implement single parameterized compose architecture (AC: 1, 2, 3)
  - [x] Subtask 2.1: Create the compose file that orchestrates frontend/backend/database using variable substitution instead of duplicated instance files.
  - [x] Subtask 2.2: Parameterize service naming and project scoping to avoid collisions when multiple instances run concurrently.
  - [x] Subtask 2.3: Wire frontend runtime `VITE_API_URL` to the per-instance backend endpoint contract.
  - [x] Subtask 2.4: Add healthchecks and `depends_on` conditions aligned with Story 7.1 health endpoints.

- [x] Task 3: Prepare isolation-forward architecture hooks (AC: 4)
  - [x] Subtask 3.1: Define per-instance naming conventions for database name, volumes, and network identifiers.
  - [x] Subtask 3.2: Ensure compose variables and labels leave a clean extension point for Story 7.3 resource isolation enforcement.
  - [x] Subtask 3.3: Confirm no shared mutable runtime resource is hard-coded across instances.

- [x] Task 4: Add reproducible operator and CI validation workflow (AC: 5)
  - [x] Subtask 4.1: Add repository-root commands/scripts for `up`, `ps`, `logs`, `health`, `down` for one instance profile.
  - [x] Subtask 4.2: Validate running at least two instances concurrently with different env files and non-overlapping host ports.
  - [x] Subtask 4.3: Capture cleanup commands that remove containers/networks/volumes according to safe operational rules.

- [x] Task 5: Documentation and handoff alignment (AC: 1, 5)
  - [x] Subtask 5.1: Update `docs/07-infrastructure.md` with multi-instance compose architecture, env contract, and runbook commands.
  - [x] Subtask 5.2: Update `docs/08-development-guide.md` with local multi-instance verification and troubleshooting notes.
  - [x] Subtask 5.3: Add story completion trace entry to `docs/09-changelog.md` after implementation.

## Dev Notes

- Epic 7 targets a production-grade deployment track. Story 7.1 delivered production container baselines; Story 7.2 provides the compose orchestration contract needed for all subsequent deployment automation stories.
- Current repository has production `Dockerfile` assets in `client` and `server`, but no root multi-instance compose file yet. This story introduces the first reusable compose architecture layer.
- Sprint status currently marks this story as `backlog`; completion of this context creation moves it to `ready-for-dev`.

### Technical Requirements

- Use one compose template architecture with environment-variable substitution for all instance profiles.
- Keep runtime contracts from Story 7.1 unchanged:
  - backend image starts `node dist/index.js`, internal port `3000`, health endpoint `/api/v1/health`.
  - frontend image serves static assets on internal port `80` with runtime `VITE_API_URL`.
- Ensure deterministic startup behavior and health checks suitable for CI smoke tests.
- Preserve deterministic dependency/build assumptions already encoded in Story 7.1 images.

### Architecture Compliance

- Align with Epic 7 sequence from planning artifacts:
  - Story 7.2 builds shared compose architecture,
  - Story 7.3 hardens resource isolation,
  - Story 7.4 defines concrete env contracts (`stu`, `hms`, `elia`).
- Respect architecture constraints:
  - environment-driven runtime configuration,
  - explicit and documented deployment contracts,
  - no regressions to local-only assumptions.

### Library & Framework Requirements

- Docker Compose V2 syntax compatible with current Docker Desktop/runtime expectations.
- Backend container runtime remains Node 22.12.0-alpine image line from Story 7.1 implementation.
- Frontend container runtime remains Nginx 1.27.0-alpine image line from Story 7.1 implementation.
- No framework migration in this story (no React/Express architecture changes).

### File Structure Requirements

- Expected primary implementation targets:
  - `docker-compose.yml` (or equivalent root compose entrypoint chosen by team convention)
  - optional compose support files under a dedicated ops/deployment folder (for env templates and script wrappers)
  - instance env template files (for example `*.env.example` variants) referenced by compose workflow
- Supporting documentation targets:
  - `docs/07-infrastructure.md`
  - `docs/08-development-guide.md`
  - `docs/09-changelog.md`

### Testing Requirements

- Compose configuration validation:
  - `docker compose config` resolves correctly for each env profile,
  - no unresolved variables for required contracts.
- Runtime validation:
  - single-instance smoke checks return expected health results for frontend/backend.
  - dual-instance concurrency check demonstrates no naming/port collision.
- Operational validation:
  - up/down/logs/cleanup commands are reproducible from repository root and usable by CI scripts.

### Previous Story Intelligence

From Story 7.1 (`_bmad-output/implementation-artifacts/7-1-containerize-frontend-and-backend-for-production-runtime.md`):

- Production images and healthchecks are already implemented and validated.
- Frontend runtime API endpoint is configured at container startup via `VITE_API_URL` and `runtime-config.js`; compose must feed this variable correctly per instance.
- Backend runtime now strictly validates `PORT` (`1-65535`) and mandatory `DATABASE_URL` + `JWT_SECRET`; compose env contracts must always provide valid values.
- Validation commands captured in Story 7.1 should be reused and generalized for multi-instance orchestration in this story.
- Infrastructure docs are partially updated for container baselines; Story 7.2 must extend them for multi-instance operations without breaking existing single-instance instructions.

### Git Intelligence Summary

Recent commits (latest first):
- `28b7973`: feat: Containerize frontend and backend for production runtime
- `c5924c9`: feat: implement CLI for exporting events with CSV and JSON formats
- `a726263`: feat: Implement event immutability and audit trail completeness
- `5da5005`: feat: Implement event logging for Big Five questionnaire and enrich issue mutation payloads
- `bf45575`: feat: enhance issue statistics aggregation and improve error handling

Actionable implications for Story 7.2:
- Follow recent infra style from Story 7.1 (explicit runtime contracts, reproducible smoke commands, docs updated together with code).
- Preserve existing event-logging and backend stability work by avoiding service-level behavior regressions while adding compose orchestration.

### Latest Tech Information

- In-repo validated runtime stack for deployment path currently uses:
  - Node image: `node:22.12.0-alpine`
  - Nginx image: `nginx:1.27.0-alpine`
  - npm version pinned in Docker build stages: `11.8.0`
- Compose implementation should remain compatible with these image/runtime assumptions and avoid introducing mismatched base images unless explicitly required.

### Project Context Reference

Follow `_bmad-output/project-context.md` constraints:
- Node 18+ baseline remains mandatory (current implementation uses Node 22 image, which satisfies the baseline).
- Documentation updates are mandatory for Definition of Done.
- Environment variables, security posture, and reproducibility expectations must remain explicit.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7: Deployment Architecture & CI/CD Automation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2: Implement Parameterized Multi-Instance Docker Compose Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/implementation-artifacts/7-1-containerize-frontend-and-backend-for-production-runtime.md]
- [Source: _bmad-output/project-context.md]
- [Source: docs/07-infrastructure.md]

## Story Completion Status

- Story context creation complete.
- Story is now ready for implementation by `dev-story`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Loaded BMAD config, workflow engine, create-story workflow, template, and checklist.
- Parsed user input `7.2` and resolved story key `7-2-implement-parameterized-multi-instance-docker-compose-architecture`.
- Loaded sprint status and confirmed source status was `backlog` before context generation.
- Loaded full epic and architecture artifacts and extracted Epic 7 deployment track requirements.
- Loaded previous story 7.1 artifact and extracted reusable implementation guardrails.
- Collected git intelligence from latest 5 commits.
- Implemented parameterized root compose architecture and instance env contracts.
- Added root-level compose validation and operations scripts in `package.json` and `scripts/compose-instance.ps1`.
- Executed compose config validation for `stu` and `hms` profiles successfully.
- Executed concurrent multi-instance runtime validation: both instances healthy (`backend /api/v1/health` and frontend `/` returned HTTP 200).
- Executed backend regression tests successfully (`37/37` suites passing, `345/345` tests passing).
- Executed frontend regression tests: failures detected in existing suite outside Story 7.2 scope (multiple unrelated test failures and unhandled errors in current baseline).

### File List

| File | Action | Description |
|---|---|---|
| `docker-compose.yml` | Added | Parameterized root compose architecture for frontend/backend/database |
| `deploy/compose/.env.instance.example` | Added | Operator-facing env template with comments and examples |
| `deploy/compose/stu.env` | Added | Instance env profile for `stu` |
| `deploy/compose/hms.env` | Added | Instance env profile for `hms` |
| `scripts/compose-instance.ps1` | Added | PowerShell operator helper script for compose actions |
| `scripts/compose-instance.sh` | Added | Bash operator helper script for compose actions (CI-compatible) |
| `package.json` | Modified | Added compose npm scripts for config/up/down/ps/health per instance |
| `docs/07-infrastructure.md` | Modified | Added multi-instance compose architecture runbook section |
| `docs/08-development-guide.md` | Modified | Added multi-instance validation workflow and troubleshooting |
| `docs/09-changelog.md` | Modified | Added Story 7.2 completion trace entry |
| `.gitignore` | Modified | Added rule to exclude instance env files with secrets |

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-03-12 | Initial implementation of parameterized compose architecture | Dev Agent (GPT-5.3-Codex) |
| 2026-03-13 | Code review fixes: added backend healthcheck to compose, gitignore for instance envs, bash script for CI, marked tasks complete | Reviewer (Claude Opus 4.6) |

### Completion Notes List

- Created implementation-ready story context for Story 7.2 with explicit acceptance criteria, tasks, constraints, and validation strategy.
- Captured previous-story learnings from Story 7.1 to reduce implementation risk and prevent contract drift.
- Code review applied: fixed secret exposure risk, added explicit backend healthcheck, added cross-platform operator script, corrected task completion tracking.
- Included compose architecture extensibility constraints so Story 7.3 can add isolation without redesign.
- Included deterministic run/validation expectations to support upcoming CI/CD stories.
- Implemented single parameterized compose architecture with deterministic naming and per-instance resource patterns.
- Implemented dual-profile env contract (`stu`, `hms`) and reusable template for additional profiles.
- Added reproducible root commands for config, up/down, ps, and health checks.
- Updated infrastructure, development guide, and changelog documentation for Story 7.2 operations.
- Blocker: full frontend regression suite currently fails in baseline (non-Story-7.2 tests), preventing Definition-of-Done completion gate.

### File List

- _bmad-output/implementation-artifacts/7-2-implement-parameterized-multi-instance-docker-compose-architecture.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- docker-compose.yml
- deploy/compose/.env.instance.example
- deploy/compose/stu.env
- deploy/compose/hms.env
- scripts/compose-instance.ps1
- package.json
- docs/07-infrastructure.md
- docs/08-development-guide.md
- docs/09-changelog.md

## Change Log

- 2026-03-12: Created Story 7.2 implementation context and set status to `ready-for-dev`.
- 2026-03-13: Implemented Story 7.2 compose architecture and docs; blocked at completion gate due existing frontend regression suite failures outside Story 7.2 scope.
