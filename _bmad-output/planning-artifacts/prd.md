---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02-party-mode', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - product-brief-bmad_version-2026-01-14.md
  - brainstorming-session-2026-01-14.md
  - doc/APR.pdf
  - doc/db_schema_v0.dbml
workflowType: 'prd'
documentCounts:
  briefCount: 1
  researchCount: 0
  brainstormingCount: 1
  projectDocsCount: 2
classification:
  projectType: 'Web Application (SaaS-style platform)'
  domain: 'Software Engineering Research / Applied Psychology'
  complexity: 'HIGH'
  projectContext: 'greenfield'
  specialConstraints:
    - '3-week hard deadline'
    - 'Production-quality standards (zero-bug requirement)'
    - 'Must work equally well for student and professional teams'
    - 'Research data integrity critical'
  deploymentScope: 'Pre-recruited teams (4-8 teams, mixed student/professional)'
  researchFocus: 'PhD prototype - personality-practice relationships'
  priorityOrder: 'User Experience First > Data Integrity > Implementation Speed'
scopeDecisions:
  mustHave:
    - 'Self-service signup (name + email + password)'
    - 'Team creation + practice selection'
    - 'Invite system (handles existing and new users)'
    - 'Practice catalog + search/filter'
    - 'Team coverage dashboard (% pillars covered)'
    - 'Big Five questionnaire (44-item IPIP-NEO)'
    - 'Issue submission + team discussion (page-refresh acceptable)'
    - 'Event logging for research audit trail'
    - 'Practice recommendations (alternative practices with same or better pillar coverage)'
  outOfScope:
    - 'Personality-ranked recommendations (Phase 2 - Big Five-informed ranking)'
    - 'Real-time notifications'
    - 'Advanced practice visualizations'
    - 'Analytics dashboard'
    - 'Tutorial/onboarding walkthrough'
userFlows:
  signup: 'Simple form (name + email + password) → Teams view'
  teamCreation: 'Team name + practice selection + pillar config → invite others'
  inviteFlow: 'Email-based → existing user added immediately, new user pending'
  multiTeam: 'User can belong to multiple teams, Teams view shows all'
dataIntegrity:
  bigFive: 'Calculation correctness (44 items, reversed scoring)'
  issues: 'Submission → storage → discussion → resolution (no data loss)'
  coverage: 'Accurate % calculation based on practice selections'
  concurrency: 'Max 8 per team, separate instances, optimistic locking acceptable'
uxPrinciples:
  'No deep menu hierarchies': 'Simple 2-3 step flows for all processes'
  'No tutorial required': 'Self-explanatory interface'
  'Bug-free operation': 'Primary quality metric'
  'Standard UI': 'CSS library OK, no custom design heavy lifting'
partyModeInsights:
  - 'Scope clarity enables 3-week delivery'
  - 'Simplified schema (no ...version tables) critical to timeline'
  - 'Research validity through data integrity + authentic user engagement'
  - 'Testing focused on: auth flows, team creation, Big Five calculation, issue lifecycle'
knownIssues:
  - 'Database schema versioning approach too complex for MVP - should use single update/event table instead of duplicating records with ...version tables'
date: 2026-01-14
author: nicolas
---

# Product Requirements Document - bmad_version

**Author:** nicolas
**Date:** 2026-01-14

## Executive Summary

**bmad_version** is a research-grade web platform enabling development teams to systematically identify and resolve individual friction points with agile practices. Teams submit issues describing specific practice difficulties, receive personality-informed context (Big Five traits), discuss alternatives, and collectively decide adaptations. The platform captures complete event logs for academic analysis of personality-practice relationships over 2–5 months across 6–8 teams.

**MVP Scope (3 weeks):** Self-service signup, team management, practice catalog with coverage tracking, 44-item Big Five questionnaire, issue submission/discussion/decision workflow, practice recommendations (coverage-based), immutable event logging. Desktop-only; page-refresh acceptable; single-tenant per team.

**Product Differentiator:** Semantic pillar-based practice mapping (discover equivalents across frameworks) + Big Five personality integration + coverage-based practice recommendations + collective intelligence workflow + research-grade event logging.

**Success Definition:** Zero critical bugs; all user stories done by week 3; deployable to 4–8 teams; Big Five calculations match IPIP-NEO standard; event logs 100% accurate.

## Success Criteria

### User Success

- Developers: Issue submission friction-free (< 2 minutes); discussion is clear; adaptation decisions recorded; timelines self-managed by the team.
- Scrum Masters: Can guide full lifecycle (submission → discussion → decision → resolution) with unclunky flow; timing is team-managed.

### Business/Research Success

- Data collection: All key DB-affecting events are logged (excluding account/team composition); logs are exportable and queryable.
- Pattern discovery: 6–8 teams over 2–5 months; Big Five scoring aligns with IPIP-NEO; “clear pattern” definition deferred to analysis phase.

### Technical Success

- MVP delivery (week 3): All user stories meet DoD; zero critical bugs; deployable for all teams; auth, team management, Big Five, and issue lifecycle operate without data loss.
- Event logging: Full audit trail of DB-affecting events with reliable export; traceable end-to-end.
- Big Five: 44-item questionnaire with correct reversed scoring; persisted and retrievable.

### Measurable Outcomes

| Criterion | Target | Validation |
|-----------|--------|-----------|
| MVP completion | All user stories done by week 3 | User story acceptance checklist |
| Stability | Zero critical bugs during initial pilot | Bug tracking / team feedback |
| Data quality | Event logs 100% accurate | End-to-end trace checks |
| Big Five accuracy | Matches IPIP-NEO scoring | Algorithm validation tests |
| User friction | Issue submission < 2 minutes | Quick UX checks |
| Deployment readiness | Supports simultaneous 4–8 teams | Deployment validation |

## Product Scope

### MVP - Minimum Viable Product

- Self-service signup; team creation with practice selection and pillar config; email invites (existing/new users with pending state); practice catalog + search; coverage dashboard; Big Five questionnaire; issue submission + page-refresh discussion; practice recommendations (coverage-based); event logging and export.

### Growth Features (Post-MVP)

- Personality-ranked recommendations (Big Five-informed ranking); real-time notifications; advanced practice visualizations; analytics dashboards; onboarding walkthrough.

### Vision (Future)

- Personality-informed recommendations; multi-team insights; richer visualizations; longitudinal research tooling.

## User Journeys

### Journey 1: Primary User — Happy Path

Opening: User signs up (name, email, password) and lands on Teams view (empty state with clear call to action).

Rising Action: Creates a new team, sets team name, selects practices used, configures pillar specifics. Invites teammates by email. Existing users are added immediately; new users show as pending until signup.

Climax: On the dashboard, the user reviews coverage score, opens Practice Catalog, adds/removes practices, and submits an issue describing a specific difficulty. Team members discuss via comments and record an adaptation decision.

Resolution: Issue shows status updated to “Adaptation in progress” and later “Evaluated”. Event logging captures all DB-affecting actions for research.

### Journey 2: Edge Case — Stale Data on Submit (Optimistic Concurrency)

Opening: User edits an existing issue while another teammate updated the same record moments before.

Rising Action: User clicks “Save”; backend detects version mismatch and returns a non-destructive 409 Conflict with latest server state.

Climax: UI presents a gentle banner: “This item changed since you opened it.” Shows a diff (your edits vs latest), offers three clear options: (1) Apply latest and re-apply your changes, (2) Overwrite (if permitted), (3) Save your edits as a new comment/update.

Resolution: User selects “Apply latest and re-apply”, submit succeeds. Draft is auto-saved locally during editing, so no work is lost.

### Journey 3: Edge Case — Invite Flow Recovery

Opening: A team member invites multiple emails; one is a typo, one belongs to an existing user, one new.

Rising Action: System marks invites as: Added (existing), Pending (new), Failed (invalid email). The team member sees status chips with actions.

Climax: The team member corrects the failed invite, resends; pending invite auto-resolves when the new user signs up.

Resolution: Teams view shows all memberships across teams. Event log records invite create/update states; no duplicate members due to idempotent backend.

### Journey 4: Data Export — Research Audit Trail

Opening: User needs to export events for analysis.

Rising Action: Opens “Data Export” panel, selects date range and event types (issues, comments, practice changes, Big Five completion).

Climax: Clicks “Export CSV/JSON”; server returns a file built from the event log.

Resolution: Export completes; user verifies sample rows. No account or team composition events included per research rules.

## Technical & Domain Requirements

### Security & Data Integrity

- Passwords stored as bcrypt hashes (min 10 rounds); JWT sessions over HTTPS-only.
- Team isolation enforced at database level (users see only their team's data).
- Database connections use parameterized queries (SQL injection prevention).
- Event logs immutable (append-only); no deletion except manual batch purge at experiment end.
- Big Five questionnaire data stored exactly as submitted; calculations verified against IPIP-NEO algorithm.
- Transactional consistency for issue creation and comments (all-or-nothing).

### Architecture & Technology Stack

- Frontend: React + TypeScript.
- Backend: Node/Express.
- Database: PostgreSQL (single normalized schema without version tables; immutable event log for all DB-affecting actions excluding auth/team composition).
- Data Model: Simplified, optimized for 3-week MVP; no complex versioning or multi-tenancy plumbing.
- Concurrency: Optimistic locking with version field; server returns 409 Conflict; client offers diff/merge UI; local draft auto-save.

### Deployment & Hosting

- Single-tenant per team instance (isolation by deployment).
- Per-team database and runtime separated.
- Manual instance provisioning script for MVP (no in-app provisioning).
- No data residency constraints; no external system integrations required.
- SMTP server provided externally for invite emails.

### Reliability & Compliance

- No institutional research policy enforcement required.
- No mandatory export protocol; researcher accesses DB directly.
- Data retention: indefinite during experiment; manual erase at end.
- Page-refresh acceptable for discussions; no real-time transport required.
- No rate limiting for MVP (rely on server-side validations + SMTP throttling).
- Manual backup procedure documented for per-team instances.
- PostgreSQL ACID guarantees sufficient for research data integrity.

### Access Control (Single Role: Team Member)

**Note:** All users are equal team members with no role hierarchy.

- All team members can: create team; configure practices and pillar specifics; invite members; manage team membership; submit issues; comment in discussions; view coverage and catalog; manage own Big Five profile; view/export events.
- No permission restrictions or owner-only actions in MVP.

### Practice Recommendation Logic (MVP - Coverage-Based)

**Scope:** MVP recommendations focus on pillar coverage equivalence, not personality matching.

**Algorithm:**
1. **Same-Pillar Recommendations:** When viewing a practice, system suggests all other practices that cover the exact same set of pillars.
   - Example: If "Daily Standup" covers [Communication, Feedback], show all practices that cover [Communication, Feedback]
   
2. **Gap-Filling Recommendations:** When viewing team coverage, system suggests practices that cover the team's missing pillars.
   - Example: If team covers 14/19 pillars, show practices that cover any of the 5 missing pillars
   - Sort by: practices covering most missing pillars first

3. **Presentation Rules:**
   - Recommendations appear as a sidebar on issue detail or practice catalog views
   - No ranking by personality traits in MVP
   - Clear labeling: "Alternative practices covering the same pillars" vs "Practices covering missing pillars"
   - Non-intrusive; optional for users to explore

**Future (Phase 2 - Post-MVP):**
- Personality-informed ranking: Boost recommendations for practices matching user's Big Five profile
- Correlation analysis: Track which practice-personality combinations lead to successful adaptations
- Personalized suggestions: "Based on your [Introversion, Low Conscientiousness], consider practices with [Async, Flexible] characteristics"

### API Endpoint Specification (MVP)

- Auth: POST /api/auth/register; POST /api/auth/login; GET /api/auth/me
- Teams: GET/POST /api/teams; GET /api/teams/:id; POST /api/teams/:id/invites
- Practices: GET /api/practices (filters); GET /api/practices/:id; POST/DELETE /api/teams/:id/practices
- Practice Recommendations: GET /api/teams/:id/practices/:practiceId/alternatives (same-pillar); GET /api/teams/:id/recommendations/coverage-gaps (missing pillars)
- Coverage: GET /api/teams/:id/coverage
- Issues: GET/POST /api/teams/:id/issues; GET/POST /api/issues/:id/comments; POST /api/issues/:id/decision
- Events: GET /api/events (filterable by type/date); optional export to CSV/JSON

### Implementation Notes

- Idempotent invites prevent duplicate memberships; clear statuses (added/pending/failed) with retry.
- Event log schema: actor_id, team_id, entity_type, entity_id, action, payload_snapshot, created_at.
- No hard deletes for research-critical entities; use status fields; retain events until manual purge.
- Recommendation algorithms: Pillar set matching (same-pillar) and set difference operations (coverage gaps); no ranking in MVP. 
## Project Scoping & Phased Development

### MVP Strategy & Deliverable

**MVP Approach:** Experience MVP — friction-free core flows teams can use immediately.

**MVP Feature Set (Phase 1 — Week 3):**
Self-service signup → Teams view → Create team → Configure practices & pillars → Invite teammates (existing + new) → Practice catalog with coverage dashboard → Big Five questionnaire → Issue submission/discussion/decision recording → Event logging and export → Optimistic concurrency with conflict recovery.

**Resource Model:** Solo full-stack or small team (frontend + backend); SMTP configured; per-team instance provisioning script (manual).

### Post-MVP Roadmap

**Phase 2 (Growth):**
Recommendation engine, real-time updates, advanced practice visualizations, analytics dashboard, onboarding walkthrough.

**Phase 3 (Expansion):**
Personality-informed recommendations v2, multi-team insights, richer visualizations, longitudinal research tooling.

### Risk Mitigation

**Technical:** Simplified schema (immutable event log, no version tables); idempotent invites; optimistic concurrency with user-friendly diff/merge UI.

**Data Integrity:** Event logging complete and verified; Big Five calculations validated against IPIP-NEO; transactional consistency enforced.

**Timeline:** Tight scope (25 FRs + 9 NFRs); manual tenancy provisioning acceptable; coverage-based recommendations can be implemented efficiently; defer personality-ranked recommendations to Phase 2; team focus on auth, team mgmt, Big Five, issue lifecycle, and practice recommendations.
## Functional Requirements

### User Management

- FR1: User can register with name, email, password.
- FR2: User can log in and view current session details.
- FR3: User can view all teams they belong to.

### Team Management

- FR4: User can create a team with name, practices, pillar specifics.
- FR5: Team member can invite users by email.
- FR6: Team member can see invite statuses (added, pending, failed).
- FR7: Team member can manage team membership (add/remove).

### Practice Catalog & Coverage

- FR8: User can browse practices with search and filters.
- FR9: User can add/remove practices to the team portfolio.
- FR10: User can view team coverage (% pillars covered).

### Big Five Questionnaire

- FR11: User can complete the 44-item IPIP-NEO questionnaire.
- FR12: User can view their Big Five profile scores.

### Issues & Discussions

- FR13: User can submit an issue linked to a practice with description.
- FR14: User can comment in the issue thread.
- FR15: User can record an adaptation decision on an issue.
- FR16: User can view issue status updates over time.

### Event Logging & Export

- FR17: System logs DB-affecting actions (excluding auth/team composition).
- FR18: User can filter and export events by type and date range.

### Practice Recommendations

- FR18A: User can view alternative practices that cover the same pillars as a selected practice.
- FR18B: User can view practices that cover missing pillars in their team's current coverage.

### Concurrency & Recovery UX

- FR19: System detects conflicts on save and surfaces a non-destructive resolution flow.
- FR20: System auto-saves local drafts during editing to prevent data loss.

### Permissions & Access

- FR21: Team members can create teams, configure practices, invite others, and manage membership.
- FR22: Team members can submit issues, comment in discussions, view coverage/catalog, and manage their Big Five profile.

### Instance Provisioning (Operational)

- FR23: Admin can provision per-team instances via manual script (outside UI; documented).

## Non-Functional Requirements

### Security

- NFR1: All passwords stored as bcrypt hashes (min 10 rounds).
- NFR2: All user sessions use JWT tokens over HTTPS-only.
- NFR3: Database connections use parameterized queries to prevent SQL injection.
- NFR4: Team isolation enforced at database level (users see only their team's data).

### Data Integrity

- NFR5: Event logs are immutable (append-only; no deletion except manual batch purge).
- NFR6: Big Five questionnaire data stored exactly as submitted; calculations verified against IPIP-NEO algorithm.
- NFR7: Transactional consistency for issue creation and comment addition (all-or-nothing).

### Reliability (Research Data)

- NFR8: No data loss on server restarts (PostgreSQL ACID guarantees sufficient).
- NFR9: Manual backup procedure documented for per-team instances.