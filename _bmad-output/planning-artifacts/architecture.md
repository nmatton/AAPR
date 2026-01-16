---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments:
  - product-brief-bmad_version-2026-01-14.md
  - prd.md
  - ux-design-specification.md
  - brainstorming-session-2026-01-14.md
  - doc/APR.pdf
  - doc/db_schema_v0.dbml
workflowType: 'architecture'
project_name: 'bmad_version'
user_name: 'nicolas'
date: '2026-01-15'
starterTemplate: 'minimal-vite-express'
---

# Architecture Decision Document - bmad_version

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (23 total):**

The system provides a complete lifecycle for agile practice adaptation:

- **User & Team Management (FR1-7):** Self-service signup, team creation with practice selection, email-based invitations with pending state handling, team membership management
- **Practice Catalog & Coverage (FR8-10):** Browse searchable practice catalog, add/remove practices to team portfolio, real-time coverage % calculation based on pillar mapping
- **Big Five Integration (FR11-12):** Complete 44-item IPIP-NEO questionnaire, view personality profile scores
- **Issue Workflow (FR13-16):** Submit practice difficulties, threaded team discussion, record adaptation decisions, track resolution lifecycle
- **Research Infrastructure (FR17-18):** Immutable event logging of all DB-affecting actions (excluding auth/team composition), filterable export (CSV/JSON)
- **Concurrency & Recovery (FR19-20):** Optimistic locking conflict detection, non-destructive resolution UI with diff view and auto-draft preservation
- **Access Control (FR21-22):** Single-role model - all team members have equal permissions (team configuration, invites, issues, discussions, catalog, Big Five)
- **Operational (FR23):** Manual per-team instance provisioning via script

**Non-Functional Requirements:**

Critical NFRs driving architectural decisions:

- **Security (NFR1-4):** bcrypt password hashing (min 10 rounds), JWT over HTTPS-only, parameterized queries (SQL injection prevention), database-level team isolation
- **Data Integrity (NFR5-7):** Immutable append-only event logs, Big Five calculation accuracy vs IPIP-NEO standard, transactional consistency for issue/comment operations
- **Reliability (NFR8-9):** PostgreSQL ACID guarantees, documented manual backup procedures

**UX Technical Requirements:**

- Desktop-only (no responsive breakpoints), page-refresh acceptable (no WebSocket/real-time requirements)
- Auto-save with draft preservation, instant feedback (< 200ms interactions)
- React + TypeScript + TailwindCSS component architecture
- WCAG AA accessibility (keyboard navigation, screen readers, contrast ratios)
- "Teal Focus" design direction with calm, professional aesthetic

**Scale & Complexity:**

- **Complexity Level:** MEDIUM-HIGH
  - User Scale: 4-8 teams, ~25 users per instance, single-tenant per-team deployment
  - Quality Bar: Zero critical bugs requirement, production-ready, research-grade data integrity
  - Timeline: 3-week hard deadline for MVP delivery
  
- **Primary Domain:** Full-stack web application (SaaS-style research platform)

- **Estimated Architectural Components:**
  - Frontend: 10-12 page templates, 15-20 custom components
  - Backend: 8-10 API endpoint groups, 15-20 database tables
  - Data Layer: Practice catalog import pipeline, event logging system, coverage calculation engine, Big Five scoring engine

### Technical Constraints & Dependencies

**Existing Data Format - Practice JSON Schema:**

Critical constraint: Practices are currently stored in structured JSON format and must be imported into PostgreSQL. This defines the data model architecture.

**JSON Schema Structure:**
- Tables: snake_case plural (e.g., team_members, team_practices, events).
- Columns: snake_case (team_id, created_at); FK as <ref>_id; indexes idx_<table>_<col>[_<col2>]; uniques uq_<table>_<col>.
- Enums: Postgres enum or text check, named enum_<domain>_<name> if used.
- RACI matrix: Roles with responsibility types (Responsible, Accountable, Consulted, Informed)
- Resources: Guidelines (with URL/type), benefits array, pitfalls array
- REST base plural nouns: /api/v1/teams/{teamId}/practices, /api/v1/auth/login.
- Path params documented camelCase; server maps to snake for DB.
- Query params camelCase (page, pageSize, searchTerm, pillarId).
- Headers: X-Request-Id, X-Trace-Id respected or generated.
- Import pipeline required: JSON → PostgreSQL with validation
- Schema must accommodate nested structures (activities with sequence, roles with RACI types)
- Components PascalCase; files match component (TeamCoverageCard.tsx).
- Hooks: useX naming; Zustand slices createXSlice; selectors selectX.
- Types/DTOs PascalCase; API DTOs in dto/ with Request/Response suffix.
- War Room refinements (patterns):
  - API query params use concise business terms (pillarId, categoryId, searchTerm, page, pageSize); avoid ambiguous id or filter.
  - Events use UX-facing verbs when visible (issue.comment_added, practice.coverage_recomputed); keep generic names internal.
**Technology Stack (from PRD & UX Spec):**
- Frontend: React + TypeScript + TailwindCSS
- Backend: Node.js + Express
- Frontend feature-first: features/<domain>/{components,hooks,state,api}; shared ui/ and lib/; co-located *.test.tsx.
- Backend layered: routes/ -> controllers/ -> services/ -> repositories/; prisma/ for client+migrations; middleware/, schemas/ (zod), dto/, utils/; co-located *.test.ts.
- Config in config/; env via .env.example per service.
- War Room refinements (structure):
  - Each feature folder contains state/ and api/ or a short README explaining why not, to avoid scattered fetch/state logic.
  - Shared ui/ holds components used by 2+ features; otherwise keep inside feature to prevent coupling.
  - Backend: services own business rules; repositories are DB-only; routes/controllers stay thin.
**Hard Constraints:**
- 3-week MVP timeline
- Static assets: frontend/public/.
- Docs: architecture.md as source of truth; optional feature READMEs under feature dirs.

**Pre-Draft Reference Documents:**
- `db_schema_v0.dbml` and `APR.pdf` provide domain context but contain version mismatch with PRD
- Success: direct JSON payload (no envelope).
- Errors (Option B): { code, message, details?, requestId } with proper HTTP status.
- Pagination: { items, page, pageSize, total }.
- Dates: ISO 8601 UTC strings; frontend stores ISO and formats via dayjs/date-fns.
- War Room refinements (formats):
  - Validation errors: details array items use { path: string, message: string, code?: string }.
  - IDs in list/pagination responses are strings (UUID) for client typing consistency.
  - Timestamps include Z and use <name>At (createdAt, updatedAt).
- Self-Consistency refinements (formats):
  - Error details path uses dot-notation for nested fields (e.g., practice.activities[2].name).
  - Prisma must map snake_case DB to camelCase API consistently (use @map/@@map); never leak DB column names in API errors.

**1. Security & Authentication**
- JSON on the wire camelCase; DB snake_case; Prisma maps to TS camelCase.
- Booleans true/false; nulls instead of empty strings.
- IDs: UUIDv4 for public resources; numeric allowed for internal join tables if Prisma schema aligned.
- HTTPS enforcement for production

**2. Data Integrity & Research Logging**
- Event names: domain.action lower snake (practice.created, issue.resolved).
- Payload: { actorId, teamId, entityType, entityId, action, payload, occurredAt, version? }; carry requestId/traceId.
- Version field when schema evolves.
- War Room refinements (communication/state):
  - Zustand slices export an initialState factory and a reset() action (for logout/team switch).
  - Events include version when touching mutable entities and requestId when sourced from API; omit only for offline/local events.
- Self-Consistency refinements (communication/state):
  - Events must always carry teamId (even system events) to avoid orphan telemetry.
- Export capability (CSV/JSON) with filtering

- Zustand slices by domain: auth, teams, practices, coverage, issues.
- Immutable updates (spread or immer); export selectors; avoid deep component subscriptions.
- Persist only auth/session slice; avoid global caching of server lists (future react-query OK).
- Auto-draft preservation (local storage) to prevent data loss
- Three resolution paths: apply latest + re-apply, overwrite (if permitted), save as comment

- Backend: central error middleware emits structured error; log warn for 4xx, error for 5xx with stack.
- Frontend: error boundary at shell; toast for recoverable; inline for form errors; fallback copy “Something went wrong. Please retry.”
- Validation: zod/Joi on ingress; 400 with details array of field issues.
  - **Pillar-level:** % of 19 pillars covered by team's selected practices
  - **Category-level:** % of pillars covered within each of 5 categories
- Naming: isLoading, isSaving, isRefreshing.
- Skeletons for lists/detail pages; spinners only for button-scope actions.
- Disable double-submit; optimistic only when version matches else refetch.
- Refresh flows: show isRefreshing instead of blanking content.
- War Room refinements (process/logging):
  - Mutations: optimistic only when entity has version; on failure, revert and refetch; no silent retries without user notice.
  - Loading UX: skeletons for list/detail; buttons use inline spinner + disabled; never blank page during refresh.
  - Tests: each new feature folder includes at least one co-located test or a TODO with owner.
  - Logging: 5xx logs include requestId, userId (if present), route; 4xx may omit stack but keep requestId.
- Self-Consistency refinements (process/logging):
  - On optimistic failure: emit toast "Changes reverted" and restore prior state; log warn with requestId.
  - Test TODOs expire within the same sprint (replace with tests or delete).
  - Include teamId in 5xx logs when available; redact PII (email, tokens, passwords) from all logs.

**5. Big Five Personality Integration**
- 44-item IPIP-NEO questionnaire embedded in UI
- Use structured error shape and carry requestId end-to-end.
- Follow snake_case DB, camelCase API/TS, and stated route patterns.
- Keep tests co-located with implementations using *.test.ts[x].
- Future use: personality-practice correlation analysis (research phase)

- Checks: lint/tsc; Prisma migrate check; reject responses lacking requestId/error shape; log deviations in architecture.md.
- Loading skeletons for initial data fetch
- Toast notifications (success 2-3s, warning 4-6s)
- Keyboard shortcuts (Ctrl+I for submit issue, Ctrl+F for search)
- GET /api/v1/teams/{teamId}/practices?page=1&pageSize=20 → 200 { items: [...], page: 1, pageSize: 20, total: 42 }
- Error 409 version conflict: { code: "version_conflict", message: "Stale data", details: { expectedVersion: 3, actualVersion: 4 }, requestId: "req-123" }
- Accessibility: focus management, ARIA landmarks, semantic HTML

- GET /api/v1/team/list (singular, verb in path); 500 { error: "oops" }; DB column userId (camel in DB).
- Per-team database isolation (separate PostgreSQL instances or schemas)
- Docker Compose for local development
- Manual provisioning script for production instances
- Environment configuration per team
- SMTP server for invite emails (external dependency)

**Advanced Elicitation session note:** Applied First Principles Analysis to tighten patterns. Session complete.

---

### ADR: Implementation Patterns & Consistency Rules

- **Status:** Proposed
- **Context:** Multiple AI agents contribute; risk of drift across naming, structure, formats, state, and logging. Stack: React+TS+Tailwind, Express+TS, Prisma+Postgres, JWT+refresh, structured JSON errors, Zustand.
- **Decision:** Adopt the documented patterns as binding norms:
  - Naming: snake_case DB with Prisma maps; camelCase API/TS; REST plural paths; explicit business query params; UX-facing event verbs.
  - Structure: frontend feature-first with required state/api or README; shared UI only if reused; backend routes→controllers→services (rules)→repositories (DB-only); Prisma migrations.
  - Formats: success = raw payload; errors {code,message,details?,requestId} with dot-path details; UUID strings in lists; timestamps <name>At with Z; no snake_case leakage.
  - Communication/State: events always include teamId, requestId, version (if mutable); Zustand slices export initialState() + reset().
  - Process/Logging: optimistic only with version (on fail revert+toast+warn); skeleton + inline button spinners; test per feature (TODO expires same sprint); logs 5xx include requestId/userId/teamId, redact PII.
- **Consequences:**
  - ✅ Cross-agent consistency, predictable DX, easier code review.
  - ✅ Reduced integration friction via shared shapes, paths, logging.
  - ⚠️ Discipline required on Prisma mappings and log redaction.
  - ⚠️ Small overhead to maintain per-feature test/TODO hygiene.

## Critical Architectural Decisions

### Decision 1: Team Data Isolation Strategy

**Chosen Approach:** Separate PostgreSQL database instances per team

**Rationale:**
- Perfect isolation (impossible to leak data between teams)
- Matches single-tenant requirement from PRD
- Simple Docker Compose deployment per team
- Easy backup/restore per team (individual database dumps)
- Research data integrity guaranteed: teams cannot cross-contaminate

**Trade-offs Accepted:**
- Higher resource usage (acceptable for 4-8 teams max)
- Cannot easily query across teams at runtime

**Future Enhancement:**
- Export-to-research-DB aggregation script (week 3+) for cross-team analysis phase
- Allows researchers to run correlation queries on aggregated data without compromising operational isolation

**Implementation Notes:**
- Each team gets dedicated PostgreSQL container via Docker Compose
- Environment variables specify connection string per team
- Backup strategy: automated per-team dumps to object storage with **weekly restore verification** (restore to test environment to prove backups work)
- Scaling beyond 8 teams: **documented scale-out strategy** - provision multiple Docker Compose stacks across VMs, each handling 4-8 teams

**Schema Migration Orchestration (Critical for Multi-DB Consistency):**
```sql
-- Add to EVERY database
CREATE TABLE schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  applied_by VARCHAR(100),
  git_sha VARCHAR(40),
  status VARCHAR(20) -- 'success', 'failed', 'rolled_back'
);
```

**Migration Script Requirements:**
1. Check all databases are at same version before applying new migration
2. Apply to all databases or rollback all (atomic across DBs)
3. Log success/failure per database with git SHA
4. Alert if any database gets out of sync
5. Prevent app startup if schema versions diverge

**Post-MVP Enhancements:**
- Certificate-based authentication + 30-day rotation (MVP: password-based OK)
- Automated backup verification can be manual initially (verify restore weekly by hand)

---

### Decision 2: Event Logging Architecture

**Chosen Approach:** Dedicated `events` table with JSONB payloads storing deltas (changed fields only)

**Schema:**
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  actor_id INT REFERENCES members(id),
  team_id INT NOT NULL,
  entity_type VARCHAR(50),      -- 'practice', 'issue', 'comment', 'team_practice'
  entity_id INT,
  action VARCHAR(50),            -- 'created', 'updated', 'resolved', 'added', 'removed'
  payload JSONB,                 -- delta: {"old_value": X, "new_value": Y}
  schema_version VARCHAR(10) DEFAULT 'v1',  -- enable event schema evolution
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_events_team_type ON events(team_id, event_type);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX idx_events_timeline ON events(created_at);
CREATE INDEX idx_events_schema_version ON events(schema_version);

-- Optional: Row-Level Security (post-MVP if additional defense needed)
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY events_team_isolation ON events
--   USING (team_id = current_setting('app.current_team')::int);
-- Note: RLS adds query overhead and testing complexity; defer unless required
```

**Rationale:**
- Complete audit trail with queryable metadata fields
- JSONB allows flexible payload schema (different event types have different fields)
- Append-only by design (no UPDATE/DELETE permissions on events table)
- Delta payloads (only changed fields) keep storage efficient vs full snapshots
- Indexes enable fast research queries (events per team, events for entity, timeline analysis)

**Trade-offs Accepted:**
- Delta payloads mean reconstructing full historical state requires event replay
- Acceptable because research focuses on action sequences, not state snapshots

**Event Payload Validation:**
- **Zod schema validation per event type** before insert (prevents inconsistent payloads)
- Example: `issue.created` requires `{issueId, title}`, `issue.resolved` requires `{issueId, resolution}`
- Validation failures logged as warnings (don't block event write, but alert dev team)

**Research Integration:**
- Conflict event logging: `event_type: 'conflict_detected'` with `payload: {entity_type, attempted_version, actual_version}`
- Near-conflict logging: `event_type: 'concurrent_edit_detected'` when edits within 30s (reveals collaboration patterns)
- Enables analysis of conflict frequency (signals if page-refresh UX is too friction-heavy)
- All events tagged with `actor_id`, `team_id` for personality-practice correlation later

**Immutability Trade-offs:**
- **MVP approach:** App-level immutability (REVOKE UPDATE/DELETE) + separate databases prevent tampering
- **Research-grade option** (if ethics committee requires cryptographic verification):
  ```sql
  ALTER TABLE events ADD COLUMN event_hash VARCHAR(64);
  ALTER TABLE events ADD COLUMN previous_hash VARCHAR(64);
  -- On insert: SHA256(id || event_type || payload || previous_hash)
  -- Creates tamper-evident chain; any modification breaks hash verification
  ```
- **Decision:** Start with app-level immutability; add hash chain only if publication requires it

**Deferred (Post-MVP):**
- **Table partitioning by month** for scale: `CREATE TABLE events_2026_01 PARTITION OF events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')`
- External immutable log streaming (AWS CloudWatch, Splunk) for audit trail backup

---

### Decision 3: Practice Import Pipeline

**Chosen Approach:** One-time transactional seed script; JSON → validated → normalized relational tables

**Pipeline:**
1. **Read:** All JSON files from `/seed-data/practices/*.json`
2. **Validate:** Schema validation (required fields, valid values); referential integrity (pillar references exist)
3. **Transact:** BEGIN transaction
4. **Insert:** Core practice data into `practices` table
5. **Insert:** Activities into `activities` table (preserving sequence order)
6. **Insert:** Practice-pillar relationships into `practice_pillars` join table
7. **Insert:** Practice associations into `practice_associations` (with relationship types)
8. **Insert:** Roles, metrics, guidelines, benefits, pitfalls into respective tables
9. **Preserve:** Store original JSON in `practices.raw_json` JSONB column (for debugging/traceability)
10. **Commit:** COMMIT transaction (all-or-nothing safety)
11. **Log:** Write import event to events table with metadata

**Metadata Fields Added:**
```sql
ALTER TABLE practices ADD COLUMN imported_at TIMESTAMP;
ALTER TABLE practices ADD COLUMN source_file VARCHAR(255);
ALTER TABLE practices ADD COLUMN json_checksum VARCHAR(64);
ALTER TABLE practices ADD COLUMN practice_version INT DEFAULT 1;  -- enable idempotent re-import
ALTER TABLE practices ADD COLUMN imported_by VARCHAR(100);        -- provenance: who ran import
ALTER TABLE practices ADD COLUMN source_git_sha VARCHAR(40);      -- provenance: exact JSON commit
```

**Rationale:**
- Transactional safety ensures clean data from day one
- Normalized relational structure enables fast queries
- Raw JSON preservation enables recovery/debugging if needed
- Metadata provides practice provenance tracking (critical for research validity)

**Validation Rules:**
- All required fields present (name, objective, description)
- `practice_goal` values match one of 19 defined pillars
- `tags` are from approved vocabulary
- Responsibilities are one of: Responsible, Accountable, Consulted, Informed
- Association types are one of: Configuration, Equivalence, Dependency, Complementarity, Exclusion
- **URL validation:** Guidelines URLs must be `https://` only (prevent javascript:// injection)
- **String length limits:** Practice name ≤255 chars, description ≤10,000 chars (prevent DoS)
- Fail fast: any validation error aborts entire import with clear error message

**Practice Update Workflow (Manual for MVP):**
1. Create migration SQL with `practice_version` bump: `UPDATE practices SET description = '...', practice_version = 2 WHERE id = ?`
2. Log update event: `INSERT INTO events (event_type, action, entity_type, entity_id, payload) VALUES ('practice.updated', 'version_bumped', 'practice', ?, '{"from_version": 1, "to_version": 2}')`
3. Notify affected teams via email or dashboard alert
4. Document change in `docs/practice-changelog.md`

**Implementation:**
- Use JSON Schema validator (e.g., Ajv) for schema validation
- Database triggers or application-level checks for referential integrity
- Idempotent: running twice doesn't create duplicates (check by practice name + source_file)

**Trade-off:**
- Practices cannot be easily updated after seeding (would require migration script)
- Acceptable for MVP: practices are foundational and stable; teams customize via `TeamPractice` table

---

### Decision 4: Coverage Calculation Engine

**MVP Approach:** Multi-level coverage with pillar-level, category-level, and overall metrics

**Data Structure - 5 Pillar Categories:**
```json
{
  "categories": [
    {
      "id": "human_values",
      "name": "VALEURS HUMAINES",
      "pillars": ["Communication", "Courage", "Humility", "Transparency", "Sustainable Pace"]
    },
    {
      "id": "feedback_learning",
      "name": "FEEDBACK & APPRENTISSAGE",
      "pillars": ["Feedback", "Inspection", "Adaptation", "Continuous Integration", "Refactoring", "TDD (Test First)"]
    },
    {
      "id": "technical_excellence",
      "name": "EXCELLENCE TECHNIQUE",
      "pillars": ["Simple Design", "Coding Standards", "Collective Code Ownership", "TDD (Test First)", "Refactoring", "Continuous Integration"]
    },
    {
      "id": "organization_autonomy",
      "name": "ORGANISATION & AUTONOMIE",
      "pillars": ["Self-Organization", "Cross-Functional Teams", "Collective Code Ownership", "Active Stakeholder Participation"]
    },
    {
      "id": "flow_speed",
      "name": "FLUX & RAPIDITÉ",
      "pillars": ["Simplicity", "Short Releases", "Sustainable Pace"]
    }
  ],
  "total_pillars": 19
}
```

**Coverage Metrics (3-level):**

1. **Pillar-Level Coverage:**
   ```sql
   SELECT COUNT(DISTINCT pp.pillar_id) as pillars_covered,
          19 as total_pillars,
          ROUND((COUNT(DISTINCT pp.pillar_id) / 19.0) * 100, 1) as pillar_coverage_pct
   FROM practice_pillars pp
   WHERE pp.practice_id IN (SELECT practice_id FROM team_practices WHERE team_id = ?)
   ```

2. **Category-Level Coverage (per category):**
   ```sql
   SELECT 
     c.id as category_id,
     c.name as category_name,
     COUNT(DISTINCT pp.pillar_id) as pillars_covered,
     (SELECT COUNT(*) FROM category_pillars WHERE category_id = c.id) as total_in_category,
     ROUND((COUNT(DISTINCT pp.pillar_id) / 
            (SELECT COUNT(*) FROM category_pillars WHERE category_id = c.id)::float) * 100, 1) as category_coverage_pct
   FROM categories c
   LEFT JOIN category_pillars cp ON c.id = cp.category_id
   LEFT JOIN practice_pillars pp ON cp.pillar_id = pp.pillar_id
   WHERE pp.practice_id IN (SELECT practice_id FROM team_practices WHERE team_id = ?)
   GROUP BY c.id, c.name
   ```

3. **Overall Coverage (categories at 100%):**
   ```sql
   SELECT COUNT(*) as categories_complete,
          5 as total_categories,
          ROUND((COUNT(*) / 5.0) * 100, 1) as overall_coverage_pct
   FROM (
     SELECT c.id, COUNT(DISTINCT pp.pillar_id) as covered
     FROM categories c
     LEFT JOIN category_pillars cp ON c.id = cp.category_id
     LEFT JOIN practice_pillars pp ON cp.pillar_id = pp.pillar_id
     WHERE pp.practice_id IN (SELECT practice_id FROM team_practices WHERE team_id = ?)
     GROUP BY c.id
     HAVING COUNT(DISTINCT pp.pillar_id) = (
       SELECT COUNT(*) FROM category_pillars WHERE category_id = c.id
     )
   ) completed_categories
   ```

**Database Schema Updates:**
```sql
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INT
);

CREATE TABLE category_pillars (
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id),
  pillar_id INT NOT NULL REFERENCES pillars(id),
  PRIMARY KEY (category_id, pillar_id)
);

-- Add category descriptions table for research
CREATE TABLE pillar_descriptions (
  pillar_id INT PRIMARY KEY REFERENCES pillars(id),
  description TEXT NOT NULL,
  definition VARCHAR(500),
  research_note TEXT
);
```

**Dashboard Display:**
- **Primary metric:** Overall coverage (0-100%, by count of complete categories)
- **Secondary:** Pillar-level progress bar (0-19 pillars)
- **Tertiary:** Category breakdown (5 boxes, each showing pillar/total within category)
- Example: "3/5 categories complete | 14/19 pillars covered | Feedback & Learning: 4/6"

**Rationale:**
- Pillar-level: Shows comprehensive practice coverage across agile principles
- Category-level: Reveals balance (teams might over-index on Technical Excellence, under-invest in Autonomy)
- Overall: Simple metric for team health (are we balanced across all dimensions?)
- Research value: Category imbalances might correlate with team personality profiles (e.g., high Conscientiousness → over-focus on Technical Excellence)

**Performance Optimization:**
- Cache all 3 metrics in `team_coverage` table (denormalized):
  ```sql
  CREATE TABLE team_coverage (
    team_id INT PRIMARY KEY REFERENCES teams(id),
    pillar_coverage_pct FLOAT,
    category_breakdown JSONB,  -- {human_values: 80, feedback_learning: 67, ...}
    categories_complete INT,
    overall_coverage_pct FLOAT,
    last_calculated_at TIMESTAMP
  );
  
  -- Temporal analysis support
  CREATE TABLE coverage_history (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id),
    pillar_coverage_pct FLOAT,
    overall_coverage_pct FLOAT,
    categories_complete INT,
    snapshot_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX idx_coverage_history_team_time ON coverage_history(team_id, snapshot_at);
  ```

**Coverage Calculation Logic:**
- **Implementation:** TypeScript service layer (`services/coverage.service.ts`), NOT stored procedures
- **Rationale:** Business logic must be testable, type-safe, version-controlled with application code
- **Pattern compliance:** "services own business rules, repositories are DB-only" (from architectural patterns)
- **Process:**
  1. Service calculates all 3 metrics (pillar/category/overall)
  2. Transactional update: `team_coverage` table + insert `coverage_history` snapshot
  3. Retry logic with exponential backoff if transaction contention detected
- Queries remain sub-millisecond even with 8 teams (denormalized cache + indexes)

**Coverage Metadata Synchronization:**
- **API endpoint:** `GET /api/v1/coverage/metadata` returns pillar/category definitions
- Frontend fetches at boot to guarantee FE/BE constant sync (eliminates hardcoded duplicates)
- Response: `{ pillars: [{id, name, description}], categories: [{id, name, pillars: [...]}], total_pillars: 19 }`

**Implementation Sequence:**
1. Load pillar categories from JSON during seed (similar to practices)
2. Insert into `categories` and `category_pillars` join table
3. Create `team_coverage` cache table
4. On practice add/remove, recalculate all 3 metrics and update cache
5. Dashboard queries read from `team_coverage` (instant response)

**Trade-offs Accepted:**
- Additional complexity vs pillar-only approach (worth it: category insights are research-valuable)
- Denormalization of coverage metrics (trades storage for query speed; acceptable)

**Future Enhancement (Post-MVP):**
- Category weighting: some categories more critical than others
- Minimum thresholds per category (e.g., "must cover ≥50% of Technical Excellence")
- Category-practice recommendations: "Your Technical Excellence is weak; consider practices X, Y, Z"

---

### Decision 5: Optimistic Concurrency Control Implementation

**Approach:** Version field on mutable entities with 409 Conflict handling

**Schema:**
```sql
ALTER TABLE issues ADD COLUMN version INT DEFAULT 1;
ALTER TABLE team_practices ADD COLUMN version INT DEFAULT 1;
```

**Update Logic:**
```sql
UPDATE issues 
SET content = ?, status = ?, version = version + 1
WHERE id = ? AND team_id = ? AND version = ?
-- Check rows_affected; if 0, version mismatch → return 409
```

**409 Conflict Response:**
- Return current server state to client
- Include payload: `{entity_id, attempted_version, current_version, latest_state}`
- Frontend shows ConflictModal with three options:
  1. **Apply latest + re-apply:** User's changes overlay on server state
  2. **Overwrite:** Replace server state entirely (if permission allows)
  3. **Save edits as comment:** Convert draft to a separate comment (for issues)

**Draft Preservation:**
- Auto-save to browser localStorage as user types (primary mechanism)
- **Optional server-side draft storage** (post-MVP): autosave to `issue_drafts` table every 30s (survives browser crashes/clears)
- If conflict occurs, draft is preserved and available in ConflictModal
- User's edits never lost

**Conflict Redaction (Privacy):**
- ConflictModal diffs **redact sensitive fields** (Big Five scores, personal comments)
- Only show field names that changed, not values: "Big Five profile updated" instead of showing actual scores
- Prevents accidental info leakage during conflict resolution

**Research Integration:**
- Log conflict events for analysis: `event_type: 'conflict_detected'`
- Track conflict frequency per entity type
- Signals if page-refresh UX causes excessive conflicts (indicates real-time need)

**Privacy Boundary:**
- Diff UI respects team isolation: only show changed fields, not cross-team actor identities
- Even in conflict resolution, cannot infer what other teams are doing

**Rationale:**
- Industry-standard pattern (well-proven, minimal risk)
- Research-traceable: conflicts become analyzable data
- Safe for users: no data loss, clear resolution paths
- Respects privacy even in edge cases

**Trade-off:**
- Requires frontend to send `version` field with every update request
- Client must handle 409 gracefully (already designed in UX spec)

---

### Cross-Decision Architectural Safeguards

**Database-Level Defense-in-Depth:**

All architectural patterns assume correct agent implementation, but mistakes happen. Database constraints provide last line of defense:

```sql
-- Enum-like columns: CHECK constraints
-- Single-role model: all team members have identical permissions
-- No role distinction needed in MVP (future versions may introduce sub-roles)

ALTER TABLE issues ADD CONSTRAINT chk_status 
  CHECK (status IN ('open', 'in_discussion', 'resolved'));

-- Critical fields: NOT NULL constraints
ALTER TABLE events ADD CONSTRAINT events_team_id_required 
  CHECK (team_id IS NOT NULL);

ALTER TABLE team_practices ADD CONSTRAINT team_practices_keys_required 
  CHECK (team_id IS NOT NULL AND practice_id IS NOT NULL);

-- Business keys: UNIQUE constraints
ALTER TABLE teams ADD CONSTRAINT uq_team_name UNIQUE (name);
ALTER TABLE practices ADD CONSTRAINT uq_practice_name_version 
  UNIQUE (name, practice_version);

-- Referential integrity: FOREIGN KEY constraints everywhere
ALTER TABLE events ADD CONSTRAINT fk_events_team 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE team_practices ADD CONSTRAINT fk_team_practices_team 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE team_practices ADD CONSTRAINT fk_team_practices_practice 
  FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE RESTRICT;
```

**Rationale:** Even if AI agents bypass application-level validation, database catches:
- Invalid enum values (role = "admin" rejected)
- Missing critical fields (team_id = null rejected)
- Orphaned records (practice deleted while teams use it → restricted)
- Duplicate business keys (two teams with same name → rejected)

**Implementation Priority:**
- ✅ Week 1: Add all constraints to initial migration
- ✅ CI gate: Prisma schema includes all constraints
- ✅ Monitoring: Log constraint violation errors separately (signal agent bugs)

---

### Data Dictionary & Research Documentation

**Note for Implementation Phase:**

A comprehensive **data dictionary** will be generated during database schema implementation, documenting:
- Every table: purpose, relationships, constraints
- Every column: meaning, data type, nullability, defaults
- Every index: query optimization rationale
- Every trigger/procedure: business logic encapsulation

This dictionary is **critical for research publications** — enables researchers to cite exact data structures and understand provenance.

**Location:** `docs/data-dictionary.md` (auto-generated from Prisma schema annotations)

---

## Risks & Mitigations (Pre-Mortem Analysis)

### Critical Risk #1: Database Schema Incompatibility with Practice JSON

**Failure Scenario:** Week 2 ends; practice catalog import fails on 15% of JSON files due to schema mismatches, pillar reference errors, or invalid responsibility types.

**Prevention (Do Week 1):**
- ✅ Create strict JSON Schema validator specifying all constraints:
  - `practice_goal` values must match exactly one of 19 canonical pillars
  - `roles[].responsibility` must be one of: Responsible, Accountable, Consulted, Informed
  - `tags` must reference approved behavior list
  - `associated_practices[].association_type` must be one of: Configuration, Equivalence, Dependency, Complementarity, Exclusion
- ✅ Run import script with sample JSON **on day 1** (not day 14)
- ✅ Auto-generate pillar + category seed data from single JSON source of truth

**Mitigation:** Import validation test suite that passes before deploying backend

---

### Critical Risk #2: Coverage Calculation Logic Bugs

**Failure Scenario:** Dashboard shows nonsensical coverage (team with 8 practices shows 30%, another with 3 shows 80%). Researchers question data validity.

**Prevention (Do Week 1):**
- ✅ Write unit tests for each coverage metric BEFORE dashboard implementation:
  - Pillar coverage: 12 pillars covered / 19 total = 63.2%
  - Category coverage: human_values 4/5 pillars = 80%
  - Overall: 3/5 categories complete = 60%
- ✅ Create fixture data with known-good coverage values
- ✅ Add data integrity checks: every coverage update validates against recalculated sum
- ✅ Dashboard explains calculation on hover

**Mitigation:** 100% test coverage for coverage calculation functions before week 2

---

### Critical Risk #3: Big Five Questionnaire Scoring Incorrect

**Failure Scenario:** Researchers detect reverse-coded items handled incorrectly. Scores systematically wrong for Neuroticism/Openness. Research hypothesis compromised.

**Prevention (Do Week 1):**
- ✅ Document IPIP-NEO algorithm explicitly:
  - List exactly which items are reverse-coded (typically ~9 items out of 44)
  - Provide exact scoring formula per trait
  - Reference official IPIP-NEO documentation + academic papers
- ✅ Create validation test suite: "all answers=5 produces expected profiles" validated against reference
- ✅ Have psychometrician review implementation before week 2
- ✅ Export and spot-check 3-5 scored questionnaires against manual calculation

**Mitigation:** Big Five implementation validated by domain expert before week 2 deploy

---

### Critical Risk #4: Team Isolation Data Leak

**Failure Scenario:** Security audit discovers Team A queries accidentally return Team B data. A missing `WHERE team_id = ?` clause exposed confidential information.

**Prevention (Do Week 1):**
- ✅ Create team isolation middleware that forces `team_id` filter on every query:
  ```javascript
  const enforceTeamIsolation = (req, res, next) => {
    const userTeamId = req.user.team_id; // from JWT
    req.dbFilter = `team_id = '${userTeamId}'`;
    // Middleware validates every query includes this filter
  };
  ```
- ✅ Write integration tests: queries without team_id filter return 403 Forbidden
- ✅ Database schema: add unique constraint (team_id, entity_id) on all entities
- ✅ Security audit before week 3: test with separate team accounts, verify no cross-team visibility

**Mitigation:** Data isolation middleware tested and verified for all query paths before MVP

---

### Critical Risk #5: Optimistic Concurrency Conflicts Not Handled

**Failure Scenario:** Two team members edit issue simultaneously. Second update silently fails (409 returned but user never sees it). Conflict resolution UI crashes on missing version field. Data lost.

**Prevention (Do Week 1):**
- ✅ Define API contract for 409 Conflict response:
  ```json
  {
    "status": 409,
    "error": "conflict",
    "entity": {"id": 123, "version": 5},
    "server_state": {"content": "...", "status": "..."},
    "user_version": 4
  }
  ```
- ✅ Frontend ConflictModal test: verify 409 handling and diff UI displays correctly
- ✅ Database test: simulate concurrent writes, verify only one succeeds, other gets 409
- ✅ Add version field validation in request schema: reject updates without version

**Mitigation:** Concurrent write test suite with ConflictModal validation before week 2

---

### Critical Risk #6: Event Logging Gaps - Missing Events

**Failure Scenario:** Researchers reconstruct team's decision history. Several events missing from log (practice additions, issue resolutions). Research data timeline has unexplained gaps.

**Prevention (Do Week 1):**
- ✅ Create exhaustive event checklist (what gets logged):
  - Issue created, updated, resolved
  - Issue comment added
  - Practice added to team, removed from team
  - Team created
  - Member joined team
  - Big Five questionnaire completed
  - Adaptation decision recorded
- ✅ Wrap DB operation + event log in single transaction (atomicity guaranteed):
  ```javascript
  db.transaction(async (trx) => {
    await trx('team_practices').insert({...});
    await trx('events').insert({event_type: 'practice_added', ...});
    // Both succeed or both roll back
  });
  ```
- ✅ Add event logging tests: for each operation, verify exactly 1 new event row in table
- ✅ Audit report (end of week 1): list all events from test team for 24 hours, manually verify completeness

**Mitigation:** Event logging transactional wrapper implemented and audit-tested before week 2

---

### Critical Risk #7: Pillar Category Seed Data Out of Sync

**Failure Scenario:** Dashboard shows only 4 categories instead of 5. Coverage calculations break. Practices referencing Simplicity/Short Releases fail to associate.

**Prevention (Do Week 1):**
- ✅ Single source of truth: pillar categories defined in JSON config only
- ✅ Seed script validates:
  - Exactly 5 categories loaded
  - Exactly 19 unique pillars across all categories
  - No pillar appears in multiple categories
  - No category is empty
- ✅ Unit test: verify categories/pillars counts match expected (5 + 19)
- ✅ Before week 3 deploy: dump categories/pillars from production DB, verify counts

**Mitigation:** Pillar category seed data validation tested before week 2

---

### Critical Risk #8: Deployment & Instance Provisioning Failed

**Failure Scenario:** Provisioning script for per-team database instances has bugs. Week 2 ends and cannot spin up instances. Docker containers crash or connection strings are wrong.

**Prevention (Do Week 1):**
- ✅ Create and test provisioning script **day 1**:
  - Spin up PostgreSQL container
  - Create database + tables
  - Seed practice/pillar data
  - Validate database connection
  - Run migrations
  - Verify seed data loaded correctly
- ✅ Run full provisioning for mock team on **day 2** (not day 14)
- ✅ Document rollback procedure: how to delete/reset an instance
- ✅ Create CI/CD pipeline that automatically tests provisioning on every commit

**Mitigation:** Provisioning script end-to-end test completed and automated before week 2

---

### Critical Risk #9: Performance Timeout on Coverage Calculation

**Failure Scenario:** Dashboard hangs when loading coverage. Coverage query takes 45 seconds for 8 teams' data. Users give up waiting.

**Prevention (Do Week 1):**
- ✅ Define database indexes upfront:
  ```sql
  CREATE INDEX idx_practice_pillars_practice ON practice_pillars(practice_id);
  CREATE INDEX idx_team_practices_team ON team_practices(team_id);
  CREATE INDEX idx_category_pillars_category ON category_pillars(category_id);
  ```
- ✅ Write performance test: dashboard load ≤ 500ms for 8 teams
- ✅ Run EXPLAIN ANALYZE on each coverage query before week 2 deploy
- ✅ Implement denormalized `team_coverage` cache: queries read cache (instant), recalculate on practice add/remove

**Mitigation:** Query performance validated and optimized before week 2 deploy

---

## Prevention Checklist (Week 1 - Priority Order)

### MUST DO (Non-Negotiable - Blocks MVP)
- [ ] JSON Schema validator for practice catalog import
- [ ] Big Five scoring implementation + validation against IPIP-NEO reference
- [ ] Team isolation middleware + data leak tests
- [ ] Event logging transaction wrapper (atomicity)
- [ ] Coverage calculation unit tests (logic correctness)
- [ ] Provisioning script end-to-end test

### SHOULD DO (High Risk - Likely Catches Bugs)
- [ ] Coverage calculation performance test (prevents timeouts)
- [ ] Pillar category seed validation (prevents missing data)
- [ ] Optimistic concurrency 409 test suite (prevents data loss)
- [ ] Event logging completeness audit (validates all operations logged)

### NICE TO DO (Lower Risk - Polish)
- [ ] Database security audit (extra validation)
- [ ] Dashboard error boundaries (graceful failures)
- [ ] Documentation of reverse-coded Big Five items

---

## Security & Threat Model

### Threat Landscape

**bmad_version** is a research-grade platform with:
- **Sensitive data:** Big Five personality profiles, team issues/discussions, practice adaptations
- **Multi-tenant architecture:** Team A and Team B must be absolutely isolated
- **Research integrity requirement:** Event logs must be immutable and audit-traceable
- **High trust assumption:** Researchers and teams trust the system (loss of trust = loss of data integrity)

**Key Threats (Prioritized by Impact):**

1. 🔴 **Team Data Isolation Bypass** - Team A reads Team B's issues/profiles (HIGH IMPACT: research ethics violation)
2. 🔴 **Big Five Data Leakage** - Personality profiles exposed (HIGH IMPACT: privacy violation)
3. 🔴 **Event Log Tampering** - Research audit trail compromised (HIGH IMPACT: data integrity loss)
4. 🟡 **SQL Injection** - Attacker executes arbitrary SQL (MEDIUM IMPACT: data loss/exposure)
5. 🟡 **JWT Token Forgery** - Attacker impersonates legitimate user (MEDIUM IMPACT: unauthorized access)
6. 🟡 **Data Access** - Team member accesses another team's data (MEDIUM IMPACT: privacy violation)
7. 🟠 **XSS in Issue Comments** - Malicious script runs in team members' browsers (LOWER IMPACT: session hijacking potential)
8. 🟠 **Denial of Service** - Server overwhelmed, research data collection interrupted (LOWER IMPACT: availability loss)
9. 🟠 **Secrets Leakage** - Database password/JWT key exposed (LOWER IMPACT if rotated quickly)

---

### Mitigation Strategies (By Threat)

#### **Threat #1: Team Data Isolation Bypass**

**Defense Layers:**
- 🛡️ **Database Level:** Separate PostgreSQL instances per team (impossible to cross-team query)
- 🛡️ **Middleware Level:** Every API route enforces `team_id` from JWT
- 🛡️ **Query Level:** ALL SQL queries include `WHERE team_id = ?` filter

**Implementation:**
```javascript
// Mandatory middleware on EVERY route
const enforceTeamIsolation = (req, res, next) => {
  const userTeamId = req.user.team_id; // from JWT
  const requestTeamId = req.params.team_id || req.query.team_id || req.body.team_id;
  
  if (requestTeamId !== userTeamId) {
    return res.status(403).json({error: 'Forbidden: not your team'});
  }
  next();
};

// Apply to ALL routes
app.use('/api/teams/:team_id/', enforceTeamIsolation);
app.use('/api/issues/:issue_id', enforceTeamIsolation);
```

**Verification (Test Week 1):**
- [ ] Create test accounts in Team A + Team B
- [ ] Team A user tries to access Team B's issues → 403 Forbidden
- [ ] Team A user tries to modify JWT's team_id → still 403 (verified against DB)
- [ ] All API routes have isolation middleware (no exceptions)

**Audit Logging:**
```sql
event_type: 'access_denied'
payload: {requested_team, user_team, attempted_action}
```

---

#### **Threat #2: Big Five Data Leakage**

**Defense Layers:**
- 🛡️ **Encryption at Rest:** Big Five scores encrypted in database
- 🛡️ **Access Control:** Team members see only own scores; all team members can see team aggregates
- 🛡️ **Research Export:** Anonymized IDs (user_id → SHA256 hash)

**Implementation:**
```javascript
// User can see only their own Big Five
app.get('/api/teams/:team_id/big-five/me', (req, res) => {
  const profile = db.query(
    'SELECT o, c, e, a, n FROM member_big_five WHERE user_id = ? AND team_id = ?',
    [req.user.user_id, req.user.team_id]
  );
  res.json(profile);
});

// Team members can see team aggregate (not individual scores)
app.get('/api/teams/:team_id/big-five/aggregate', (req, res) => {
  const aggregate = db.query(
    'SELECT AVG(o), AVG(c), AVG(e), AVG(a), AVG(n) FROM member_big_five WHERE team_id = ?',
    [req.user.team_id]
  );
  res.json(aggregate);
});

// Research export: anonymized
app.get('/api/export/big-five', requireResearcherRole, (req, res) => {
  const data = db.query(
    'SELECT SHA256(CONCAT(user_id, ?)) as user_id, o, c, e, a, n FROM member_big_five',
    [process.env.ANONYMIZATION_SALT]
  );
  // Researcher sees: {user_id: "a3f5b9...", o: 4.2, c: 3.8, ...} with no names/emails
});
```

**Database-Level Protection:**
```sql
-- Encrypt Big Five scores at rest (PostgreSQL pgcrypto extension)
CREATE EXTENSION pgcrypto;

CREATE TABLE member_big_five (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  team_id INT NOT NULL,
  o FLOAT NOT NULL, -- Openness
  c FLOAT NOT NULL, -- Conscientiousness
  e FLOAT NOT NULL, -- Extraversion
  a FLOAT NOT NULL, -- Agreeableness
  n FLOAT NOT NULL, -- Neuroticism
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Encryption trigger (optional: encrypt specific columns)
-- Or use database-wide encryption (TDE - Transparent Data Encryption)
```

**Verification (Test Week 1):**
- [ ] Member A tries to view Member B's Big Five → 403 Forbidden
- [ ] Owner views team aggregate → returns only averages, no individual values
- [ ] Research export has anonymized user IDs only (no email, name)
- [ ] Big Five data in database verified encrypted

**Audit Logging:**
```sql
event_type: 'big_five_accessed'
payload: {access_level, data_scope} -- 'own' | 'aggregate' | 'export_anonymized'
```

---

#### **Threat #3: Event Log Tampering**

**Defense Layers:**
- 🛡️ **Database Immutability:** Events table: INSERT only; no UPDATE/DELETE permissions
- 🛡️ **Transactional Integrity:** Event write wrapped in transaction with main operation
- 🛡️ **Audit Archive:** Events exported to read-only historical archive

**Implementation:**
```sql
-- Create immutable events table
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  actor_id INT,
  team_id INT NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  action VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
) WITH (fillfactor = 100); -- Append-only optimization

-- Create indexes for queries
CREATE INDEX idx_events_team ON events(team_id);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);

-- Remove all mutation permissions
REVOKE UPDATE, DELETE ON events FROM app_user;
REVOKE UPDATE, DELETE ON events FROM public;

-- Only INSERT allowed for app
GRANT INSERT ON events TO app_user;
```

**Transactional Wrapper (Application Layer):**
```javascript
// All event-creating operations wrapped in transaction
db.transaction(async (trx) => {
  // Main operation
  await trx('issues').insert({title: '...', team_id, ...});
  
  // Event log MUST succeed or entire transaction rolls back
  await trx('events').insert({
    event_type: 'issue_created',
    actor_id: req.user.user_id,
    team_id: req.user.team_id,
    entity_type: 'issue',
    payload: {...},
    created_at: NOW()
  });
  // Both succeed or both rollback
});
```

**Verification (Test Week 1):**
- [ ] Attempt UPDATE on events table → Error: "Permission denied"
- [ ] Attempt DELETE from events → Error: "Permission denied"
- [ ] Try to directly delete event row (as admin) → Succeeds (for emergency, but logged)
- [ ] Verify transaction: issue and event both created together (spot-check DB)

**Audit Trail:**
- All event writes logged with timestamps
- Admin access to events table logged: `event_type: 'audit_access'` with actor
- Emergency deletion logged: `event_type: 'event_purged'` with admin_id, reason, count

---

#### **Threat #4: SQL Injection**

**Defense Layers:**
- 🛡️ **Parameterized Queries:** ALL SQL uses placeholders `?`, never string concatenation
- 🛡️ **JSON Schema Validation:** Practice import validates before DB write
- 🛡️ **Input Whitelisting:** Practice names match regex (alphanumeric + allowed chars)

**Implementation:**
```javascript
// GOOD: Parameterized query
const stmt = db.prepare('SELECT * FROM practices WHERE name = ? AND team_id = ?');
const result = stmt.all(practiceName, teamId);

// BAD: String concatenation (FLAGGED IN CODE REVIEW)
const result = db.exec(`SELECT * FROM practices WHERE name = '${practiceName}'`);

// Practice import validation
const practiceSchema = {
  type: 'object',
  properties: {
    name: {type: 'string', minLength: 1, maxLength: 255, pattern: '^[a-zA-Z0-9\\s\\-()]+$'},
    practice_goal: {type: 'array', items: {enum: [list of 19 pillars]}},
    roles: {
      type: 'array',
      items: {
        properties: {
          responsibility: {enum: ['Responsible', 'Accountable', 'Consulted', 'Informed']}
        }
      }
    }
  },
  required: ['name', 'practice_goal']
};

// Validate before insert
const validator = ajv.compile(practiceSchema);
const valid = validator(practice);
if (!valid) {
  throw new Error(`Invalid practice: ${validator.errorsText()}`);
}
```

**Code Linting:**
```javascript
// ESLint rule: flag string interpolation in SQL
// npm install eslint-plugin-sql
// Rule: no database query strings with template literals
const bad = db.query(`SELECT * FROM users WHERE id = ${userId}`); // ESLint error
const good = db.query('SELECT * FROM users WHERE id = ?', [userId]); // OK
```

**Verification (Test Week 1):**
- [ ] Inject SQL payload in practice name: `"'; DROP TABLE practices; --"`
- [ ] Verify payload is treated as literal string (not executed)
- [ ] Linting passes without SQL injection patterns
- [ ] Code review catches any violations

---

#### **Threat #5: JWT Token Forgery**

**Defense Layers:**
- 🛡️ **Strong Signing:** HS256 algorithm with 256+ bit secret (environment variable)
- 🛡️ **Short Expiry:** 1-hour access token lifetime
- 🛡️ **Refresh Tokens:** Long-lived refresh tokens for session extension

**Implementation:**
```javascript
// Generate tokens on login
const accessToken = jwt.sign(
  {user_id, team_id, email},
  process.env.JWT_SECRET,
  {algorithm: 'HS256', expiresIn: '1h'}
);

const refreshToken = jwt.sign(
  {user_id, team_id},
  process.env.JWT_REFRESH_SECRET,
  {algorithm: 'HS256', expiresIn: '7d'}
);

// Verify on every request
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({error: 'Invalid or expired token'});
  }
  next();
};

// Refresh endpoint
app.post('/api/auth/refresh', (req, res) => {
  const {refreshToken} = req.body;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      {user_id: decoded.user_id, team_id: decoded.team_id},
      process.env.JWT_SECRET,
      {expiresIn: '1h'}
    );
    res.json({accessToken: newAccessToken});
  } catch (err) {
    res.status(401).json({error: 'Invalid refresh token'});
  }
});
```

**Environment Variables:**
```bash
# .env (never committed)
JWT_SECRET=<random-256-bit-value-from-crypto.randomBytes(32)>
JWT_REFRESH_SECRET=<different-256-bit-value>
```

**Verification (Test Week 1):**
- [ ] Token from 2 hours ago rejected (expiry enforced)
- [ ] Token signed with wrong secret rejected
- [ ] Refresh token successfully extends session
- [ ] Token tampering (modify payload) detected and rejected

---

#### **Threat #6: Privilege Escalation**

**Defense Layers:**
- 🛡️ **Role in Database (not JWT):** Role always verified against `team_members` table
- 🛡️ **Permission Checks:** Sensitive endpoints check role before action

**Implementation:**
```javascript
const requireTeamMembership = (req, res, next) => {
  // Verify user is member of team (all members have equal permissions)
  const member = db.query(
    'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?',
    [req.user.team_id, req.user.user_id]
  );
  
  if (!member) {
    return res.status(403).json({error: 'Not a team member'});
  }
  next();
};

// All team members can perform these actions
app.post('/api/teams/:team_id/invites', requireTeamMembership, (req, res) => {
  // Any team member can invite others
});

app.put('/api/teams/:team_id/settings', requireTeamMembership, (req, res) => {
  // Any team member can change team settings
});
```

**Verification (Test Week 1):**
- [ ] Member tries to invite users → 403 Forbidden
- [ ] Owner invites users → 200 Success
- [ ] Member modifies JWT to claim role=owner → still 403 (verified against DB)

**Audit Logging:**
- Role changes: `event_type: 'role_changed'` with before/after
- Failed permission checks: `event_type: 'permission_denied'` with attempted_action

---

#### **Threat #7: XSS (Cross-Site Scripting)**

**Defense Layers:**
- 🛡️ **React Auto-Escaping:** JSX escapes HTML by default
- 🛡️ **Content Security Policy:** HTTP header restricts script execution
- 🛡️ **Input Validation:** Reject HTML tags in sensitive fields

**Implementation:**
```jsx
// SAFE: React escapes by default
<div>{userComment}</div> // If userComment = "<script>alert('xss')</script>", renders as text

// UNSAFE: Never do this
<div dangerouslySetInnerHTML={{__html: userComment}} /> // FLAGGED IN REVIEW

// Safe Markdown rendering (if needed)
import ReactMarkdown from 'react-markdown';
<ReactMarkdown
  allowedElements={['b', 'i', 'p', 'ul', 'li', 'code']}
  children={userComment}
/>
```

**Content Security Policy (HTTP Header):**
```javascript
// Middleware
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
// Only scripts from same origin allowed; inline scripts blocked
```

**Verification (Test Week 1):**
- [ ] Submit XSS payload in issue comment: `<script>alert('xss')</script>`
- [ ] Verify it renders as text, not executed
- [ ] ESLint flags `dangerouslySetInnerHTML` (fail build)
- [ ] CSP header present in all responses

---

#### **Threat #8: Denial of Service**

**Defense Layers:**
- 🛡️ **Rate Limiting:** 100 requests/minute per user
- 🛡️ **Query Timeouts:** Long-running queries killed after 30 seconds
- 🛡️ **Input Size Limits:** Max payload size enforced

**Implementation:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests'
});

app.use('/api/', limiter);

// Query timeout
db.query('SELECT * FROM practices', {timeout: 30000}); // 30 seconds

// Payload size limit
app.use(express.json({limit: '10mb'})); // Max 10MB
```

**Verification (Test Week 1):**
- [ ] Send 101 requests in 1 minute → 101st rejected
- [ ] Run query that would take 60s → killed at 30s with error
- [ ] Send 20MB payload → rejected with 413 Payload Too Large

---

#### **Threat #9: Secrets Leakage**

**Defense Layers:**
- 🛡️ **Environment Variables Only:** No hardcoding in code
- 🛡️ **Git Ignores:** `.env` excluded from version control
- 🛡️ **Rotation Policy:** Secrets rotated every 90 days

**Implementation:**
```javascript
// GOOD: Environment variable
const jwtSecret = process.env.JWT_SECRET;

// BAD: Hardcoded (FLAGGED IN REVIEW)
const jwtSecret = 'mysecretkey123';
```

**Files:**
```bash
# .gitignore
.env
.env.local
.env.*.local

# .env (local development only)
JWT_SECRET=<random-256-bit-value>
DB_PASSWORD=<strong-password>
SMTP_PASSWORD=<email-key>
```

**Linting:**
```javascript
// ESLint rule: flag hardcoded secrets
// npm install eslint-plugin-no-secrets
const bad = 'JWT_SECRET=abc123def456'; // ESLint error: hardcoded secret
const good = process.env.JWT_SECRET; // OK
```

**Verification (Test Week 1):**
- [ ] Check `.env` in `.gitignore` (not in repo)
- [ ] Git history scan: no secrets ever committed
- [ ] Linting passes without hardcoded values
- [ ] Production deployment uses secret manager (not .env files)

---

### Security Implementation Roadmap

**Week 1 (MVP - Critical):**
- ✅ Team isolation middleware
- ✅ JWT + bcrypt authentication
- ✅ Parameterized queries + SQL injection prevention
- ✅ Event log immutability
- ✅ Big Five access control
- ✅ Rate limiting + query timeouts
- ✅ Environment variable secrets
- ✅ React XSS prevention (default)
- ✅ Privilege checking middleware

**Week 2 (MVP - Hardening):**
- ✅ CSP header implementation
- ✅ Input validation + whitelisting
- ✅ Security audit (team isolation verification)
- ✅ Secrets rotation setup

**Week 3+ (Post-MVP - Advanced):**
- 📋 Token revocation blacklist
- 📋 Hash-chained event logs
- 📋 DDoS protection (CDN, WAF)
- 📋 Secrets manager integration (AWS Secrets Manager, Vault)
- 📋 Database column encryption

---

### Compliance & Audit

**No formal compliance framework required (MVP)**, but implement:
- ✅ Audit logging (all security events)
- ✅ Data minimization (export only necessary fields)
- ✅ Privacy by design (anonymous researcher access)
- ✅ Transparency (document security measures)

**Research Ethics (Standard Practice):**
- Data retention: indefinite during study; manual erasure at end
- Data access: team members see only own data; researchers see anonymized data
- Incident response: if data breach detected, notify teams immediately
- Security review: pre-study security audit by institutional review

---

## Starter Template Evaluation

### Analysis Framework: Occam's Razor

**Approach:** Rather than starting with "industry-standard" starters, we identified the **absolutely essential** features for bmad_version MVP and selected the simplest starter that provides them, eliminating unnecessary overhead.

**Essential Features (Non-Negotiable):**
- ✅ TypeScript support (specified in UX spec)
- ✅ React frontend (specified in UX spec)
- ✅ TailwindCSS styling (specified in UX spec)
- ✅ Express or equivalent backend HTTP server
- ✅ PostgreSQL driver + migration capability
- ✅ Environment variable management (.env)
- ✅ Basic testing scaffolding (Jest or Vitest)
- ✅ Fast development experience (< 5s reload times)

**Total Essential Features: 8**

**Overhead Features (NOT Needed for MVP):**
- ❌ Storybook (pre-MVP)
- ❌ GraphQL (using REST API)
- ❌ Next.js App Router (page-refresh acceptable; adds complexity)
- ❌ Redux/state management (can hand-roll)
- ❌ NestJS decorators (Express is simpler)
- ❌ tRPC (REST is sufficient)
- ❌ Prisma ORM (can use pg driver directly)
- ❌ Kubernetes/advanced DevOps (manual per-team provisioning is fine)
- ❌ CI/CD pipelines (manual deploy for 8 teams is acceptable)
- ❌ Pre-commit hooks, release automation (add post-MVP)

**Total Overhead Features to Avoid: 18**

### Starter Comparison (Occam's Razor Scoring)

| Starter | Essential ✅ | Overhead ❌ | Score | Verdict |
|---------|----------|----------|-------|---------|
| **Minimal: Vite + Express** | 8/8 | 0/18 | ⭐⭐⭐⭐⭐ | **SELECTED** - Exactly what you need, nothing more |
| Next.js Full-Stack | 8/8 | 3/18 | ⭐⭐⭐⭐ | Good, but opinionated (App Router adds complexity) |
| T3 Stack | 8/8 | 7/18 | ⭐⭐⭐ | Solid, but tRPC + Prisma + Clerk overhead for MVP |
| Express + Create React App | 8/8 | 2/18 | ⭐⭐⭐⭐ | Same as Vite but CRA slower startup |
| NestJS + React | 8/8 | 5/18 | ⭐⭐⭐ | Over-engineered for 3-week MVP |

### Selected Starter: Minimal Vite + Express

**Rationale:**
- **Perfect essential coverage:** All 8 must-have features with zero overhead
- **Fast iteration:** Vite hot module reload (< 600ms refresh)
- **Control:** Every architectural decision explicit (no hidden assumptions)
- **Lightweight:** Minimal dependencies (easier to debug, fewer supply-chain risks)
- **Scalable:** Easy to add complexity post-MVP (Prisma, state management, etc.) without refactoring

**Trade-offs Accepted:**
- ⚠️ Must scaffold some boilerplate (vs batteries-included starters)
- ⚠️ You make database integration decisions (pg driver vs Prisma)
- ⚠️ No pre-built deployment configs (but per-team manual provisioning is explicit anyway)

### Project Structure

```
bmad-version/
├── frontend/                    # React + TypeScript + TailwindCSS (Vite)
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── api/                # API client (fetch wrapper)
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── tailwind.config.js
│   └── tailwind.css
│
├── backend/                     # Express + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── routes/             # API endpoints (auth, teams, issues, etc.)
│   │   ├── middleware/         # Auth, team isolation, logging, error handling
│   │   ├── db/                 # Database connection, queries, migrations
│   │   ├── models/             # TypeScript types/interfaces
│   │   ├── services/           # Business logic (auth, coverage calc, Big Five)
│   │   ├── utils/              # Helpers (validators, formatters)
│   │   └── server.ts           # Express app initialization
│   ├── migrations/             # SQL migration files (run via script)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── docker-compose.yml          # PostgreSQL container
├── provision-team.sh           # Manual per-team provisioning script
├── README.md                    # Setup instructions
└── .gitignore
```

### Technology Decisions Made by This Starter

**Frontend Stack:**
- **Build Tool:** Vite (600ms startup vs CRA 3-5s)
- **Language:** TypeScript (strict mode)
- **Component Library:** React (18+)
- **Styling:** TailwindCSS (utility-first, no runtime overhead)
- **HTTP Client:** Fetch API wrapper (minimal abstraction)
- **Testing:** Vitest (built-in to Vite, fast)
- **Bundling:** Vite default (esbuild + Rollup)

**Backend Stack:**
- **Runtime:** Node.js 18+ (LTS)
- **Framework:** Express 4.x (minimal, unopinionated)
- **Language:** TypeScript (strict mode)
- **Database Driver:** `pg` module (lightweight) + manual SQL, or Prisma (optional for migrations)
- **Validation:** Manual validators (can add Zod/Joi post-MVP)
- **Testing:** Jest (Node standard)
- **Process Manager:** node for dev, pm2 or systemd for production

**Database:**
- **PostgreSQL** (as specified in PRD)
- **Migrations:** SQL files + manual migration script (or Prisma if desired)
- **Connection Pool:** pg-pool (built into pg module)
- **Schema:** Designed in architecture.md (tables, indexes, immutability constraints)

**Development Environment:**
- **Package Manager:** npm (Node standard)
- **Version Control:** Git (standard)
- **Environment Config:** dotenv (.env files)
- **Linting:** ESLint + Prettier (standard setup)
- **Type Checking:** TypeScript compiler (tsc)

**Deployment:**
- **Container:** Docker per team (as per architecture)
- **Runtime:** Node.js in container
- **Database:** PostgreSQL in separate container (docker-compose)
- **Secrets:** Environment variables (provisioning script sets on container init)

### Initialization Commands

**Frontend Initialization:**
```bash
npm create vite@latest bmad-frontend -- --template react-ts
cd bmad-frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
# Copy tailwind.config from UX spec
npm run dev
```

**Backend Initialization (Manual):**
```bash
mkdir bmad-backend
cd bmad-backend
npm init -y
npm install express typescript @types/express @types/node ts-node dotenv pg
npm install -D @types/pg
npx tsc --init
# Create src/server.ts with Express boilerplate
npm run dev
```

**Database Initialization:**
```bash
docker-compose up -d postgres
# Run migration scripts (SQL files in backend/migrations/)
```

### Development Workflow

**Frontend Development:**
```bash
cd frontend
npm run dev
# Vite dev server: localhost:5173
# Hot reload on file save (< 600ms)
```

**Backend Development:**
```bash
cd backend
npm run dev
# ts-node watches for changes
# API: localhost:3000
# Restart on file save
```

**Full-Stack Testing:**
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Frontend calls backend API at `http://localhost:3000`

### Key Decisions & Rationale

**Decision: Separate Frontend/Backend Repos vs. Next.js Monorepo**
- ✅ **Chosen:** Separate repos for maximum control
- **Why:** 
  - Backend has specific per-team database isolation needs (easier to manage separately)
  - Frontend is desktop-only (doesn't need Next.js features)
  - Separate deployment: backend on server, frontend can be static hosted
  - Research data integrity: backend is critical; frontend can be swapped

**Decision: pg Module vs. Prisma ORM**
- ✅ **Chosen for MVP:** pg module (lightweight, direct SQL control)
- **Why:**
  - Event logging needs raw SQL (append-only, no ORM abstraction)
  - Coverage calculation complex (raw SQL queries easier)
  - Migrations are simple (just SQL files)
  - Can add Prisma later if needed (add as optional layer)
- **Note:** If team prefers ORM, Prisma can be added without breaking architecture

**Decision: Vitest vs. Jest**
- ✅ **Chosen:** Vitest (faster, Vite-native)
- **Why:**
  - Integrates with Vite (no separate test bundler)
  - Jest still available as fallback (compatible syntax)

**Decision: dotenv vs. Secrets Manager**
- ✅ **Chosen for MVP:** dotenv (.env files)
- **Why:**
  - Simple local development
  - Production: environment variables set by provisioning script
  - Post-MVP: can switch to AWS Secrets Manager / HashiCorp Vault
  - No additional infrastructure needed

### Bootstrap Timeline (First 2 Days)

**Day 1 - Setup Phase:**
- Morning: Create monorepo structure, initialize Vite + Express
- Afternoon: Add TypeScript, TailwindCSS, Docker Compose
- End of day: Both dev servers start successfully

**Day 2 - Scaffolding Phase:**
- Morning: Backend API structure (routes, middleware, db folder)
- Midday: Frontend page structure, API client wrapper
- Afternoon: Database schema setup, migration script
- End of day: Frontend-backend API call works end-to-end

**By End of Day 2:** Ready for feature development (stories, issues, coverage, Big Five)

### Post-MVP Enhancements (Ready to Add)

Without any rework, can add:
- ✅ Prisma ORM (drop-in replacement for pg queries)
- ✅ Redux or Zustand (state management)
- ✅ React Query (data fetching cache)
- ✅ Storybook (component library)
- ✅ GraphQL (alongside REST)
- ✅ Kubernetes (containerization already done)
- ✅ Advanced monitoring (APM tools)

**No architectural refactoring needed** — just additive.

---

## Core Architectural Decisions (Step 4)

- How do we interact with PostgreSQL? **Prisma ORM (Option B)** for schema-first workflow, safer migrations, and type-safe queries; keep escape hatch with raw SQL for JSONB event log and coverage queries.
- How do users stay logged in? **JWT + refresh tokens** with short-lived access tokens, HTTP-only secure cookies, refresh rotation, and a Postgres-backed revocation list; aligns with existing auth stack.
- API design and errors? **Structured JSON errors (Option B)** returning `{ code, message, details, requestId }`, mapped to HTTP status codes; enforces a consistent error contract across all routes.
- How do we manage React component state? **Zustand** with domain-focused slices (auth, teams, practices, coverage) plus middleware for persistence and devtools; keeps React Context light while supporting future complexity.
- How do we capture errors and system metrics? **Hybrid logging/metrics (Option C)**: structured console/file transports now, correlation IDs per request, client error-reporting endpoint; OpenTelemetry-compatible hooks so we can add centralized metrics/traces later without refactor.

# Project Structure & Boundaries

## Complete Project Directory Structure

    ```
    bmad-version/
    ├── README.md
    ├── package.json                 # (root orchestrator if using workspaces)
    ├── pnpm-workspace.yaml          # or npm workspaces; align tooling
    ├── .editorconfig                # formatting consistency
    ├── .gitignore
    ├── .env.example                 # root shared env hints (not secrets)
    ├── .github/workflows/ci.yml     # lint/test/migrate check
    ├── ops/                         # provisioning + ops (no app imports)
    │   ├── provision-team.sh
    │   ├── docker-compose.yml
    │   ├── env/
    │   │   ├── backend.env.example
    │   │   └── frontend.env.example
    │   └── README.md
    ├── frontend/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── tailwind.config.js
    │   ├── .env.example
    │   ├── src/
    │   │   ├── main.tsx
    │   │   ├── App.tsx
    │   │   ├── index.css
    │   │   ├── lib/
    │   │   │   ├── api-client.ts        # fetch wrapper with requestId injection
    │   │   │   ├── constants/
    │   │   │   │   └── coverage.ts      # pillar/category constants (mirrors backend)
    │   │   │   └── types/
    │   │   │       ├── generated/       # generated from backend OpenAPI/TS (do not edit)
    │   │   │       └── domain.ts        # light FE-only types
    │   │   ├── ui/                      # shared UI used by 2+ features
    │   │   ├── hooks/                   # cross-feature hooks
    │   │   ├── features/
    │   │   │   ├── auth/
    │   │   │   │   ├── components/
    │   │   │   │   ├── api/             # clients map 1:1 to backend auth routes
    │   │   │   │   ├── state/           # Zustand slice (resettable)
    │   │   │   │   └── __tests__/
    │   │   │   ├── teams/
    │   │   │   │   ├── components/
    │   │   │   │   ├── api/             # /api/v1/teams...
    │   │   │   │   ├── state/
    │   │   │   │   └── __tests__/
    │   │   │   ├── practices-coverage/
    │   │   │   │   ├── components/
    │   │   │   │   ├── api/             # /api/v1/teams/{id}/practices
    │   │   │   │   ├── state/           # coverage UI state (not server cache)
    │   │   │   │   └── __tests__/
    │   │   │   ├── issues/
    │   │   │   │   ├── components/
    │   │   │   │   ├── api/             # /api/v1/issues...
    │   │   │   │   ├── state/
    │   │   │   │   └── __tests__/
    │   │   │   ├── big-five/
    │   │   │   │   ├── components/
    │   │   │   │   ├── api/
    │   │   │   │   ├── state/
    │   │   │   │   └── __tests__/
    │   │   │   └── events-export/
    │   │   │       ├── api/
    │   │   │       ├── components/
    │   │   │       └── __tests__/
    │   │   ├── __tests__/               # global setup/mocks if needed
    │   │   └── setupTests.ts            # shared mocks (Matrix refinement)
    │   └── public/
    │       └── assets/
    └── backend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    ├── src/
    │   ├── server.ts               # app bootstrap
    │   ├── app.ts                  # express app wiring
    │   ├── config/                 # env parsing, constants (coverage.ts)
    │   ├── middleware/
    │   │   ├── auth.ts
    │   │   ├── team-isolation.ts
    │   │   ├── logger.ts           # correlation IDs, redaction
    │   │   └── error-handler.ts    # structured errors
    │   ├── routes/                 # route registration per domain
    │   │   ├── auth.routes.ts
    │   │   ├── teams.routes.ts
    │   │   ├── practices.routes.ts
    │   │   ├── coverage.routes.ts
    │   │   ├── issues.routes.ts
    │   │   ├── bigfive.routes.ts
    │   │   └── events.routes.ts
    │   ├── controllers/            # thin; maps DTOs to services
    │   ├── services/               # business rules (no DB here)
    │   ├── repositories/           # Prisma data access only
    │   ├── dto/                    # request/response types
    │   ├── schemas/                # zod validation per route (pair with DTOs)
    │   ├── utils/                  # helpers (id, time, hashing)
    │   ├── telemetry/              # OTEL hooks, logger transport
    │   ├── __tests__/              # co-located integration/unit; migrations tests
    │   │   └── helpers/            # fixtures/factories (Matrix refinement)
    │   └── types/                  # shared types if needed
    └── scripts/
        ├── dev-seed.ts
        └── migrate-check.ts
    ```

  ## Architectural Boundaries
  - **API boundaries:** `/api/v1/*` REST; structured errors `{code,message,details?,requestId}`; requestId injected by middleware; team isolation middleware on all team-scoped routes; JWT/refresh on auth endpoints.
  - **Service boundaries:** Routes/controllers thin; services own business logic; repositories are DB-only (Prisma). Events go through eventsRepository only.
  - **Component/state boundaries (FE):** Feature API clients live in that feature; no cross-feature client imports. Zustand slices only UI/ephemeral; server cache not stored there. Shared types from generated bindings in `lib/types/generated`.
  - **Data boundaries:** Prisma schema snake_case mapped to camelCase; no direct SQL from routes. Events require teamId; coverage constants mirrored in FE/BE config. Ops isolated in /ops (no imports into app).
  - **Graph of Thoughts refinements:** enforce 1:1 mapping feature api/clients ↔ backend route namespaces; server cache not in Zustand; shared coverage constants FE/BE; events/logging via single middleware + eventsRepository; migrations paired with tests; ops isolated.

  ## Requirements to Structure Mapping
  - **Auth & Sessions (JWT/refresh):** frontend/features/auth/*; backend routes/auth, controllers/auth, services/auth, repositories/user; schemas/auth.
  - **Teams & Invitations:** frontend/features/teams/*; backend routes/teams, services/teams, repositories/team, member, invite; team-isolation middleware.
  - **Practices & Coverage:** frontend/features/practices-coverage/*; backend routes/practices + coverage; services/practices, coverage; repositories/practice, practice_pillars, team_practices; shared coverage constants in frontend lib/constants/coverage.ts and backend config/coverage.ts.
  - **Issues & Comments:** frontend/features/issues/*; backend routes/issues; services/issues/comments; repositories/issues/comments; optimistic version handling.
  - **Big Five:** frontend/features/big-five/*; backend routes/bigfive; services/bigfive; repositories/bigfive_results; schemas for validation.
  - **Events & Export:** frontend/features/events-export/*; backend routes/events; eventsRepository only; export endpoints; telemetry/logger middleware for correlation IDs.
  - **Provisioning:** ops/ scripts; backend prisma/migrations for schema; no feature code imports from ops.

  ## Integration Points
  - **Internal:** FE API clients ↔ BE routes (1:1 mapping); requestId generated/propagated; version field on mutable entities; structured errors enforced centrally.
  - **External:** SMTP (invites) via service adapter; no other third-party for MVP.
  - **Data flow:** Controllers validate (zod) → services (rules) → repositories (Prisma) → eventsRepository (log) → structured response with requestId.

  ## File Organization Patterns
  - **Config:** backend/config for env/coverage; frontend/.env.example; ops/env templates.
  - **Source:** feature-first FE; layered BE (routes→controllers→services→repositories).
  - **Tests:** co-located __tests__; migrations get paired tests in backend/src/__tests__/migrations/; helpers in backend/src/__tests__/helpers/; frontend src/setupTests.ts for shared mocks.
  - **Assets:** frontend/public/assets; no imports from ops into app.

  ## Development Workflow Integration
  - **Dev:** `frontend: npm run dev`; `backend: npm run dev` with logger/error middleware active. requestId injected by FE api-client if absent.
  - **Build:** Vite build to dist; backend compiled to dist; prisma migrate check in CI.
  - **Deploy:** ops/provision-team.sh + docker-compose; env files from ops/env templates; one DB per team.

  CI/Tooling (Matrix refinements):
  - Prefer pnpm (or npm) workspaces; root scripts run lint, format, test, migrate:check across frontend/backend.
  - Generate frontend API types from backend into frontend/src/lib/types/generated with a do-not-edit note; forbid manual duplications.
  - Keep zod schemas and DTOs co-located per route module to prevent divergence; controllers import from one place.
  - Tests helpers: frontend/src/setupTests.ts; backend/src/__tests__/helpers/ for fixtures/factories.
  - CI gates: prisma migrate diff clean; fail if new routes lack schemas or generated types are stale (regen + git diff zero).

---

## Ruthlessly Prioritized Implementation Plan (3-Week Timeline)

### **MUST SHIP (Week 1) - Blocking Requirements:**
1. **Schema migration orchestration** with version tracking across all databases (prevents data inconsistency)
2. **Database constraints** (CHECK, FK, NOT NULL, UNIQUE) in initial Prisma schema (catches agent errors)
3. **Team isolation middleware** + integration tests (security foundation)
4. **Event logging transaction wrapper** (research data integrity)

**Estimated:** 3 days (infrastructure week)

### **MUST SHIP (Week 2-3) - Core Features:**
5. Core features: auth, teams, practices, coverage (TypeScript services), issues, Big Five, events export
6. Practice import pipeline with JSON Schema validation + URL/length checks
7. Coverage calculation in TypeScript service (NOT stored procedure)
8. Event schema validation (Zod per type) - prevents payload inconsistencies

**Estimated:** 15 days (feature development)

### **SHOULD SHIP (If Time Permits) - High Value, Low Cost:**
9. `coverage_history` table + snapshot inserts (enables temporal research analysis)
10. Coverage metadata API endpoint `/api/v1/coverage/metadata` (guarantees FE/BE sync)
11. Import provenance metadata (git SHA, timestamp, user) - research traceability
12. Near-conflict event logging (collaboration pattern analysis)

**Estimated:** 2 days (optional polish)

### **DEFER TO POST-MVP - Not Blocking, Can Add Later:**
- Automated backup verification (manual weekly checks OK for MVP)
- Certificate-based auth (password-based sufficient initially)
- Row-Level Security policies (already have 3 isolation layers)
- Server-side draft storage (localStorage works for MVP)
- Event hash chains (add only if ethics committee requires cryptographic proof)
- Table partitioning (8 teams won't hit scale limits)
- Practice versioning/re-import (practices stable for MVP duration)

**Total MVP Timeline:** 18-20 days, leaves 1-3 days buffer for bug fixes

**Critical Success Factor:** Ship working system with core features; defer nice-to-haves ruthlessly

---

## Implementation Checklist for AI Agents

### **Critical Pattern Compliance (Automated Tests):**

```typescript
// CI must enforce these constraints
describe('Architectural Pattern Compliance', () => {
  it('prevents SQL injection - no template literals in queries', () => {
    const sqlFiles = findFilesContaining('db.query', 'prisma.raw');
    sqlFiles.forEach(file => {
      expect(file).not.toContain('${'); // template literal = SQL injection risk
    });
  });
  
  it('enforces team isolation - all queries include teamId', () => {
    const queryFiles = findRepositoryFiles();
    queryFiles.forEach(file => {
      // Parse queries, verify WHERE clause includes team_id or team relationship
    });
  });
  
  it('enforces error format - all API errors return structured shape', () => {
    const controllerFiles = findControllerFiles();
    controllerFiles.forEach(file => {
      // Verify error responses match {code, message, details?, requestId}
    });
  });
  
  it('prevents business logic in repositories - services only', () => {
    const repoFiles = findRepositoryFiles();
    repoFiles.forEach(file => {
      expect(file).not.toContain('if ('); // no conditionals in data layer
      expect(file).not.toContain('for ('); // no loops (except simple maps)
    });
  });
});
```

### **Feature Implementation Checklist (Per Epic/FR):**

- [ ] **API Route:** Implements REST pattern `/api/v1/{resource}`, includes team isolation middleware
- [ ] **Controller:** Thin, maps DTOs to service calls, returns structured errors
- [ ] **Service:** Contains business logic, validates inputs, calls repository
- [ ] **Repository:** Prisma calls only, no conditionals, enforces snake_case→camelCase mapping
- [ ] **DTO/Schema:** Zod validation at API ingress, exports TypeScript types
- [ ] **Event Logging:** Transaction wrapper includes event write for all mutations
- [ ] **Tests:** Co-located `*.test.ts` with minimum 1 integration test per feature
- [ ] **Frontend:** Feature folder with `api/`, `state/`, `components/` (or README explaining why not)

### **Week 1 Infrastructure Acceptance Criteria:**

- [ ] Prisma schema includes all constraints (CHECK, FK, NOT NULL, UNIQUE)
- [ ] `schema_migrations` table exists in all databases
- [ ] Migration script verifies version consistency before applying
- [ ] Team isolation middleware tests: cross-team query attempts return 403
- [ ] Event logging transaction wrapper: operation + event both succeed or both rollback
- [ ] Database backup script runs successfully, restore verified manually

---

## Data Dictionary (Schema Annotations)

**Requirement:** All Prisma models must include `///` documentation comments for research publication

**Template Example:**
```prisma
/// Team entity - represents a research team using the platform
/// Isolation: team_id is the primary boundary for all data access
/// Privacy: Team names are not anonymized in research exports
model Team {
  /// Auto-incrementing primary key
  id        Int      @id @default(autoincrement())
  
  /// Unique team name, displayed in UI and used in invitations
  /// Constraints: 3-50 characters, alphanumeric + spaces only
  name      String   @unique @db.VarChar(255)
  
  /// ISO 8601 UTC timestamp of team creation
  /// Used for: Research cohort analysis, temporal studies
  createdAt DateTime @default(now()) @map("created_at")
  
  /// Relationships
  members   TeamMember[]
  practices TeamPractice[]
  issues    Issue[]
  coverage  TeamCoverage?
  
  @@map("teams")
}

/// Event log entry - immutable append-only audit trail
/// Immutability: App enforced via REVOKE UPDATE/DELETE permissions
/// Research: Enables reconstruction of team decision timelines
model Event {
  id           Int      @id @default(autoincrement())
  
  /// Event classification using domain.action pattern (practice.created, issue.resolved)
  eventType    String   @map("event_type") @db.VarChar(50)
  
  /// User who triggered the event (null for system events)
  actorId      Int?     @map("actor_id")
  
  /// Team context - required for isolation, included in all events
  teamId       Int      @map("team_id")
  
  /// Entity affected by event (practice, issue, comment, etc.)
  entityType   String?  @map("entity_type") @db.VarChar(50)
  entityId     Int?     @map("entity_id")
  
  /// Action performed (created, updated, resolved, added, removed)
  action       String?  @db.VarChar(50)
  
  /// Delta payload - only changed fields {"old_value": X, "new_value": Y}
  /// Format: Validated via Zod schema per event type
  payload      Json?
  
  /// Schema version for payload evolution (enables research data filtering)
  schemaVersion String  @default("v1") @map("schema_version") @db.VarChar(10)
  
  /// Timestamp of event occurrence (immutable, source of truth for temporal analysis)
  createdAt    DateTime @default(now()) @map("created_at")
  
  @@index([teamId, eventType], name: "idx_events_team_type")
  @@index([entityType, entityId], name: "idx_events_entity")
  @@index([createdAt], name: "idx_events_timeline")
  @@map("events")
}
```

**Generation:** Run `npx prisma-docs-generator` to create `docs/data-dictionary.md`

**Week 1 Acceptance Criteria:**
- [ ] All models have `///` triple-slash documentation
- [ ] All fields explain: purpose, constraints, research usage
- [ ] Relationships documented with cardinality
- [ ] Indexes explained (which queries they optimize)
- [ ] Data dictionary generated and committed in Week 1

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- ✅ Frontend stack (React 18+ + TypeScript + Vite + TailwindCSS) fully compatible
- ✅ Backend stack (Express 4.x + TypeScript + Prisma + PostgreSQL) proven combination
- ✅ Authentication flow (JWT + refresh tokens + bcrypt) industry standard
- ✅ Docker Compose supports per-team PostgreSQL isolation
- ✅ No version conflicts detected across technology choices

**Pattern Consistency:**
- ✅ Naming conventions unified: snake_case DB → camelCase API via Prisma `@map`
- ✅ REST routes follow `/api/v1/{resource}` with plural nouns consistently
- ✅ Error format `{code, message, details?, requestId}` enforced across all routes
- ✅ Events carry `teamId`, `requestId`, `version` (when mutable) universally
- ✅ Zustand slices export `initialState()` + `reset()` for state management hygiene
- ✅ Business logic in services layer, NOT stored procedures (pattern compliance)

**Structure Alignment:**
- ✅ Frontend feature folders map 1:1 to backend route namespaces
- ✅ Each feature has required `api/` + `state/` or explicit README
- ✅ Backend layering (routes→controllers→services→repositories) prevents logic leakage
- ✅ Ops isolated in `/ops` with no application imports
- ✅ Shared UI components only for 2+ feature reuse

### Requirements Coverage Validation ✅

**Functional Requirements (FR1-23):**
- ✅ FR1-7 (User/Team Management): `features/auth`, `features/teams`, JWT middleware
- ✅ FR8-10 (Practice Catalog): `features/practices-coverage`, import pipeline, coverage calculation
- ✅ FR11-12 (Big Five Integration): `features/big-five`, 44-item IPIP-NEO questionnaire
- ✅ FR13-16 (Issue Workflow): `features/issues`, threaded discussions, resolution lifecycle
- ✅ FR17-18 (Research Logging): `events` table (immutable), export endpoints with filtering
- ✅ FR19-20 (Concurrency): Optimistic locking via `version`, ConflictModal UI with 3 resolution paths
- ✅ FR21-22 (Permissions): Single-role model, `requireTeamMembership` middleware
- ✅ FR23 (Provisioning): `ops/provision-team.sh`, Docker Compose per team

**Non-Functional Requirements:**
- ✅ NFR1-4 (Security): bcrypt (10+ rounds), JWT/HTTPS, parameterized queries, team isolation middleware
- ✅ NFR5-7 (Data Integrity): Events immutable (REVOKE UPDATE/DELETE), Big Five IPIP-NEO validated, transactional operations
- ✅ NFR8-9 (Reliability): PostgreSQL ACID guarantees, documented backup procedures with verification

**UX Technical Requirements:**
- ✅ Desktop-only (no responsive breakpoints required)
- ✅ Page-refresh acceptable (no WebSocket/real-time requirements)
- ✅ Auto-save with localStorage draft preservation
- ✅ React + TypeScript + TailwindCSS component architecture
- ✅ WCAG AA accessibility (keyboard navigation, ARIA, contrast)
- ✅ "Teal Focus" design direction

### Implementation Readiness Validation ✅

**Decision Completeness:**
- ✅ All 5 critical decisions documented with explicit rationales and trade-offs
- ✅ Technology versions specified (React 18+, Express 4.x, Node 18+, PostgreSQL)
- ✅ Prisma ORM chosen with raw SQL escape hatch for complex queries
- ✅ JWT + refresh token flow fully specified (1h access, 7d refresh, rotation)
- ✅ Zustand state management with domain slices defined
- ✅ Multi-database migration orchestration with version tracking defined

**Structure Completeness:**
- ✅ Full directory tree with all files/folders defined
- ✅ Frontend: 6 feature folders (auth, teams, practices-coverage, issues, big-five, events-export)
- ✅ Backend: 7 route groups (auth, teams, practices, coverage, issues, bigfive, events)
- ✅ Database: Prisma schema with migrations, `schema_migrations` tracking table
- ✅ Ops: Provisioning script + docker-compose.yml with orchestration logic

**Pattern Completeness:**
- ✅ Naming: DB (snake_case), API/TS (camelCase), REST (plural), params (business terms)
- ✅ Structure: Frontend feature-first, backend layered, shared UI gated by 2+ reuse
- ✅ Formats: Success (raw), errors (structured), pagination (items/page/total), dates (ISO 8601 UTC)
- ✅ State: Events include teamId/requestId/version, Zustand slices resettable
- ✅ Process: Optimistic with version, skeletons for lists, tests co-located, logs include requestId/teamId
- ✅ Implementation checklist with CI-enforced pattern compliance tests

### Gap Analysis Results

**Critical Gaps:** ✅ **None Found**

All blocking requirements addressed with pragmatic, shippable solutions.

**Important Gaps:** ✅ **None Found**

All high-value architectural concerns resolved through ADR panel review and critical challenge analysis.

**Post-MVP Enhancements (Documented, Not Blocking):**
- 📋 Certificate-based PostgreSQL authentication (password-based sufficient for MVP)
- 📋 Automated backup verification scripts (manual weekly verification acceptable initially)
- 📋 Row-Level Security policies (3 existing isolation layers sufficient)
- 📋 Server-side draft storage (localStorage works for MVP)
- 📋 Event hash chains (add only if ethics committee requires cryptographic proof)
- 📋 Table partitioning (8 teams won't hit scale limits in study duration)
- 📋 Practice versioning/re-import (practices stable for MVP duration)

### Validation Issues Addressed

**Architecture Decision Records Panel Review:**
- ✅ Multi-database schema migration orchestration added with version tracking
- ✅ Event immutability clarified: app-level for MVP, hash chain option if research requires
- ✅ Coverage calculation moved to TypeScript services (removed stored procedure approach)
- ✅ Row-Level Security downgraded to optional (acknowledges existing 3-layer isolation)
- ✅ Import provenance metadata added (git SHA, timestamp, user)
- ✅ URL validation and string length limits added to practice import
- ✅ Coverage metadata API endpoint added to guarantee FE/BE sync

**Critical Challenge Review (Devil's Advocate):**
- ✅ Schema migration orchestration prevents multi-DB drift
- ✅ Stored procedures removed to maintain service-layer business logic pattern
- ✅ RLS performance/complexity trade-offs acknowledged, made optional
- ✅ Ruthless prioritization applied: 18-20 day timeline with MUST/SHOULD/DEFER tiers
- ✅ Implementation checklist added with automated CI pattern compliance tests
- ✅ Data dictionary requirements moved to Week 1 (not deferred)

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (23 FRs, 9 NFRs, UX requirements)
- [x] Scale and complexity assessed (MEDIUM-HIGH, 3-week timeline, research-grade)
- [x] Technical constraints identified (practice JSON format, separate DBs per team)
- [x] Cross-cutting concerns mapped (security, data integrity, research logging)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions and rationales (5 major decisions)
- [x] Technology stack fully specified with compatibility verified
- [x] Integration patterns defined (team isolation, event logging, coverage calculation)
- [x] Performance considerations addressed (denormalized cache, indexes, transaction optimization)
- [x] Security threat model complete (9 threats with mitigations)

**✅ Implementation Patterns**
- [x] Naming conventions established across DB/API/TS layers
- [x] Structure patterns defined (feature-first, layered, ops isolation)
- [x] Communication patterns specified (events, errors, pagination, dates)
- [x] Process patterns documented (optimistic concurrency, logging, testing)
- [x] CI-enforced compliance tests defined (SQL injection, team isolation, error format)

**✅ Project Structure**
- [x] Complete directory structure defined (frontend/backend/ops)
- [x] Component boundaries established (features, routes, services, repositories)
- [x] Integration points mapped (API routes, middleware, database access)
- [x] Requirements to structure mapping complete (FRs → features/routes)
- [x] Data dictionary requirements specified with Prisma annotation template

**✅ Risk Mitigation**
- [x] 9 critical risks identified with prevention strategies
- [x] Week 1 prevention checklist defined (6 must-do items)
- [x] Pre-mortem analysis complete for high-impact failure scenarios
- [x] Security audit planned (team isolation verification before MVP)

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** **HIGH**

**Rationale:**
- All validation checks passed without blocking issues
- Architecture enhanced through multi-perspective review (ADR panel + critical challenges)
- Pragmatic simplifications applied to meet 3-week timeline
- Clear implementation guidance with automated compliance enforcement
- Research-grade data integrity requirements satisfied

**Key Strengths:**
1. **Comprehensive security model** - 9 threats addressed, 3-layer team isolation, defense-in-depth
2. **Research-grade data integrity** - Immutable event logs, transactional consistency, provenance tracking
3. **AI agent conflict prevention** - Explicit patterns, CI-enforced compliance, implementation checklist
4. **Risk-aware design** - 9 pre-mortem scenarios, Week 1 prevention checklist, pragmatic prioritization
5. **Complete requirements coverage** - Every FR/NFR/UX requirement mapped to architectural components
6. **Technology stack coherence** - Proven, compatible choices with no version conflicts
7. **Realistic timeline** - 18-20 day delivery plan with explicit MUST/SHOULD/DEFER tiers

**Areas for Future Enhancement (Post-MVP):**
1. Certificate-based database authentication (password-based sufficient initially)
2. Automated backup verification scripts (manual process acceptable for MVP)
3. Event hash chains for cryptographic immutability (add only if required by ethics review)
4. Row-Level Security policies (3 existing layers provide sufficient isolation)
5. Table partitioning for event log scale (won't hit limits during study)
6. Practice versioning system (practices stable for MVP duration)

### Implementation Handoff

**AI Agent Guidelines:**
1. **Follow all architectural decisions** exactly as documented (versions, patterns, structure)
2. **Use implementation patterns consistently** across all components (naming, formats, communication)
3. **Respect project structure and boundaries** (feature-first frontend, layered backend, ops isolation)
4. **Enforce consistency rules** (Prisma mappings, error shapes, event logging, test discipline)
5. **Refer to this document** for all architectural questions (single source of truth)
6. **Execute Week 1 infrastructure checklist** before feature development begins
7. **Run CI pattern compliance tests** on every commit to catch violations early

**First Implementation Steps:**
1. Initialize project structure using Minimal Vite + Express starter template
2. Set up Prisma schema with snake_case → camelCase mappings and all constraints
3. Create `schema_migrations` table in template database
4. Implement migration orchestration script with version checking
5. Create database tables (practices, pillars, categories, team_coverage, coverage_history, events)
6. Implement team isolation middleware with integration tests
7. Set up event logging transaction wrapper
8. Run practice import seed script with validation (validate on day 1)
9. Add Prisma schema documentation (/// comments) for data dictionary generation
10. Execute Week 1 acceptance criteria checklist before feature work begins

**Week 1 Priority (Non-Negotiable):**
- ✅ Schema migration orchestration with version tracking
- ✅ Database constraints (CHECK, FK, NOT NULL, UNIQUE) in Prisma schema
- ✅ Team isolation middleware + cross-team access denial tests
- ✅ Event logging transactional wrapper (operation + event atomic)
- ✅ Practice import pipeline with JSON Schema + URL/length validation
- ✅ Data dictionary Prisma annotations (enable docs generation)

**Success Criteria:**
- Week 1: All infrastructure acceptance criteria passed, CI pattern tests passing
- Week 2-3: Core features (auth, teams, practices, coverage, issues, Big Five, events) implemented
- MVP Complete: All MUST SHIP items delivered, tested, and validated
- Research-ready: Event logs immutable, team isolation verified, data dictionary published

---

## Architecture Workflow Complete

**Document Status:** ✅ **VALIDATED AND APPROVED**

**Completion Date:** 2026-01-15

**Next Steps:**
1. Review this architecture document with development team
2. Execute Week 1 infrastructure setup following acceptance criteria
3. Begin feature implementation with AI agents using implementation checklist
4. Refer to this document as single source of truth for all architectural decisions

This architecture document is now ready to guide consistent, high-quality implementation by AI agents while meeting the 3-week MVP timeline and research-grade data integrity requirements.
