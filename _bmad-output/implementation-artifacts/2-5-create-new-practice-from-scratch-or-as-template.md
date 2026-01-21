# Story 2.5: Create New Practice from Scratch or as Template

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **create a new practice either from scratch or by duplicating an existing practice**,
so that **we can adapt or define practices specific to our team's needs**.

## Acceptance Criteria

1. **Entry point with two creation paths**
   - Given I'm on the Team Dashboard or Practice list
   - When I click [Create New Practice] or [+ New Practice]
   - Then I see two options:
     1. [Create from Scratch] - Start with empty form
     2. [Use Existing as Template] - Duplicate an existing practice

2. **Create from scratch form fields**
   - Given I select [Create from Scratch]
   - When the form opens
   - Then I see editable fields: title, goal/objective, pillars to cover (multi-select), category

3. **Create from scratch success**
   - Given I'm creating a practice from scratch
   - When I fill in the form (title, goal, select pillars)
   - Then I can click [Create Practice]
   - And the practice is created and added to our team's portfolio
   - And a success message: "New practice created: [Practice Name]"

4. **Template selection flow**
   - Given I select [Use Existing as Template]
   - When the dialog opens
   - Then I see a list of all practices (team + catalog practices)
   - And I can select one to duplicate

5. **Template form pre-fill**
   - Given I've selected a practice to duplicate
   - When I click [Duplicate]
   - Then the form opens with the selected practice's data pre-filled
   - And the title shows: "[Original Name] (Copy)"
   - And I can edit any field before creating

6. **Template-based creation success**
   - Given I've edited the duplicated practice
   - When I click [Create Practice]
   - Then the new practice is created with my edits
   - And an event is logged: `{ action: "practice.created", teamId, practiceId, createdFrom: "original_practice_id", timestamp }`

7. **Validation errors**
   - Given I'm creating a practice from scratch
   - When I don't fill in required fields (title, at least one pillar)
   - Then I see validation errors: "Title is required", "Select at least one pillar"
   - And I can't click [Create Practice]

8. **Team-specific scope + coverage update**
   - Given I've created a new practice
   - When the creation completes
   - Then the practice is added to my team's portfolio (not the global catalog)
   - And coverage % is recalculated
   - And an event is logged: `{ action: "practice.created", teamId, practiceId, isCustom: true, timestamp }`

## Tasks / Subtasks

### Task 1: Backend - Create custom practice endpoint (AC: 1-8)
- [x] Add **POST /api/v1/teams/:teamId/practices/custom**
  - Purpose: create a team-specific practice (isGlobal=false) and add to team portfolio
  - Auth: `requireAuth` + `validateTeamMembership`
  - Request body (scratch): `{ title, goal, pillarIds: number[], categoryId }`
  - Request body (template): `{ title, goal, pillarIds, categoryId, templatePracticeId }`
  - Validate required fields + title length (2-100) + goal length (1-500)
  - Validate pillar IDs exist (reuse validation used for search/filter)
  - Validate `categoryId` exists
  - Enforce unique constraint on `(title, categoryId)` with friendly error
  - Transaction: create Practice + PracticePillar rows + TeamPractice link + log event `practice.created`
  - After transaction: recalc coverage via `calculateTeamCoverage(teamId)`
  - Response: `{ practiceId, coverage, requestId }`
  - Structured errors: `{ code, message, details?, requestId }`

### Task 2: Backend - Service/repository updates (AC: 1-8)
- [x] Service: `createCustomPracticeForTeam(teamId, userId, payload)`
  - Derive `isGlobal=false`, set `createdFrom` in event payload when template used
  - If template selected, ensure `templatePracticeId` exists (404 if not found)
  - Add PracticePillar records (one per pillarId)
  - Wrap all mutations + event in `prisma.$transaction`
- [x] Repository: add data access helpers
  - `createPractice` (with isGlobal=false)
  - `createPracticePillars` (bulk insert)
  - `linkPracticeToTeam` (TeamPractice)
  - `findPracticeById` (template validation)

### Task 3: Frontend - Create practice UI (AC: 1-8)
- [x] Add "Create New Practice" entry point on Team Dashboard or ManagePracticesView
- [x] Build `CreatePracticeModal` (or page) with two-mode flow:
  - Mode A: Scratch (empty fields)
  - Mode B: Template (select practice → prefill fields)
- [x] Prefill logic: append "(Copy)" to title by default
- [x] Validation UX:
  - Title required + 2-100 chars
  - Goal required + 1-500 chars
  - At least one pillar selected
- [x] Success state: toast + close modal + refresh team practices + coverage
- [x] Error state: inline error banner, keep form state

### Task 4: Frontend - State and API integration (AC: 1-8)
- [x] Add API client function: `createCustomPractice(teamId, payload)`
- [x] Add Zustand slice (practices/teams):
  - `createPractice` action with loading/error states
  - Update team practice list + coverage from response
- [x] Reuse existing practice catalog fetch for template selection list

### Task 5: Testing (AC: 1-8)
- [x] Backend route tests:
  - POST creates practice, links to team, returns coverage
  - POST with invalid pillarId returns 400
  - POST with duplicate title+category returns 409
  - POST with templatePracticeId not found returns 404
- [x] Backend service tests:
  - Transaction writes practice + pillars + team link + event
  - Event payload includes `createdFrom` when template used
  - isGlobal=false for team-created practices
- [x] Frontend tests:
  - Modal shows two creation options
  - Template flow pre-fills fields and appends "(Copy)"
  - Validation errors block submit
  - Success refreshes practice list + coverage

### Task 6: Documentation updates (Required)
- [x] docs/05-backend-api.md: add POST custom practice endpoint
- [x] docs/06-frontend.md: describe CreatePracticeModal flow
- [x] docs/09-changelog.md: add Story 2.5 entry
- [x] Update "Last Updated" in modified docs

## Dev Notes

### Developer Context Section

This story adds **team-specific practice creation**, distinct from the global catalog. The new practice must be **isGlobal=false** and automatically added to the team's portfolio with coverage recalculation. Template-based creation should reuse existing practice data without mutating the original.

### Technical Requirements

**Endpoint (New):**
- `POST /api/v1/teams/:teamId/practices/custom`
  - Creates a new team-specific practice
  - Uses Prisma transaction for practice + pillar links + team link + event log
  - Validates `title`, `goal`, `pillarIds`, `categoryId`, and optional `templatePracticeId`
  - Returns updated coverage and created practice ID

**Data rules:**
- Practice is **team-specific**: `is_global = false`
- Must link created practice to team via `team_practices`
- Must create `practice_pillars` relations using provided `pillarIds`
- Unique constraint on `(title, categoryId)` must be respected; show friendly validation error

**Event logging:**
- `eventType: 'practice.created'`
- payload: `{ teamId, practiceId, isCustom: true, createdFrom?: templatePracticeId }`
- Must be written in the same transaction as practice creation

**Coverage update:**
- Recalculate with existing `calculateTeamCoverage(teamId)` and return updated coverage

### Architecture Compliance

- Express route layering: routes → controllers → services → repositories
- Team isolation: `requireAuth` + `validateTeamMembership` on team-scoped routes
- Structured errors: `{ code, message, details?, requestId }`
- Prisma mappings: snake_case DB ↔ camelCase API (no leakage)

### Library / Framework Requirements

- React 18.2 + TypeScript strict + TailwindCSS + Zustand (frontend)
- Express 4.18 + Prisma 7.2 + PostgreSQL 14+ (backend)
- Use Prisma `prisma.$transaction(...)` for atomic create (per Prisma docs)
- No new dependencies required

### File Structure Requirements

- Backend: add route in `server/src/routes/teams.routes.ts`, controller in `server/src/controllers/teams.controller.ts`, service in `server/src/services/teams.service.ts`, repository in `server/src/repositories/practice.repository.ts`
- Frontend: feature-first placement under `client/src/features/teams/` or `client/src/features/practices/`
- No path aliases; use relative imports

### Testing Requirements

- Backend Jest tests for route + service (co-located)
- Frontend Vitest tests for modal flow + validation
- Validate duplicate-title constraint handling and structured error output

### Previous Story Intelligence

From Story 2.4:
- Reuse `ManagePracticesView` entry points and `PracticeCard` UI patterns
- Use existing API client patterns from `teamPracticesApi.ts`
- Use Zustand slice pattern with initialState factory + reset
- Transactional event logging and coverage recalculation patterns already established
- Avoid client-side calculations for coverage or pillar impact

### Git Intelligence Summary

Recent commits show established patterns:
- `feat: add practice removal impact preview and modal`
- `feat: implement remove practices from team portfolio functionality`
- `feat: complete Story 2.3 - finalize Add Selected Practices`

Patterns to follow:
- Co-located tests
- Transactional event logging in services
- Structured errors with requestId
- Feature-first UI structure

### Latest Tech Information

- Prisma transactions: use `prisma.$transaction` for atomic multi-step writes (Prisma docs, v6.19)
- No version upgrades required; follow locked versions in project context

### Project Context Reference

**Critical Rules:**
- ✅ Team isolation: EVERY query filters by `teamId`
- ✅ Event logging: ALL mutations wrapped in transactions
- ✅ Error format: Structured `{code, message, details?, requestId}`
- ✅ TypeScript strict: No `any`, no implicit types
- ✅ Documentation updates: MANDATORY for every story

### Common Mistakes to Avoid

❌ Creating global practices for team-specific entries (`is_global` must be false)
❌ Forgetting to link practice to team portfolio
❌ Skipping PracticePillar creation (coverage will be wrong)
❌ Not handling unique constraint on title+category
❌ Logging event outside the transaction
❌ Using client-side coverage calculation

### References

- Epic story definition: `_bmad-output/planning-artifacts/epics.md` (Story 2.5)
- Practice schema: `server/prisma/schema.prisma` (Practice, PracticePillar, TeamPractice)
- Practices routes: `server/src/routes/teams.routes.ts`
- Practices service patterns: `server/src/services/teams.service.ts`
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-4-remove-practices-from-team-portfolio.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2-Codex (GitHub Copilot)

### Debug Log References

- Sprint status: Story 2-5 selected from backlog
- Epics source: `_bmad-output/planning-artifacts/epics.md`
- Previous story intelligence: `_bmad-output/implementation-artifacts/2-4-remove-practices-from-team-portfolio.md`
- Prisma transaction guidance: Context7 Prisma docs (transactions)
- Tests: `npm test` (server) and `npm test` (client)

### Completion Notes List

**Story Creation Complete:**
- ✅ Acceptance criteria extracted from epics
- ✅ Full backend/frontend task breakdown
- ✅ Architecture compliance and constraints
- ✅ Previous story intelligence and reuse hints
- ✅ Git patterns captured
- ✅ Project context rules integrated
- ✅ Ready-for-dev status set

**Implementation Complete:**
- ✅ Added POST `/api/v1/teams/:teamId/practices/custom` with validation, transactional event logging, and coverage recalculation
- ✅ Added repository helpers for custom practice creation and template validation
- ✅ Implemented CreatePracticeModal flow with scratch/template modes, validation, and success refresh
- ✅ Added create practice state + API integration in teams store
- ✅ Added backend and frontend tests; all tests passing

**Code Review Fixes Applied (2026-01-21):**
- ✅ Fixed unique constraint error handling to verify specific field targets (P2002 with title+category check)
- ✅ Updated createPractice action to refresh team practices list after creation (fixes stale UI)
- ✅ Memoized form validation to prevent 5x re-runs per keystroke (performance optimization)
- ✅ Grouped pillars by category in form for better UX (Process, People, Quality, Technical)
- ✅ Verified template not found (404) test exists and passes (line 267-290 in test file)
- ✅ Verified entry point integration in ManagePracticesView (Create New Practice button)
- ✅ All 21 backend tests passing, 3 frontend tests passing

### File List

**Modified/Added Files:**
- `server/src/routes/teams.routes.ts`
- `server/src/controllers/teams.controller.ts`
- `server/src/services/teams.service.ts`
- `server/src/repositories/practice.repository.ts`
- `server/src/routes/teams.practices.routes.test.ts`
- `server/src/services/teams.service.test.ts`
- `client/src/features/teams/api/teamPracticesApi.ts`
- `client/src/features/teams/api/teamPracticesApi.test.ts`
- `client/src/features/teams/state/managePracticesSlice.ts`
- `client/src/features/teams/components/CreatePracticeModal.tsx`
- `client/src/features/teams/components/CreatePracticeModal.test.tsx`
- `client/src/features/teams/pages/ManagePracticesView.tsx`
- `client/src/features/teams/pages/ManagePracticesView.test.tsx`
- `docs/05-backend-api.md`
- `docs/06-frontend.md`
- `docs/09-changelog.md`
- `_bmad-output/implementation-artifacts/2-5-create-new-practice-from-scratch-or-as-template.md`

### Change Log

- 2026-01-21: Implemented Story 2.5 custom practice creation flow across backend, frontend, tests, and docs.
