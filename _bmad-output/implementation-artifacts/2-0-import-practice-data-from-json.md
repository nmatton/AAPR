# Story 2.0: Import Practice Data from JSON

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system administrator,
I want to import the practice data from JSON files into the database,
So that the practice catalog is available for teams to browse and select.

## Acceptance Criteria

1. **Seed script execution**
   - Given the application is initializing
   - When I run the database seeding script
   - Then all practices from the JSON source are imported into the practices table

2. **Complete practice records**
   - Given the import runs
   - When practices are loaded from JSON
   - Then each practice record includes: id, title, goal/objective, category, pillars covered (array of pillar IDs)

3. **Pillar and category mapping**
   - Given practice data is imported
   - When I query the practices table
   - Then I see all 19 pillars across 5 categories properly mapped:
     - VALEURS HUMAINES (4 pillars)
     - FEEDBACK & APPRENTISSAGE (4 pillars)
     - EXCELLENCE TECHNIQUE (4 pillars)
     - ORGANISATION & AUTONOMIE (4 pillars)
     - FLUX & RAPIDITÉ (3 pillars)

4. **Global practice marking**
   - Given practices are imported
   - When the import completes
   - Then each practice is marked as global (not team-specific) with `is_global = true`

5. **Practice validation**
   - Given the import process
   - When a practice JSON record is processed
   - Then validation ensures:
     - Title is not empty (2-100 chars)
     - Goal/objective is not empty (1-500 chars)
     - At least 1 pillar is assigned
     - Category is one of the 5 valid categories

6. **Error handling for invalid data**
   - Given invalid practice data is encountered
   - When the import runs
   - Then validation errors are logged and the import continues with valid records

7. **Event logging**
   - Given the import completes
   - When all practices are in the database
   - Then an event is logged: `{ action: "practices.imported", count, timestamp }`

8. **Idempotent import**
   - Given practices have been imported
   - When a subsequent import runs
   - Then duplicate practices are not re-inserted (idempotent import based on title + category)

9. **Catalog availability for next story**
   - Given the catalog data exists
   - When Story 2.1 runs
   - Then the practice list is immediately available to load and display

## Tasks / Subtasks

- [ ] **Database Schema: Create practice catalog tables** (AC: #3, #4)
  - [ ] `categories` table: id (VARCHAR), name (VARCHAR), description (TEXT), display_order (INT)
  - [ ] `pillars` table: id (SERIAL), name (VARCHAR), category_id (FK), description (TEXT)
  - [ ] `practices` table: id (SERIAL), title (VARCHAR 2-100), goal (TEXT 1-500), description (TEXT), category_id (FK), is_global (BOOLEAN DEFAULT true), imported_at (TIMESTAMP), source_file (VARCHAR), json_checksum (VARCHAR 64), practice_version (INT DEFAULT 1), imported_by (VARCHAR), source_git_sha (VARCHAR 40), raw_json (JSONB), created_at, updated_at
  - [ ] `practice_pillars` join table: practice_id (FK), pillar_id (FK), PRIMARY KEY (practice_id, pillar_id)
  - [ ] Indexes: idx_practices_category, idx_practices_title, idx_practice_pillars_practice, idx_practice_pillars_pillar
  - [ ] Unique constraints: uq_practices_title_category, uq_pillars_name_category, uq_categories_name

- [ ] **Database Schema: Seed categories and pillars** (AC: #3)
  - [ ] Insert 5 categories with proper naming and order
  - [ ] Insert 19 pillars with category relationships:
    - VALEURS HUMAINES: Communication, Courage, Humility, Transparency
    - FEEDBACK & APPRENTISSAGE: Feedback, Inspection, Adaptation, Sustainable Pace
    - EXCELLENCE TECHNIQUE: Simple Design, Coding Standards, Collective Code Ownership, TDD (Test First)
    - ORGANISATION & AUTONOMIE: Self-Organization, Cross-Functional Teams, Active Stakeholder Participation, Continuous Integration
    - FLUX & RAPIDITÉ: Simplicity, Short Releases, Refactoring

- [ ] **Backend: JSON validation schema** (AC: #5, #6)
  - [ ] Create Zod schema for practice JSON structure
  - [ ] Validate: title (string, 2-100 chars, non-empty)
  - [ ] Validate: goal (string, 1-500 chars, non-empty)
  - [ ] Validate: description (string, optional, max 10,000 chars)
  - [ ] Validate: category (enum: one of 5 valid categories)
  - [ ] Validate: pillars (array of pillar names, min 1 item)
  - [ ] Validate: URLs in guidelines (HTTPS only, no javascript://)
  - [ ] Log validation errors (warn level) and skip invalid practices

- [ ] **Backend: Import service** (AC: #1, #7, #8)
  - [ ] `server/src/services/practice-import.service.ts`
  - [ ] Function: `importPractices(jsonData: PracticeJson[]): Promise<ImportResult>`
  - [ ] Read JSON from `docs/raw_practices/practices_reference.json`
  - [ ] Parse JSON array of practice objects
  - [ ] Validate each practice against Zod schema (see docs/PRACTICES_REFERENCE_GUIDE.md for schema)
  - [ ] Calculate JSON checksum (SHA256) per practice
  - [ ] Check for duplicates: SELECT WHERE title = ? AND category_id = ?
  - [ ] If duplicate exists and checksum matches → skip (idempotent)
  - [ ] If duplicate exists and checksum differs → log warning, skip or update (configurable)
  - [ ] Transaction: BEGIN
  - [ ] INSERT practices with all metadata fields
  - [ ] INSERT practice_pillars relationships (join table)
  - [ ] INSERT event: `{ event_type: 'practices.imported', payload: { count, duration_ms, source_files, git_sha }, created_at }`
  - [ ] Transaction: COMMIT
  - [ ] Return `{ success: true, imported: count, skipped: count, errors: [] }`

- [ ] **Backend: Seed script** (AC: #1, #9)
  - [ ] `server/src/scripts/seed-practices.ts`
  - [ ] Read JSON from `docs/raw_practices/practices_reference.json`
  - [ ] Call `importPractices()` service with parsed JSONnt
  - [ ] Call `importPractices()` service
  - [ ] Log results: "Imported X practices, skipped Y duplicates, Z errors"
  - [ ] Exit with code 0 on success, 1 on critical failure
  - [ ] Add to package.json: `"db:seed": "tsx src/scripts/seed-practices.ts"`

- [ ] **Backend: Practice repository** (AC: #9)
  - [ ] `server/src/repositories/practice.repository.ts`
  - [ ] Function: `findAll(): Promise<Practice[]>` (for Story 2.1 catalog view)
  - [ ] Function: `findById(id: number): Promise<Practice | null>`
  - [ ] Function: `findByCategory(categoryId: string): Promise<Practice[]>`
  - [ ] Include related pillars and category in all queries (Prisma `include`)
  - [ ] Filter: `is_global = true` (exclude team-specific practices for now)

- [ ] **Testing: Import service unit tests** (AC: #5, #6, #8)
  - [ ] Test: valid practice JSON → successful import
  - [ ] Test: invalid title (empty, too long) → validation error logged, practice skipped
  - [ ] Test: invalid goal (empty) → validation error logged, practice skipped
  - [ ] Test: invalid category → validation error logged, practice skipped
  - [ ] Test: missing pillars → validation error logged, practice skipped
  - [ ] Test: duplicate practice (same title + category) → skipped, no error
  - [ ] Test: duplicate with different checksum → warning logged
  - [ ] Test: event logged after successful import

- [ ] **Testing: Repository unit tests** (AC: #9)
  - [ ] Test: `findAll()` returns all global practices with pillars
  - [ ] Test: `findById()` returns practice with related data
  - [ ] Test: `findByCategory()` filters correctly

- [ ] **Testing: Integration test** (AC: #1, #7, #9)
  - [ ] End-to-end: run seed script → verify DB has practices, pillars, categories
  - [ ] Verify: event logged in events table
  - [ ] Verify: practice_pillars join table populated
  - [ ] Verify: idempotency (run twice, same result)

- [ ] **Documentation** (Mandatory)
  - [ ] Update `docs/04-database.md`: add practice catalog schema, seed script usage
  - [ ] Update `docs/08-development-guide.md`: document seed script execution steps
  - [ ] Update `docs/09-changelog.md`: add Story 2.0 entry under Epic 2

## Developer Context

This story establishes the foundational **practice catalog** for Epic 2 by importing structured JSON practice data into a normalized PostgreSQL schema. It's the first story in Epic 2 and enables all subsequent stories (practice browsing, search, team selection, coverage calculation).

### Practice JSON Source

**JSON File Location:** `docs/raw_practices/practices_reference.json`

**Schema Documentation:** `docs/PRACTICES_REFERENCE_GUIDE.md`

The JSON file contains a comprehensive catalog of agile practices with detailed metadata. Each practice includes:
- Core identity (name, type, objective, description)
- Framework classification (method, tags, practice_goal)
- Execution details (activities, roles, work_products, completion_criteria)
- Metrics & success indicators
- Resources (guidelines, pitfalls, benefits)
- Practice relationships (associated_practices)

**CRITICAL:** Review `docs/PRACTICES_REFERENCE_GUIDE.md` for complete JSON schema before implementation.

### Critical Mission Context

**🔥 THIS IS THE FOUNDATION OF THE ENTIRE PRACTICE SYSTEM 🔥**

This story imports the **agile practice catalog** that drives the entire platform. Every downstream feature (search, selection, coverage, recommendations) depends on this data being correctly imported, validated, and structured.

**Common LLM Mistakes to Prevent:**
- ❌ Skipping validation → invalid data breaks coverage calculations
- ❌ Missing idempotency → duplicate practices on re-runs
- ❌ No transaction safety → partial imports leave DB inconsistent
- ❌ Forgetting event logging → research audit trail broken
- ❌ Not preserving raw JSON → debugging impossible later
- ❌ Missing metadata (checksums, git SHA) → provenance lost

### Technical Requirements

**API Requirements:**
- No API endpoints yet (this is database seeding only)
- Story 2.1 will create `GET /api/v1/practices` using the repository from this story

**Database Requirements:**
- **Snake_case DB columns:** All table/column names use snake_case
- **Prisma @map:** Map snake_case DB to camelCase TypeScript
- **Team isolation:** Not applicable yet (practices are global)
- **Event logging:** Log import completion with count and metadata
- **Transactional safety:** All inserts in a single transaction (all-or-nothing)

**TypeScript Requirements:**
- **Strict mode:** `tsconfig.json` has `"strict": true"`
- **No any types:** All function signatures fully typed
- **Zod validation:** Use Zod schemas for JSON validation
- **Error handling:** Structured `AppError` with `{code, message, details?, statusCode}`

**Validation Rules:**
- Title: 2-100 chars, non-empty, no leading/trailing whitespace
- Goal: 1-500 chars, non-empty
- Description: optional, max 10,000 chars
- Category: ENUM validation (one of 5 categories)
- Pillars: array, min 1 item, must reference existing pillars
- URLs: HTTPS only (no `javascript://`, `file://`)

### Architecture Compliance

**Layered Backend (Service + Repository Only):**
- **Service layer:** `practice-import.service.ts` (business logic: validation, transaction, event logging)
- **Repository layer:** `practice.repository.ts` (DB queries only, no branching)
- **No routes/controllers yet:** Story 2.1 adds API endpoints

**Database Design (from Architecture.md):**
- **5 Categories:** VALEURS HUMAINES, FEEDBACK & APPRENTISSAGE, EXCELLENCE TECHNIQUE, ORGANISATION & AUTONOMIE, FLUX & RAPIDITÉ
- **19 Pillars:** Distributed across categories (4+4+4+4+3)
- **Normalized schema:** `practices` → `practice_pillars` ← `pillars` ← `categories`
- **Metadata tracking:** imported_at, source_file, json_checksum, practice_version, imported_by, source_git_sha

**Transaction Safety:**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Insert practices
  // 2. Insert practice_pillars relationships
  // 3. Log event
  // All succeed or all rollback
})
```

**Event Logging Schema:**
```typescript
{
  event_type: 'practices.imported',
  actor_id: null, // System action
  team_id: 0, // System-level event
  entity_type: 'practice',
  entity_id: null, // Multiple practices
  action: 'imported',
  payload: {
    count: number,
    duration_ms: number,
    source_files: string[],
    git_sha: string,
    imported_by: string
  },
  created_at: ISO 8601 timestamp
}
```

### Library / Framework Requirements

**Backend Stack:**
- **Node.js 18+** (required for Prisma 7+ and async/await)
- **TypeScript 5.2+** (strict mode)
- **Prisma 7.2+** with `@prisma/client 7.2+` (versions MUST match)
- **Prisma adapter:** `@prisma/adapter-pg` for PostgreSQL
- **Zod 4.3+** (JSON schema validation)
- **tsx** (TypeScript execution for seed script)

**Validation Library:**
- **Zod 4.3+:** Schema-first validation
- Example:
  ```typescript
  const PracticeSchema = z.object({
    title: z.string().min(2).max(100).trim(),
    goal: z.string().min(1).max(500),
    category: z.enum(['VALEURS HUMAINES', 'FEEDBACK & APPRENTISSAGE', ...]),
    pillars: z.array(z.string()).min(1)
  })
  ```

**Hashing Library:**
- **crypto (Node.js built-in):** SHA256 checksums
- Example: `crypto.createHash('sha256').update(JSON.stringify(practice)).digest('hex')`

### File Structure Requirements

**New Files to Create:**

```
server/
├── prisma/
│   ├── migrations/
│   │   └── YYYYMMDDHHMMSS_add_practice_catalog_tables/
│   │       └── migration.sql
│   └── schema.prisma (updated with practice tables)
├── src/
│   ├── scripts/
│   │   └── seed-practices.ts (NEW)
│   ├── services/
│   │   ├── practice-import.service.ts (NEW)
│   │   └── practice-import.service.test.ts (NEW)
│   └── repositories/
│       ├── practice.repository.ts (NEW)
│       └── practice.repository.test.ts (NEW)
└── seed-data/
    └── practices/
        ├── practices.json (or multiple JSON files)
        └── README.md (describe JSON structure)
```

**File Locations:**
- **Seed script:** `server/src/scripts/seed-practices.ts`
- **Import service:** `server/src/services/practice-import.service.ts`
- **Repository:** `server/src/repositories/practice.repository.ts`
- **JSON data:** `server/seed-data/practices/*.json`
- **Prisma schema:** `server/prisma/schema.prisma` (add practice models)
- **Migration:** Auto-generated via `npx prisma migrate dev --name add_practice_catalog_tables`

### Testing Requirements

**Unit Tests (Service):**
- Test import with valid JSON → success
- Test validation errors (invalid title, goal, category, pillars)
- Test duplicate detection (same title + category)
- Test checksum comparison (same vs different)
- Test event logging after import
- Mock Prisma client with jest.mock()

**Unit Tests (Repository):**
- Test `findAll()` returns practices with pillars
- Test `findById()` returns single practice
- Test `findByCategory()` filters correctly
- Mock Prisma client

**Integration Test:**
- Run actual seed script against test database
- Verify tables populated: practices, pillars, categories, practice_pillars, events
- Verify idempotency: run twice, same row count
- Verify event logged in events table

**Test Command:**
- Run: `npm test` (server directory)
- Coverage: Should cover service logic, validation, repository queries

### Previous Story Intelligence (Epic 1 Complete)

**Learnings from Story 1.6 (Last Story in Epic 1):**

**Database Patterns:**
- ✅ **Prisma 7.2 with prisma.config.ts:** New config file required, adapter pattern working
- ✅ **Snake_case DB with @map:** All models use `@@map("table_name")` and `@map("column_name")`
- ✅ **Event logging:** Transactional pattern: operation + event in `prisma.$transaction()`
- ✅ **Team isolation middleware:** Every query has `teamId` filter (not applicable here, but pattern established)

**Testing Patterns:**
- ✅ **Co-located tests:** `*.test.ts` next to implementation files
- ✅ **Jest 30.x:** New version, no issues reported
- ✅ **Mock Prisma:** Use `jest.mock('@prisma/client')` for unit tests
- ✅ **Integration tests:** Separate test DB, real Prisma queries

**Service Layer Patterns:**
- ✅ **Thin controllers:** Just req/res handling, delegate to services
- ✅ **Services own business logic:** Validation, transactions, error handling
- ✅ **Repositories are DB-only:** No branching, just Prisma queries
- ✅ **Structured errors:** `AppError` class with `{code, message, details?, statusCode}`

**TypeScript Patterns:**
- ✅ **Strict mode enforced:** No `any`, all types explicit
- ✅ **Zod validation:** Used for input validation at controller boundary
- ✅ **Date handling:** Convert Date objects to ISO strings in API responses

**Epic 1 Tech Stack Confirmation:**
- ✅ **Prisma 7.2+** working (requires `prisma.config.ts`)
- ✅ **Jest 30.0+** working (no issues)
- ✅ **bcrypt 6.0+** working (password hashing)
- ✅ **Nodemailer 7.0+** working (email invitations)
- ✅ **Zustand 5.0+** working (state management)
- ✅ **React Router 7.12+** working (client-side routing)

**Known Deviations:**
- ❌ **No path aliases configured:** Use relative imports (`../services/...`), NOT `@/services/...`
- ✅ **Prisma 7.x adopted:** Requires `prisma.config.ts` (different from 5.x)

### Git Intelligence Summary

**Recent Commits (from Epic 1 completion):**
1. **Database schema evolution:** Team, user, invite, practice tables established
2. **Event logging pattern:** Transactional event logging in `events` table
3. **Middleware patterns:** Auth middleware, team isolation middleware
4. **Testing infrastructure:** Jest config, Prisma mock helpers

**Files Modified in Epic 1 (Relevant Patterns):**
- `server/prisma/schema.prisma` → Add practice models here
- `server/src/services/*.service.ts` → Follow this service pattern
- `server/src/repositories/*.repository.ts` → Follow this repository pattern
- `server/src/scripts/*` → Add seed script here (new pattern)

**Code Patterns to Reuse:**
- Transaction + event logging: See `invites.service.ts`
- Prisma queries with includes: See `members.repository.ts`
- Zod validation: See `teams.controller.ts`
- Jest tests with Prisma mocks: See `members.service.test.ts`

### Latest Tech Information

**Prisma 7.2+ Key Changes:**
- **New:** `prisma.config.ts` file required (replaces some CLI flags)
- **New:** `@prisma/adapter-pg` for PostgreSQL connection pooling
- **Migration command:** `npx prisma migrate dev --name <name>`
- **Generate command:** `npx prisma generate` (run after schema changes)
- **Seed command:** `npx prisma db seed` (if configured in package.json)

**Node.js 18+ Features to Use:**
- **Native fetch:** Use `fetch()` instead of axios (not applicable here)
- **Top-level await:** Use in seed script for cleaner code
- **crypto module:** SHA256 hashing for checksums

**Zod 4.3+ Features:**
- **Schema composition:** `z.object()`, `z.array()`, `z.enum()`
- **Refinements:** `.refine()` for custom validation logic
- **Error formatting:** `zodError.format()` for structured errors
- **Type inference:** `z.infer<typeof Schema>` for TypeScript types

**PostgreSQL 14+ Features:**
- **JSONB:** Store raw JSON with indexing support
- **Generated columns:** Can use for computed checksums (optional)
- **Constraints:** CHECK constraints for enum validation at DB level

### Project Context Reference

**From `_bmad-output/project-context.md`:**

**Critical Rules:**
1. ✅ **Team isolation:** Not applicable (practices are global), but pattern established for future stories
2. ✅ **Event logging:** ALL mutations logged in transactions
3. ✅ **Error format:** Structured `{code, message, details?, requestId}` (not applicable for seed script, but use in services)
4. ✅ **Prisma mappings:** All `@map/@@@map` present, no DB column leakage
5. ✅ **TypeScript strict:** No `any`, no implicit types
6. ✅ **Testing discipline:** Co-located tests, fixtures, mocks
7. ✅ **Naming consistency:** PascalCase components, camelCase functions, UPPER_SNAKE_CASE constants
8. ✅ **Documentation updates:** MANDATORY for every story (Definition of Done)

**Version Constraints (MUST MATCH):**
- Node.js 18+
- TypeScript 5.2+
- Prisma 7.2+ (CLI and client versions MUST match)
- Zod 4.3+
- Jest 30.0+

**Database Conventions:**
- Tables: snake_case plural (`practices`, `practice_pillars`)
- Columns: snake_case (`created_at`, `practice_id`)
- Foreign keys: `<table>_id` (e.g., `category_id`)
- Indexes: `idx_<table>_<column>` (e.g., `idx_practices_category`)
- Unique constraints: `uq_<table>_<column>` (e.g., `uq_practices_title_category`)
- Enums: PostgreSQL ENUM or CHECK constraint

**API Conventions (for future stories):**
- REST paths: `/api/v1/<plural>/<id>` (e.g., `/api/v1/practices/5`)
- Query params: camelCase (`searchTerm`, `pillarId`, `page`, `pageSize`)
- Request/response: camelCase JSON
- Headers: `X-Request-Id`, `X-Trace-Id`

**TypeScript Conventions:**
- Components: PascalCase (`TeamCoverageCard.tsx`)
- Functions: camelCase (`calculateCoverage()`)
- Constants: UPPER_SNAKE_CASE (`MAX_PRACTICES`)
- Hooks: `useX` (`usePractices()`)
- Interfaces: PascalCase (`Practice`, `PracticeDto`)

**Testing Conventions:**
- Co-located: `practice.service.test.ts` next to `practice.service.ts`
- Jest 30.x with TypeScript (`ts-jest`)
- Mock Prisma: `jest.mock('@prisma/client')`
- Fixtures: `createPracticeFixture()` helpers

**Documentation Requirements:**
- Every story MUST update documentation (Definition of Done)
- Files to update: `docs/04-database.md`, `docs/08-development-guide.md`, `docs/09-changelog.md`
- Include "Last Updated" date at top of modified files

## Story Completion Status

**Status:** ready-for-dev

**Completion Note:** Ultimate context engine analysis completed - comprehensive developer guide created. This story is ready for implementation by the Dev agent.

## Dev Notes
JSON to Database Field Mapping

**Source JSON Location:** `docs/raw_practices/practices_reference.json`

**JSON → Database Mapping:**

| JSON Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|-------|
| `name` | `practices` | `title` | Unique identifier for practice |
| `objective` | `practices` | `goal` | One-sentence summary (1-500 chars) |
| `description` | `practices` | `description` | Full explanation (max 10,000 chars) |
| `type` | `practices` | `category_id` | Map to categories.id (FK) |
| `practice_goal` | `practice_pillars` | `pillar_id` | Array → join table rows (FK) |
| `tags` | `practicesmatching `docs/PRACTICES_REFERENCE_GUIDE.md` structure
2. Validate all required fields: name, type, objective, description, practice_goal, activities, roles, work_products, completion_criteria, metrics, resources
3. Test validation with actual JSON from `docs/raw_practices/practices_reference.json`Scrum, XP, Kanban, etc.) |
| `activities` | `practices` | `activities` (JSONB) | Store as JSON array with sequence |
| `roles` | `practices` | `roles` (JSONB) | Store as JSON array with RACI |
| `work_products` | `practices` | `work_products` (JSONB) | Store as JSON array |
| `completion_criteria` | `practices` | `completion_criteria` | Definition of Done |
| `metrics` | `practices` | `metrics` (JSONB) | Store as JSON array |
| `resources.guidelines` | `practices` | `guidelines` (JSONB) | Store as JSON array |
| `resources.pitfalls` | `practices` | `pitfalls` (JSONB) | Store as JSON array |
| `resources.benefits` | `practices` | `benefits` (JSONB) | Store as JSON array |
| `associated_practices` | `practices` | `associated_practices` (JSONB) | Store as JSON array |
| (full JSON) | `practices` | `raw_json` (JSONB) | Complete original for debugging |
reads `docs/raw_practices/practices_reference.json`
2. Parse JSON and call import service with practice array
3. Add npm script: `"db:seed": "tsx src/scripts/seed-practices.ts"`
4
### Implementation Strategy

**Step 0: Review JSON Schema**
1. Read `docs/PRACTICES_REFERENCE_GUIDE.md` completely
2. Examine `docs/raw_practices/practices_reference.json` structure
3. Understand field mappings (see table above)

**Step 1: Database Schema (Migration)**
1. Create Prisma models for `categories`, `pillars`, `practices`, `practice_pillars`
2. AJSON Schema Reference

**Complete schema documentation:** `docs/PRACTICES_REFERENCE_GUIDE.md`

**Example Practice JSON Structure:**
```json
{
  "name": "Daily Stand-up",
  "type": "Teamwork Practice",
  "objective": "Synchronize the team and identify blockers",
  "description": "Each day at the same time, the team meets...",
  "method": "Scrum",
  "tags": ["Visual/Tactile", "Async-Ready", "Structured"],
  "practice_goal": ["Communication", "Transparency", "Self-Organization"],
  "activities": [
    { "sequence": 1, "name": "Gather Team", "description": "..." }
  ],
  "roles": [
    { "role": "Developer", "responsibility": "Responsible" }
  ],
  "work_products": [
    { "name": "Sprint Backlog", "description": "..." }
  ],
  "completion_criteria": "All team members reported; timebox respected",
  "metrics": [
    { "name": "Meeting Duration", "unit": "Minutes", "formula": "..." }
  ],
  "resources": {
    "guidelines": [{ "name": "...", "url": "...", "type": "Wiki" }],
    "pitfalls": ["..."],
    "benefits": ["..."]
  },
  "associated_practices": [
    { "name": "Sprint Planning", "association_type": "Dependency" }
  ]
}
```

**Valid Values:**
- **types:** See `PRACTICES_REFERENCE_GUIDE.md` for complete list (maps to categories)
- **tags:** Visual/Tactile, Async-Ready, Structured, Consensus-Driven, Whole Crowd, Small Group, Spontaneous, Verbal-Heavy, Solo-Capable, Critical
- **practice_goal:** Communication, Simplicity, Feedback, Courage, Humility, Transparency, Inspection, Adaptation, Collective Code Ownership, Continuous Integration, TDD, Refactoring, Simple Design, Coding Standards, Sustainable Pace, Self-Organization, Cross-Functional Teams, Active Stakeholder Participation, Short Releases
- **method:** Scrum, XP, Kanban, Lean, Design Thinking, Product Management, DSDM, Agile, "" (empty)
- **responsibility (RACI):** Responsible, Accountable, Consulted, Informed
- **association_type:** Configuration, Equivalence, Dependency, Complementarity, Exclusion
- **resource type:** Blog Post, Book, Wiki, Scientific Article, Video

### dd JSONB columns for structured metadata (activities, roles, metrics, etc.)
3. Run `npx prisma migrate dev --name add_practice_catalog_tables`
4. Run `npx prisma migrate dev --name add_practice_catalog_tables`
3. Verify migration SQL matches architecture requirements

**Step 2: Seed Static Data (Categories + Pillars)**
1. Create seed script for 5 categories and 19 pillars
2. Run once to populate foundational data
3. These are static and won't change during MVP

**Step 3: JSON Validation Schema**
1. Create Zod schema for practice JSON structure
2. Test validation with sample valid/invalid JSON

**Step 4: Import Service**
1. Implement `importPractices()` with validation, deduplication, transaction
2. Unit test all validation rules and error cases

**Step 5: Repository**
1. Implement `findAll()`, `findById()`, `findByCategory()`
2. Unit test with mocked Prisma client

**Step 6: Seed Script**
1.method VARCHAR(50),
  tags JSONB,
  activities JSONB,
  roles JSONB,
  work_products JSONB,
  completion_criteria TEXT,
  metrics JSONB,
  guidelines JSONB,
  pitfalls JSONB,
  benefits JSONB,
  associated_practices JSONB,
  is_global BOOLEAN DEFAULT true,
  imported_at TIMESTAMP,
  source_file VARCHAR(255),
  json_checksum VARCHAR(64),
  practice_version INT DEFAULT 1,
  imported_by VARCHAR(100),
  source_git_sha VARCHAR(40),
  raw_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_practices_title_category UNIQUE (title, category_id),
  CONSTRAINT chk_title_length CHECK (LENGTH(title) BETWEEN 2 AND 100),
  CONSTRAINT chk_goal_length CHECK (LENGTH(goal) BETWEEN 1 AND 500)
);
CREATE INDEX idx_practices_category ON practices(category_id);
CREATE INDEX idx_practices_title ON practices(title);
CREATE INDEX idx_practices_is_global ON practices(is_global);
CREATE INDEX idx_practices_method ON practices(method);
CREATE INDEX idx_practices_tags ON practices USING GIN(tags
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  display_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Pillars Table:**
```sql
CREATE TABLE pillars (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_pillars_name_category UNIQUE (name, category_id)
);
CREATE INDEX idx_pillars_category ON pillars(category_id);
```

**Practices Table:**
```sql
CREATE TABLE practices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  goal TEXT NOT NULL,
  description TEXT,
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id),
  is_global BOOLEAN DEFAULT true,
  imported_at TIMESTAMP,
  source_file VARCHAR(255),
  json_checksum VARCHAR(64),
  practice_version INT DEFAULT 1,
  imported_by VARCHAR(100),
  source_git_sha VARCHAR(40),
  raw_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_practices_title_category UNIQUE (title, category_id),
  CONSTRAINT chk_title_length CHECK (LENGTH(title) BETWEEN 2 AND 100),
  CONSTRAINT chk_goal_length CHECK (LENGTH(goal) BETWEEN 1 AND 500)
);
CREATE INDEX idx_practices_category ON practices(category_id);
CREATE INDEX idx_practices_title ON practices(title);
CREATE INDEX idx_practices_is_global ON practices(is_global);
```

**Practice-Pillars Join Table:**
```sql
CREATE TABLE practice_pillars (
  practice_id INT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  pillar_id INT NOT NULL REFERENCES pillars(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (practice_id, pillar_id)
);
CREATE INDEX idx_practice_pillars_practice ON practice_pillars(practice_id);
CREATE INDEX idx_practice_pillars_pillar ON practice_pillars(pillar_id);
```

### Validation Rules Summary

**Title Validation:**
- Type: string
- Min length: 2 chars
- Max length: 100 chars
- Trim whitespace
- Non-empty after trim
- Example valid: "Daily Standup Meeting"
- Example invalid: "A" (too short), "" (empty), "  " (whitespace only)

**Goal Validation:**
- Type: string
- Min length: 1 char
- Max length: 500 chars
- Non-empty
- Example valid: "Synchronize team progress and blockers daily"
- Example invalid: "" (empty)

**Description Validation:**
- Type: string (optional)
- Max length: 10,000 chars
- Can be null or empty

**Category Validation:**
- Type: enum
- Must be one of:
  - "VALEURS HUMAINES"
  - "FEEDBACK & APPRENTISSAGE"
  - "EXCELLENCE TECHNIQUE"
  - "ORGANISATION & AUTONOMIE"
  - "FLUX & RAPIDITÉ"

**Pillars Validation:**
- Type: array of strings
- Min items: 1
- Each pillar name must match an existing pillar in `pillars` table
- Example valid: ["Communication", "Feedback"]
- Example invalid: [] (empty), ["InvalidPillar"]

**URL Validation (for guidelines/resources):**
- Protocol: HTTPS only
- Block: `javascript://`, `file://`, `data://`
- Example valid: "https://scrum.org/resources"
- Example invalid: "http://..." (insecure), "javascript:alert(1)"

### Idempotency Strategy

**Duplicate Detection:**
```typescript
// Check for existing practice
const existing = await tx.practice.findFirst({
  where: {
    title: practice.title,
    categoryId: practice.category
  }
})

if (existing) {
  const newChecksum = calculateChecksum(practice)
  if (existing.jsonChecksum === newChecksum) {
    // Same content, skip
    skippedCount++
    continue
  } else {
    // Content changed, log warning
    logger.warn('Practice content differs', {
      title: practice.title,
      oldChecksum: existing.jsonChecksum,
      newChecksum
    })
    // Skip or update (configurable)
  }
}
```

**Checksum Calculation:**
```typescript
import crypto from 'crypto'

function calculateChecksum(practice: PracticeJson): string {
  const content = JSON.stringify({
    title: practice.title,
**Seed Script Usage**

**Command:**
```bash
npm run db:seed
```

**Source File:** Reads from `docs/raw_practices/practices_reference.json`

**Expected Output:**
```
[INFO] Starting practice import...
[INFO] Reading from docs/raw_practices/practices_reference.json
[INFO] Found 25 practices in JSON
```typescript
await tx.event.create({
  data: {
    eventType: 'practices.imported',
    actorId: null, // System action
    teamId: 0, // System-level event
    entityType: 'practice',
    entityId: null, // Multiple practices
    action: 'imported',
    payload: {
      count: importedCount,
      duration_ms: Date.now() - startTime,
    JSON Source:** `docs/raw_practices/practices_reference.json` (practice data)
- **JSON Schema:** `docs/PRACTICES_REFERENCE_GUIDE.md` (complete field documentation)
- **  source_files: ['practices.json'],
      git_sha: process.env.GIT_SHA || 'unknown',
      imported_by: process.env.USER || 'system'
    },
    createdAt: new Date()
  }
})
```

### Error Handling Strategy

**Validation Errors:**
- Log at WARN level
- Include: practice title, field, validation error
- Continue processing other practices
- Return summary: `{ imported: X, skipped: Y, errors: Z }`

**Critical Errors:**
- Database connection failure → abort with exit code 1
- Transaction rollback → abort with exit code 1
- Missing JSON files → abort with exit code 1

**Error Response Example:**
```typescript
{
  success: false,
  imported: 0,
  skipped: 3,
  errors: [
    {
      practice: 'Invalid Practice',
      field: 'title',
      error: 'Title must be between 2 and 100 characters',
      code: 'validation_error'
    }
  ]
}
```

### Seed Script Usage

**Command:**
```bash
npm run db:seed
```

**Expected Output:**
```
[INFO] Starting practice import...
[INFO] Found 25 practices in seed-data/practices/
[INFO] Validating practices...
[WARN] Skipped invalid practice: "X" (title too short)
[INFO] Importing 24 valid practices...
[INFO] Transaction started...
[INFO] Inserted 24 practices
[INFO] Inserted 78 practice-pillar relationships
[INFO] Logged import event
[INFO] Transaction committed
[SUCCESS] Import complete: 24 imported, 1 skipped, 0 errors
```

### References

- **PRD:** FR8-10 (practice catalog, add/remove practices, coverage calculation)
- **Architecture:** Decision 3 (Practice Import Pipeline), categories/pillars structure, validation rules
- **UX Spec:** Practice catalog display requirements (for Story 2.1)
- **Epic 2:** Story 2.0 is the foundation; Stories 2.1-2.8 depend on this data
- **Project Context:** `_bmad-output/project-context.md` (version constraints, TypeScript rules, testing patterns)

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Debug Log References

_To be filled by Dev agent_

### Completion Notes List

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_

