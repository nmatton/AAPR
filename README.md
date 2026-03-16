# AAPR - Agile Adaptation Practice Research

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

Available instance presets: `stu`, `hms`, `elia`.

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

## Contribution Workflow

1.  **Update Source-of-Truth**: If changing behavior, update the PRD, architecture, or documentation index first.
2.  **Maintain Documentation**: Follow the [Documentation Policy](docs/01-project-overview.md#documentation-policy).
3.  **Factual Claims**: Every README update must trace to `package.json`, `docker-compose.yml`, or `sprint-status.yaml`.

## Known Limitations and Roadmap

- **Immutability Principle**: Issues and events are immutable for research integrity.
- **Manual Operations**: Deployment and instance provisioning are manual script-driven (not fully CI/CD automated).
- **Roadmap**: Post-MVP goals include advanced practice visualizations.

---
*Note: This project is part of Nicolas Matton's PhD research at the Université de Namur. contacts : nicolas.matton@unamur.be*


