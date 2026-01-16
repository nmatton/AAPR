---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
  - product-brief-bmad_version-2026-01-14.md
  - project-context.md
  - pillars_and_categories.json
workflowType: 'epics-and-stories'
project_name: 'bmad_version'
user_name: 'nicolas'
date: '2026-01-15'
epicStructure: 'Sequential delivery (Epic 1 → 2 → 3 → 4 → 5, Epic 6 parallel)'
totalEpics: 6
totalFRsCovered: 20
totalNFRsCovered: 18
---

# bmad_version - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **bmad_version**, decomposing the requirements from the PRD, Architecture, and UX Design into implementable user stories organized by user value.

The platform is a research-grade web application enabling development teams to systematically identify, discuss, and resolve individual friction points with agile practices through personality-informed collective decision-making.

---

## Requirements Inventory

### Functional Requirements (20 total)

**FR1-3: User Management**
- FR1: User can register with name, email, password
- FR2: User can log in and view current session details
- FR3: User can view all teams they belong to

**FR4-6: Team Management**
- FR4: Team member can create a team with name, practices, pillar specifics
- FR5: Team member can invite teammates by email
- FR6: Team member can see invite statuses (added, pending, failed) and manage team membership

**FR8-10: Practice Catalog & Coverage**
- FR8: User can browse practices with search and filters
- FR9: User can add/remove practices to the team portfolio
- FR10: User can view team coverage (% pillars covered)

**FR11-12: Big Five Questionnaire**
- FR11: User can complete the 44-item IPIP-NEO questionnaire
- FR12: User can view their Big Five profile scores

**FR13-18: Issues & Discussions**
- FR13: User can submit an issue linked to a practice with description
- FR14: User can comment in the issue thread
- FR15: User can record an adaptation decision on an issue
- FR16: User can view issue status updates over time
- FR17: System logs DB-affecting actions (excluding auth/team composition)
- FR18: User can view system-generated recommendations for alternative practices (coverage-based pillar matching)

**FR19: Concurrency & Recovery UX**
- FR19: System detects conflicts on save and surfaces a non-destructive resolution flow with auto-draft preservation

**FR20: Instance Provisioning (Operational)**
- FR20: Admin can provision per-team instances via manual script (outside UI; documented)

### Non-Functional Requirements (18 total)

**Security (NFR1-4)**
- NFR1: All passwords stored as bcrypt hashes (min 10 rounds)
- NFR2: All user sessions use JWT tokens over HTTPS-only
- NFR3: Database connections use parameterized queries (SQL injection prevention)
- NFR4: Team isolation enforced at database level (users see only their team's data)

**Data Integrity (NFR5-7)**
- NFR5: Event logs are immutable (append-only; no deletion except manual batch purge)
- NFR6: Big Five questionnaire data stored exactly as submitted; calculations verified against IPIP-NEO algorithm
- NFR7: Transactional consistency for issue creation and comment addition (all-or-nothing)

**Reliability & Deployment (NFR8-9)**
- NFR8: No data loss on server restarts (PostgreSQL ACID guarantees)
- NFR9: Manual backup procedure documented for per-team instances

**UX & Performance (NFR10-11)**
- NFR10: Desktop-only interface (no responsive design required)
- NFR11: Page-refresh acceptable (no WebSocket/real-time required)

**API & Data Format (NFR12-14)**
- NFR12: REST API with snake_case DB, camelCase API/TS, proper HTTP status codes
- NFR13: Structured error responses with { code, message, details, requestId }
- NFR14: Pagination format: { items, page, pageSize, total }

**Technology Stack (NFR15-17)**
- NFR15: Frontend: React 18.2 + TypeScript + TailwindCSS
- NFR16: Backend: Node.js + Express + Prisma 5.0 + PostgreSQL 14+
- NFR17: 3-week MVP delivery timeline

**Accessibility (NFR18)**
- NFR18: WCAG AA accessibility (keyboard navigation, screen readers, contrast ratios)

### Additional Requirements from Architecture & UX

**Architecture Requirements:**
- Starter template: minimal-vite-express
- PostgreSQL normalized schema (no version tables)
- Practice JSON import pipeline
- Event log schema: { actor_id, team_id, entity_type, entity_id, action, payload_snapshot, created_at }
- Frontend feature-first structure
- Backend layered architecture (routes → controllers → services → repositories)
- Zustand state management by domain
- Three-path conflict resolution UI: apply latest + re-apply, overwrite (if permitted), save as comment
- Comprehensive error handling with requestId tracking
- Docker Compose for local development

**UX Requirements:**
- Issue submission as primary hero flow (< 2 minutes)
- Conflict resolution with safe, reversible diffs and auto-saved drafts
- Transparent, non-intrusive event logging indicators
- Personality context gentle sidebar hints (not prescriptive)
- Core components: Issue Detail card, Practice Catalog sidebar, Coverage Dashboard, Personality Context sidebar, Activity Feed, Conflict Resolution modal
- TailwindCSS design system with calm color palette
- Keyboard shortcuts (Ctrl+I for submit, Ctrl+F for search)
- Loading skeletons and toast notifications
- Clear visual feedback at every step

### FR Coverage Map

| Epic | User Value | FRs Covered | NFRs Supported |
|------|-----------|-------------|----------------|
| **Epic 1: Authentication & Team Onboarding** | Fast team setup from signup through team creation and member invites | FR1-7, FR20 | NFR1-4, NFR12-17 |
| **Epic 2: Practice Catalog & Coverage** | Team visibility into practice portfolio and coverage gaps | FR8-10 | NFR10-11, NFR12-14 |
| **Epic 3: Big Five Personality Profiling** | Self-awareness of personality traits and behavioral style | FR11-12 | NFR6, NFR12-14 |
| **Epic 4: Issue Submission & Discussion** | Structured practice friction identification, team dialogue, and conflict resolution | FR13-14, FR19 | NFR5-7, NFR12-14, NFR18 |
| **Epic 5: Adaptation Decision & Tracking** | Recorded practice changes with coverage-based recommendations and full audit trail | FR15-18 | NFR5-6, NFR12-14 |
| **Epic 6: Research Data Integrity** | Complete, queryable, immutable event logs for analysis | FR17 | NFR5-9, NFR12-14 |

---

## Epic Breakdown

### Epic 1: Authentication & Team Onboarding

**Epic Goal:** Enable users to quickly sign up, log in, and onboard their first team with practice selection, team member invitations, and full team membership management.

**User Value:** Friction-free entry point; teams can start using the platform within 10 minutes of signup. Teams have complete control over who participates.

**FRs Covered:** FR1-7, FR23

**Scope:** Self-service signup → login → team creation → practice selection → pillar configuration → email invitations → invite status tracking → membership management → per-team instance provisioning.

**Stories:**

#### Story 1.0: Set Up Initial Project from Starter Template

As a developer,
I want to set up the initial project from the minimal-vite-express starter template,
So that I have a working foundation with React + TypeScript + Vite (frontend) and Node.js + Express (backend).

**Acceptance Criteria:**

- **Given** I'm starting the project
  **When** I clone the minimal-vite-express repository
  **Then** I have both `/client` (React + Vite + TypeScript) and `/server` (Node.js + Express) directories

- **Given** the repository is cloned
  **When** I run `npm install` in both client and server directories
  **Then** all dependencies are installed successfully

- **Given** dependencies are installed
  **When** I run `npm run dev` in the server directory
  **Then** the Express server starts on `http://localhost:3000`

- **Given** the server is running
  **When** I run `npm run dev` in the client directory
  **Then** the Vite dev server starts on `http://localhost:5173` with hot module replacement

- **Given** both servers are running
  **When** I access `http://localhost:5173` in my browser
  **Then** I see the default starter template landing page

- **Given** the template is running
  **When** I verify the tech stack
  **Then** I confirm:
    - Frontend: React 18.2 + TypeScript + Vite + TailwindCSS
    - Backend: Node.js + Express
    - Ready for Prisma integration

- **Given** the initial setup is complete
  **When** I configure environment variables
  **Then** I create `.env` files for both client and server with placeholder values:
    - Server: `DATABASE_URL`, `JWT_SECRET`, `PORT`
    - Client: `VITE_API_URL`

- **Given** the project structure is ready
  **When** I verify the build process
  **Then** `npm run build` successfully creates production bundles for both client and server

- **Given** the starter template setup is complete
  **When** the setup completes
  **Then** an event is logged: `{ action: "project.initialized", template: "minimal-vite-express", timestamp }`

---

#### Story 1.1: User Registration with Email Validation

As a developer,
I want to sign up with my name, email, and password,
So that I can create an account and access the platform.

**Acceptance Criteria:**

- **Given** I'm on the signup page
  **When** I enter valid name, email, and password
  **Then** my account is created and I'm redirected to Teams view (empty state)

- **Given** I'm on the signup page
  **When** I enter an invalid email format
  **Then** I see an inline error message and the form is not submitted

- **Given** I'm on the signup page
  **When** I enter a password < 8 characters
  **Then** I see an inline error message and the form is not submitted

- **Given** I'm on the signup page
  **When** an email already exists in the system
  **Then** I see an error: "Email already registered" and the form is not submitted

- **Given** I've completed signup
  **When** I refresh the page or close the browser
  **Then** my session persists (JWT stored securely)

---

#### Story 1.2: User Login with Session Management

As a developer,
I want to log in with email and password,
So that I can access my teams and resume my work.

**Acceptance Criteria:**

- **Given** I'm on the login page
  **When** I enter valid email and password
  **Then** I'm redirected to Teams view and my session is active

- **Given** I'm on the login page
  **When** I enter an invalid email or password
  **Then** I see a generic error: "Invalid email or password" (no user enumeration)

- **Given** I'm logged in
  **When** I request `/api/auth/me`
  **Then** I see my user details (id, name, email, created_at)

- **Given** I'm logged in
  **When** I click "Logout"
  **Then** my JWT is invalidated and I'm redirected to login page

- **Given** I've logged in on device A
  **When** I log in on device B
  **Then** both sessions are active independently (no session limit per user for MVP)

---

#### Story 1.3: Teams List View with Multi-Team Support

As a developer,
I want to see all teams I belong to,
So that I can switch between teams and manage my involvement.

**Acceptance Criteria:**

- **Given** I'm logged in and belong to 1 team
  **When** I view the Teams page
  **Then** I see the team card with: team name, member count, practice count, coverage %

- **Given** I'm logged in and belong to 3 teams
  **When** I view the Teams page
  **Then** I see all 3 team cards in a list

- **Given** I'm logged in with no teams
  **When** I view the Teams page
  **Then** I see an empty state: "No teams yet. Create one or wait for an invite." with [Create Team] button

- **Given** I'm on the Teams page and see a team I own
  **When** I click the team
  **Then** I'm navigated to the Team Dashboard (coverage, issues, practices)

- **Given** I'm on the Teams page
  **When** I click [Create Team]
  **Then** I'm taken to the Team Creation form

---

#### Story 1.4: Team Creation with Practice Selection

As a **team member**,
I want to **create a new team, select practices we use, and configure pillar specifics**,
So that **we can start identifying practice friction**.

**Acceptance Criteria:**

- **Given** I'm on the Create Team form
  **When** I enter a team name and click [Next]
  **Then** I proceed to practice selection

- **Given** I'm on the practice selection step
  **When** I browse the practice catalog (searchable, filtered by pillar)
  **Then** I can select/deselect practices used by my team

- **Given** I've selected practices
  **When** I click [Create Team]
  **Then** the team is created with all selected practices, and I'm redirected to Team Dashboard

- **Given** I'm creating a team
  **When** I don't select any practices
  **Then** I see a warning: "Please select at least one practice" and can't proceed

- **Given** I've created a team
  **When** I go to Team Dashboard
  **Then** I see Coverage % calculated based on pillars covered by selected practices

---

#### Story 1.5: Email-Based Team Member Invitations

As a team member,
I want to invite teammates by email and have them notified,
So that they can join the team and contribute.

**Acceptance Criteria:**

- **Given** I'm on the Team Dashboard
  **When** I click [Invite Members] and enter a valid email of a NEW user (doesn't exist in system)
  **Then** an invite is created with status: "Pending"
  **And** an email is sent to that address with:
    - Subject: "You're invited to join [Team Name] on bmad_version"
    - Body: "You've been invited to join the team '[Team Name]' on bmad_version. Please sign up using this email address to access the platform."
    - CTA: [Create Account] button/link
  **And** an event is logged: `{ action: "invite.created", inviteId, teamId, email, isNewUser: true }`

- **Given** I'm on the Team Dashboard
  **When** I click [Invite Members] and enter a valid email of an EXISTING user
  **Then** the user is added to the team immediately, status: "Added"
  **And** an email is sent to them with:
    - Subject: "You've been added to the team [Team Name]"
    - Body: "You've been added to the team '[Team Name]' on bmad_version. Click the link to access it now."
    - CTA: [View Team] button/link
  **And** an event is logged: `{ action: "team_member.added", teamId, userId }`

- **Given** I enter an invalid email format
  **When** I try to send the invite
  **Then** I see an error: "Invalid email format" and the invite is not sent

- **Given** I've sent an invite to a new user email
  **When** that user signs up with the same email
  **Then** they're automatically added to the team (invite auto-resolves)
  **And** an event is logged: `{ action: "invite.auto_resolved", inviteId, userId }`

- **Given** I've invited multiple users
  **When** I see the invite list
  **Then** I can see all invites with statuses: Added, Pending (new users), Failed (email send errors)
  **And** I can [Resend Email] for Pending or Failed invites

- **Given** I invite a user who's already on the team
  **When** I send the invite
  **Then** I see a warning: "User is already a team member" and the invite is not created (idempotent)

- **Given** an invite email fails to send (e.g., SMTP error, invalid address)
  **When** the system detects the failure
  **Then** the invite status is set to "Failed"
  **And** I see [Retry] option to resend the email
  **And** an event is logged: `{ action: "invite.email_failed", inviteId, teamId, error }`

---

#### Story 1.6: Invite Status Management & Membership View

As a **team member**,
I want to **see who's been invited, their status, and manage membership**,
So that **I know who's on the team and can fix invite issues**.

**Acceptance Criteria:**

- **Given** I'm on the Team Members panel
  **When** I view the membership list
  **Then** I see all members with: name, email, join date, invite status (Added/Pending/Failed)

- **Given** a teammate has a "Pending" invite
  **When** I hover over their status
  **Then** I see: "Awaiting signup" with option to [Resend Invite]

- **Given** an invite has "Failed" status
  **When** I click [Retry]
  **Then** the email is resent and status updates to "Pending"

- **Given** I'm viewing members
  **When** I click on a member
  **Then** I can see their Big Five profile (if completed) and issues they've submitted

- **Given** a member is on the team
  **When** I click [Remove]
  **Then** they're removed and can't access the team (event logged)

---

### Epic 2: Practice Catalog & Coverage

**Epic Goal:** Provide transparent visibility into agile practice portfolio and coverage gaps based on pillar mapping.

**User Value:** Teams see which agile principles (pillars) are covered by their selected practices and identify gaps. Teams can add, remove, and create practices.

**FRs Covered:** FR8-10

**Scope:** Practice catalog with search/filter → add/remove/create practices → coverage dashboard (pillar + category level) → real-time recalculation.

**Stories:**

#### Story 2.0: Import Practice Data from JSON

As a **system administrator**,
I want to **import the practice data from JSON files into the database**,
So that **the practice catalog is available for teams to browse and select**.

**Acceptance Criteria:**

- **Given** the application is initializing
  **When** I run the database seeding script
  **Then** all practices from the JSON source are imported into the practices table

- **Given** the import runs
  **When** practices are loaded from JSON
  **Then** each practice record includes: id, title, goal/objective, category, pillars covered (array of pillar IDs)

- **Given** practice data is imported
  **When** I query the practices table
  **Then** I see all 19 pillars across 5 categories properly mapped:
    - VALEURS HUMAINES (4 pillars)
    - FEEDBACK & APPRENTISSAGE (4 pillars)
    - EXCELLENCE TECHNIQUE (4 pillars)
    - ORGANISATION & AUTONOMIE (4 pillars)
    - FLUX & RAPIDITÉ (3 pillars)

- **Given** practices are imported
  **When** the import completes
  **Then** each practice is marked as global (not team-specific) with `is_global = true`

- **Given** the import process
  **When** a practice JSON record is processed
  **Then** validation ensures:
    - Title is not empty (2-100 chars)
    - Goal/objective is not empty (1-500 chars)
    - At least 1 pillar is assigned
    - Category is one of the 5 valid categories

- **Given** invalid practice data is encountered
  **When** the import runs
  **Then** validation errors are logged and the import continues with valid records

- **Given** the import completes
  **When** all practices are in the database
  **Then** an event is logged: `{ action: "practices.imported", count, timestamp }`

- **Given** practices have been imported
  **When** a subsequent import runs
  **Then** duplicate practices are not re-inserted (idempotent import based on title + category)

- **Given** the catalog data exists
  **When** Story 2.1 runs
  **Then** the practice list is immediately available to load and display

---

#### Story 2.1: Load and Display Practice Catalog

As a **team member**,
I want to **browse the full practice catalog with names, goals, and pillar mappings**,
So that **I understand what practices are available and which pillars they cover**.

**Acceptance Criteria:**

- **Given** I'm on the Practice Catalog page
  **When** the page loads
  **Then** I see a list of all practices with: name, goal/objective, pillars covered (as colored badges), category

- **Given** I'm viewing the catalog
  **When** I see a practice
  **Then** each practice shows: title (2-100 chars), goal/objective (1-500 chars describing what the practice aims to achieve), visual pillar indicators (colored badges for each pillar covered)

- **Given** I'm on the catalog page
  **When** the page loads for the first time
  **Then** I see loading skeleton placeholders while practices are fetched from the server

- **Given** the practices have loaded
  **When** I scroll through the list
  **Then** the list displays smoothly without lag (all practices visible within 2 seconds)

- **Given** I'm viewing practices
  **When** I click on a practice name
  **Then** a detail sidebar opens showing: goal, all pillars covered, category, any additional notes

- **Given** practices are displayed
  **When** the server returns 0 practices
  **Then** I see a message: "No practices available. Please contact support."

- **Given** I'm viewing the catalog
  **When** the API request fails
  **Then** I see an error message: "Unable to load practices. Please refresh the page."
  **And** a [Retry] button is available

- **Given** I'm on the catalog page
  **When** practices load successfully
  **Then** an event is logged: `{ action: "catalog.viewed", teamId, practiceCount, timestamp }`

---

#### Story 2.2: Search and Filter Practices by Pillar

As a **team member**,
I want to **search for specific practices and filter by pillar**,
So that **I can quickly find practices that cover the principles I care about**.

**Acceptance Criteria:**

- **Given** I'm on the Practice Catalog
  **When** I click the search box and type "standup"
  **Then** the list updates instantly to show matching practices (e.g., "Daily Standup", "Async Standup")
  **And** matches are highlighted in the practice names

- **Given** I've searched for practices
  **When** I clear the search box
  **Then** the full practice list reappears immediately (no page reload)

- **Given** I'm searching for "standup"
  **When** I get 0 results
  **Then** I see: "No practices found for 'standup'. Try a different search."

- **Given** I'm on the catalog
  **When** I click the filter dropdown for "Pillar"
  **Then** I see all 19 pillars as selectable options

- **Given** I select pillar "Communication"
  **When** the filter is applied
  **Then** I see only practices that cover Communication pillar
  **And** the filter indicator shows "Communication" is active

- **Given** I've filtered by one pillar
  **When** I select a second pillar (e.g., "Feedback")
  **Then** I see practices that cover EITHER Communication OR Feedback (OR logic)
  **And** the filter shows both pillars selected

- **Given** I've applied filters
  **When** I click [Clear Filters]
  **Then** all filters reset and the full practice list reappears

- **Given** I'm filtering or searching
  **When** I see updated results
  **Then** a "Results updated" toast appears briefly (2-3 seconds)

- **Given** I search/filter
  **When** results change
  **Then** an event is logged: `{ action: "catalog.searched", teamId, query, pillarsSelected, timestamp }`

---

#### Story 2.3: Add Selected Practices to Team Portfolio

As a **team member**,
I want to **add practices we use to our team portfolio from a dedicated view**,
So that **our practice list reflects what we actually do**.

**Acceptance Criteria:**

- **Given** I'm on the Team Dashboard
  **When** I click [Add Practices] or [Manage Practices]
  **Then** I'm taken to a dedicated "Add Practices" view
  **And** I see a list of all practices we're NOT yet using (unselected practices only)

- **Given** I'm on the Add Practices view
  **When** I view the list
  **Then** each practice shows: title, goal/objective, pillars covered (colored badges), category

- **Given** I find a practice we want to use (e.g., "Sprint Planning")
  **When** I click [Add to Team] or select the practice
  **Then** the practice is added to our team's portfolio
  **And** I see a success message: "Practice added to team portfolio"
  **And** the practice disappears from the "unselected" list

- **Given** a practice is added to our team
  **When** the addition completes
  **Then** an event is logged: `{ action: "practice.added", teamId, practiceId, timestamp }`
  **And** the coverage % is recalculated and updated on the page

- **Given** I'm on the Add Practices view
  **When** the operation fails (server error)
  **Then** I see an error message: "Unable to add practice. Please try again."
  **And** the practice remains in the unselected list (no optimistic update on failure)

- **Given** I've added practices
  **When** I return to the Team Dashboard
  **Then** the new practices appear in our team's practice list
  **And** coverage is updated

---

#### Story 2.4: Remove Practices from Team Portfolio

As a **team member**,
I want to **remove practices we no longer use from our team portfolio**,
So that **our practice list stays current with our actual practices**.

**Acceptance Criteria:**

- **Given** I'm viewing our team's practice list (practice editing page)
  **When** I see a practice we're using
  **Then** there's a [Remove] button or action menu next to the practice

- **Given** I find a practice we want to remove
  **When** I click [Remove]
  **Then** I see a confirmation dialog: "Remove '[Practice Name]' from your team?"
  **And** the dialog shows which pillars we'll lose coverage in (if any)

- **Given** I've confirmed removal
  **When** I click [Confirm Remove]
  **Then** the practice is removed from our team
  **And** I see a success message: "Practice removed from team portfolio"

- **Given** a practice is removed
  **When** the removal completes
  **Then** an event is logged: `{ action: "practice.removed", teamId, practiceId, timestamp }`
  **And** the coverage % is recalculated and updated in real-time

- **Given** I'm removing a practice
  **When** the operation fails (server error)
  **Then** I see an error message: "Unable to remove practice. Please try again."
  **And** the practice remains in the team's list

- **Given** a practice is removed
  **When** the removal completes
  **Then** any gap pillars created by this removal are highlighted
  **And** I see a suggestion: "Consider adding a practice that covers [Pillar Name]"

---

#### Story 2.5: Create New Practice from Scratch or as Template

As a **team member**,
I want to **create a new practice either from scratch or by duplicating an existing practice**,
So that **we can adapt or define practices specific to our team's needs**.

**Acceptance Criteria:**

- **Given** I'm on the Team Dashboard or Practice list
  **When** I click [Create New Practice] or [+ New Practice]
  **Then** I see two options:
    1. [Create from Scratch] - Start with empty form
    2. [Use Existing as Template] - Duplicate an existing practice

- **Given** I select [Create from Scratch]
  **When** the form opens
  **Then** I see editable fields: title, goal/objective, pillars to cover (multi-select), category

- **Given** I'm creating a practice from scratch
  **When** I fill in the form (title, goal, select pillars)
  **Then** I can click [Create Practice]
  **And** the practice is created and added to our team's portfolio
  **And** a success message: "New practice created: [Practice Name]"

- **Given** I select [Use Existing as Template]
  **When** the dialog opens
  **Then** I see a list of all practices (team + catalog practices)
  **And** I can select one to duplicate

- **Given** I've selected a practice to duplicate
  **When** I click [Duplicate]
  **Then** the form opens with the selected practice's data pre-filled
  **And** the title shows: "[Original Name] (Copy)"
  **And** I can edit any field before creating

- **Given** I've edited the duplicated practice
  **When** I click [Create Practice]
  **Then** the new practice is created with my edits
  **And** an event is logged: `{ action: "practice.created", teamId, practiceId, createdFrom: "original_practice_id", timestamp }`

- **Given** I'm creating a practice from scratch
  **When** I don't fill in required fields (title, at least one pillar)
  **Then** I see validation errors: "Title is required", "Select at least one pillar"
  **And** I can't click [Create Practice]

- **Given** I've created a new practice
  **When** the creation completes
  **Then** the practice is added to my team's portfolio (not the global catalog)
  **And** coverage % is recalculated
  **And** an event is logged: `{ action: "practice.created", teamId, practiceId, isCustom: true, timestamp }`

---

#### Story 2.6: View Team Coverage at Pillar Level

As a **team member**,
I want to **see what percentage of agile pillars our team covers**,
So that **we know if we're missing important principles**.

**Acceptance Criteria:**

- **Given** I'm on the Team Dashboard
  **When** I view the Coverage section
  **Then** I see: "Coverage: X/19 pillars (Y%)" with a visual progress bar

- **Given** my team has selected 3 practices
  **When** I view the coverage
  **Then** the coverage % is correctly calculated based on pillar mapping (e.g., 14/19 = 74%)

- **Given** I'm viewing coverage
  **When** I see the pillar breakdown
  **Then** I see two sections: "Covered Pillars" (green) and "Gap Pillars" (gray)
  **And** each pillar is listed with its name and a badge showing if it's covered

- **Given** the Covered Pillars section is displayed
  **When** I click on a pillar name
  **Then** I see which practices cover that pillar
  **And** a brief description of what that pillar means

- **Given** the Gap Pillars section is displayed
  **When** I click on a gap pillar
  **Then** I see a suggestion: "Practices that cover this pillar" with a list of available practices
  **And** I can click [Add] to quickly add one

- **Given** coverage is calculated
  **When** I add a new practice to the team
  **Then** the coverage % updates instantly (no page refresh needed)
  **And** the pillar breakdown updates immediately

- **Given** I'm viewing coverage
  **When** the calculation completes
  **Then** an event is logged: `{ action: "coverage.calculated", teamId, coveragePercent, coveredPillars, timestamp }`

---

#### Story 2.7: View Team Coverage by Category

As a **team member**,
I want to **see coverage broken down by agile category (Values, Feedback, Excellence, Org, Flow)**,
So that **I understand which domains we're strong in and which need attention**.

**Acceptance Criteria:**

- **Given** I'm on the Team Dashboard
  **When** I view the Category Breakdown section
  **Then** I see 5 categories with individual coverage %:
    - VALEURS HUMAINES
    - FEEDBACK & APPRENTISSAGE
    - EXCELLENCE TECHNIQUE
    - ORGANISATION & AUTONOMIE
    - FLUX & RAPIDITÉ

- **Given** I'm viewing category coverage
  **When** I see a category (e.g., "EXCELLENCE TECHNIQUE: 80%")
  **Then** a visual bar shows the coverage level with color coding:
    - ✅ Green: 75%+ (strong)
    - ⚠️ Yellow: 50-74% (moderate)
    - ❌ Red: <50% (gap)

- **Given** I'm viewing categories
  **When** I click on a category name
  **Then** I see detailed breakdown:
    - Pillars in that category
    - Which pillars are covered / gaps
    - Which practices cover each pillar

- **Given** category coverage is shown
  **When** I add a practice that covers multiple categories
  **Then** all affected category percentages update in real-time

- **Given** a category has < 50% coverage
  **When** I view that category
  **Then** it's highlighted with a warning badge
  **And** I see a recommendation: "Consider adding practices from this category"

- **Given** I'm viewing category breakdown
  **When** I click [View Available Practices] for a gap category
  **Then** the Practice Catalog filters to show only practices in that category
  **And** I can quickly add them to the team

- **Given** coverage by category is calculated
  **When** the calculation completes
  **Then** an event is logged: `{ action: "coverage.by_category.calculated", teamId, categoryBreakdown, timestamp }`

---

#### Story 2.8: Edit Practice Details (Any Practice)

As a **team member**,
I want to **edit any practice's details including title, goal, pillars, and category**,
So that **we can adapt practices to our team's context or fix outdated information**.

**Acceptance Criteria:**

- **Given** I'm viewing a practice (in the catalog, team's practice list, or practice detail page)
  **When** I see the practice
  **Then** there's an [Edit] button or action menu item

- **Given** I click [Edit] on any practice (whether selected by team or not)
  **When** the edit form opens
  **Then** I see all editable fields pre-populated:
    - Title (text field, 2-100 chars)
    - Goal/objective (text area, 1-500 chars)
    - Pillars covered (multi-select checkboxes, 19 options)
    - Category (dropdown: VALEURS HUMAINES, FEEDBACK & APPRENTISSAGE, etc.)

- **Given** I'm editing a practice
  **When** I modify the title
  **Then** the change is captured in real-time
  **And** I see character count: "85/100"

- **Given** I'm editing a practice
  **When** I modify the goal/objective
  **Then** the text area expands as I type
  **And** I see character count: "250/500"

- **Given** I'm editing pillars
  **When** I check/uncheck pillars
  **Then** the selection updates immediately
  **And** I see: "X pillars selected"

- **Given** I've made changes
  **When** I click [Save Changes]
  **Then** the practice is updated
  **And** I see a success message: "Practice updated successfully"
  **And** if this practice is in our team's portfolio, coverage is recalculated

- **Given** I'm editing a practice that's used by our team
  **When** I change the pillars covered
  **Then** after saving, team coverage % updates to reflect the new pillar mapping
  **And** any gap/covered pillars lists update

- **Given** I edit a practice
  **When** the update completes
  **Then** an event is logged: `{ action: "practice.edited", teamId, practiceId, editedBy: userId, changes: { field: oldValue → newValue }, timestamp }`

- **Given** I'm editing a practice
  **When** I don't fill required fields (e.g., remove title)
  **Then** I see validation errors: "Title is required"
  **And** I can't save until validation passes

- **Given** I'm editing a practice
  **When** another teammate edits the same practice simultaneously
  **Then** optimistic locking detects the conflict (version mismatch)
  **And** I see: "This practice was updated by another team member. [Refresh] to see changes"

- **Given** I've made changes but haven't saved
  **When** I try to navigate away
  **Then** I see a warning: "You have unsaved changes. Leave anyway?"
  **And** I can [Stay] or [Leave without saving]

- **Given** I'm editing a practice used by multiple teams
  **When** I save changes
  **Then** the changes affect ALL teams using this practice (global catalog edit)
  **And** a warning is shown: "This will affect X teams using this practice"

- **Given** I want to make team-specific edits
  **When** I edit a global practice
  **Then** I see an option: [Save as Team-Specific Copy]
  **And** clicking creates a custom practice for our team only
  **And** the original practice remains unchanged for other teams

- **Given** I cancel editing
  **When** I click [Cancel]
  **Then** all changes are discarded
  **And** I return to the previous view

---

### Epic 3: Big Five Personality Profiling

**Epic Goal:** Enable users to complete the IPIP-NEO questionnaire and see their personality profile.

**User Value:** Users understand their Big Five traits, providing context for practice friction and recommendations.

**Scope:** 44-item questionnaire → score calculation (with reversed scoring) → profile display → data storage.

**Stories:**

#### Story 3.1: Complete 44-Item IPIP-NEO Questionnaire

As a developer,
I want to complete a personality questionnaire to understand my Big Five traits,
So that the system can provide context-aware recommendations for practice adaptations.

**Acceptance Criteria:**

- **Given** I'm on the Big Five page and haven't completed the questionnaire
  **When** I click [Start Questionnaire]
  **Then** I see the first question: "I am the life of the party" with response options (1-5 scale)

- **Given** I'm answering questions
  **When** I answer 44 questions
  **Then** all responses are captured and the questionnaire is complete

- **Given** I'm on question 5 of 44
  **When** I click [Back]
  **Then** my previous answers are preserved and I can navigate back

- **Given** I haven't answered all 44 questions
  **When** I try to submit
  **Then** I see: "Please answer all questions" and can't proceed

- **Given** I've answered all 44 questions
  **When** I click [Submit]
  **Then** my responses are saved and scores are calculated

- **Given** certain questions need reverse scoring (e.g., "I get stressed easily" for Neuroticism)
  **When** scores are calculated
  **Then** reverse-scored items are correctly inverted before aggregation

---

#### Story 3.2: Display Big Five Profile Scores

As a developer,
I want to see my Big Five profile with scores for Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism,
So that I understand my personality dimensions.

**Acceptance Criteria:**

- **Given** I've completed the questionnaire
  **When** I view my Big Five Profile
  **Then** I see 5 dimensions with scores (0-100 scale or percentile)

- **Given** my Extraversion score is 35/100
  **When** I view the profile
  **Then** I see: "Introversion" as my tendency (score-based interpretation)

- **Given** I view my profile
  **When** I hover over a score
  **Then** I see a brief explanation: e.g., "High Conscientiousness: You're organized and reliable"

- **Given** I've completed the questionnaire
  **When** I view the profile
  **Then** I see when I completed it and an option to [Retake] if I want to update

- **Given** another team member views my profile (if shared)
  **When** they see my scores
  **Then** they understand my personality strengths (e.g., "collaborative", "detail-oriented")

- **Given** I complete the questionnaire
  **When** scores are calculated
  **Then** they match IPIP-NEO scoring algorithm (validated against reference implementation)

---

### Epic 4: Issue Submission & Discussion

**Epic Goal:** Provide friction-free issue submission and team discussion threads with clear status tracking, conflict resolution, and draft preservation.

**User Value:** Developers can voice practice difficulties in < 2 minutes and teams discuss solutions collaboratively without data loss.

**FRs Covered:** FR13-14, FR19-20

**Scope:** Issue form (< 2 min friction) → discussion comments → status lifecycle → conflict resolution (3-path safe merge) → auto-draft preservation → local storage recovery.

**Stories:**

#### Story 4.1: Submit Practice-Linked Issue with Description

As a developer,
I want to submit an issue describing a specific difficulty with a practice,
So that my team can discuss it and adapt the practice if needed.

**Acceptance Criteria:**

- **Given** I'm on the Issue Submission form
  **When** I select a practice from a dropdown
  **Then** the practice is linked to the issue

- **Given** I've selected a practice
  **When** I write a description (e.g., "Daily standups are too interrupt-heavy")
  **Then** the text is captured

- **Given** I've filled in practice + description
  **When** I click [Submit]
  **Then** the issue is created with status "Submitted" and I see confirmation

- **Given** I haven't selected a practice or written a description
  **When** I try to submit
  **Then** I see inline error: "Practice and description required"

- **Given** I start writing an issue
  **When** I close the browser or navigate away without saving
  **Then** my draft is auto-saved locally (localStorage)

- **Given** I had a draft saved
  **When** I return to the submission form
  **Then** I see a notification: "You have a draft from [time]. [Restore]"

- **Given** I submit an issue
  **When** the submission completes
  **Then** an event is logged: { action: "issue.created", teamId, issueId, practiceId, timestamp }

---

#### Story 4.2: View Issue Detail with Full History

As a team member,
I want to see an issue's full history (submission, comments, status changes),
So that I understand the evolution of the discussion and decisions.

**Acceptance Criteria:**

- **Given** I click on an issue from the Issues list
  **When** the issue detail opens
  **Then** I see: issue title (practice name), description, status, created date, creator name

- **Given** the issue detail is open
  **When** I scroll down
  **Then** I see a chronological list of all comments with: author, timestamp, comment text

- **Given** I view the detail
  **When** the issue status has changed (e.g., "Submitted" → "Discussed")
  **Then** I see the status change recorded with timestamp and who changed it

- **Given** I'm viewing an issue
  **When** another team member comments
  **Then** I can refresh the page to see new comments (page-refresh acceptable)

- **Given** there are 10+ comments
  **When** I view the issue detail
  **Then** I see pagination or a [Load More] button to avoid overwhelming the page

---

#### Story 4.3: Comment in Issue Thread

As a team member,
I want to add comments to an issue discussion,
So that I can share my perspective and help the team decide on adaptations.

**Acceptance Criteria:**

- **Given** I'm viewing an issue
  **When** I scroll to the comment section and click in the text field
  **Then** I can type a comment

- **Given** I've written a comment
  **When** I click [Post Comment]
  **Then** the comment is saved and appears in the thread with my name and timestamp

- **Given** I've posted a comment
  **When** I view the issue again
  **Then** the comment persists and is visible to all team members

- **Given** I start typing a long comment
  **When** I close the browser without submitting
  **Then** my draft is auto-saved locally

- **Given** I had a draft saved
  **When** I return to the issue
  **Then** I see a notification: "Draft comment saved. [Restore]"

- **Given** I post a comment
  **When** the comment is saved
  **Then** an event is logged: { action: "issue.comment_added", issueId, teamId, timestamp }

---

#### Story 4.4: Detect & Handle Concurrent Edits (Optimistic Locking)

As a developer,
I want the system to detect when another teammate has edited an issue I'm currently editing,
So that we don't lose work and can safely merge changes.

**Acceptance Criteria:**

- **Given** I'm editing an issue (changing description)
  **When** another teammate edits the same issue and saves first
  **Then** when I try to save, I get a non-destructive 409 Conflict response

- **Given** I receive a 409 Conflict
  **When** the UI updates
  **Then** I see a gentle banner: "This item changed since you opened it."

- **Given** the conflict banner is shown
  **When** I click [View Changes]
  **Then** I see a diff: my edits (in one color) vs. latest server state (in another color)

- **Given** I'm in conflict resolution mode
  **When** I click [Apply Latest & Re-Apply My Changes]
  **Then** the system merges: latest server state + my edits on top, and saves

- **Given** I'm in conflict resolution
  **When** I click [Overwrite] (if I have permission)
  **Then** my version replaces the server version (for issues I created)

- **Given** I'm in conflict resolution
  **When** I click [Save as Comment]
  **Then** my edits are posted as a new comment instead of overwriting

- **Given** I was editing the issue
  **When** a conflict occurs
  **Then** my local draft is preserved in localStorage (can't be lost)

---

### Epic 5: Adaptation Decision & Tracking

**Epic Goal:** Record team decisions on practice adaptations and track resolution progress.

**User Value:** Teams document what they decided to change and see the outcome over time.

**Scope:** Record adaptation decision → track status progression → view decision history → link to recommendations.

**Stories:**

#### Story 5.1: Record Adaptation Decision on Issue

As a team member,
I want to record what adaptation decision we've made for a practice difficulty,
So that the decision is documented and we can track if it worked.

**Acceptance Criteria:**

- **Given** I'm viewing an issue with discussion
  **When** we've agreed on an adaptation
  **Then** I click [Record Decision] button

- **Given** the decision form opens
  **When** I describe the decision (e.g., "Switch to async standups")
  **Then** I capture the decision text

- **Given** I've written the decision
  **When** I click [Save Decision]
  **Then** the issue status changes to "Adaptation in Progress" and decision is recorded

- **Given** a decision is recorded
  **When** I view the issue detail
  **Then** I see the decision prominently with: decision text, who recorded it, when, and "Implementation in progress" status

- **Given** I record a decision
  **When** the decision is saved
  **Then** an event is logged: { action: "issue.decision_recorded", issueId, teamId, decision_text, timestamp }

---

#### Story 5.2: Update Issue Status to "Evaluated" & Capture Outcome

As a Scrum Master,
I want to mark an adaptation as "Evaluated" after we've tried it for a sprint,
So that we can track which adaptations worked.

**Acceptance Criteria:**

- **Given** an issue is in "Adaptation in Progress" status
  **When** I click on the issue detail
  **Then** I see an [Evaluate] button

- **Given** I've used the adaptation for 1-2 sprints
  **When** I click [Evaluate]
  **Then** a form appears asking: "Was this adaptation effective? (yes/no/partial)" with comment field

- **Given** I submit the evaluation
  **When** I provide feedback
  **Then** the issue status changes to "Evaluated" and the outcome is recorded

- **Given** an issue is "Evaluated"
  **When** I view the issue detail
  **Then** I see: decision, evaluation result, and final comments

- **Given** I evaluate an issue
  **When** the evaluation is saved
  **Then** an event is logged: { action: "issue.evaluated", issueId, teamId, outcome, timestamp }

---

#### Story 5.3: View System Recommendations for Alternative Practices

As a **developer with a practice difficulty**,
I want to **see system-generated recommendations for alternative practices that cover the same or missing pillars**,
So that **I can discuss evidence-informed adaptations with my team**.

**Acceptance Criteria:**

- **Given** I've submitted an issue about a practice difficulty
  **When** I view the issue detail
  **Then** I see a "Recommendations" sidebar showing alternative practices

- **Given** I'm viewing a practice (e.g., "Daily Standup" covering Communication + Feedback)
  **When** I view the recommendation section
  **Then** the system recommends other practices that cover the same 2 pillars (e.g., "Async Status Updates", "Feedback Circles")

- **Given** my team's coverage is low in some pillars (e.g., team covers 14/19 pillars)
  **When** I view the recommendations
  **Then** I see practices that cover the 5 missing pillars, sorted by: practices covering most missing pillars first

- **Given** recommendations are displayed
  **When** I click a recommended practice
  **Then** I see: description, pillars it covers, why it was recommended (e.g., "Covers same Communication + Feedback pillars as Daily Standup")

- **Given** the system shows recommendations
  **When** they're displayed
  **Then** they're labeled as "Alternative practices with similar pillar coverage" or "Practices covering missing pillars" (factual, not prescriptive)

- **Given** recommendations are generated
  **When** they're shown
  **Then** an event is logged: `{ action: "recommendations.viewed", issueId, teamId, recommendationIds, timestamp }`

- **Given** I'm viewing recommendations
  **When** I see multiple practices covering the same pillars
  **Then** they're presented as "equivalent alternatives" with no ranking or preference indicated

---

### Epic 6: Research Data Integrity & Event Logging

**Epic Goal:** Capture immutable, queryable event logs of all DB-affecting actions for research analysis.

**User Value:** Academic validity; researchers can verify what happened and analyze personality-practice relationships.

**Scope:** Event schema and storage → event logging on all mutations → event integrity validation → audit trail access.

**Stories:**

#### Story 6.1: Log All DB-Affecting Events (Excluding Auth/Composition)

As a researcher,
I want to capture an immutable event log of all DB-affecting actions,
So that I can analyze personality-practice relationships and verify data integrity.

**Acceptance Criteria:**

- **Given** a user creates a team
  **When** the team is saved to the database
  **Then** an event is logged: { actor_id, team_id, entity_type: "team", entity_id, action: "created", payload, created_at }

- **Given** a user submits an issue
  **When** the issue is saved
  **Then** an event is logged with full issue details in payload

- **Given** a user adds a comment
  **When** the comment is saved
  **Then** an event is logged: { action: "issue.comment_added", payload: { issueId, commentText, actor_id }, ... }

- **Given** a user completes the Big Five questionnaire
  **When** responses are saved
  **Then** an event is logged: { action: "big_five.completed", payload: { responses: [...], scores: {...} }, ... }

- **Given** events are logged
  **When** I query the event table
  **Then** ALL DB-affecting events are present (except auth login/team composition events per research rules)

- **Given** an event is logged
  **When** it's saved to the database
  **Then** it's append-only (no updates or deletes except manual batch purge at experiment end)

- **Given** events are captured
  **When** they're stored
  **Then** the sequence is maintained: events from the same transaction have ordered timestamps (precision: milliseconds)

---

#### Story 6.2: Ensure Event Immutability & Audit Trail Completeness

As a researcher,
I want to verify that all events are captured accurately and can't be tampered with,
So that the data is research-grade valid.

**Acceptance Criteria:**

- **Given** an event is logged
  **When** I try to update or delete it from the application
  **Then** the delete is not allowed (immutable table/view, or application-level protection)

- **Given** the experiment ends
  **When** we need to purge data per research protocol
  **Then** a batch delete script removes events (not individual deletes), and the purge is logged

- **Given** events are logged over time
  **When** I export events for analysis
  **Then** I can verify: every action has an actor_id, timestamp, and consistent ordering

- **Given** I'm reviewing events
  **When** I trace an issue submission through comments to decision
  **Then** I can follow the complete lifecycle with audit trail

- **Given** events are stored
  **When** the database is backed up
  **Then** the event table is included in the backup (no partial history)

---

#### Story 6.3: Event Export & Filtering Capability (Research Use)

As a **team member**,
I want to **export events filtered by type, date range, and team**,
So that **I can analyze specific periods or events for research**.

**Acceptance Criteria:**

- **Given** I'm on the Team Dashboard
  **When** I click [Export Events]
  **Then** I can filter events by: event type, date range
  **And** I can select export format: CSV or JSON

- **Given** I filter events from "2026-01-15" to "2026-01-22"
  **When** I click [Download]
  **Then** a CSV file is generated with all events in that date range

- **Given** I export events
  **When** the CSV is generated
  **Then** columns are properly structured: actor_id, team_id, entity_type, entity_id, action, payload_json, created_at
  **And** the data is escaped properly for CSV format

- **Given** I export events with PII-sensitive data (e.g., email in payload)
  **When** the export runs
  **Then** PII is redacted or excluded from export (per research protocol)
  **And** emails are masked as "redacted@example.com", names as "REDACTED"

- **Given** I'm exporting a large dataset (1000+ events)
  **When** I initiate the export
  **Then** the system streams results efficiently
  **And** I see a download progress indicator
  **And** the export completes without timeout

- **Given** the export completes successfully
  **When** the file is downloaded
  **Then** the file has proper naming: "team-events-2026-01-15-to-2026-01-22.csv"
  **And** a confirmation message appears: "Exported X events"

- **Given** I attempt an export with invalid parameters (e.g., future date range)
  **When** I submit the export request
  **Then** a clear error message is returned: "Invalid date range" or "No events found in date range"
  **And** the export is not generated

---

## Summary & Next Steps

**Total FRs covered:** 20 functional requirements
**Total NFRs covered:** 18 non-functional requirements
**Epics:** 6 major epics
**Stories:** 31 detailed user stories

**Story Breakdown by Epic:**
- Epic 1 (Authentication & Team Onboarding): 8 stories
- Epic 2 (Practice Catalog & Coverage): 9 stories
- Epic 3 (Big Five Personality Profiling): 4 stories
- Epic 4 (Issue Submission & Discussion): 5 stories
- Epic 5 (Adaptation Decision & Tracking): 3 stories
- Epic 6 (Research Data Integrity & Event Logging): 2 stories

**Delivery Sequence:** Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 (Epic 6 runs in parallel)

**Next Steps:**
1. ✅ Step 1: Requirements extraction and validation (COMPLETE)
2. ✅ Step 2: Epic design and story creation (COMPLETE)
3. ✅ Step 3: Detailed acceptance criteria for all stories (COMPLETE)
4. 🔄 Step 4: Final validation and sign-off (PENDING)

---

**Document Status:** ✅ All 31 user stories complete with detailed acceptance criteria
**Ready for:** Final validation and development kickoff
