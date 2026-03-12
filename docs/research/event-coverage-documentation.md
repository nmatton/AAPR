# Event Coverage Documentation

## Purpose

This document is the canonical Story 6.0 coverage artifact for Epic 6.

It maps implemented user actions to:

- endpoint and owning service,
- persisted event type (when present),
- payload fields relevant to research,
- metadata completeness (actor, team, timestamp),
- and current coverage status (`Logged`, `Partial`, `Missing`, `Out of Scope`).

## Scope

- In scope: backend routes and service flows relevant to research observability.
- In scope: persisted writes to the `events` table via `prisma.event.create(...)` or `eventService.logEvent(...)`.
- Out of scope by decision: session inspection and token refresh telemetry (`GET /auth/me`, `POST /auth/refresh`).
- In scope for Story 6.0 coverage completeness: Export-domain user actions and current implementation gaps.

## Status Legend

- `Logged`: persisted event exists and represents the action.
- `Partial`: persisted event exists, but payload/semantics are incomplete for research needs.
- `Missing`: no persisted event currently represents the action.
- `Out of Scope`: explicitly excluded by product/research decision for this phase.

## Current Persisted Event Types

- `user.registered`
- `user.login_success`
- `team.created`
- `team.name_updated`
- `team_member.added`
- `team_member.removed`
- `invite.created`
- `invite.email_failed`
- `invite.cancelled`
- `invite.auto_resolved`
- `practice.imported`
- `practices.imported`
- `practice.added`
- `practice.removed`
- `practice.created`
- `practice.edited`
- `coverage.by_category.calculated`
- `issue.created`
- `issue.comment_added`
- `issue.status_changed`
- `issue.priority_changed`
- `issue.decision_recorded`
- `issue.evaluated`
- `big_five.completed`
- `big_five.retaken`

## Metadata Completeness Rules Checked

For each logged row, metadata was verified in two layers:

- Event row metadata: top-level `actorId`, `teamId`, and DB `createdAt`.
- Payload metadata: whether payload includes `teamId`, actor/user reference, and timestamp fields.

Important:

- DB-level timestamp always exists on event rows (`createdAt`), even when payload does not carry a timestamp.
- Actor is not always present (`actorId: null` for system-level actions).
- Payload-level `teamId` is inconsistent and is flagged below where relevant.

## Reproducible Analysis Procedure

1. Read planning constraints in `_bmad-output/planning-artifacts/epics.md` and `_bmad-output/planning-artifacts/architecture.md`.
2. Enumerate user-facing actions per domain from route files in `server/src/routes`.
3. Map each action to its owning service method in `server/src/services`.
4. For each mutation path, verify whether a persisted event is created through `eventService.logEvent(...)` or direct `prisma.event.create(...)`.
5. Capture current payload fields, actor/team metadata, and timestamp behavior.
6. Classify each action as `Logged`, `Partial`, `Missing`, or `Out of Scope`.
7. Record one concrete source location per matrix row in the `Evidence` column.
8. Recompute summary counts and coverage ratio.

## Coverage Matrix

### Auth

| User Action | Endpoint / Flow | Service | Event Type(s) | Payload Fields (Current) | Metadata Check | Status | Notes | Evidence |
|---|---|---|---|---|---|---|---|---|
| Register new user | `POST /api/v1/auth/register` | `registerUser` | `user.registered` | `email`, `name`, `registrationMethod` | actor: no (system), team: no (`teamId: null`), timestamp: DB only | Logged | Correct for user-level system event. | `server/src/services/auth.service.ts` |
| Log in successfully | `POST /api/v1/auth/login` | `verifyCredentials` | `user.login_success` | `email`, `timestamp`, `ipAddress` | actor: yes, team: no (`teamId: null`), timestamp: payload + DB | Logged | Auth telemetry retained as informational. | `server/src/services/auth.service.ts` |
| View current session details | `GET /api/v1/auth/me` | controller read path | None | None | N/A | Out of Scope | Explicitly excluded per stakeholder decision. | `server/src/routes/auth.routes.ts` |
| Refresh tokens | `POST /api/v1/auth/refresh` | refresh controller path | None | None | N/A | Out of Scope | Explicitly excluded per stakeholder decision. | `server/src/routes/auth.routes.ts` |
| Log out | `POST /api/v1/auth/logout` | logout controller path | None | None | N/A | Missing | Optional future lifecycle telemetry. | `server/src/routes/auth.routes.ts` |

### Teams

| User Action | Endpoint / Flow | Service | Event Type(s) | Payload Fields (Current) | Metadata Check | Status | Notes | Evidence |
|---|---|---|---|---|---|---|---|---|
| Create team | `POST /api/v1/teams` | `createTeam` | `team.created` | `teamId`, `teamName`, `practiceCount`, `creatorId`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Payload now includes explicit team metadata and timestamp. | `server/src/services/teams.service.ts` |
| Rename team | `PATCH /api/v1/teams/:teamId` | `updateTeam` | `team.name_updated` | `teamId`, `actorId`, `oldName`, `newName`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Payload now includes explicit team metadata. | `server/src/services/teams.service.ts` |
| Invite existing user | `POST /api/v1/teams/:teamId/invites` (existing-user branch) | `createInvite` | `team_member.added` | `teamId`, `userId` | actor: yes, team: top-level yes / payload yes, timestamp: DB only | Logged | Good team scoping in payload. | `server/src/services/invites.service.ts` |
| Invite new user | `POST /api/v1/teams/:teamId/invites` (new-user branch) | `createInvite` | `invite.created` | `inviteId`, `teamId`, `email`, `isNewUser` | actor: yes, team: top-level yes / payload yes, timestamp: DB only | Logged | Good team scoping in payload. | `server/src/services/invites.service.ts` |
| Resend invite email | `POST /api/v1/teams/:teamId/invites/:inviteId/resend` | `resendInvite` | `invite.email_failed` on failure only | `inviteId`, `teamId`, `error` | actor: yes, team: top-level yes / payload yes, timestamp: DB only | Partial | Success path has no event. | `server/src/services/invites.service.ts` |
| Cancel invite | `DELETE /api/v1/teams/:teamId/invites/:inviteId` | `cancelInvite` | `invite.cancelled` | `inviteId`, `teamId`, `email`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Complete metadata. | `server/src/services/invites.service.ts` |
| Auto-resolve invite on signup | registration side-effect | `autoResolveInvitesOnSignup` | `invite.auto_resolved` | `inviteId`, `teamId`, `userId`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Payload now includes explicit team metadata. | `server/src/services/invites.service.ts` |
| Remove team member | `DELETE /api/v1/teams/:teamId/members/:userId` | `removeMember` | `team_member.removed` | `teamId`, `userId`, `removedBy` | actor: yes, team: top-level yes / payload yes, timestamp: DB only | Logged | Complete team scoping. | `server/src/services/members.service.ts` |

### Practices

| User Action | Endpoint / Flow | Service | Event Type(s) | Payload Fields (Current) | Metadata Check | Status | Notes | Evidence |
|---|---|---|---|---|---|---|---|---|
| Import single practice | seed/import flow | `importPracticesFromDirectory` | `practice.imported` | `practiceId`, `title`, `category`, `pillarCount` | actor: no (system), team: top-level `0` / payload no, timestamp: DB only | Partial | Uses system `teamId: 0`; payload has no team context. | `server/src/services/practice-import.service.ts` |
| Import batch practices | seed/import flow | `importPracticesFromDirectory` | `practices.imported` | `count`, `skipped`, `errors`, `duration_ms`, `timestamp`, `source_file`, `imported_by`, `git_sha` | actor: no (system), team: top-level `0` / payload no, timestamp: payload + DB | Partial | Same system-scope semantics as single import. | `server/src/services/practice-import.service.ts` |
| Add practice to team portfolio | `POST /api/v1/teams/:teamId/practices` | `addPracticeToTeam` | `practice.added` | `practiceId`, `practiceTitle` | actor: yes, team: top-level yes / payload no, timestamp: DB only | Partial | Confirmed: payload misses `teamId`. | `server/src/services/teams.service.ts` |
| Remove practice from team portfolio | `DELETE /api/v1/teams/:teamId/practices/:practiceId` | `removePracticeFromTeam` | `practice.removed` | `teamId`, `practiceId`, `pillarIds`, `gapPillarsCreated`, `practiceTitle` | actor: yes, team: top-level yes / payload yes, timestamp: DB only | Logged | Good team scoping. | `server/src/services/teams.service.ts` |
| Create custom practice | `POST /api/v1/teams/:teamId/practices/custom` | `createCustomPracticeForTeam` | `practice.created` | `teamId`, `practiceId`, `isCustom`, `createdFrom` | actor: yes, team: top-level yes / payload yes, timestamp: DB only | Logged | Good team scoping. | `server/src/services/teams.service.ts` |
| Edit practice | `PATCH /api/v1/teams/:teamId/practices/:practiceId` | `editPracticeForTeam` | `practice.edited` | `teamId`, `practiceId`, `editedBy`, `changes`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Good team scoping. | `server/src/services/teams.service.ts` |
| Copy from template (`saveAsCopy=true`) | `PATCH /api/v1/teams/:teamId/practices/:practiceId` | `editPracticeForTeam` copy branch | `practice.edited` | `teamId`, `practiceId`, `editedBy`, `copiedFrom`, `changes`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Partial | Should use dedicated event type for copy action. | `server/src/services/teams.service.ts` |

### Issues

| User Action | Endpoint / Flow | Service | Event Type(s) | Payload Fields (Current) | Metadata Check | Status | Notes | Evidence |
|---|---|---|---|---|---|---|---|---|
| Submit issue | `POST /api/v1/teams/:teamId/issues` | `createIssue` | `issue.created` | `issueId`, `title`, `descriptionSummary`, `priority`, `status`, `linkedPracticeIds`, `actorId`, `teamId`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Story 6.1: Enriched payload with full creation context and explicit metadata. | `server/src/services/issue.service.ts` |
| Add issue comment | `POST /api/v1/teams/:teamId/issues/:issueId/comments` | `addComment` | `issue.comment_added` | `issueId`, `commentId`, `commentText`, `actorId`, `teamId`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Story 6.1: Enriched payload with explicit issueId, actorId, teamId, and bounded commentText. | `server/src/services/issue.service.ts` |
| Change issue status | `PATCH /api/v1/teams/:teamId/issues/:issueId` | `updateIssue` | `issue.status_changed` | `issueId`, `teamId`, `actorId`, `oldStatus`, `newStatus`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Payload now includes explicit metadata and timestamp. | `server/src/services/issue.service.ts` |
| Change issue priority | `PATCH /api/v1/teams/:teamId/issues/:issueId` | `updateIssue` | `issue.priority_changed` | `issueId`, `teamId`, `actorId`, `oldPriority`, `newPriority`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Payload now includes explicit metadata and timestamp. | `server/src/services/issue.service.ts` |
| Record adaptation decision | `POST /api/v1/teams/:teamId/issues/:issueId/decisions` | `recordDecision` | `issue.decision_recorded` | `issueId`, `teamId`, `actorId`, `decisionText`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Payload naming normalized to camelCase and metadata completed. | `server/src/services/issue.service.ts` |
| Modify/update adaptation decision | not implemented endpoint/flow | N/A | None | None | N/A | Missing | Confirmed missing action-specific event and endpoint semantics. | `server/src/routes/issues.routes.ts` |
| Record evaluation outcome | `POST /api/v1/teams/:teamId/issues/:issueId/evaluations` | `evaluateIssue` | `issue.evaluated` | `issueId`, `teamId`, `actorId`, `outcome`, `comments`, `timestamp` | actor: yes, team: top-level yes / payload yes, timestamp: payload + DB | Logged | Payload now includes explicit team metadata. | `server/src/services/issue.service.ts` |

### Big Five

| User Action | Endpoint / Flow | Service | Event Type(s) | Payload Fields (Current) | Metadata Check | Status | Notes | Evidence |
|---|---|---|---|---|---|---|---|---|
| Submit questionnaire for first completion | `POST /api/v1/big-five/submit` | `saveResponses` | `big_five.completed` | `userId`, `teamId`, `scores` (all 5 traits), `responseCount`, `itemIds`, `timestamp`, `schemaVersion` | actor: yes, team: top-level optional / payload yes, timestamp: payload + DB | Logged | Story 6.1: Event logged inside transaction; teamId included when provided. | `server/src/services/big-five.service.ts` |
| Retake questionnaire | same endpoint, overwrite path | `saveResponses` | `big_five.retaken` | `userId`, `teamId`, `scores` (all 5 traits), `responseCount`, `itemIds`, `timestamp`, `schemaVersion` | actor: yes, team: top-level optional / payload yes, timestamp: payload + DB | Logged | Story 6.1: Retake detected by checking existing response count before deletion; atomic with transaction. | `server/src/services/big-five.service.ts` |
| View current scores | `GET /api/v1/big-five/me` | `getUserScores` | None | None | N/A | Missing | Optional read telemetry only. | `server/src/routes/big-five.routes.ts` |

### Export

| User Action | Endpoint / Flow | Service | Event Type(s) | Payload Fields (Current) | Metadata Check | Status | Notes | Evidence |
|---|---|---|---|---|---|---|---|---|
| Open export panel | UI flow | client flow | None | None | N/A | Missing | Export domain included for Story 6.0 coverage completeness. | `client/src` |
| Request filtered export | Export API flow (planned) | export service (planned) | None | None | N/A | Missing | Story 6.3 requirement; no current endpoint in server routes. | `_bmad-output/planning-artifacts/epics.md` |
| Download exported file | Export API flow (planned) | export service (planned) | None | None | N/A | Missing | Story 6.3 requirement; no telemetry yet. | `_bmad-output/planning-artifacts/epics.md` |

### Read / View

| User Action | Endpoint / Flow | Service | Event Type(s) | Payload Fields (Current) | Metadata Check | Status | Notes | Evidence |
|---|---|---|---|---|---|---|---|---|
| View teams list | `GET /api/v1/teams` | `getUserTeams` | None | None | N/A | Missing | If added later, payload should include `teamId` when scoped. | `server/src/services/teams.service.ts` |
| View team invites | `GET /api/v1/teams/:teamId/invites` | `listInvites` | None | None | N/A | Missing | No event exists; teamId payload question is N/A until event is added. | `server/src/services/invites.service.ts` |
| View team members | `GET /api/v1/teams/:teamId/members` | `getTeamMembers` | None | None | N/A | Missing | No event exists; teamId payload question is N/A until event is added. | `server/src/services/members.service.ts` |
| View member detail | `GET /api/v1/teams/:teamId/members/:userId` | `getMemberDetail` | None | None | N/A | Missing | No event exists; teamId payload question is N/A until event is added. | `server/src/services/members.service.ts` |
| Browse global catalog | `GET /api/v1/practices` | catalog controller path | None | None | N/A | Missing | Optional behavioral telemetry. | `server/src/routes/practices.routes.ts` |
| View global practice detail | `GET /api/v1/practices/:id` | detail controller path | None | None | N/A | Missing | Optional behavioral telemetry. | `server/src/routes/practices.routes.ts` |
| View team practices | `GET /api/v1/teams/:teamId/practices` | `getTeamPractices` | None | None | N/A | Missing | Optional behavioral telemetry. | `server/src/services/teams.service.ts` |
| View coverage dashboard | `GET /api/v1/teams/:teamId/coverage/pillars` | `getTeamPillarCoverage` | `coverage.by_category.calculated` | `coveragePercent`, `coveredCount`, `coveredPillarIds`, `categoryBreakdown`, `timestamp` | actor: no, team: top-level yes / payload no, timestamp: payload + DB | Partial | Logs calculation, not explicit page-view action. | `server/src/services/coverage.service.ts` |
| View issues list | `GET /api/v1/teams/:teamId/issues` | `getIssues` | None | None | N/A | Missing | Optional behavioral telemetry. | `server/src/services/issue.service.ts` |
| View issue detail | `GET /api/v1/teams/:teamId/issues/:issueId` | `getIssueDetails` | None | None | N/A | Missing | Optional behavioral telemetry. | `server/src/services/issue.service.ts` |

## Coverage Summary

| Status | Count |
|---|---:|
| Logged | 19 |
| Partial | 6 |
| Missing | 17 |
| Out of Scope | 2 |

Coverage for in-scope actions is:

$$
\frac{19 + 6}{19 + 6 + 17} = \frac{25}{42} \approx 59.5\%
$$

**Story 6.1 changes (vs Story 6.0 baseline):** `big_five.completed` Missing→Logged, `big_five.retaken` Missing→Logged, `issue.created` Partial→Logged, `issue.comment_added` Partial→Logged, `team.created` Partial→Logged, `team.name_updated` Partial→Logged, `invite.auto_resolved` Partial→Logged, `issue.status_changed` Partial→Logged, `issue.priority_changed` Partial→Logged, `issue.decision_recorded` Partial→Logged, `issue.evaluated` Partial→Logged.

## Prioritized Implementation Recommendations

### Story 6.1 Priorities

1. Add Big Five completion and retake events:
   - `big_five.completed`
   - `big_five.retaken`
2. Big Five completion payload should include:
   - `teamId` when available,
   - `userId`/actor reference,
   - all five trait scores (`extraversion`, `agreeableness`, `conscientiousness`, `neuroticism`, `openness`),
   - timestamp,
   - schema version.
3. Add explicit event for adaptation decision update/modify action.
4. Add export request/download events for Story 6.3 execution.

### Story 6.2 Priorities

1. Keep append-only integrity checks and schema-version discipline.
2. Add explicit event for adaptation decision modify/update flow when endpoint is implemented.
3. Implement export request/download telemetry as part of Story 6.3.

## Source Index

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `server/src/routes/auth.routes.ts`
- `server/src/routes/big-five.routes.ts`
- `server/src/routes/issues.routes.ts`
- `server/src/routes/teams.routes.ts`
- `server/src/routes/practices.routes.ts`
- `server/src/services/auth.service.ts`
- `server/src/services/big-five.service.ts`
- `server/src/services/coverage.service.ts`
- `server/src/services/events.service.ts`
- `server/src/services/invites.service.ts`
- `server/src/services/issue.service.ts`
- `server/src/services/members.service.ts`
- `server/src/services/practice-import.service.ts`
- `server/src/services/teams.service.ts`
- `client/src`
