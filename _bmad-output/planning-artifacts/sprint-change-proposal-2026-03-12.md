# Sprint Change Proposal - 2026-03-12

## 1. Issue Summary

### Trigger
A strategic change has been identified: introduce a future Epic 7 focused on production deployment architecture and CI/CD automation.

### Problem Statement
The current implementation model runs frontend/backend in local dev mode and does not yet define a production-ready, repeatable deployment architecture for multiple isolated instances on the same server.

### Why This Change Is Needed
- Upcoming pilot usage requires predictable, reproducible deployments.
- Multiple instances must run on one server with strict data isolation and non-overlapping ports.
- The project needs controlled branch-merge deployment automation with SSH-based update scripts.
- CI/CD checks should stay lean and target server/deployment regressions, while broader application tests remain local.

### Change Trigger Details (from user request)
- Add future Epic 7 for Docker architecture + CI/CD pipeline.
- Use one docker-compose approach controlled by environment variables to run frontend, backend, and database.
- Support three named instances on the same host:
  - `stu`: frontend `5173`, backend `3000`
  - `hms`: frontend `5174`, backend `3001`
  - `elia`: frontend `5175`, backend `3002`
- Implement merge-triggered deployment pipeline using SSH keys and scripts to update running instances.
- Restrict CI checks to prod/server-relevant checks; main application tests continue local.

## 2. Impact Analysis

### Epic Impact
- Affected epics: introduces new future Epic 7; no scope removal from Epics 1-6.
- Change type: additive strategic epic (deployment and delivery operations).
- Impact level: Moderate to Major (infrastructure, environment strategy, deployment automation, docs).

### Story Impact
- New stories required for Epic 7 across architecture, operations, and CI/CD automation.
- Existing stories in current in-progress epics remain valid, but deployment assumptions in docs must be updated.

### Artifact Conflicts
- PRD currently describes manual per-team provisioning and does not yet formalize multi-instance compose orchestration on one server.
- Architecture documents emphasize per-team database isolation; Epic 7 must preserve this while introducing compose-driven multi-instance orchestration.
- Infrastructure documentation needs explicit port mapping, instance naming, and deployment script standards.

### Technical Impact
- New environment variable matrix for instance-scoped runtime config (`INSTANCE_NAME`, frontend/backend host ports, DB name/volume/network/project names).
- Dockerization of frontend and backend must distinguish dev and prod behavior and avoid hardcoded local assumptions.
- Compose setup must prevent cross-instance collisions (ports, container names, volumes, networks, env files).
- Deployment scripts must support idempotent remote pull/build/restart for each instance.
- CI pipeline must run deployment-facing validation (build, compose config validation, smoke checks), not full local test suites.

## 3. Recommended Approach

### Selected Path
Option 1 - Direct Adjustment by adding a dedicated future Epic 7 and preparing implementation handoff.

### Rationale
- Preserves current product delivery momentum while creating a clear operational track.
- Creates a safe boundary between feature work and deployment-system hardening.
- Aligns with BMAD by routing specialized changes to Architect, Developer, QA, SM, and PM roles with explicit ownership.

### Effort, Risk, Timeline
- Effort: Medium.
- Risk: Medium (misconfiguration risk across multiple instances and deployment scripts).
- Timeline impact: Limited on current sprint execution; Epic 7 can run as future planned work.

## 4. Detailed Change Proposals

### 4.1 Epic Additions (epics.md)

Artifact: `_bmad-output/planning-artifacts/epics.md`
Section: Epic list and story inventory

OLD:
- Epic 6 is the latest epic in plan.

NEW:
- Add **Epic 7: Deployment Architecture & CI/CD Automation**.

Proposed Story Set:
- **Story 7.1: Containerize frontend and backend for production runtime**
  - Build Dockerfiles for `client` and `server` with production entrypoints.
- **Story 7.2: Implement parameterized multi-instance docker-compose architecture**
  - One compose template with env-driven instance identity and host port mapping.
- **Story 7.3: Provision isolated data/storage/network per instance**
  - Instance-specific DB names, volumes, and networks.
- **Story 7.4: Define and validate instance env contracts (`stu`, `hms`, `elia`)**
  - Env files and validation rules for each instance profile.
- **Story 7.5: Build SSH-based deployment scripts for merge-triggered updates**
  - Remote pull/build/up flow with safe restart strategy.
- **Story 7.6: Add CI/CD workflow for deployment validation and rollout**
  - Trigger on merge to main; secrets-backed SSH; selective deployment checks.
- **Story 7.7: Add server-side smoke and resilience checks in pipeline scope**
  - Health endpoints, compose status, startup checks, rollback guard.
- **Story 7.8: Update infra/runbook documentation for operations handoff**
  - Ops instructions, environment matrix, troubleshooting and rollback.

Rationale:
- Covers your required architecture, multi-instance isolation, and deployment pipeline without blocking current epic execution.

### 4.2 Environment and Port Strategy

Artifact: future infra/env documentation and compose env files

OLD:
- Frontend/backend currently run locally with `npm run dev`; only DB is dockerized.

NEW:
- Define canonical instance mapping:
  - `stu`: `FRONTEND_PORT=5173`, `BACKEND_PORT=3000`
  - `hms`: `FRONTEND_PORT=5174`, `BACKEND_PORT=3001`
  - `elia`: `FRONTEND_PORT=5175`, `BACKEND_PORT=3002`
- Add required instance parameters:
  - `INSTANCE_NAME`, `COMPOSE_PROJECT_NAME`
  - `DATABASE_NAME`, `DATABASE_PORT_INTERNAL=5432`
  - per-instance volume and network naming conventions

Rationale:
- Enforces deterministic startup and avoids resource collisions while preserving data separation.

### 4.3 CI/CD Pipeline Proposal

Artifact: future CI workflow + deployment scripts

OLD:
- No merge-triggered deployment automation for docker instances.

NEW:
- Merge-to-main deployment pipeline using SSH keys and remote scripts.
- Pipeline scope limited to prod/server-relevant checks:
  - Container build validation (`client`, `server`)
  - Compose config validation for each instance profile
  - Deployment smoke checks (`/health` endpoint and container state)
- Full functional suites remain local by design.

Rationale:
- Matches your requirement to avoid duplicating broad local test execution in CI while protecting deployment quality.

### 4.4 Document Updates

Artifacts to update during Epic 7 implementation:
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `docs/07-infrastructure.md`
- `docs/08-development-guide.md`
- `docs/09-changelog.md`

Update intent:
- Add deployment/operations requirements and acceptance criteria.
- Capture multi-instance topology and env contract.
- Document CI/CD operational workflow, rollback, and maintenance responsibilities.

## 5. Implementation Handoff

### Scope Classification
Major (new cross-cutting operational epic with architectural and delivery implications).

### BMAD Agent Routing (recommended)
- **architect (Winston):**
  - Define final Docker topology, isolation model, and env-variable contract.
  - Validate compatibility with existing architecture constraints.
- **dev (Amelia):**
  - Implement Dockerfiles, compose configuration, and deployment scripts.
  - Add health endpoints and startup checks where needed.
- **qa (Quinn):**
  - Define deployment-focused test design (compose validation + smoke tests).
  - Verify CI scope excludes broad local functional suites.
- **sm (Bob):**
  - Sequence Epic 7 stories and dependencies with existing backlog.
  - Prepare ready-for-dev story slices and acceptance checklists.
- **pm (John):**
  - Validate rollout risk, environment governance, and acceptance criteria.
  - Approve release policy for merge-triggered deployments.
- **tech-writer (Paige):**
  - Produce/update operational runbooks and infra docs.

### Success Criteria
- Epic 7 is added to planning artifacts with clear, testable stories.
- Three-instance deployment model (`stu`, `hms`, `elia`) is explicitly documented and parameterized.
- SSH-based merge deployment pipeline is defined with controlled rollout and smoke checks.
- CI remains focused on deployment/server reliability checks only.
- Documentation and handoff responsibilities are complete before implementation starts.

---

Workflow execution summary:
- Issue addressed: Need for future Epic 7 (Docker multi-instance deployment + CI/CD).
- Change scope: Major.
- Artifacts proposed for update: epics/prd/architecture/infrastructure/development-guide/changelog + sprint status tracking.
- Recommended handoff: Architect + Dev + QA + SM + PM + Tech Writer.