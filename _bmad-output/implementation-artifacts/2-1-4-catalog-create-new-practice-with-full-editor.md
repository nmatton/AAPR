# Story 2.1.4: Catalog - Create New Practice with Full Editor

Status: done

## Story

As a team member,
I want to create a new practice from scratch in the catalog with all fields editable,
so that we can define custom practices or add ones missing from the global catalog.

## Acceptance Criteria

1. From the Practice Catalog page, clicking [+ Create New Practice] or [New Practice] opens the creation flow.
2. The creation flow offers:
   - Create from Scratch (empty form)
   - Use Existing as Template (duplicate an existing practice)
3. The full editor includes the following fields:
   - Title (text, 2-100 chars)
   - Goal/Objective (text area, 1-500 chars)
   - Detailed Description (text area, optional)
   - Pillars (multi-select checkboxes, 19 options)
   - Category (dropdown: VALEURS HUMAINES, FEEDBACK & APPRENTISSAGE, etc.)
   - Tags (comma-separated text or multi-select, optional)
   - Method/Framework (dropdown: Scrum, XP, Kanban, Lean, SAFe, Custom)
   - Benefits (text area, optional)
   - Pitfalls (text area, optional)
   - Work Products (text area, optional)
4. Required field validation blocks submit when title, goal, category, or pillar selection is missing.
5. On successful submit:
   - The practice is created as team-specific (not global).
   - The practice is added to the team portfolio.
   - Coverage % is recalculated.
   - A success message appears: “Practice created successfully”.
6. If the practice is created from a template:
   - The form is pre-filled with template values.
   - The title defaults to “{Template Title} (Copy)”.
   - The event payload includes `createdFrom`.
7. Optional fields (description, tags, method/framework, benefits, pitfalls, work products) are stored and visible when the practice is viewed.
8. An event is logged: `practice.created` with `teamId`, `practiceId`, `isCustom: true`, and `createdFrom` when applicable.

## Tasks / Subtasks

- [x] UI: Extend `CreatePracticeModal` to capture full editor fields (AC: 1-4, 6-7)
  - [x] Add inputs for description, tags, method/framework, benefits, pitfalls, work products
  - [x] Add field-level validation and disable submit when invalid
- [x] UI: Ensure new practice fields are visible in practice detail view (AC: 7)
  - [x] Update `PracticeCatalogDetail` to render optional fields when present
- [x] State/API: Expand `CreateCustomPracticePayload` and `createCustomPractice` to send full fields (AC: 5-7)
  - [x] Update `client/src/features/teams/api/teamPracticesApi.ts`
  - [x] Update `client/src/features/teams/state/managePracticesSlice.ts`
- [x] Backend: Extend create practice request validation schema (AC: 3-4)
  - [x] Update `createCustomPracticeSchema` in `teams.controller.ts`
- [x] Backend: Persist new optional fields on `Practice` creation (AC: 5-7)
  - [x] Update `createCustomPracticeForTeam` in `teams.service.ts`
  - [x] Ensure JSON fields match practice schema expectations (arrays for tags/benefits/pitfalls/workProducts)
- [x] Backend: Ensure event logging remains transactional and includes `createdFrom` (AC: 6, 8)
- [x] Tests: Add/extend unit and integration coverage (AC: 3-8)
  - [x] Frontend: `CreatePracticeModal` validation + payload tests
  - [x] Frontend: API payload shape tests (`teamPracticesApi.test.ts`)
  - [x] Backend: Controller schema validation + service create tests
- [x] Docs: Update documentation and changelog (DoD)
  - [x] docs/05-backend-api.md (payload shape for create custom practice)
  - [x] docs/06-frontend.md (full editor fields)
  - [x] docs/09-changelog.md (story completion)

## Dev Notes

### Key Implementation Context

- The create flow is already wired in `CreatePracticeModal`, `managePracticesSlice`, and `createCustomPracticeForTeam`. Extend these to cover all optional fields.
- The `Practice` Prisma model already includes fields for `description`, `method`, `tags`, `benefits`, `pitfalls`, and `workProducts`. No schema change should be required.
- Create remains team-specific (`isGlobal: false`) and must link the practice to the team in the same transaction.
- Validation must continue to emit structured errors `{ code, message, details?, requestId }` and include `requestId` in all responses.
- Maintain strict TypeScript and relative imports (no path aliases).

### API Contract (Create Custom Practice)

Endpoint: `POST /api/v1/teams/:teamId/practices/custom`

Payload (extend existing):
- `title` (required)
- `goal` (required)
- `categoryId` (required)
- `pillarIds` (required)
- `description` (optional)
- `method` (optional)
- `tags` (optional array of strings)
- `benefits` (optional array of strings)
- `pitfalls` (optional array of strings)
- `workProducts` (optional array of strings)
- `templatePracticeId` (optional)

### Data Mapping Guidance

- Store `tags`, `benefits`, `pitfalls`, and `workProducts` as arrays in JSON fields to align with the practice import schema.
- Prefer trimming and normalizing inputs (e.g., split comma-separated tags, remove empty values).

### Project Structure Targets

Frontend (feature-first):
- `CreatePracticeModal` in client/src/features/teams/components
- API client in client/src/features/teams/api
- Store in client/src/features/teams/state

Backend (layered):
- Route in server/src/routes/teams.routes.ts
- Controller in server/src/controllers/teams.controller.ts
- Service logic in server/src/services/teams.service.ts
- Repository calls in server/src/repositories/practice.repository.ts

### Guardrails (Non-Negotiable)

- Team isolation on all team-scoped routes (`validateTeamMembership` middleware).
- Transactional event logging in the same DB transaction as practice creation.
- No path aliases; use relative imports.
- Keep TypeScript `strict: true`.

### UX Expectations

- Desktop-only UI; use clear inline validation errors.
- Use skeletons/spinners for submission; disable submit during create.
- Keep modal UX consistent with existing components (calm colors, minimal noise).

### Previous Story Intelligence (2.1.3)

- Recent changes standardized optimistic locking and transactional event logging; follow the same error handling patterns and structured response format.
- Tests exist for practice editing and team flows; mirror test structure and naming conventions.

### Git Intelligence Summary (Recent Commits)

Recent work touched `ManagePracticesView`, `PracticeEditForm`, and practice API routes—extend those patterns rather than introducing new abstractions.

### References

- Epic & story definitions: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md)
- Project constraints and versions: [_bmad-output/project-context.md](_bmad-output/project-context.md)
- Practice schema fields: [server/prisma/schema.prisma](server/prisma/schema.prisma)
- Create practice UI: [client/src/features/teams/components/CreatePracticeModal.tsx](client/src/features/teams/components/CreatePracticeModal.tsx)
- Create practice API client: [client/src/features/teams/api/teamPracticesApi.ts](client/src/features/teams/api/teamPracticesApi.ts)
- Create practice controller: [server/src/controllers/teams.controller.ts](server/src/controllers/teams.controller.ts)
- Create practice service: [server/src/services/teams.service.ts](server/src/services/teams.service.ts)
- Practice import schema reference: [server/src/schemas/practice.schema.ts](server/src/schemas/practice.schema.ts)

## Dev Agent Record

### Agent Model Used

GPT-5.2-Codex

### Debug Log References

- Source context: epics, architecture, UX spec, project-context
- Prior story: 2-1-3-team-name-inline-editing

### Completion Notes List

- Implemented full custom practice editor fields and payload normalization across UI/API.
- Practice detail sidebar now renders optional fields when present.
- Backend validation and persistence updated for optional fields (JSON arrays) with transactional event logging intact.
- Tests: server `npm test`; client `npm test`.

### File List

- _bmad-output/implementation-artifacts/2-1-4-catalog-create-new-practice-with-full-editor.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- client/src/App.test.tsx
- client/src/features/practices/components/PracticeCatalogDetail.tsx
- client/src/features/practices/types/index.ts
- client/src/features/teams/api/teamPracticesApi.ts
- client/src/features/teams/api/teamPracticesApi.test.ts
- client/src/features/teams/components/CreatePracticeModal.tsx
- client/src/features/teams/components/CreatePracticeModal.test.tsx
- client/src/features/teams/state/invitesSlice.test.ts
- client/src/features/teams/types/practice.types.ts
- docs/05-backend-api.md
- docs/06-frontend.md
- docs/09-changelog.md
- server/src/controllers/teams.controller.ts
- server/src/controllers/teams.controller.test.ts
- server/src/services/practices.service.ts
- server/src/services/practices.service.test.ts
- server/src/services/teams.service.ts
- server/src/services/teams.service.test.ts

## Change Log

- 2026-01-23: Implemented full custom practice editor fields, payload expansion, backend persistence, and documentation updates.
