# Story 2.6: View Team Coverage at Pillar Level

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **see what percentage of agile pillars our team covers**,
so that **we know if we're missing important principles**.

## Acceptance Criteria

1. **Coverage summary display**
   - Given I'm on the Team Dashboard
   - When I view the Coverage section
   - Then I see: "Coverage: X/19 pillars (Y%)" with a visual progress bar

2. **Correct calculation**
   - Given my team has selected 3 practices
   - When I view the coverage
   - Then the coverage % is correctly calculated based on pillar mapping (e.g., 14/19 = 74%)

3. **Pillar breakdown sections**
   - Given I'm viewing coverage
   - When I see the pillar breakdown
   - Then I see two sections: "Covered Pillars" (green) and "Gap Pillars" (gray)
   - And each pillar is listed with its name and a badge showing if it's covered

4. **Covered pillar interaction**
   - Given the Covered Pillars section is displayed
   - When I click on a pillar name
   - Then I see which practices cover that pillar
   - And a brief description of what that pillar means

5. **Gap pillar interaction**
   - Given the Gap Pillars section is displayed
   - When I click on a gap pillar
   - Then I see a suggestion: "Practices that cover this pillar" with a list of available practices
   - And I can click [Add] to quickly add one

6. **Real-time updates**
   - Given coverage is calculated
   - When I add a new practice to the team
   - Then the coverage % updates instantly (no page refresh needed)
   - And the pillar breakdown updates immediately

7. **Event logging**
   - Given I'm viewing coverage
   - When the calculation completes
   - Then an event is logged: `{ action: "coverage.calculated", teamId, coveragePercent, coveredPillars, timestamp }`

## Tasks / Subtasks

### Task 1: Backend - Create coverage calculation endpoint (AC: 1-3, 7)
- [x] Add **GET /api/v1/teams/:teamId/coverage/pillars**
  - Purpose: calculate and return pillar-level coverage for a team
  - Auth: `requireAuth` + `validateTeamMembership`
  - Query team's practices via TeamPractice + Practice joins
  - Load pillars for each practice (PracticePillar)
  - Calculate covered pillars (unique pillar IDs from all team practices)
  - Calculate gap pillars (all 19 pillars - covered pillars)
  - Return: `{ overallCoveragePct: number, coveredCount: number, totalCount: 19, coveredPillars: Pillar[], gapPillars: Pillar[], requestId }`
  - Log event `coverage.calculated` (non-transactional, informational)
  - Structured errors: `{ code, message, details?, requestId }`

### Task 2: Backend - Service/repository for coverage logic (AC: 1-3, 7)
- [x] Service: `getTeamPillarCoverage(teamId)`
  - Fetch team practices with pillar relations
  - Extract unique pillar IDs from practices
  - Fetch all 19 pillars from database
  - Split into covered vs gap pillars
  - Calculate percentage: `(coveredCount / 19) * 100`
  - Log event: `{ eventType: 'coverage.calculated', teamId, payload: { coveragePercent, coveredCount } }`
  - Return structured coverage object
- [x] Repository: add data access helpers
  - `findTeamPracticesWithPillars(teamId)` - join TeamPractice + Practice + PracticePillar + Pillar
  - `findAllPillars()` - fetch all 19 pillars (cacheable)
  - Optimize with single query + includes (no N+1)

### Task 3: Frontend - Coverage display UI (AC: 1-6)
- [x] Build `TeamCoverageCard` component
  - Displays: "Coverage: X/19 pillars (Y%)"
  - Progress bar with percentage
  - Two sections: Covered Pillars (green badges) and Gap Pillars (gray badges)
- [x] Build `PillarDetailModal` or expandable section
  - Displays pillar name + description
  - Lists practices covering that pillar (for covered pillars)
  - Suggests practices to add (for gap pillars) with [Add] button
- [x] Handle pillar click interactions
  - Covered pillar → show practices covering it
  - Gap pillar → show practices that could cover it
- [x] Real-time update mechanism
  - Re-fetch coverage when practices change (add/remove)
  - Update UI without page reload

### Task 4: Frontend - State and API integration (AC: 1-6)
- [x] Add API client function: `getTeamPillarCoverage(teamId)`
- [x] Add Zustand slice (teams or coverage):
  - `fetchPillarCoverage` action with loading/error states
  - Store coverage data: `{ overallCoveragePct, coveredCount, totalCount, coveredPillars, gapPillars }`
  - Expose action to refresh coverage (called after practice add/remove)
- [x] Integrate with Team Dashboard page
  - Display TeamCoverageCard with coverage data
  - Trigger coverage fetch on mount and after practice changes

### Task 5: Testing (AC: 1-7)
- [x] Backend route tests:
  - GET returns correct coverage calculation for team with 0 practices
  - GET returns correct coverage for team with 3 practices covering 14 pillars
  - GET returns covered and gap pillars arrays
  - GET logs `coverage.calculated` event
  - GET requires auth and team membership
- [x] Backend service tests:
  - Coverage calculation: 14/19 = 73.68%
  - Covered pillars array contains unique pillars from practices
  - Gap pillars array contains pillars not covered
  - Event logged with correct payload
- [x] Frontend tests:
  - TeamCoverageCard renders progress bar with correct percentage
  - Covered and gap pillars displayed correctly
  - Pillar click opens detail modal/section
  - Coverage refreshes after practice add/remove

### Task 6: Documentation updates (Required)
- [x] docs/05-backend-api.md: add GET coverage/pillars endpoint
- [x] docs/06-frontend.md: describe TeamCoverageCard and pillar interaction
- [x] docs/09-changelog.md: add Story 2.6 entry
- [x] Update "Last Updated" in modified docs

## Dev Notes

### Developer Context Section

This story adds **pillar-level coverage visualization** to the Team Dashboard, showing teams which agile principles (pillars) they're covering vs. missing. Coverage is calculated server-side based on the team's practices and their pillar mappings. The UI displays coverage percentage, covered pillars (green), and gap pillars (gray), with interactive elements to show practices covering each pillar or suggest practices to fill gaps.

### Technical Requirements

**Endpoint (New):**
- `GET /api/v1/teams/:teamId/coverage/pillars`
  - Calculates pillar coverage for a team
  - Joins TeamPractice → Practice → PracticePillar → Pillar
  - Returns: `{ overallCoveragePct, coveredCount, totalCount: 19, coveredPillars: Pillar[], gapPillars: Pillar[], requestId }`
  - Logs `coverage.calculated` event (informational, not transactional)

**Data rules:**
- Total pillars: **19** (across 5 categories)
- Coverage formula: `(unique covered pillar IDs / 19) * 100`
- Covered pillars: unique pillar IDs from all team practices
- Gap pillars: all 19 pillars - covered pillars
- Performance: use single query with includes (no N+1)

**Event logging:**
- `eventType: 'coverage.calculated'`
- payload: `{ teamId, coveragePercent, coveredCount }`
- Non-transactional (informational only)

**Real-time updates:**
- Frontend re-fetches coverage after practice add/remove operations
- No WebSocket/polling required (page-refresh acceptable per NFR11)

### Architecture Compliance

- Express route layering: routes → controllers → services → repositories
- Team isolation: `requireAuth` + `validateTeamMembership` on team-scoped routes
- Structured errors: `{ code, message, details?, requestId }`
- Prisma mappings: snake_case DB ↔ camelCase API (no leakage)
- Feature-first frontend structure (client/src/features/teams or coverage)

### Library / Framework Requirements

- React 18.2 + TypeScript strict + TailwindCSS + Zustand (frontend)
- Express 4.18 + Prisma 7.2 + PostgreSQL 14+ (backend)
- Use Prisma includes/joins for efficient data loading (per Prisma docs)
- No new dependencies required

### File Structure Requirements

- Backend: add route in `server/src/routes/teams.routes.ts`, controller in `server/src/controllers/teams.controller.ts`, service in `server/src/services/coverage.service.ts` (new file), repository in `server/src/repositories/coverage.repository.ts` (new file)
- Frontend: feature-first placement under `client/src/features/teams/components/TeamCoverageCard.tsx` and `client/src/features/teams/state/coverageSlice.ts` (or extend teamsSlice)
- No path aliases; use relative imports

### Testing Requirements

- Backend Jest tests for route + service (co-located)
- Frontend Vitest tests for TeamCoverageCard rendering and interactions
- Validate coverage calculation accuracy (14/19 = 73.68%, not 74%)
- Validate real-time update mechanism

### Previous Story Intelligence

From Story 2.5:
- Reuse `ManagePracticesView` patterns for UI integration
- Use existing API client patterns from `teamPracticesApi.ts`
- Use Zustand slice pattern with loading/error states
- Event logging patterns established (non-transactional for informational events)
- Coverage recalculation triggered after practice changes (already exists in service)

From Story 2.4:
- Practice add/remove already triggers coverage updates (backend service)
- Frontend must refresh coverage data after these operations

From Story 2.3:
- Coverage data structure already defined in backend responses
- Frontend likely already displays basic coverage percentage
- **Extend existing coverage display with pillar breakdown**

### Git Intelligence Summary

Recent commits show established patterns:
- `feat: add practice removal impact preview and modal` (Story 2.4)
- `feat: implement remove practices from team portfolio functionality` (Story 2.4)
- `feat: complete Story 2.3 - finalize Add Selected Practices` (Story 2.3)
- `feat: complete Story 2.5 - custom practice creation` (Story 2.5)

Patterns to follow:
- Co-located tests
- Structured errors with requestId
- Feature-first UI structure
- Event logging for analytics
- Coverage recalculation already integrated in practice mutations

### Latest Tech Information

- Prisma joins/includes: use `include` option for efficient loading (Prisma docs, v7.2)
- React progress bars: TailwindCSS utility classes (`bg-green-500`, `w-[73%]`)
- No version upgrades required; follow locked versions in project context

### Project Context Reference

**Critical Rules:**
- ✅ Team isolation: EVERY query filters by `teamId`
- ✅ Event logging: ALL mutations wrapped in transactions (informational events can be separate)
- ✅ Error format: Structured `{code, message, details?, requestId}`
- ✅ TypeScript strict: No `any`, no implicit types
- ✅ Documentation updates: MANDATORY for every story

### Common Mistakes to Avoid

❌ N+1 queries (fetch practices, then loop to fetch pillars for each)
❌ Incorrect coverage calculation (rounding errors, not handling 0 practices)
❌ Forgetting to filter by teamId (data leak!)
❌ Client-side coverage calculation (must be server-side for consistency)
❌ Not refreshing coverage after practice add/remove
❌ Hard-coding total pillar count (should be fetched from DB or config)
❌ Logging coverage.calculated event in a transaction (unnecessary, informational only)

### Existing Coverage Implementation

**CRITICAL: Check existing implementation before building**
- Coverage calculation may already exist in backend service (`calculateTeamCoverage`)
- Coverage data may already be returned in practice add/remove responses
- Frontend may already display basic coverage percentage
- **This story extends existing coverage with pillar breakdown and interaction**

**Action:**
1. Read `server/src/services/teams.service.ts` (or coverage.service.ts) for existing coverage logic
2. Read `client/src/features/teams/pages/TeamDashboard.tsx` (or similar) for existing UI
3. Extend existing implementation rather than creating duplicate logic
4. If coverage endpoint already exists, enhance it with pillar arrays
5. If coverage UI already exists, add pillar breakdown section

### References

- Epic story definition: `_bmad-output/planning-artifacts/epics.md` (Story 2.6)
- Practice schema: `server/prisma/schema.prisma` (Practice, PracticePillar, Pillar, TeamPractice)
- Teams routes: `server/src/routes/teams.routes.ts`
- Teams service patterns: `server/src/services/teams.service.ts`
- Project context: `_bmad-output/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/2-5-create-new-practice-from-scratch-or-as-template.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2-Codex (GitHub Copilot)

### Debug Log References

- Sprint status: Story 2-6 selected from backlog (first backlog story in Epic 2)
- Epics source: `_bmad-output/planning-artifacts/epics.md`
- Previous story intelligence: `_bmad-output/implementation-artifacts/2-5-create-new-practice-from-scratch-or-as-template.md`
- Project context: `_bmad-output/project-context.md`
- Coverage calculation: Must be server-side, 19 pillars total, coverage = (unique covered / 19) * 100
- Tests: `client npm test` (Vitest) and `server npm test` (Jest)

### Completion Notes List

**Story Creation Complete:**
- ✅ Acceptance criteria extracted from epics
- ✅ Full backend/frontend task breakdown
- ✅ Architecture compliance and constraints
- ✅ Previous story intelligence and reuse hints
- ✅ Git patterns captured
- ✅ Project context rules integrated
- ✅ Ready-for-dev status set

**CRITICAL: Existing Implementation Check Required:**
- ⚠️ Coverage calculation may already exist in backend (check `teams.service.ts`)
- ⚠️ Coverage UI may already exist on Team Dashboard (check `TeamDashboard.tsx`)
- ⚠️ This story **extends** existing coverage with pillar breakdown
- ⚠️ Dev agent must read existing code before implementing

**Next Steps:**
1. Dev agent reads existing coverage implementation
2. Enhances existing coverage endpoint with pillar arrays
3. Extends existing coverage UI with pillar breakdown section
4. Adds pillar interaction (click to show practices or suggestions)
5. Ensures coverage refreshes after practice mutations

**⚠️ IMPORTANT - Git Workflow:**
All 10 new files are currently untracked. Before committing, run:
```bash
git add client/src/features/teams/api/coverageApi.ts
git add client/src/features/teams/components/TeamCoverageCard.tsx
git add client/src/features/teams/components/TeamCoverageCard.test.tsx
git add client/src/features/teams/components/PillarDetailModal.tsx
git add client/src/features/teams/state/coverageSlice.ts
git add client/src/features/teams/types/coverage.types.ts
git add server/src/repositories/coverage.repository.ts
git add server/src/services/coverage.service.ts
git add server/src/services/coverage.service.test.ts
git add server/src/routes/teams.coverage.routes.test.ts
git add _bmad-output/implementation-artifacts/2-6-view-team-coverage-at-pillar-level.md
```

**Implementation Complete:**
- ✅ Mapped coverage API pillars to UI pillar shape (category/description)
- ✅ Integrated TeamCoverageCard + coverage store into Team Dashboard with refresh
- ✅ Ensured coverage refresh after add/remove practice actions
- ✅ Updated docs and changelog for Story 2.6
- ✅ Tests passing: client Vitest + server Jest (4 backend, 4 frontend)
- ✅ Coverage refresh integration verified: TeamDashboard passes `refreshCoverage` to TeamCoverageCard and TeamPracticesPanel
- ✅ Event logging: Non-transactional for read-only coverage calculation (acceptable per AC7 - informational only, no mutation)
- ✅ All 10 new files created and documented in File List

### File List

**Files Created (NEW):**
- `client/src/features/teams/api/coverageApi.ts`
- `client/src/features/teams/components/TeamCoverageCard.tsx`
- `client/src/features/teams/components/TeamCoverageCard.test.tsx`
- `client/src/features/teams/components/PillarDetailModal.tsx`
- `client/src/features/teams/state/coverageSlice.ts`
- `client/src/features/teams/types/coverage.types.ts`
- `server/src/repositories/coverage.repository.ts`
- `server/src/services/coverage.service.ts`
- `server/src/services/coverage.service.test.ts`
- `server/src/routes/teams.coverage.routes.test.ts`

**Files Modified:**
- `client/src/features/teams/components/TeamDashboard.tsx`
- `client/src/features/teams/components/TeamPracticesPanel.test.tsx`
- `server/src/controllers/teams.controller.ts`
- `server/src/routes/teams.routes.ts`
- `docs/05-backend-api.md`
- `docs/06-frontend.md`
- `docs/09-changelog.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-6-view-team-coverage-at-pillar-level.md`

### Change Log

- 2026-01-21: Created Story 2.6 with comprehensive context for pillar-level coverage visualization.
- 2026-01-21: Implemented pillar coverage UI integration, API mapping, tests, and documentation updates.
- 2026-01-21: Code review complete - Updated File List with all 10 new files, verified integration, clarified event logging as non-transactional (acceptable for read-only operations), status changed to done.
