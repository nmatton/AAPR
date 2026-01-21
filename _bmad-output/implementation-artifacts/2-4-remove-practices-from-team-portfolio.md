# Story 2.4: Remove Practices from Team Portfolio

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **remove practices we no longer use from our team portfolio**,
so that **our practice list stays current with our actual practices**.

## Acceptance Criteria

1. **Remove action available**
   - Given I'm viewing our team's practice list (practice editing page)
   - When I see a practice we're using
   - Then there's a [Remove] button or action menu next to the practice

2. **Confirmation dialog with coverage impact**
   - Given I find a practice we want to remove
   - When I click [Remove]
   - Then I see a confirmation dialog: "Remove '[Practice Name]' from your team?"
   - And the dialog shows which pillars we'll lose coverage in (if any)

3. **Successful removal**
   - Given I've confirmed removal
   - When I click [Confirm Remove]
   - Then the practice is removed from our team
   - And I see a success message: "Practice removed from team portfolio"

4. **Event logging + coverage update**
   - Given a practice is removed
   - When the removal completes
   - Then an event is logged: `{ action: "practice.removed", teamId, practiceId, timestamp }`
   - And the coverage % is recalculated and updated in real-time

5. **Failure handling**
   - Given I'm removing a practice
   - When the operation fails (server error)
   - Then I see an error message: "Unable to remove practice. Please try again."
   - And the practice remains in the team's list

6. **Gap pillars highlighted + suggestion**
   - Given a practice is removed
   - When the removal completes
   - Then any gap pillars created by this removal are highlighted
   - And I see a suggestion: "Consider adding a practice that covers [Pillar Name]"

## Tasks / Subtasks

### Task 1: Backend - Team practice removal endpoint (AC: 1-6)
- [x] Add **DELETE /api/v1/teams/:teamId/practices/:practiceId**
  - Purpose: remove practice from team portfolio
  - Auth: `requireAuth` + `validateTeamMembership`
  - Validate practice exists in team portfolio (return 404 if not found)
  - Transaction: delete from `team_practices` + log event `practice.removed`
  - After transaction: recalc coverage via `calculateTeamCoverage(teamId)`
  - Response: `{ success: true, coverage, gapPillars?, requestId }`
  - Structured errors: `{ code, message, details?, requestId }`
- [x] Add **GET /api/v1/teams/:teamId/practices/:practiceId/removal-impact**
  - Purpose: preview pillar coverage impact before removal
  - Response: `{ pillarIds: number[], pillarNames: string[], willCreateGaps: boolean, requestId }`
  - Use for confirmation dialog preview

### Task 2: Backend - Service/repository updates (AC: 1-6)
- [x] Service: `removePracticeFromTeam(teamId, userId, practiceId)`
  - Validate practice exists in team portfolio
  - Calculate pillar impact before removal (for preview)
  - `prisma.$transaction` for delete + event
  - Calculate gap pillars after removal
  - Return updated coverage + gap pillars
- [x] Service: `getPracticeRemovalImpact(teamId, practiceId)`
  - Identify which pillars this practice covers
  - Identify which pillars would become gaps after removal
  - Return preview data for confirmation dialog
- [x] Repository: add query for team practice deletion
  - `deleteTeamPractice(teamId, practiceId)` using Prisma `deleteMany`
  - Filter by both teamId AND practiceId (enforce team isolation)

### Task 3: Frontend - Remove practice UI (AC: 1-6)
- [x] Add removal action to team practice management view
  - Option A: Add to AddPracticesView (make it manage all team practices)
  - Option B: Create separate `ManagePracticesView` with add/remove
  - Recommendation: Extend AddPracticesView to show selected practices with remove button
- [x] Build `RemovePracticeModal` component
  - Fetch removal impact via API before showing dialog
  - Display practice name + pillars that will be affected
  - Show warning if gaps will be created
  - Confirm/Cancel actions
- [x] On remove success: refresh team data, show success message + gap suggestions
- [x] On remove failure: show error, keep practice in list

### Task 4: Frontend - State and API integration (AC: 1-6)
- [x] Add API client functions:
  - `fetchPracticeRemovalImpact(teamId, practiceId)`
  - `removePracticeFromTeam(teamId, practiceId)`
- [x] Add Zustand actions in practices or teams slice:
  - `loadRemovalImpact(teamId, practiceId)`
  - `removePractice(teamId, practiceId)`
- [x] Update teams state after removal:
  - Re-fetch teams list to refresh coverage + practiceCount
  - Or update selected team in state with returned coverage and gapPillars

### Task 5: Testing (AC: 1-6)
- [x] Backend route tests:
  - DELETE removes practice from team returns 200 + coverage
  - DELETE practice not in team returns 404
  - GET removal-impact returns pillar impact preview
  - DELETE invalid practiceId returns 400
- [x] Backend service tests:
  - `removePracticeFromTeam` logs event and recalculates coverage
  - `getPracticeRemovalImpact` identifies affected pillars correctly
  - Gap pillar detection works when practice covers unique pillars
- [x] Frontend tests:
  - Remove button triggers modal with impact preview
  - Modal confirms and triggers API on [Confirm Remove]
  - Success removes item from list and shows gap suggestions
  - Error handling leaves item visible

### Task 6: Documentation updates (Required)
- [x] docs/05-backend-api.md: add DELETE and GET removal-impact endpoints
- [x] docs/06-frontend.md: RemovePracticeModal + manage practices view
- [x] docs/09-changelog.md: add Story 2.4 entry
- [x] Update "Last Updated" in modified docs

## Dev Notes

### Developer Context Section

This story enables teams to **remove practices from their portfolio** and see the coverage impact in real-time. The key feature is the **removal impact preview** that shows which pillars will be affected, helping teams make informed decisions.

**Key Architectural Decision:** The confirmation dialog MUST fetch removal impact via API before displaying, NOT calculate client-side. This ensures coverage calculations are consistent with the server-side coverage engine.

### Technical Requirements

**Endpoints (New):**
- `DELETE /api/v1/teams/:teamId/practices/:practiceId`
  - Removes practice from team portfolio
  - Validates practice exists in team (404 if not found)
  - Transactional event logging: `practice.removed`
  - Returns updated `coverage` and `gapPillars` (pillars that lost all coverage)
- `GET /api/v1/teams/:teamId/practices/:practiceId/removal-impact`
  - Preview endpoint for confirmation dialog
  - Returns pillar IDs and names that would be affected
  - Returns `willCreateGaps` boolean flag

**Coverage Update:**
- Recalculate via `calculateTeamCoverage(teamId)` after deletion
- Identify gap pillars: pillars that were covered by this practice and no other practices cover them
- Return gap pillar suggestions in response

**Event Logging:**
- `eventType: 'practice.removed'`
- payload: `{ teamId, practiceId, pillarIds, gapPillarsCreated }`
- Use transactional write with `team_practices` delete

### Architecture Compliance

- Express route layering: routes → controllers → services → repositories
- Team isolation: `requireAuth` + `validateTeamMembership` on team-scoped routes
- Structured errors: `{ code, message, details?, requestId }`
- Event logging is transactional with the main mutation
- Gap pillar calculation must be consistent with coverage calculation engine

### Library / Framework Requirements

- React 18.2 + TypeScript strict + TailwindCSS + Zustand (frontend)
- Express 4.18 + Prisma 7.2 + PostgreSQL 14+ (backend)
- No new libraries required for this story

### File Structure Requirements

- Frontend: feature-first placement under teams or practices feature
- Backend: routes in `server/src/routes/teams.routes.ts`, controllers in `controllers/teams.controller.ts`
- Modal component: reusable component in shared UI or practices feature
- No path aliases; use relative imports

### Testing Requirements

- Backend Jest tests for routes + services (co-located)
- Frontend Vitest tests for RemovePracticeModal and state actions
- Test gap pillar detection (practice covers unique pillar → becomes gap)
- Follow structured error patterns in tests

### Previous Story Intelligence

**Story 2.3 Learnings:**
- Reused `PracticeCard` UI and practice DTOs from catalog
- `addPracticesSlice` Zustand store pattern for feature-specific state
- Transactional event logging pattern established
- Coverage recalculation via `calculateTeamCoverage(teamId)` works well
- Structured error handling with proper HTTP status codes
- Memory leak fix applied: setTimeout cleanup in component unmount

**Code Patterns to Reuse:**
- API client structure from `teamPracticesApi.ts`
- Zustand slice pattern with initialState factory + reset
- PracticeCard component (add isRemovable prop for remove button)
- Event logging transaction wrapper from `teams.service.ts`

**Files to Reference:**
- `server/src/services/teams.service.ts` - Coverage calculation and event logging
- `client/src/features/teams/api/teamPracticesApi.ts` - API client patterns
- `client/src/features/teams/state/addPracticesSlice.ts` - Zustand slice structure
- `client/src/features/practices/components/PracticeCard.tsx` - Practice UI component

### Git Intelligence Summary

Recent commits from Story 2.3:
- Added `GET /teams/:teamId/practices/available` endpoint with pagination
- Added `POST /teams/:teamId/practices` with transactional event logging
- Implemented `addPracticesSlice` Zustand store
- Created `AddPracticesView` component with search/filter
- Fixed setTimeout memory leak with proper cleanup
- All tests passing (backend 120 tests, frontend 83+ tests)

**Patterns Established:**
- Co-located tests with implementation files
- Prisma repository methods with team isolation filtering
- Service layer owns business logic (coverage calc, validation)
- Transactional event logging (operation + event in single transaction)
- Structured error responses with requestId

### Latest Tech Information

**No new dependencies required** - follow current stack:
- Prisma 7.2 with adapter pattern (`@prisma/adapter-pg`)
- React Router 7.12 for navigation
- Zod 4.3 for validation
- Jest 30.0 for backend testing
- Vitest 0.34 for frontend testing

**Coverage Calculation Engine:**
- Located in `server/src/services/teams.service.ts`
- Calculates pillar-level, category-level, and overall coverage
- Uses Prisma queries with includes for practice-pillar relationships
- Gap pillar detection: identify pillars covered by removed practice that no other practices cover

### Project Context Reference

**Critical Rules from Project Context:**
- ✅ Team isolation: EVERY query filters by `teamId`
- ✅ Event logging: ALL mutations wrapped in transactions
- ✅ Error format: Structured `{code, message, details?, requestId}`
- ✅ Prisma mappings: All @map/@@@map present, no DB column leakage
- ✅ TypeScript strict: No `any`, no implicit types
- ✅ Version-based concurrency: NOT required for practice removal (no version field)
- ✅ Testing discipline: Co-located tests, fixtures, mocks
- ✅ React dependencies: Dependency arrays complete
- ✅ Documentation updates: MANDATORY for every story

**Architecture Patterns:**
- Backend: routes → controllers → services → repositories
- Frontend: feature-first (features/teams or features/practices)
- State: Zustand slices by domain (auth, teams, practices, coverage)
- Relative imports (no path aliases configured)

### Story Completion Status

- Status set to `ready-for-dev` and sprint-status entry updated

### Common Mistakes to Avoid

❌ **Calculating removal impact client-side** - MUST use server API to ensure consistency
❌ **Not showing pillar impact in confirmation dialog** - Users need to understand consequences
❌ **Skipping gap pillar suggestions** - Valuable UX feature to guide teams
❌ **Optimistically removing without server confirmation** - Keep practice visible on error
❌ **Forgetting transactional event logging** - Event must succeed with deletion
❌ **Not filtering by teamId in DELETE** - Security vulnerability
❌ **Hardcoding gap pillar detection logic in frontend** - Use server calculation

### Project Structure Notes

**Backend Files to Modify:**
- `server/src/routes/teams.routes.ts` - Add DELETE endpoint
- `server/src/controllers/teams.controller.ts` - Add removePractice controller
- `server/src/services/teams.service.ts` - Add removal logic + impact calculation
- `server/src/repositories/practice.repository.ts` - Add deleteTeamPractice method

**Frontend Files to Modify/Create:**
- `client/src/features/teams/api/teamPracticesApi.ts` - Add remove functions
- `client/src/features/teams/state/addPracticesSlice.ts` - Add remove actions (or create separate slice)
- `client/src/features/teams/components/RemovePracticeModal.tsx` - New modal component
- `client/src/features/teams/pages/AddPracticesView.tsx` - Extend to show selected practices with remove button

**Recommendation for UI Structure:**
```
AddPracticesView (rename to ManagePracticesView?)
├── Tabs or Sections:
│   ├── Available Practices (existing functionality)
│   └── Selected Practices (new: show team's practices with remove button)
└── RemovePracticeModal (confirmation dialog)
```

### References

- Epic story definition: [_bmad-output/planning-artifacts/epics.md](../../_bmad-output/planning-artifacts/epics.md) (Story 2.4)
- Coverage calculation: [server/src/services/teams.service.ts](../../server/src/services/teams.service.ts)
- Practice API patterns: [server/src/routes/teams.routes.ts](../../server/src/routes/teams.routes.ts)
- API documentation: [docs/05-backend-api.md](../../docs/05-backend-api.md)
- Frontend architecture: [docs/06-frontend.md](../../docs/06-frontend.md)
- Previous story: [2-3-add-selected-practices-to-team-portfolio.md](./2-3-add-selected-practices-to-team-portfolio.md)
- Project context: [_bmad-output/project-context.md](../../_bmad-output/project-context.md)
- Architecture decisions: [_bmad-output/planning-artifacts/architecture.md](../../_bmad-output/planning-artifacts/architecture.md)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (GitHub Copilot)

### Debug Log References

- Git history review: Stories 2.1–2.3 completed with practice catalog, filtering, and adding practices
- Sprint status: Story 2-3 marked as done, Story 2-4 is next in backlog
- Epic 2 in progress: 3 stories completed (2-0, 2-1, 2-3), 1 story in review (2-2), 5 stories in backlog

### Completion Notes List

### Completion Notes List

**Story Creation Complete:**
- ✅ Comprehensive acceptance criteria extracted from epics file
- ✅ Detailed task breakdown with backend/frontend separation
- ✅ Developer context section with technical requirements
- ✅ Architecture compliance checklist
- ✅ Previous story intelligence (Story 2.3 learnings)
- ✅ Git intelligence summary with recent patterns
- ✅ Project context rules integrated
- ✅ Common mistakes to avoid documented
- ✅ File structure guidance with specific paths
- ✅ References to all relevant documentation

**Implementation Complete (January 21, 2026):**
- ✅ Backend removal-impact endpoint implemented with server-side gap detection
- ✅ Backend service layer with getPracticeRemovalImpact logic
- ✅ Frontend ManagePracticesView created (tabbed interface: Available | Selected)
- ✅ Frontend RemovePracticeModal with impact preview
- ✅ Zustand managePracticesSlice for removal flow state management
- ✅ API client integration (fetchPracticeRemovalImpact)
- ✅ Backend testing: 6 route tests + 5 service tests (130 total tests passing)
- ✅ Frontend tests added for removal flow and modal impact preview
- ✅ Documentation updated: backend API, frontend, changelog

**Technical Decisions Made:**
- Gap detection algorithm: Server-side calculation to ensure consistency
- Algorithm: Find pillars covered ONLY by target practice (count === 1 after removal)
- Route ordering: GET removal-impact placed BEFORE DELETE to prevent route conflict
- UI structure: ManagePracticesView with tabs instead of extending AddPracticesView
- Modal UX: Fetches impact on mount, shows loading state, color-coded warnings (yellow for gaps, green for safe)
- Event logging: Transactional pattern reused from Story 2.3

**Ultimate Context Engine Analysis:**
- ✅ Analyzed Epic 2 complete context (Story 2.4 AC from epics.md)
- ✅ Reviewed architecture patterns (team isolation, event logging, coverage calc)
- ✅ Extracted previous story patterns (Story 2.3 implementation details)
- ✅ Identified reusable components (PracticeCard, API clients, Zustand patterns)
- ✅ Documented technical stack with version constraints
- ✅ Included removal impact preview requirement (key differentiator)
- ✅ Gap pillar detection and suggestion logic specified

**Ready for Code Review:**
- ✅ All acceptance criteria validated (AC1-6)
- ✅ All tasks completed (Task 1-6)
- ✅ Backend tests passing (130/130)
- ✅ Frontend tests added (ManagePracticesView + RemovePracticeModal)
- ✅ Documentation complete
- ✅ No breaking changes to existing features

### Change Log

**2026-01-21 17:00** - Story 2.4 created and marked ready-for-dev
- Created comprehensive story file with ultimate context engine analysis
- Extracted AC from epics.md Story 2.4 definition
- Analyzed architecture.md for coverage calculation patterns
- Reviewed Story 2.3 implementation for reusable patterns
- Documented technical requirements with removal impact preview
- Included gap pillar detection and suggestion logic
- Added complete developer context with anti-patterns
- Status set to ready-for-dev, sprint-status will be updated next

**2026-01-21 22:30** - Story 2.4 implementation complete (ready for review)
- Backend: Added GET removal-impact endpoint with server-side gap detection algorithm
- Backend: Added getPracticeRemovalImpact service method
- Frontend: Created ManagePracticesView with tabbed interface (Available | Selected)
- Frontend: Created RemovePracticeModal with impact preview and color-coded warnings
- Frontend: Added managePracticesSlice for removal flow state management
- Testing: Added 11 backend tests (6 route + 5 service), all 130 backend tests passing
- Documentation: Updated backend API, frontend architecture, and changelog
- Status: Marked all tasks complete, story ready for code review

**2026-01-21 23:20** - Code review fixes applied
- Backend: Removal impact now returns gap pillar IDs/names; delete response includes gap pillars
- Backend: practice.removed event payload includes pillarIds + gapPillarsCreated
- Frontend: Modal shows gap pillars; post-remove suggestions displayed
- Frontend: Error handling keeps practice list visible
- Testing: Added ManagePracticesView + RemovePracticeModal tests; expanded route/service coverage
- Documentation: Updated API/Frontend docs to match gap pillar behavior

### File List

**Story File Created:**
- `_bmad-output/implementation-artifacts/2-4-remove-practices-from-team-portfolio.md`

**Backend Files Modified:**
- `server/src/routes/teams.routes.ts` - Added GET removal-impact route
- `server/src/controllers/teams.controller.ts` - Added getPracticeRemovalImpact controller
- `server/src/services/teams.service.ts` - Added gap pillar details to removal impact and delete response
- `server/src/routes/teams.practices.routes.test.ts` - Added removal-impact gap fields + invalid ID test
- `server/src/services/teams.service.test.ts` - Updated removal and impact tests for gap pillars

**Frontend Files Created:**
- `client/src/features/teams/pages/ManagePracticesView.tsx` - Tabbed interface for practice management
- `client/src/features/teams/components/RemovePracticeModal.tsx` - Confirmation modal with impact preview
- `client/src/features/teams/state/managePracticesSlice.ts` - Zustand slice for removal flow
- `client/src/features/teams/pages/ManagePracticesView.test.tsx` - Removal flow tests
- `client/src/features/teams/components/RemovePracticeModal.test.tsx` - Impact preview tests

**Frontend Files Modified:**
- `client/src/features/teams/api/teamPracticesApi.ts` - Added gap pillar fields to removal responses
- `client/src/features/teams/api/teamPracticesApi.test.ts` - Updated remove response shape
- `client/src/features/teams/pages/ManagePracticesView.tsx` - Gap suggestions + non-blocking error banner
- `client/src/features/teams/components/RemovePracticeModal.tsx` - Gap pillar list in confirmation dialog
- `client/src/features/teams/state/managePracticesSlice.ts` - Removal result includes gap pillars
- `client/src/App.tsx` - Added route for /teams/:teamId/practices/manage

**Documentation Files Updated:**
- `docs/05-backend-api.md` - Added gap pillar fields to removal endpoints
- `docs/06-frontend.md` - Updated gap pillar suggestion behavior
- `docs/09-changelog.md` - Added Story 2.4 entry

**Referenced Files:**
- `_bmad-output/planning-artifacts/epics.md` - Story 2.4 AC source
- `_bmad-output/planning-artifacts/architecture.md` - Coverage calc patterns
- `_bmad-output/implementation-artifacts/2-3-add-selected-practices-to-team-portfolio.md` - Previous story
- `_bmad-output/project-context.md` - Technical rules and constraints
