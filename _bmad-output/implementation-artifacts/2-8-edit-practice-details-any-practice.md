# Story 2.8: Edit Practice Details (Any Practice)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **edit any practice's details including title, goal, pillars, and category**,
So that **we can adapt practices to our team's context or fix outdated information**.

## Acceptance Criteria

1. **Edit access from any practice view**
   - Given I'm viewing a practice (catalog, team practice list, or practice detail)
   - When I see the practice
   - Then there's an [Edit] button or action menu item

2. **Pre-populated edit form**
   - Given I click [Edit]
   - When the edit form opens
   - Then all editable fields are pre-filled:
     - Title (text field, 2-100 chars)
     - Goal/objective (text area, 1-500 chars)
     - Pillars covered (multi-select, 19 options)
     - Category (dropdown: VALEURS HUMAINES, FEEDBACK & APPRENTISSAGE, EXCELLENCE TECHNIQUE, ORGANISATION & AUTONOMIE, FLUX & RAPIDITÉ)

3. **Real-time feedback while editing**
   - Given I'm editing a practice
   - When I change the title
   - Then I see a character count (e.g., "85/100")
   - And changes are captured in real-time

4. **Goal/objective editing UX**
   - Given I'm editing a practice
   - When I modify the goal/objective
   - Then the text area expands as I type
   - And I see a character count (e.g., "250/500")

5. **Pillar selection feedback**
   - Given I'm editing pillars
   - When I check/uncheck pillars
   - Then the selection updates immediately
   - And I see: "X pillars selected"

6. **Save updates with coverage refresh**
   - Given I've made changes
   - When I click [Save Changes]
   - Then the practice is updated
   - And I see a success message: "Practice updated successfully"
   - And if this practice is in our team's portfolio, coverage is recalculated

7. **Coverage impact when pillars change**
   - Given I'm editing a practice used by our team
   - When I change the pillars covered
   - Then after saving, team coverage % updates
   - And gap/covered pillar lists update

8. **Event logging**
   - Given I edit a practice
   - When the update completes
   - Then an event is logged:
     `{ action: "practice.edited", teamId, practiceId, editedBy: userId, changes: { field: oldValue → newValue }, timestamp }`

9. **Validation errors block save**
   - Given I'm editing a practice
   - When I remove required fields (e.g., title)
   - Then I see validation errors
   - And I can't save until validation passes

10. **Optimistic locking conflict**
   - Given another teammate edits the same practice simultaneously
   - When I try to save stale changes
   - Then the API returns 409 Conflict with version details
   - And I see: "This practice was updated by another team member. [Refresh] to see changes"

11. **Unsaved changes warning**
   - Given I made changes and haven't saved
   - When I try to navigate away
   - Then I see: "You have unsaved changes. Leave anyway?"
   - And I can [Stay] or [Leave without saving]

12. **Global practice edit warning**
   - Given I'm editing a global practice used by multiple teams
   - When I save changes
   - Then I see a warning before saving: "This will affect X teams using this practice"

13. **Team-specific copy option**
   - Given I want to avoid changing other teams' practices
   - When I edit a global practice
   - Then I can choose: [Save as Team-Specific Copy]
   - And this creates a custom practice for our team only
   - And the original practice remains unchanged

14. **Cancel editing**
   - Given I'm editing a practice
   - When I click [Cancel]
   - Then all changes are discarded
   - And I return to the previous view

## Tasks / Subtasks

### Task 1: Backend - Practice edit endpoint (AC: 1-10, 12-13)
- [x] Add **PATCH /api/v1/teams/:teamId/practices/:practiceId**
  - Auth: `requireAuth` + `validateTeamMembership`
  - Body: `{ title, goal, pillarIds, categoryId, saveAsCopy?: boolean, version }`
  - If `saveAsCopy=true`:
    - Create new `Practice` with `isGlobal=false` and copied fields (use `templatePracticeId` pattern)
    - Insert `practice_pillars` for new practice
    - Ensure team has this practice in `team_practices` (upsert)
    - Return new practiceId and updated coverage
  - If `saveAsCopy=false`:
    - Use optimistic concurrency via `practiceVersion` match
    - Update practice fields + increment `practiceVersion`
    - Update `practice_pillars` join rows (replace set)
    - Return updated practice + coverage for affected teams
  - Error handling: 400 validation, 404 not found, 409 version conflict

### Task 2: Backend - Coverage refresh + event logging (AC: 6-8)
- [x] If practice is used by team(s), recalc coverage for each affected team
  - Query distinct `teamId` from `team_practices` for this `practiceId`
  - Reuse existing coverage service (Story 2.6/2.7)
- [x] Log `practice.edited` event with `changes` diff summary
  - Include `teamId`, `practiceId`, `editedBy`, `timestamp`
  - Use transaction if editing global practice to keep changes consistent

### Task 3: Frontend - Edit form + unsaved changes (AC: 1-6, 9, 11, 14)
- [x] Add edit affordance in catalog, manage practices list, and practice detail
- [x] Build `PracticeEditForm` (or modal/slide-over)
  - Pre-fill fields
  - Title/goal counters, auto-expand textarea
  - Pillar multiselect + category dropdown
  - Client validation (lengths, required fields)
- [x] Unsaved change guard on navigation
  - Prompt on route change and on close

### Task 4: Frontend - Global warning + team-specific copy (AC: 12-13)
- [x] Show warning when editing a global practice with multiple teams
  - Display `usedByTeamsCount` from API in confirmation dialog
- [x] Add [Save as Team-Specific Copy] action
  - Call `saveAsCopy=true` flow
  - Ensure team practice list and coverage update

### Task 5: Frontend - Optimistic conflict handling (AC: 10)
- [x] Display conflict banner on 409 responses
  - Offer [Refresh] action to reload practice details

### Task 6: Testing (AC: 1-14)
- [x] Backend tests:
  - Patch updates practice fields and `practice_pillars`
  - 409 conflict when `practiceVersion` mismatches
  - Save-as-copy creates non-global practice and links team
  - Event log contains `practice.edited` with change diff
  - Coverage recalculated for affected teams
- [x] Frontend tests:
  - Edit button opens pre-filled form
  - Validation blocks save
  - Unsaved changes prompt fires on navigation
  - Global warning shown when `usedByTeamsCount > 1`
  - Save-as-copy path updates list and coverage

### Task 7: Documentation updates (Required)
- [x] docs/05-backend-api.md: document PATCH edit endpoint and payload
- [x] docs/06-frontend.md: document PracticeEditForm UX and warning flow
- [x] docs/09-changelog.md: add Story 2.8 entry
- [x] Update "Last Updated" in modified docs

## Dev Notes

### Developer Context Section
This story enables editing any practice (global or team-specific) with strong guardrails. The key complexity is **global vs team-specific** editing and **optimistic concurrency**. Global edits affect all teams using the practice; therefore we must show a warning and optionally create a team-specific copy. When pillars change, coverage must be recalculated for affected teams.

### Technical Requirements

**Endpoints (New):**
- `PATCH /api/v1/teams/:teamId/practices/:practiceId`
  - Purpose: edit practice details (title, goal, pillars, category)
  - Auth: `requireAuth` + `validateTeamMembership`
  - Body:
    ```json
    {
      "title": "...",
      "goal": "...",
      "pillarIds": [1, 2, 3],
      "categoryId": "technical_excellence",
      "saveAsCopy": false,
      "version": 3
    }
    ```
  - Response (edit): `{ practice, coverage, requestId }`
  - Response (saveAsCopy): `{ practiceId, coverage, requestId }`

**Optimistic Concurrency:**
- Use `practiceVersion` field for OCC
- Update pattern: `updateMany` with `where: { id, practiceVersion }` and `data: { practiceVersion: { increment: 1 } }`
- 0 rows affected → return 409 Conflict
- Prisma supports non-unique where for updates (Prisma 5+)

**Global vs Team-Specific Behavior:**
- If `isGlobal=true` and `saveAsCopy=false`: edit in place and warn about affected teams
- If `saveAsCopy=true`: create new practice with `isGlobal=false`, copy fields, create `practice_pillars`, and attach to team
- For practices not currently in team, `saveAsCopy=true` should also add to team portfolio

**Coverage Recalculation:**
- Recalculate coverage for all teams using edited practice
- Reuse coverage service (Story 2.6/2.7)

**Event Logging:**
- Log `practice.edited` with change diff
- Include `teamId`, `practiceId`, `editedBy`, `timestamp`

### Architecture Compliance
- Backend layering: routes → controllers → services → repositories
- Team isolation: all edits must be team-scoped (team membership required)
- Structured errors: `{ code, message, details?, requestId }`
- Prisma mappings: snake_case DB ↔ camelCase API (never leak DB columns)

### Library / Framework Requirements
- React 18.2 + TypeScript strict + TailwindCSS + Zustand
- Express 4.18 + Prisma 7.2 + PostgreSQL 14+
- No new dependencies required

### File Structure Requirements
- Backend: add new handler in `server/src/routes/teams.routes.ts`
- Backend: create controller/service/repository functions in `server/src/controllers/teams.controller.ts`, `server/src/services/teams.service.ts`, `server/src/repositories/practices.repository.ts` (or existing practice repo)
- Frontend: add edit UI in `client/src/features/teams/pages/ManagePracticesView.tsx` and/or practice catalog detail
- Frontend: new form component under `client/src/features/teams/components/PracticeEditForm.tsx`
- Frontend: update API client in `client/src/features/teams/api/teamPracticesApi.ts`
- No path aliases; use relative imports

### Testing Requirements
- Backend Jest tests co-located with practice services/repo
- Frontend Vitest tests co-located with new form component
- Validate OCC conflict path and save-as-copy
- Validate coverage refresh after edit

### Previous Story Intelligence
- Story 2.7 introduced category coverage and coverage refresh patterns
- Story 2.6 provides coverage service; reuse it for recalculation
- Story 2.5 already supports creating a custom practice (team-specific) via `POST /api/v1/teams/:teamId/practices/custom`
- Story 2.3/2.4 established team practice add/remove flows and coverage refresh

### Git Intelligence Summary
Recent commits indicate patterns to follow:
- `feat: implement category coverage breakdown feature`
- `feat: add team pillar coverage feature with API, components, and state management`
- `feat: implement custom practice creation from scratch or template`
- `feat: add practice removal impact preview and modal`

### Latest Tech Information
- Prisma OCC uses a version field in the `where` clause; `updateMany` with `practiceVersion` guards prevents stale updates
- Prisma 5+ supports non-unique field filtering on update for OCC, so this is safe on the current stack

### Project Context Reference
**Critical Rules:**
- ✅ Team isolation on every query and mutation
- ✅ Event logging for DB-affecting changes
- ✅ Structured errors with `requestId`
- ✅ TypeScript strict mode
- ✅ Documentation updates are mandatory

### Common Mistakes to Avoid
- ❌ Editing global practices without warning about team impact
- ❌ Forgetting to update `practice_pillars` after edit
- ❌ Skipping OCC version checks (silent overwrites)
- ❌ Not recalculating coverage for affected teams
- ❌ Returning unstructured errors

### References
- Epic story definition: `_bmad-output/planning-artifacts/epics.md` (Story 2.8)
- Architecture rules: `_bmad-output/planning-artifacts/architecture.md`
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-7-view-team-coverage-by-category.md`
- Prisma OCC docs: Prisma Transactions → Optimistic Concurrency Control

## Dev Agent Record

### Agent Model Used

GPT-5.2-Codex (GitHub Copilot)

### Debug Log References

- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml` (story 2-8 selected)
- Epics source: `_bmad-output/planning-artifacts/epics.md`
- Architecture source: `_bmad-output/planning-artifacts/architecture.md`
- UX source: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-7-view-team-coverage-by-category.md`
- Git log: `git log -5 --oneline`
- Prisma OCC: /prisma/docs (transactions / optimistic concurrency control)

### Completion Notes List

**Story Creation Complete:**
- ✅ Acceptance criteria extracted from epics
- ✅ Backend/frontend tasks and coverage impact identified
- ✅ OCC and global vs team-specific rules captured
- ✅ Coverage recalculation and event logging included
- ✅ Project context rules integrated
- ✅ Ready-for-dev status set

**Implementation Complete:**
- ✅ Backend PATCH edit endpoint with OCC, save-as-copy, event logging, and coverage refresh
- ✅ Frontend edit modal with validation, unsaved changes guard, warnings, and conflict handling
- ✅ Tests added/updated for server and client flows
- ✅ Docs updated (backend API, frontend UX, changelog)
- ✅ Tests: server `npm test`; client `npm test` (all passing)
- ✅ **Code Review Complete (Jan 22, 2026):**
  - Fixed: Save-as-copy now returns full practice object for frontend updates
  - Fixed: Refresh action now prompts for unsaved changes confirmation
  - Improved: Coverage recalc error handling to prevent API failures
  - Updated: Documentation dates refreshed to Jan 22, 2026
  - Tests: 151 server tests passing, 140 client tests passing

### File List

**Files Created:**
- `_bmad-output/implementation-artifacts/2-8-edit-practice-details-any-practice.md`
- `client/src/features/teams/components/PracticeEditForm.tsx`
- `client/src/features/teams/components/PracticeEditForm.test.tsx`

**Files Updated:**
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `client/src/App.test.tsx`
- `client/src/features/practices/components/PracticeCard.tsx`
- `client/src/features/practices/components/PracticeCatalogDetail.tsx`
- `client/src/features/practices/pages/PracticeCatalog.tsx`
- `client/src/features/practices/types/index.ts`
- `client/src/features/teams/api/teamPracticesApi.test.ts`
- `client/src/features/teams/api/teamPracticesApi.ts`
- `client/src/features/teams/pages/ManagePracticesView.tsx`
- `client/src/features/teams/state/managePracticesSlice.ts`
- `client/src/features/teams/types/practice.types.ts`
- `docs/05-backend-api.md`
- `docs/06-frontend.md`
- `docs/09-changelog.md`
- `server/src/controllers/teams.controller.ts`
- `server/src/repositories/practice.repository.ts`
- `server/src/repositories/teams.repository.ts`
- `server/src/routes/teams.coverage.routes.test.ts`
- `server/src/routes/teams.practices.routes.test.ts`
- `server/src/routes/teams.routes.ts`
- `server/src/services/practices.service.test.ts`
- `server/src/services/practices.service.ts`
- `server/src/services/teams.service.test.ts`
- `server/src/services/teams.service.ts`
