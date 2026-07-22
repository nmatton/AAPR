# AdAPTR: A Tag-Based Recommendation Tool for Personality-Aware Agile Practice Adaptation

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express%20js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Vitest-%236E9F18?style=for-the-badge&logo=Vitest&logoColor=%23fcd703" />
</p>

Research-grade web platform for identifying and resolving agile practice friction points through team collaboration, coverage analysis, and personality-informed context.

Developed as part of a PhD research at the Université de Namur, AAPR enables teams to systematically document adoption challenges and collectively decide on agile practice adaptations.    

## Illustrations

### End-to-End Adaptation Workflow

![Summary of the AdAPTR from issue reporting, recommendation generation, adaptation adoption, and adaptation evaluation](img/workflowAdAPTR_v2.png)

Summary of the AdAPTR from issue reporting, recommendation generation, adaptation adoption, and adaptation evaluation.

### Team Dashboard and Coverage Insights

![Team dashboard showing the current practice portfolio and the agile objectives covered](img/team_dashboard.png)

Team dashboard showing the current practice portfolio and the agile objectives covered. This dashboard serves as a reference point for understanding the impact of potential adaptations on the team's process and goals.

![Team dashboard showing objective coverage impact when removing a practice](img/dashboard_objectives.jpg)

Team dashboard showing the current practice portfolio and the agile objectives covered. The dashboard also indicates which objectives would become uncovered if a specific practice were removed, supporting informed decision-making about practice adjustments.

### Issue Lifecycle Screens

![New issue creation form](img/new_issue.png)

New issue creation form.

![Issue detail page and recommendation panel](img/issue_details.png)

Issue detail page and recommendation panel.

## Repository Structure Overview

- [client](client): React 22.0 + Vite frontend (TypeScript).
- [server](server): Express + Prisma + Node.js backend (TypeScript).
- [docs](docs): As-built documentation set and documentation index.
- [deploy](deploy): Multi-instance Docker Compose environment files and deployment assets.
- [scripts](scripts): Deployment, smoke tests, and operational utility scripts.
- [_bmad](_bmad): BMAD framework runtime files.
- [_bmad-output](_bmad-output): Generated planning artifacts (PRD, architecture) and implementation tracking.

## Current Implementation Status

As of **March 2026**, the project has delivered core authentication, team management, practice catalogs, Big Five profiling, issue workflows, and affinity scoring.

- **Authoritative Status**: [_bmad-output/implementation-artifacts/sprint-status.yaml](_bmad-output/implementation-artifacts/sprint-status.yaml).
- **Project Overview**: [docs/01-project-overview.md](docs/01-project-overview.md).

## Overall Development Process

As the main purpose of the project is to provide a research-grade web platform that serves as a prototype, robust enough for scientific data collection with limited design on scalability and industrialization.

To achieve rapid results, the development process is grounded in the BMAD framework, an AI-driven agile development model. This framework facilitates the planning, implementation, and tracking of the project’s development. Each major step was developed using large language models (LLMs) and subsequently refined with human feedback.

## Tech Stack and Version Constraints

| Layer | Technology | Locked Version |
|---|---|---|
| **Frontend** | React, Vite, TailwindCSS, Zustand | React `^22.20.0`, Vite `^5.0.0` |
| **Backend** | Node.js, Express, Prisma, PostgreSQL | Node `^22.20.0` (Runtime), Prisma `^7.2.0` |
| **Testing** | Vitest (FE), Jest (BE) | |

## Prerequisites

- **Node.js**: `^22.20.0`
- **npm**: (Compatible version)
- **Docker & Docker Compose**: V2+ (Required for containerized workflows)

Quick version check:
```bash
node -v
docker --version
docker compose version
```

## Step-by-Step Local Installation

This is the fastest path to a working local environment with real seeded practice data.

### 1. Install dependencies

From the repository root:

```bash
npm run install:all
```

This installs both:
- `client/` dependencies for the React frontend
- `server/` dependencies for the Express + Prisma backend

### 2. Create local environment files

Backend configuration starts from [server/.env.example](server/.env.example).

Minimum local values:

```bash
DATABASE_URL=postgresql://aapr_user:aapr_password@localhost:5432/aapr_stu
PORT=3000
NODE_ENV=development
JWT_SECRET=replace_with_a_long_random_secret
ALLOWED_ORIGINS=http://localhost:5173
CLIENT_URL=http://localhost:5173
HONEYBADGER_API_KEY=local-dev-placeholder
HONEYBADGER_AUTH_HEADER=local-health-secret
ADMIN_API_KEY=local-admin-secret
```

Frontend configuration in `client/.env`:

```bash
VITE_API_URL=http://localhost:3000
```

### 3. Start PostgreSQL

The simplest local option is to start only the database service from the root compose file:

```bash
docker compose up -d db
```

This gives you a local PostgreSQL instance matching the `DATABASE_URL` example above.

### 4. Apply database migrations

```bash
cd server
npx prisma migrate deploy
```

### 5. Load seed data

Seed data is required if you want a usable practice catalog and a meaningful recommendations demo.

```bash
npm run db:seed
cd ..
```

The seed pipeline loads:
- categories and pillars
- practices from [docs/raw_practices/practices_reference.json](docs/raw_practices/practices_reference.json)
- tag-based recommendation reference data used by the issue adaptation flow

After seeding, open the app, create a team, and select multiple practices so the team portfolio has enough coverage to power recommendation cards.

### 6. Start the local stack

For the frontend + backend development servers:

```bash
npm run dev
```

This starts:
- frontend on `http://localhost:5173`
- backend on `http://localhost:3000`

For containerized multi-instance work, use the compose workflow described below instead of the dev servers.

### 7. Verify backend health

```bash
curl http://localhost:3000/api/v1/health
```

Expected result: a JSON payload with status `ok`.

## Quick Start - Local Development

1.  **Install dependencies** for all services:
    ```bash
    npm run install:all
    ```
2.  **Start concurrent dev servers** (client + server):
    ```bash
    npm run dev
    ```
    *Client endpoint: http://localhost:5173*
    *Backend health: http://localhost:3000/api/v1/health*

## Quick Start - Docker Compose Instance

AAPR supports multi-instance deployment using environment-specific compose files.

The main operator entrypoint for deployment work is `scripts/compose-instance.sh`. It wraps the common Docker Compose lifecycle for one instance env file and is the recommended interface for Linux shells, CI runners, and remote servers.

Supported actions:

- `up`: build and start the instance.
- `rebuild`: rebuild images without cache, then restart the instance.
- `update`: pull newer base images, rebuild, stop the stack, and start the updated stack.
- `down` / `clean`: stop the stack, optionally removing volumes.
- `ps` / `logs` / `config`: inspect the running stack and rendered Compose configuration.
- `health` / `inspect`: validate endpoints and resource wiring.
- `validate-isolation`: check cross-instance collisions before rollout.
- `stats-to-notion`: execute the backend stats export inside the running backend container.

Generic usage:

```bash
bash scripts/compose-instance.sh <action> deploy/compose/<instance>.env
```

1.  **Validate configuration** (example for `stu` instance):
    ```bash
    npm run compose:config:stu
    ```
2.  **Start the instance**:
    ```bash
    npm run compose:up:stu
    ```
3.  **Check health**:
    ```bash
    npm run compose:health:stu
    ```

Equivalent generic Bash commands:

```bash
bash scripts/compose-instance.sh config deploy/compose/stu.env
bash scripts/compose-instance.sh up deploy/compose/stu.env
bash scripts/compose-instance.sh health deploy/compose/stu.env
```

For Windows operators, the repository also provides `scripts/compose-instance.ps1` with the same action model and the npm shortcuts above call that PowerShell entrypoint.

Available instance presets: `stu`, `hms`, `elia`.

## Step-by-Step New Instance Configuration

Use this runbook when creating a new production-like instance for a research deployment, demo space, or hosted test environment.

### 1. Clone / Update the local repository

```bash
git pull
```

### 2. Prepare Honeybadger for monitoring and Notion for daily stats export (optional)

The project includes a backend runtime command to export operational stats to Notion. This is optional, but if you want to use it, you need to create the external dependencies first.

Before touching the instance env file, create the external dependencies that the runtime expects:

1. Create a project in Honeybadger for error monitoring.
2. Create a Notion page or workspace area dedicated to that instance's operational stats.
3. Create the two Notion databases used by the export script.

The repository now includes [scripts/create_notion_db.js](scripts/create_notion_db.js), a helper script that creates the two required Notion databases under a parent page and prints their IDs.

Recommended flow:

1. Ensure the `@notionhq/client` dependency is available in the environment where you run the script.
2. Run the helper with your Notion token and parent page ID:

```bash
node scripts/create_notion_db.js --notion-token ntn_xxx --parent-page-id <page_id>
```

You can also rely on environment variables instead of CLI arguments:

```bash
NOTION_API_TOKEN=ntn_xxx NOTION_PARENT_PAGE_ID=<page_id> node scripts/create_notion_db.js
```

3. Copy the generated database IDs into your instance env file as `NOTION_PLATFORM_STATS_DATABASE_ID` and `NOTION_TEAM_STATS_DATABASE_ID`.
4. Share both created databases with the same Notion integration used by the export runtime.

### 3. Copy an instance env file

Start from either:
- [deploy/compose/.env.instance.example](deploy/compose/.env.instance.example)
- one of the existing examples such as [deploy/compose/elia.env.example](deploy/compose/elia.env.example)

Create a new file named `deploy/compose/<instance>.env`.

### 4. Fill the mandatory instance variables

The compose stack requires each instance to define its own identity, ports, URLs, secrets, and service integrations.

Checklist:

- `INSTANCE_KEY`: short unique key such as `stu`, `hms`, or another deployment slug.
- `COMPOSE_PROJECT_NAME`: unique Docker Compose project name.
- `FRONTEND_IMAGE`, `BACKEND_IMAGE`, `POSTGRES_IMAGE`: image tags used for the deployment.
- `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT`, `POSTGRES_HOST_PORT`: unique host ports for isolation.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: database identity and password.
- `JWT_SECRET`: long random signing secret.
- `ADMIN_API_KEY`: admin-only API key used for stats and event export routes.
- `FRONTEND_RUNTIME_API_URL`: public API base URL exposed to the frontend container.
- `APP_BASE_URL`: public app URL used by backend-generated links.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS`: mail delivery settings.
- `HONEYBADGER_API_KEY`: required in production.
- `HONEYBADGER_AUTH_HEADER`: shared secret for protected health diagnostics.
- `APP_REVISION`: optional but recommended release identifier.
- `NOTION_API_TOKEN`, `NOTION_PLATFORM_STATS_DATABASE_ID`, `NOTION_TEAM_STATS_DATABASE_ID`: required only when enabling Notion stats export.

Example:

```env
INSTANCE_KEY=xxx
COMPOSE_PROJECT_NAME=aapr-xxx

BACKEND_IMAGE=aapr-backend:7.1
FRONTEND_IMAGE=aapr-frontend:7.1
POSTGRES_IMAGE=postgres:14

FRONTEND_HOST_PORT=517x
BACKEND_HOST_PORT=300x
POSTGRES_HOST_PORT=554x

POSTGRES_DB=aapr_stu
POSTGRES_USER=aapr_user
POSTGRES_PASSWORD=xxx
JWT_SECRET=xxx

FRONTEND_RUNTIME_API_URL=https://xxx.unamurcs.be
APP_BASE_URL=https://xxx.unamurcs.be

SMTP_HOST=mail.infomaniak.com
SMTP_PORT=587
SMTP_FROM=system@locla.be
SMTP_USER=system@locla.be
SMTP_PASS=xxx

HONEYBADGER_API_KEY=hbp_xxx
HONEYBADGER_AUTH_HEADER=xxx
NODE_ENV=production
APP_REVISION=xxx_unamurcs_4368702

ADMIN_API_KEY=xxx

NOTION_API_TOKEN=ntn_xxx
NOTION_PLATFORM_STATS_DATABASE_ID=xxx
NOTION_TEAM_STATS_DATABASE_ID=xxx
```

### 5. Validate instance isolation before first launch

Check that project names, ports, and database names do not collide with other instance profiles:

```bash
npm run compose:validate-isolation
```

### 6. Inspect the rendered compose configuration

For a new custom env file, use the generic script:

```bash
bash scripts/compose-instance.sh config deploy/compose/<instance>.env
```

The goal is to catch missing required variables before startup.

### 7. Start the instance

```bash
bash scripts/compose-instance.sh up deploy/compose/<instance>.env
```

On Windows PowerShell, the equivalent is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/compose-instance.ps1 -Action up -EnvFile deploy/compose/<instance>.env
```

### 8. Verify health and resource wiring

```bash
bash scripts/compose-instance.sh health deploy/compose/<instance>.env
bash scripts/compose-instance.sh inspect deploy/compose/<instance>.env
```

These checks confirm:
- backend health endpoint responds
- frontend is reachable
- containers, network, and volume were created under the expected instance name


### 9. Configure monitoring and admin operations

After startup:

1. Configure Honeybadger uptime checks against the public app and API endpoints.
2. Configure backup operations using [scripts/backup-db-to-ftp.sh](scripts/backup-db-to-ftp.sh) and [scripts/backup-db-to-ftp.conf.example](scripts/backup-db-to-ftp.conf.example).
3. Add a Honeybadger check-in for the backup job if you monitor scheduled backup execution.
4. If you need the dedicated admin monitoring account, use [scripts/set-admin-monitoring-account.sh](scripts/set-admin-monitoring-account.sh) once the stack is running.

### 10. Export stats to Notion

When the backend is healthy and the Notion variables are configured, run:

```bash
bash scripts/compose-instance.sh stats-to-notion deploy/compose/<instance>.env
```

This executes the backend runtime export command inside the container and pushes platform/team statistics to the configured Notion databases.

### 11. Roll out an update for an existing instance

For routine deployment updates on an already provisioned instance, prefer the script `update` action instead of manually chaining compose commands. Do not forget to pull the latest repository changes first.

```bash
git pull
bash scripts/compose-instance.sh update deploy/compose/<instance>.env
```

What this action does:

- rebuilds images with `--pull` while the current stack is still running
- stops the existing stack only after the build succeeds
- restarts the updated stack
- exits early if the build fails, leaving the currently running stack untouched

After the update, run:

```bash
bash scripts/compose-instance.sh health deploy/compose/<instance>.env
bash scripts/compose-instance.sh inspect deploy/compose/<instance>.env
```

Use `rebuild` instead of `update` when you explicitly need a no-cache rebuild:

```bash
bash scripts/compose-instance.sh rebuild deploy/compose/<instance>.env
```

## Environment and Secrets

Compose runtime depends on environment files in [deploy/compose](deploy/compose). Required variables in `docker-compose.yml` include:

- `JWT_SECRET`: Token signing key.
- `ADMIN_API_KEY`: Internal admin endpoint access.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`: Mail server configuration.
- `HONEYBADGER_API_KEY`: Error monitoring.

Reference environment contracts in [deploy/compose](deploy/compose).

## Core Scripts Reference (Root)

- `npm run install:all`: Install all client/server dependencies.
- `npm run dev`: Concurrent local development.
- `npm run compose:up:<env>`: Start a containerized instance.
- `npm run compose:health:<env>`: Verify instance health.
- `bash scripts/compose-instance.sh <action> deploy/compose/<instance>.env`: Primary Bash operator interface for config inspection, startup, update, shutdown, health checks, and instance inspection.
- `npm run deploy:remote`: Execute remote deployment (manual script-driven).
- `npm run deploy:smoke`: Run smoke tests on remote target.

## Documentation Map

- **Maintenance Index**: [docs/README.md](docs/README.md).
- **Planning Truth**:
    - [PRD](_bmad-output/planning-artifacts/prd.md)
    - [Architecture](_bmad-output/planning-artifacts/architecture.md)
- **Technical Manifest**: [VERSION_MANIFEST.md](VERSION_MANIFEST.md).

## Testing and Quality

Run quality gates locally before pushing:

- **Frontend**: `cd client && npm run test && npm run type-check`
- **Backend**: `cd server && npm run test && npm run build`

## Recommendation Workflow

The product exposes two recommendation paths. Both depend on seeded reference data and a non-empty team portfolio.

### 1. Alternative practice recommendations

Purpose: suggest up to 3 alternative practices for a practice already linked to the team.

How to trigger it:

1. Start the app and seed the database.
2. Create a team.
3. Add several practices to the team portfolio.
4. Open `Issues` for that team.
5. Create an issue linked to one or more existing team practices.
6. Open the issue detail page.

What happens:

- the UI renders one recommendation widget per linked practice
- the frontend calls `GET /api/v1/teams/:teamId/practices/:practiceId/recommendations`
- the backend compares the linked practice against the rest of the team's portfolio
- up to 3 alternative practices are shown in the issue sidebar

Current behavior: this workflow is portfolio- and affinity-aware, and is intended to support practice substitution during issue analysis.

### 2. Targeted adaptation recommendations

Purpose: suggest adaptation-oriented guidance for the problematic tags attached to an issue.

How to trigger it:

1. Open an issue detail page.
2. Ensure the issue has problematic or missing tags.
3. Wait for the targeted adaptations panel to load.

What happens:

- the frontend calls `GET /api/v1/teams/:teamId/issues/:issueId/recommendations/directed`
- the backend maps issue tags to candidate solution tags
- negative-affinity candidates are filtered out
- the UI displays recommendation text plus implementation options when available

This is the better demonstration path if you want to show actionable guidance rather than only alternative practices.

## Demo Expectations

For a smooth demo, prepare one seeded environment and one user account with at least one populated team.

Recommended demo flow:

1. Sign in and open the team dashboard.
2. Show that the team already has a portfolio of practices and visible coverage information.
3. Navigate to `Issues` and create a friction point tied to one or more practices.
4. Open the created issue and show the timeline, comments, decision area, and recommendation side panels.
5. Record a decision, then optionally move the issue toward evaluation.

What users should expect during the demo:

- recommendations do not appear on the landing page; they appear in issue detail context
- alternative practice cards only appear when the linked practice belongs to the team's portfolio and enough comparative data exists
- targeted adaptation cards only appear when issue tags are present and mapped to recommendation candidates
- empty states are normal if the team has too few practices, the issue has no tags, or seed data was not loaded
- the product is research-oriented: actions are captured for auditability and later analysis, not only for task tracking

## Contribution Workflow

1.  **Update Source-of-Truth**: If changing behavior, update the PRD, architecture, or documentation index first.
2.  **Maintain Documentation**: Follow the [Documentation Policy](docs/01-project-overview.md#documentation-policy).
3.  **Factual Claims**: Every README update must trace to `package.json`, `docker-compose.yml`, or `sprint-status.yaml`.

## Known Limitations and Roadmap

- **Immutability Principle**: Issues and events are immutable for research integrity.
- **Manual Operations**: Deployment and instance provisioning are manual script-driven (not fully CI/CD automated).
- **Roadmap**: Post-MVP goals include advanced practice visualizations.

## Citing the Project

The project is part of Nicolas Matton's PhD research at the Université de Namur. 
A publication (in press) is available for citation:
```
@inproceedings{matton2026adaptr,
  author={Matton, Nicolas and Vanderose, Benoit},
  title={A Tag-Based Recommendation Tool for Personality-Aware Agile Practice Adaptation},
  booktitle={2026 28th International Conference on Business Informatics (CBI)}, 
  year={2026},
  keywords={Design Science Research;Agile Practice Adaptation;Big Five Personality;Recommendation System;Tool Demonstration},
}
```

---
*Note: This project is part of Nicolas Matton's PhD research at the Université de Namur. contacts : nicolas.matton@unamur.be*


