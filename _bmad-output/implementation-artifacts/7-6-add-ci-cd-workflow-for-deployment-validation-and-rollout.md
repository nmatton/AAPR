# Story 7.6: Add CI/CD Workflow for Deployment Validation and Rollout

Status: invalid

> **⚠️ SKIPPED — Not feasible due to infrastructure constraint.**
> GitHub Actions runners cannot reach the production server due to IP restrictions. GitHub's hosted runner IPs are not whitelisted on the deployment target.
>
> **Decision (2026-03-13):** Deployment from CI is not possible with the current network setup. Deployments are executed manually from a developer machine using `scripts/deploy-remote.sh` directly, at the operator's discretion (e.g., after merging to `main`). No automated pipeline wrapper is needed.
>
> **Impact on Epic 7:** Stories 7.1–7.5 deliver all functional value (containerization, multi-instance compose, isolation, env contracts, SSH deployment scripting). Story 7.6 was solely the GitHub Actions orchestration layer on top of 7.5 — which is moot without runner access.
>
> **Story 7.7** (server-focused smoke checks) should be reviewed for the same constraint before implementation.

## Story

As a release engineer,
I want a branch-merge-triggered deployment workflow,
so that updates are validated and deployed automatically with controlled failure handling.

## Acceptance Criteria

1. **Given** a commit is merged to the `main` branch
   **When** the merge event is received by GitHub Actions
   **Then** the deployment workflow triggers automatically without manual intervention
   **And** it does not trigger on pushes to any other branch.

2. **Given** the workflow triggers
   **When** the deployment phase begins
   **Then** the workflow deploys all three instances (`stu`, `hms`, `elia`) using `scripts/deploy-remote.sh`
   **And** each instance uses its matching env file: `deploy/compose/{instance}.env`
   **And** no instance-specific logic is embedded in the workflow itself (all logic lives in the script).

3. **Given** deployment requires SSH credentials
   **When** the workflow runs
   **Then** `DEPLOY_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_REPO_PATH` are sourced exclusively from GitHub Actions repository secrets
   **And** no credential value is echoed, logged, or committed to the repository.

4. **Given** `scripts/deploy-remote.sh` returns a non-zero exit code for an instance
   **When** the instance deployment fails
   **Then** the workflow logs the specific exit code with a human-readable label (e.g., `EXIT_SSH=2`, `EXIT_HEALTH=7`)
   **And** the failing instance job is marked as failed in the GitHub Actions UI
   **And** remaining instances are still attempted (failure of one does not abort others).

5. **Given** all three instances are deployed in the same run
   **When** one or more instances fail
   **Then** the overall workflow run is marked as failed
   **And** the run summary lists which instances succeeded and which failed.

6. **Given** a manual workflow trigger (`workflow_dispatch`) is invoked
   **When** the operator selects `dry_run: true` input
   **Then** the workflow invokes `scripts/deploy-remote.sh` with `--dry-run` for each instance
   **And** no production state is mutated
   **And** a preflight validation summary is visible in the run output.

7. **Given** the workflow completes successfully for an instance
   **When** the run summary is viewed
   **Then** the `DEPLOY_RESULT=success` machine-readable line emitted by the script is captured and surfaced in the job summary.

8. **Given** the `StrictHostKeyChecking=accept-new` behavior of `deploy-remote.sh`
   **When** the remote host key is unknown on first run
   **Then** the workflow does not fail on the key verification step
   **And** subsequent runs with a known host key succeed without modification.

## Tasks / Subtasks

- [ ] Task 1: Create `.github/workflows/deploy.yml` workflow file (AC: 1, 2, 3)
  - [ ] Subtask 1.1: Configure `on: push: branches: [main]` trigger with branch protection pinning.
  - [ ] Subtask 1.2: Configure `on: workflow_dispatch` trigger with `dry_run` boolean input (default: `false`).
  - [ ] Subtask 1.3: Define a `deploy` job using `matrix: instance: [stu, hms, elia]` for parallel deployment.
  - [ ] Subtask 1.4: Set `continue-on-error: true` at matrix job level so all instances run even if one fails.
  - [ ] Subtask 1.5: Add a final `summarize` job that `needs: [deploy]` and reports per-instance pass/fail.

- [ ] Task 2: Implement SSH setup and script invocation (AC: 2, 3, 8)
  - [ ] Subtask 2.1: Write SSH private key from `secrets.DEPLOY_SSH_KEY` to a temp file with `600` permissions; clean up in `always()` post-step.
  - [ ] Subtask 2.2: Call `bash scripts/deploy-remote.sh` with `--host`, `--user`, `--repo-path`, `--ref ${{ github.sha }}`, `--instance ${{ matrix.instance }}`, and optionally `--ssh-key`.
  - [ ] Subtask 2.3: Pass `--dry-run` when `github.event.inputs.dry_run == 'true'`.
  - [ ] Subtask 2.4: Do NOT use `ssh-agent` action or `known_hosts` injection — the script handles `StrictHostKeyChecking=accept-new` internally.

- [ ] Task 3: Exit code handling and diagnostics (AC: 4, 5, 7)
  - [ ] Subtask 3.1: Capture the exit code of `deploy-remote.sh` into a variable and map it to a label in the job summary.
  - [ ] Subtask 3.2: Write per-instance result (`PASS`/`FAIL` + exit code label) to `$GITHUB_STEP_SUMMARY`.
  - [ ] Subtask 3.3: In the `summarize` job, aggregate outputs from all matrix instances into a markdown table posted to the workflow run summary.
  - [ ] Subtask 3.4: Ensure the `summarize` job fails if any matrix instance failed (check `needs.deploy.result`).

- [ ] Task 4: Secret documentation and runbook update (AC: 3, 6)
  - [ ] Subtask 4.1: Document all required secrets in `docs/07-infrastructure.md` (names, expected format, where to obtain them).
  - [ ] Subtask 4.2: Add a "CI/CD Workflow" section to `docs/08-development-guide.md` with: trigger conditions, manual dispatch instructions, failure interpretation guide.
  - [ ] Subtask 4.3: Update `docs/09-changelog.md` with Story 7.6 completion trace.

- [ ] Task 5: Validation (AC: all)
  - [ ] Subtask 5.1: Validate workflow YAML syntax locally (`actionlint` or GitHub's built-in lint on PR).
  - [ ] Subtask 5.2: Test manual `workflow_dispatch` with `dry_run: true` to confirm preflight path runs without touching production.
  - [ ] Subtask 5.3: Confirm `continue-on-error` behavior: simulate a failing instance and verify others still execute.

## Dev Notes

### Epic 7 Build Sequence

Story 7.6 builds directly on the SSH deployment layer from Story 7.5:
- **7.1** — production container baseline (`aapr-backend:7.1`, `aapr-frontend:7.1`)
- **7.2** — parameterized multi-instance compose architecture
- **7.3** — network/storage/database isolation per instance
- **7.4** — explicit env contracts for `stu`, `hms`, `elia` with validated port assignments
- **7.5** — `scripts/deploy-remote.sh` (SSH-based, idempotent, CI-safe, exit code contract) ✅ **DONE**
- **7.6** — GitHub Actions workflow orchestrating 7.5 scripts ← **THIS STORY**
- **7.7** — server-focused smoke and resilience checks expanding on hooks from 7.5/7.6
- **7.8** — infrastructure runbook updates

### New File to Create

```
.github/
  workflows/
    deploy.yml    ← create new
```

> No existing `.github/workflows/` directory exists in the repository. Create it.

### Files to Modify

```
docs/07-infrastructure.md     ← add "CI/CD Secrets" and "GitHub Actions Workflow" sections
docs/08-development-guide.md  ← add operator instructions for manual dispatch and failure triage
docs/09-changelog.md          ← add Story 7.6 entry
```

### deploy-remote.sh Contract (DO NOT MODIFY)

The workflow must invoke `scripts/deploy-remote.sh` exactly. Do not wrap it in a new script or duplicate its logic.

**Invocation signature:**
```bash
bash scripts/deploy-remote.sh \
  --host <host> \
  --user <ssh-user> \
  --repo-path <path> \
  --ref <branch-or-sha> \
  --instance <stu|hms|elia> \
  [--dry-run] \
  [--ssh-key <path>]
```

**Exit code contract (from `scripts/deploy-remote.sh`):**

| Code | Name | Meaning |
|------|------|---------|
| 0 | `EXIT_SUCCESS` | deployment succeeded |
| 1 | `EXIT_VALIDATION` | bad arguments / missing env file |
| 2 | `EXIT_SSH` | SSH connection failure |
| 3 | `EXIT_GIT` | git sync failure |
| 4 | `EXIT_COMPOSE_CONFIG` | compose config validation failure |
| 5 | `EXIT_BUILD` | image build/pull failure |
| 6 | `EXIT_UP` | `compose up` failure |
| 7 | `EXIT_HEALTH` | post-deploy health check failure |
| 99 | `EXIT_INTERNAL` | unexpected internal error |

The workflow diagnostic summary should display the label (not just the number) when a deployment fails.

**Machine-readable success line (for CI parsing):**
```
DEPLOY_RESULT=success host=<host> instance=<instance> ref=<ref> env=<env_file>
```
Capture this line and surface it in `$GITHUB_STEP_SUMMARY`.

### Required GitHub Actions Secrets

The following repository secrets must be configured in GitHub → Settings → Secrets and variables → Actions → Repository secrets:

| Secret name | Description | Format |
|---|---|---|
| `DEPLOY_HOST` | Remote server hostname or IP | plain string |
| `DEPLOY_SSH_USER` | SSH username on the remote server | plain string |
| `DEPLOY_SSH_KEY` | SSH private key (PEM format, starts with `-----BEGIN`) | multi-line PEM |
| `DEPLOY_REPO_PATH` | Absolute path to AAPR repo on the remote host | plain string (e.g., `/home/deploy/AAPR`) |

> **Security**: Write SSH key to a temp file with `chmod 600` and always clean up in a `finally` block (`always()` condition in GitHub Actions). Never print secret values in logs.

### Workflow Design: Matrix Strategy

Use a matrix strategy to deploy all instances in parallel:

```yaml
strategy:
  fail-fast: false      # do NOT abort remaining instances on failure
  matrix:
    instance: [stu, hms, elia]
```

`fail-fast: false` is the correct mechanism for AC4 (continue on error) — do not use `continue-on-error: true` at job level as this silences job failure status.

### SSH Key Injection Pattern

Do NOT use `webfactory/ssh-agent` or similar actions. Instead:

```yaml
- name: Write SSH key
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
  # no shell echo of key value, use direct redirect

- name: Deploy ${{ matrix.instance }}
  run: |
    bash scripts/deploy-remote.sh \
      --host "${{ secrets.DEPLOY_HOST }}" \
      --user "${{ secrets.DEPLOY_SSH_USER }}" \
      --repo-path "${{ secrets.DEPLOY_REPO_PATH }}" \
      --ref "${{ github.sha }}" \
      --instance "${{ matrix.instance }}" \
      --ssh-key ~/.ssh/deploy_key \
      ${{ github.event.inputs.dry_run == 'true' && '--dry-run' || '' }}

- name: Cleanup SSH key
  if: always()
  run: rm -f ~/.ssh/deploy_key
```

### Workflow Dispatch Inputs

```yaml
on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run (validate without deploying)'
        required: false
        default: 'false'
        type: boolean
```

When `dry_run` is `true`, the `--dry-run` flag is appended to the script call. The script will validate SSH connectivity and env files but will not execute `git sync`, `compose build`, or `compose up`.

### Job Summary Strategy

Each matrix job writes to `$GITHUB_STEP_SUMMARY`. The `summarize` job aggregates using job outputs:

- Each matrix job: `echo "result_${{ matrix.instance }}=$EXIT_CODE_LABEL" >> $GITHUB_OUTPUT`
- `summarize` job: reads outputs and creates a markdown table

Use `needs.deploy.outputs` to access matrix job outputs (GitHub Actions limitation: matrix outputs require the aggregation pattern).

### Retry Behavior

Story 7.6 does NOT implement automatic retry. Retries are a manual operation:
- Use `workflow_dispatch` to re-trigger for specific failures
- Or re-push to `main` if the failure was transient (SSH flap, health check timing)

Story 7.7 may add resilience checks that reduce transient health failures.

### Project Structure Notes

- **Alignment**: No `.github/workflows/` directory exists — create it fresh. Architecture doc references `.github/workflows/ci.yml` as a lint/test file; this story creates `deploy.yml` as a separate deployment workflow.
- **No app code changes**: This story touches only `.github/workflows/deploy.yml` and documentation files. No `src/`, `server/`, or `client/` files are modified.
- **Compose files untouched**: `docker-compose.yml` and `deploy/compose/*.env` files are consumed by the script; this story does not modify them.

### Previous Story Intelligence (7.5)

Key learnings from Story 7.5 that directly affect this story:

1. **SSH options are an array, not a string** — Script uses `SSH_OPTS` as a bash array to prevent word-splitting on paths with spaces. The CI invocation doesn't need to worry about this; it's handled inside the script.

2. **`require_arg()` guard** — The script validates all arguments before SSH. Missing or malformed inputs return `EXIT_VALIDATION=1`. CI should never hit this if secrets are configured correctly; if it does, the label `EXIT_VALIDATION` in the summary makes the root cause obvious.

3. **`StrictHostKeyChecking=accept-new`** — First connection to a new host automatically accepts and stores the host key. No `known_hosts` pre-population needed in CI.

4. **Health check reuses `scripts/compose-instance.sh health`** — If the deployment succeeds but health fails (exit 7), check backend logs before re-running. Story 7.7 will add more resilient post-deploy checks.

5. **Test suite covers 20 test cases** (`test-deploy-remote.sh`) — These are local validation tests only, not CI tests. Story 7.6 does not run `test-deploy-remote.sh` in CI (it requires actual SSH access).

6. **Machine-readable summary line** — `DEPLOY_RESULT=success host=... instance=... ref=... env=...` is printed on success. Grep this line in CI step output to populate the run summary.

### References

- Deploy script: [scripts/deploy-remote.sh](scripts/deploy-remote.sh) — complete SSH deployment implementation
- Compose health check: [scripts/compose-instance.sh](scripts/compose-instance.sh#L35-L46) — health action used by deploy-remote.sh post-deploy
- Instance env files: [deploy/compose/stu.env](deploy/compose/stu.env), [deploy/compose/hms.env](deploy/compose/hms.env) — instance port contracts (stu: 5173/3000, hms: 5174/3001, elia: 5175/3002)
- Architecture deployment section: [docs/03-architecture.md](docs/03-architecture.md) — project structure references `.github/workflows/ci.yml`
- Infrastructure docs (to update): [docs/07-infrastructure.md](docs/07-infrastructure.md)
- Development guide (to update): [docs/08-development-guide.md](docs/08-development-guide.md)
- Changelog (to update): [docs/09-changelog.md](docs/09-changelog.md)
- Story 7.5 completion notes: [_bmad-output/implementation-artifacts/7-5-build-ssh-based-deployment-scripts-for-merge-triggered-updates.md](_bmad-output/implementation-artifacts/7-5-build-ssh-based-deployment-scripts-for-merge-triggered-updates.md)
- Epic 7 scope: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md#epic-7-deployment-architecture--cicd-automation)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
