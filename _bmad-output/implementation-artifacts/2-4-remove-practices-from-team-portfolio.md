# Story 2.4: Remove Practices from Team Portfolio

Status: ready-for-dev

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

### Task 1: Backend - Remove practice endpoint (AC: 1-6)
- [ ] Add **DELETE /api/v1/teams/:teamId/practices/:practiceId**
  - Auth: `requireAuth` + `validateTeamMembership`
  - Validate practice exists AND belongs to team; return 404 if not found
  - Transaction: delete from `team_practices` + log event `practice.removed`
  - After transaction: recalc coverage via `calculateTeamCoverage(teamId)`
  - Response: `{ teamPracticeId, coverage, requestId }`
- [ ] Keep structured errors: `{ code, message, details?, requestId }`

### Task 2: Backend - Service/repository updates (AC: 1-6)
- [ ] Repository: add `removePracticeFromTeam(teamId, practiceId)`
  - Validate team-scoped delete (team isolation)
- [ ] Service: `removePracticeFromTeam(teamId, userId, practiceId)`
  - Validate teamId and team membership
  - Ensure practice is currently selected by team (404 if not)
  - Wrap mutation + event log in `prisma.$transaction`

### Task 3: Frontend - Remove action and confirmation (AC: 1-3, 6)
- [ ] Add [Remove] action on team practice list (Team Dashboard or Manage Practices view)
- [ ] Confirmation dialog with:
  - Practice name
  - Pillars that will become gaps (compute from current coverage vs removed practice)
  - Primary action: [Confirm Remove]
  - Secondary: [Cancel]
- [ ] Show success toast on completion

### Task 4: Frontend - API + state integration (AC: 1-6)
- [ ] Add API client: `removePracticeFromTeam(teamId, practiceId)`
- [ ] Update state to remove practice only after success
- [ ] Update coverage UI from response (or re-fetch coverage)
- [ ] Show gap pillar highlight and suggestion after removal

### Task 5: Testing (AC: 1-6)
- [ ] Backend route tests:
  - DELETE removes practice for team, returns updated coverage
  - DELETE non-member or wrong team returns 403
  - DELETE missing practice returns 404
- [ ] Backend service tests:
  - Event logged and coverage recalculated in transaction
- [ ] Frontend tests:
  - Confirmation dialog shows impacted pillars
  - Remove action calls API and updates list on success
  - Failure leaves item visible

### Task 6: Documentation updates (Required)
- [ ] docs/05-backend-api.md: document DELETE team practice endpoint
- [ ] docs/06-frontend.md: document remove action + confirmation flow
- [ ] docs/09-changelog.md: add Story 2.4 entry
- [ ] Update "Last Updated" in modified docs

## Dev Notes

- This story removes team practice selections and must recalculate coverage immediately.
- Highlight newly missing pillars and suggest a practice to cover the gap (use existing coverage metadata).
- Do not optimistically remove items before server confirmation.

### Developer Context Section

This story is the inverse of Story 2.3 (Add Practices). Reuse the existing team practice list UI and coverage recalculation patterns. The removal flow is a confirmation-first destructive action with clear coverage impact messaging. Ensure the confirmation dialog is concise and respects the desktop-first UX guidelines (no heavy modal stack, clear primary/secondary actions).

### Technical Requirements

**Endpoints:**
- `DELETE /api/v1/teams/:teamId/practices/:practiceId`
  - Transactional delete from `team_practices` + event `practice.removed`
  - Recalculate coverage via `calculateTeamCoverage(teamId)`
  - Return updated coverage and requestId

**Event Logging:**
- `eventType: 'practice.removed'`
- payload: `{ teamId, practiceId }`
- Must be in the same transaction as the delete

**Coverage Impact:**
- Identify pillars that become uncovered after removal
- Highlight these pillars in UI and show suggestion copy

### Architecture Compliance

- Express layering: routes → controllers → services → repositories
- Team isolation enforced via `requireAuth` + `validateTeamMembership`
- Structured errors: `{ code, message, details?, requestId }`
- Event logging is transactional with the main mutation
- No SQL in controllers; repositories only

### Library / Framework Requirements

- React 18.2 + TypeScript strict + TailwindCSS + Zustand (frontend)
- Express 4.18 + Prisma 7.2 + PostgreSQL 14+ (backend)
- No new dependencies required

### File Structure Requirements

- Frontend feature-first placement under teams or practices feature
- Backend: routes in `server/src/routes`, thin controllers, business logic in services
- No path aliases; use relative imports

### Testing Requirements

- Backend Jest tests for delete endpoint and service transaction
- Frontend Vitest tests for confirmation modal and removal flow
- Use co-located tests; no shared global state

### Previous Story Intelligence

- Story 2.3 added team practice selection endpoints and Add Practices view.
- Reuse PracticeCard UI and pillar filter/search patterns where applicable.
- Maintain consistency with existing teams/practices API and coverage update logic.

### Git Intelligence Summary

- Git history review not available in this run. Use existing Story 2.3 implementations as the baseline pattern.

### Latest Tech Information

- No external version updates required for this story. Follow current stack rules in project context.

### Project Context Reference

- Strict TypeScript, structured errors, team isolation, transactional event logging
- Documentation updates are mandatory for every story

### Story Completion Status

- Status set to `ready-for-dev` and sprint-status entry updated

### Common Mistakes to Avoid

- ❌ Removing a practice before server confirmation
- ❌ Skipping event logging or not wrapping in transaction
- ❌ Failing to recalculate coverage or show gap pillars
- ❌ Bypassing team membership validation
- ❌ Using incorrect endpoint base (must be `/api/v1/teams/:teamId/practices`)

### Project Structure Notes

- Add API client under teams or practices feature (do not scatter)
- Add confirmation dialog in the team practice list UI
- Reuse existing coverage UI components for gap highlighting

### References

- Epic story definition: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md)
- Project constraints: [_bmad-output/project-context.md](_bmad-output/project-context.md)
- Architecture patterns: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md)
- UX patterns: [_bmad-output/planning-artifacts/ux-design-specification.md](_bmad-output/planning-artifacts/ux-design-specification.md)

## Dev Agent Record

### Agent Model Used

GPT-5.2-Codex

### Debug Log References

- Sprint-status backlog scan and artifact analysis completed.

### Completion Notes List

- Story drafted from Epic 2.4 acceptance criteria, project context, architecture, and UX specs.
- Previous story (2.3) patterns incorporated for consistency.

### File List

- _bmad-output/implementation-artifacts/2-4-remove-practices-from-team-portfolio.md
