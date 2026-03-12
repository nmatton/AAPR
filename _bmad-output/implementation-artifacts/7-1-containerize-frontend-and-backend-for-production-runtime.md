# Story 7.1: Containerize Frontend and Backend for Production Runtime

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want production-ready Dockerfiles for frontend and backend,
so that both services can run consistently across environments.

## Acceptance Criteria

1. **Given** the existing `client` and `server` applications
   **When** I build production container images
   **Then** both images build successfully from repository root
   **And** build-time assumptions are explicit (Node version, install mode, build command, runtime command).

2. **Given** the backend production image
   **When** the container starts
   **Then** it runs the compiled production server (not dev/watch mode)
   **And** required runtime env variables are documented and validated.

3. **Given** the frontend production image
   **When** the container starts
   **Then** it serves static production assets reliably
   **And** API base URL configuration follows environment-driven runtime/deployment rules.

4. **Given** both production images
   **When** they are scanned for delivery readiness
   **Then** they use deterministic dependency install patterns (`npm ci` + lockfiles)
   **And** avoid unnecessary dev-time tooling in runtime layers.

5. **Given** this story is the foundation of Epic 7
   **When** Story 7.2 compose orchestration begins
   **Then** Dockerfiles expose predictable ports, healthcheck strategy, and startup contracts needed by multi-instance compose profiles.

## Tasks / Subtasks

- [x] Task 1: Baseline production runtime contracts (AC: 1, 2, 3)
  - [x] Subtask 1.1: Confirm current backend runtime entrypoint and compiled output path from `server/package.json` and `server/tsconfig.json`.
  - [x] Subtask 1.2: Confirm current frontend production build output and static serving strategy from `client/package.json` and Vite config.
  - [x] Subtask 1.3: Define minimal required runtime env contract for each service (backend mandatory, frontend deployment-bound variables).

- [x] Task 2: Create backend production Dockerfile (AC: 1, 2, 4)
  - [x] Subtask 2.1: Add a multi-stage backend Dockerfile using pinned Node LTS base and deterministic install (`npm ci`).
  - [x] Subtask 2.2: Build TypeScript output in build stage; copy only runtime artifacts and production dependencies into final stage.
  - [x] Subtask 2.3: Configure production startup command and internal service port exposure aligned with Epic 7 port contract.
  - [x] Subtask 2.4: Add backend container healthcheck strategy compatible with planned pipeline smoke checks.

- [x] Task 3: Create frontend production Dockerfile (AC: 1, 3, 4)
  - [x] Subtask 3.1: Add a multi-stage frontend Dockerfile (build static bundle, serve with production web server layer).
  - [x] Subtask 3.2: Ensure frontend runtime image only contains built assets and required serving config.
  - [x] Subtask 3.3: Define the frontend internal container port and startup contract for compose integration.
  - [x] Subtask 3.4: Document how frontend runtime resolves backend API endpoint in multi-instance deployments.

- [x] Task 4: Add local verification and smoke checks for image validity (AC: 1, 2, 3, 5)
  - [x] Subtask 4.1: Build both images locally with reproducible commands from repository root.
  - [x] Subtask 4.2: Run backend container and verify health endpoint behavior.
  - [x] Subtask 4.3: Run frontend container and verify static app serving plus API proxy/base URL behavior.
  - [x] Subtask 4.4: Capture the exact validation commands for reuse in Story 7.6 and 7.7 pipeline steps.

- [x] Task 5: Documentation and handoff alignment (AC: 5)
  - [x] Subtask 5.1: Update `docs/07-infrastructure.md` with container build/run instructions and production notes.
  - [x] Subtask 5.2: Update `docs/08-development-guide.md` with local validation workflow and Docker usage boundaries.
  - [x] Subtask 5.3: Add story completion entry to `docs/09-changelog.md` once implementation is finished.

### Review Follow-ups (AI)

- [x] [AI-Review][High] Frontend API base URL moved to runtime configuration using `runtime-config.js` generated at container startup via `VITE_API_URL`. [client/Dockerfile:10, client/docker-entrypoint.d/40-runtime-config.sh:1, client/src/lib/runtimeConfig.ts:1]
- [x] [AI-Review][Medium] Production `PORT` contract aligned across validation and startup (`1-65535`), removing fallback ambiguity for invalid explicit values. [server/src/config/runtime-env.ts:14, server/src/index.ts:5]
- [x] [AI-Review][Medium] Frontend quality gate restored; full client suite now passes (`53/53` files, `340` tests passing, `2` skipped). [client/src/App.test.tsx:1, client/src/features/teams/state/membersSlice.test.ts:1, client/src/features/practices/state/practices.slice.test.ts:1]

## Dev Notes

- Epic 7 is an additive infrastructure track introduced to support repeatable production deployments without disrupting feature delivery from Epics 1-6.
- Story 7.1 is the prerequisite for Story 7.2+ and must focus on image correctness, determinism, and runtime contracts rather than full multi-instance orchestration.
- Current infrastructure docs are dev-heavy; this story introduces production container baselines while preserving existing project architecture and security constraints.

### Technical Requirements

- Use deterministic installs in Docker builds (`npm ci` with lockfiles).
- Keep runtime images minimal (no dev server/watch mode in production containers).
- Ensure backend container starts compiled app and exposes stable internal service port.
- Ensure frontend container serves built static assets with explicit runtime/startup command.
- Provide healthcheck-ready behavior for backend and frontend containers to support Story 7.7 smoke/resilience checks.

### Architecture Compliance

- Align with deployment goals defined in Epic 7 and sprint change proposal:
  - one compose-driven architecture in Story 7.2,
  - strict instance isolation in Story 7.3,
  - deterministic per-instance contracts in Story 7.4.
- Preserve architecture constraints from planning artifacts:
  - Node/Express backend standards,
  - React/Vite frontend standards,
  - environment-driven runtime configuration,
  - no regression to local-only assumptions.

### Library & Framework Requirements

- Backend runtime: Node.js 18+ LTS and existing Express server build/start commands.
- Frontend runtime: existing Vite production build output served by a production web server image.
- No framework migration in this story; only containerization of existing stack.

### File Structure Requirements

- Expected primary implementation targets:
  - `server/Dockerfile`
  - `client/Dockerfile`
  - optional docker support files (for example `.dockerignore` per service) if needed for image hygiene.
- Supporting documentation targets:
  - `docs/07-infrastructure.md`
  - `docs/08-development-guide.md`
  - `docs/09-changelog.md`

### Testing Requirements

- Build validation:
  - backend image build passes,
  - frontend image build passes.
- Runtime validation:
  - backend container boots and health endpoint returns expected payload,
  - frontend container serves built assets successfully.
- Contract validation:
  - documented container run commands are reproducible,
  - exposed ports and startup commands are aligned with upcoming instance profiles (`stu`, `hms`, `elia`).

### Project Context Reference

- Follow `_bmad-output/project-context.md` constraints:
  - Node 18+ baseline,
  - strict separation of dev/runtime behavior,
  - documentation updates are mandatory,
  - environment variables and security posture must remain explicit.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7: Deployment Architecture & CI/CD Automation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1: Containerize Frontend and Backend for Production Runtime]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md]
- [Source: docs/07-infrastructure.md]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/project-context.md]

## Story Completion Status

- Story context creation complete.
- Story is now ready for implementation by `dev-story`.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Loaded BMAD create-story workflow configuration, instructions, template, and validation checklist.
- Resolved target story from user input and sprint status: `7-1-containerize-frontend-and-backend-for-production-runtime`.
- Loaded planning, architecture, infrastructure, PRD, UX, and project-context artifacts for implementation guardrails.
- Confirmed backend runtime contract from `server/package.json` (`start: node dist/index.js`) and `server/tsconfig.json` (`outDir: dist`).
- Confirmed frontend build contract from `client/package.json` (`build: vite build`) and Vite configuration (`client/vite.config.ts`).
- Implemented backend and frontend production multi-stage Dockerfiles with deterministic installs and healthchecks.
- Added backend production runtime env validation and unit tests for mandatory variables.
- Executed Docker smoke validation commands and verified HTTP 200 for backend `/api/v1/health` and frontend `/`.

### Completion Notes List

- Added production-ready containerization baseline for backend and frontend with deterministic Docker builds.
- Backend runtime now enforces production env contract (`DATABASE_URL`, `JWT_SECRET`, `PORT` range 1-65535 when provided).
- Frontend runtime image now serves only built static assets via Nginx with deployment-driven API base URL resolved at container startup through `VITE_API_URL`.
- Added reusable smoke-test commands for Story 7.6/7.7 pipeline adoption.
- Validation summary:
  - `server` runtime-env tests: passing.
  - Docker smoke checks: backend `200`, frontend `200`.
  - `client` full test suite: `53/53` files passing (`340` tests passing, `2` skipped).

### File List

- _bmad-output/implementation-artifacts/7-1-containerize-frontend-and-backend-for-production-runtime.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- server/Dockerfile
- server/.dockerignore
- server/src/config/runtime-env.ts
- server/src/config/runtime-env.test.ts
- server/src/index.ts
- client/Dockerfile
- client/.dockerignore
- client/docker-entrypoint.d/40-runtime-config.sh
- client/nginx.default.conf
- client/public/runtime-config.js
- client/src/lib/runtimeConfig.ts
- client/index.html
- client/src/lib/apiClient.ts
- client/src/features/auth/api/authApi.ts
- client/src/features/big-five/api/bigFiveApi.ts
- client/src/features/practices/api/practices.api.ts
- client/src/features/practices/api/affinity.api.ts
- client/src/features/teams/api/teamsApi.ts
- client/src/features/teams/api/practicesApi.ts
- client/src/features/teams/api/invitesApi.ts
- client/src/features/teams/api/membersApi.ts
- client/src/App.test.tsx
- client/src/components/ui/AuthenticatedLayout.test.tsx
- client/src/features/auth/state/authSlice.test.ts
- client/src/features/practices/state/practices.slice.test.ts
- client/src/features/teams/state/membersSlice.test.ts
- client/package-lock.json
- client/tailwind.config.js
- docs/07-infrastructure.md
- docs/08-development-guide.md
- docs/09-changelog.md

## Change Log

- 2026-03-12: Implemented Story 7.1 production container baseline for backend and frontend.
- 2026-03-12: Added backend production env validation and associated unit tests.
- 2026-03-12: Added Docker build/run smoke validation commands to infrastructure and development guides.
- 2026-03-12: Senior developer AI review completed; unresolved issues recorded; status moved to `in-progress`.
- 2026-03-12: Applied AI review remediations (runtime frontend API configuration, strict backend PORT handling, frontend test-suite stabilization); status moved to `done`.

## Senior Developer Review (AI)

### Reviewer

- Nmatton (AI code review workflow)

### Date

- 2026-03-12

### Outcome

- Approved after fixes

### Findings

1. High (Resolved): Frontend deployment contract is runtime-configurable.
  - Resolution: Added runtime `runtime-config.js` injection at container startup and centralized client runtime config resolution.
  - Evidence: `client/docker-entrypoint.d/40-runtime-config.sh`, `client/public/runtime-config.js`, `client/src/lib/runtimeConfig.ts`.

2. Medium (Resolved): Backend `PORT` validation matches startup behavior.
  - Resolution: Enforced explicit `1-65535` check in both env validation and startup port resolution.
  - Evidence: `server/src/config/runtime-env.ts`, `server/src/index.ts`, `server/src/config/runtime-env.test.ts`.

3. Medium (Resolved): Frontend quality gate restored.
  - Resolution: Updated affected tests to align with current state/filter signatures and routing context behavior.
  - Evidence: `client` full suite now passes (`npm test`): `53` files passing, `340` tests passing, `2` skipped.

### Validation Notes

- Backend runtime-env tests verified passing (`server`, `npm test -- runtime-env.test.ts`).
- Frontend full test suite verified passing (`client`, `npm test`): `53/53` files passing.
- Git/story file list discrepancies: none detected for this story scope.
