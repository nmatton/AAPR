# Story 7.5: Build SSH-Based Deployment Scripts for Merge-Triggered Updates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a release engineer,
I want idempotent SSH deployment scripts,
so that remote instances can be updated safely from CI after merges.

## Acceptance Criteria

1. **Given** Story 7.4 instance contracts are available for `stu`, `hms`, and `elia`
   **When** a deployment script is executed remotely over SSH for a target instance
   **Then** the script resolves the correct env profile and compose project for that instance
   **And** no hardcoded instance-specific logic is required in the script body.

2. **Given** merges to `main` should trigger deployment automation in Story 7.6
   **When** deployment scripts are invoked by CI
   **Then** they support non-interactive execution with deterministic exit codes
   **And** they can be called with explicit inputs for host, SSH user, repository path, branch/ref, and target instance.

3. **Given** deployments may run repeatedly for the same commit or branch
   **When** scripts execute a remote update cycle
   **Then** the flow is idempotent (`git fetch/reset`, compose re-render, `up -d`)
   **And** rerunning the script does not create duplicate resources or inconsistent runtime state.

4. **Given** deployment failure is a production risk
   **When** any step fails (SSH connection, git sync, compose config, image build/pull, health check)
   **Then** the script fails fast with actionable diagnostics
   **And** it does not silently report success.

5. **Given** security requirements for production operations
   **When** scripts are reviewed for release readiness
   **Then** secrets are provided via environment/CI secret stores and never committed
   **And** SSH execution avoids insecure patterns (no plaintext password prompts in CI, no disabled host verification by default).

6. **Given** Story 7.7 will add deployment/server smoke checks and resilience checks
   **When** Story 7.5 scripts complete a rollout
   **Then** they expose stable hooks/commands for post-deploy health validation
   **And** output format is suitable for pipeline parsing.

## Tasks / Subtasks

- [x] Task 1: Define SSH deployment script contract and invocation model (AC: 1, 2)
  - [x] Subtask 1.1: Define script parameters for host, user, repo path, branch/ref, and instance env file.
  - [x] Subtask 1.2: Define deterministic return code contract (success, validation failure, runtime failure).
  - [x] Subtask 1.3: Ensure invocation model is CI-ready (no interactive prompts in default mode).

- [x] Task 2: Implement idempotent remote rollout sequence (AC: 1, 3)
  - [x] Subtask 2.1: Implement remote `git fetch` + checkout/reset strategy to desired ref.
  - [x] Subtask 2.2: Run compose preflight (`docker compose ... config`) before update.
  - [x] Subtask 2.3: Apply update with deterministic compose command sequence (`pull/build` as defined, then `up -d`).

- [x] Task 3: Add failure handling and deployment diagnostics (AC: 4)
  - [x] Subtask 3.1: Fail fast on SSH, git, compose, and health-check errors with non-zero exit.
  - [x] Subtask 3.2: Emit structured, readable step logs to simplify CI triage.
  - [x] Subtask 3.3: Include explicit post-failure guidance (which command/step failed and probable remediation path).

- [x] Task 4: Enforce operational security constraints (AC: 5)
  - [x] Subtask 4.1: Use key-based SSH auth compatible with CI secret injection.
  - [x] Subtask 4.2: Ensure secrets are loaded from environment variables / secret store inputs, not repository files.
  - [x] Subtask 4.3: Keep host key verification enabled by default; if override is needed for bootstrap, make it explicit and documented.

- [x] Task 5: Integrate health-check hooks for pipeline stages (AC: 6)
  - [x] Subtask 5.1: Reuse existing compose health checks (`scripts/compose-instance.ps1 -Action health`) where feasible.
  - [x] Subtask 5.2: Add machine-readable output option (or stable parseable lines) for CI consumers.
  - [x] Subtask 5.3: Ensure hooks can be reused by Story 7.6 pipeline and Story 7.7 smoke checks without script redesign.

- [x] Task 6: Documentation and audit trail updates (AC: 2, 4, 5, 6)
  - [x] Subtask 6.1: Update `docs/07-infrastructure.md` with SSH deployment flow, preconditions, and rollback notes.
  - [x] Subtask 6.2: Update `docs/08-development-guide.md` with operator/dev execution examples.
  - [x] Subtask 6.3: Update `docs/09-changelog.md` with Story 7.5 completion trace.

## Code Review Findings & Resolutions (March 13, 2026)

All findings resolved before merge:

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | **HIGH** | `--host` (or any value-bearing flag) without a value triggered `$2: unbound variable` shell crash instead of structured validation error | Added `require_arg()` guard called before each `$2` access in argument parsing |
| 2 | **Medium** | SSH options built as a string; paths with spaces in `--ssh-key` would silently break | Converted `build_ssh_opts()` to populate a global `SSH_OPTS` array; `ssh_exec()` uses `"${SSH_OPTS[@]}"` |
| 3 | **Medium** | `# shellcheck disable=SC2086` masked the word-splitting risk from unquoted `$ssh_opts` | Removed disable comment; now uses properly quoted array expansion |
| 4 | **Medium** | No tests for missing flag value, no `--ssh-key` coverage | Added 4 new tests; test count grew from 16 to 20 (all passing) |
| 5 | **Low** | `docs/07-infrastructure.md` and `docs/08-development-guide.md` had stale `Last Updated: January 19, 2026` footers | Updated both footers to `March 13, 2026` |

## Dev Notes

- Epic 7 sequence for deployment track:
  - Story 7.1: production container baseline
  - Story 7.2: parameterized multi-instance compose architecture
  - Story 7.3: network/storage/database isolation hardening
  - Story 7.4: explicit env contracts and validation for `stu`, `hms`, `elia`
  - Story 7.5: SSH-based deployment scripting layer for CI-triggered rollout
  - Stories 7.6-7.7: CI orchestration and focused smoke/resilience checks on top of 7.5
- Story 7.5 should extend current compose operational tooling, not fork it.
- Existing local operational scripts already provide contract validation and health checks; reuse them as building blocks for remote deployment flow.

### Technical Requirements

- Preserve one root compose file (`docker-compose.yml`) and env-driven instance profiles (`deploy/compose/*.env`).
- Support deterministic target instance selection via env profile (`stu`, `hms`, `elia`) with no duplicated compose definitions.
- Remote deployment sequence must include:
  - repository sync to target ref,
  - compose config validation,
  - rollout command (`docker compose ... up -d`) with instance env file,
  - post-deploy health verification.
- Default behavior must be non-interactive and CI-safe.
- Exit code contract must distinguish success vs operational failure.

### Architecture Compliance

- Conforms to Epic 7 objective: scripted, repeatable deployment on one server with isolated instances.
- Preserves architecture decision for per-instance isolation through env-driven compose contracts.
- Keeps CI scope deployment-focused (infrastructure and server health), while broader application tests remain local.

### Library & Framework Requirements

- Docker Compose V2 commands (`docker compose`) only.
- SSH tooling should rely on standard OpenSSH-compatible usage in CI environments.
- Keep in-repo deployment baselines unchanged unless later architecture decision requires upgrades:
  - backend image baseline: `aapr-backend:7.1`
  - frontend image baseline: `aapr-frontend:7.1`
  - database image baseline: `postgres:14`

### File Structure Requirements

- Primary implementation targets (expected for Story 7.5):
  - `scripts/` (new deployment script(s) for SSH-triggered remote rollout)
  - `deploy/compose/*.env` (consumed, not redesigned)
  - `docker-compose.yml` (consumed by remote rollout commands)
  - `package.json` (optional script entrypoints for deterministic invocation)
- Documentation targets:
  - `docs/07-infrastructure.md`
  - `docs/08-development-guide.md`
  - `docs/09-changelog.md`

### Testing Requirements

- Preflight validation:
  - `npm run compose:validate-isolation` succeeds before rollout.
  - `docker compose --env-file deploy/compose/<instance>.env -f docker-compose.yml config` succeeds for target instance.
- Deployment execution validation:
  - Script dry-run/preflight mode validates SSH inputs and target paths without mutating runtime.
  - Real execution returns non-zero on failure and zero on success.
- Post-deploy validation:
  - Health endpoint checks succeed for updated instance (`/api/v1/health` via mapped backend port).
  - Instance-scoped compose `ps` output is available for CI troubleshooting.
- Note that ssh keys and secrets management will be tested in the context of Story 7.6 CI integration, but Story 7.5 scripts should be designed to support secure secret injection patterns.

### Previous Story Intelligence

From Story 7.4 (`_bmad-output/implementation-artifacts/7-4-define-and-validate-instance-environment-contracts-stu-hms-elia.md`):

- Contracts are now explicit and validated for `stu`, `hms`, and `elia`.
- Validation already enforces uniqueness for `COMPOSE_PROJECT_NAME`, `POSTGRES_DB`, and host ports.
- Existing scripts to reuse instead of replacing:
  - `scripts/compose-instance.ps1` (`config`, `health`, `validate-isolation`, `inspect`)
  - `scripts/compose-instance.sh` (cross-platform parity commands)
  - `scripts/verify-isolation.ps1` (runtime isolation validation)
- Story 7.5 should layer remote SSH orchestration on top of these contracts, not modify core compose topology.

### Git Intelligence Summary

Recent commits (latest first):
- `7ea1f3d`: feat: Implement Story 7.4 for defining and validating instance environment contracts for stu, hms, and elia
- `1f5466b`: feat: Implement Story 7.3 for isolated data, storage, and network per instance
- `593c1cf`: feat: Implement parameterized multi-instance Docker Compose architecture with validation scripts
- `28b7973`: feat: Containerize frontend and backend for production runtime
- `c5924c9`: feat: implement CLI for exporting events with CSV and JSON formats

Actionable implications for Story 7.5:
- Reuse the existing deployment contract and compose helper script ecosystem.
- Keep changes constrained to deployment automation surfaces (scripts/docs/package scripts) to avoid regressions in app-domain code.
- Maintain deterministic command behavior and clear logs to support upcoming CI integration (Story 7.6).

### Latest Tech Information

- In-repo operational baseline remains:
  - Docker Compose V2 (`docker compose`)
  - health endpoint contract: `GET /api/v1/health`
  - environment-driven frontend runtime API injection (`FRONTEND_RUNTIME_API_URL` / `VITE_API_URL`)
- For SSH deployment automation, current best-practice guardrails to apply in implementation:
  - key-based auth with CI-managed secrets,
  - strict host key verification by default,
  - non-interactive command execution with explicit error handling.

### Project Context Reference

Follow `_bmad-output/project-context.md` constraints:
- Documentation updates are mandatory for infrastructure story completion.
- Keep operational workflows explicit, deterministic, and script-first.
- Keep production security assumptions explicit (no hardcoded secrets, no implicit insecure defaults).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7: Deployment Architecture & CI/CD Automation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.5: Build SSH-Based Deployment Scripts for Merge-Triggered Updates]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/planning-artifacts/prd.md]
- [Source: _bmad-output/implementation-artifacts/7-4-define-and-validate-instance-environment-contracts-stu-hms-elia.md]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]
- [Source: docker-compose.yml]
- [Source: deploy/compose/stu.env]
- [Source: deploy/compose/hms.env]
- [Source: deploy/compose/elia.env]
- [Source: scripts/compose-instance.ps1]
- [Source: scripts/compose-instance.sh]
- [Source: scripts/verify-isolation.ps1]
- [Source: docs/07-infrastructure.md]
- [Source: docs/08-development-guide.md]

## Story Completion Status

- Story context creation complete.
- Story is now ready for implementation by `dev-story`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Loaded BMAD config, workflow engine, create-story workflow, template, and checklist.
- Parsed user-provided story identifier `7.5` and resolved story key `7-5-build-ssh-based-deployment-scripts-for-merge-triggered-updates`.
- Loaded sprint status and confirmed source status for story 7.5 was `ready-for-dev`.
- Extracted Epic 7 scope and Story 7.5 intent from planning artifacts.
- Analyzed previous implementation artifact (Story 7.4) for reusable scripts and deployment contracts.
- Loaded existing compose-instance.sh, compose-instance.ps1, docker-compose.yml, and env files.
- Designed SSH deployment script with 9-step rollout sequence and 8-value exit code contract.
- Created 16-test validation suite covering input validation, exit codes, and output format.

### Implementation Plan

1. Created `scripts/deploy-remote.sh` — idempotent SSH deployment script with:
   - Parameterized invocation (--host, --user, --repo-path, --ref, --instance, --dry-run, --ssh-key)
   - Deterministic exit codes: 0 (success), 1 (validation), 2 (SSH), 3 (git), 4 (compose config), 5 (build), 6 (up), 7 (health), 99 (internal)
   - Non-interactive CI-safe execution via BatchMode=yes
   - Key-based SSH with StrictHostKeyChecking=accept-new
   - 9-step deployment flow: validate → SSH check → repo check → git sync → compose config → build → up → health → summary
   - Dry-run mode for preflight without mutation
   - Machine-readable DEPLOY_RESULT output line
   - Post-deploy health check reusing compose-instance.sh
2. Created `scripts/test-deploy-remote.sh` — 16 tests for input validation and exit code contract.
3. Added npm entrypoints: `deploy:remote` and `deploy:test`.
4. Updated docs/07-infrastructure.md with SSH deployment section.
5. Updated docs/08-development-guide.md with deployment validation workflow.
6. Updated docs/09-changelog.md with Story 7.5 completion trace.

### Completion Notes List

- All 6 tasks and 18 subtasks implemented and verified.
- 16/16 deployment script tests pass.
- Compose isolation validation passes (no regressions to existing env contracts).
- Script reuses existing compose-instance.sh health action for post-deploy checks.
- No application code modified — all changes scoped to scripts, package.json, and docs.
- Script is designed for Story 7.6 CI integration and Story 7.7 smoke check hooks.

### File List

- scripts/deploy-remote.sh (added)
- scripts/test-deploy-remote.sh (added)
- package.json (modified)
- docs/07-infrastructure.md (modified)
- docs/08-development-guide.md (modified)
- docs/09-changelog.md (modified)
- _bmad-output/implementation-artifacts/7-5-build-ssh-based-deployment-scripts-for-merge-triggered-updates.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-03-13: Created Story 7.5 implementation context and set status to `ready-for-dev`.
- 2026-03-13: Implemented all 6 tasks. Created deploy-remote.sh with idempotent SSH rollout, test suite (16/16 pass), npm entrypoints, and documentation updates. Status: review.
