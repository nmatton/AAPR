# Story 2.1.12: Database Cleanup - Remove category_id from practices Table

Status: invalid

**Reason for Closure:** This story contradicts the normalized relational data model established in Architecture Decision 3. The `category_id` FK is intentional and necessary for query performance, data integrity, and relational queries. Removing it would break 50+ code references and degrade system functionality. See critical analysis for details.

**Analysis:** [Critical Analysis Document](file:///C:/Users/nmatton/.gemini/antigravity/brain/bf51e5b1-09c0-451d-a4e8-e929331eaafe/critical-analysis-2-1-12.md)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want to **remove the category_id column from the practices table**,
So that **the schema only stores category information as part of the JSON practice definition, as originally designed**.

## Acceptance Criteria

1. **Given** the practices table has a category_id column
   **When** I review the schema
   **Then** I verify that all category information is already stored in the JSON practice data

2. **Given** the verification is complete
   **When** I create a migration script
   **Then** the script:
     1. Backs up the existing data (via backup script or database snapshot)
     2. Removes the category_id column from practices table
     3. Logs the removal

3. **Given** the migration runs
   **When** the column is dropped
   **Then** the practices table schema no longer includes category_id
   **And** all queries that reference category_id are updated in the codebase

4. **Given** the cleanup is complete
   **When** the migration finishes
   **Then** an event is logged: `{ action: "schema.category_id_removed", affectedRows: X, timestamp }`
   **And** the schema is validated to ensure no orphaned references remain

5. **Given** the schema is updated
   **When** I query the practices table
   **Then** category information is accessed via the JSON definition (e.g., `practice_json->>'category'` in PostgreSQL)
   **And** no separate category_id column exists

## Tasks / Subtasks

- [ ] **CRITICAL ANALYSIS**: Verify Story Requirement Validity (AC: #1)
  - [ ] Review current schema.prisma - `category_id` is a FK to `categories` table (line 175)
  - [ ] Review architecture.md Decision 3 - Practice import pipeline uses normalized relational structure
  - [ ] Check if `rawJson` column contains category data for fallback
  - [ ] Analyze all queries/services that use `category_id` FK relationship
  - [ ] **DECISION POINT**: Determine if removing `category_id` breaks the normalized data model
  - [ ] Document findings and potential conflicts with architecture decisions

- [ ] Verify Category Data in JSON (AC: #1)
  - [ ] Check `practices.rawJson` column for category information
  - [ ] Verify all practices have category data in JSON format
  - [ ] Spot-check 5-10 practices to ensure JSON contains valid category references
  - [ ] Document any practices missing category data in JSON

- [ ] Analyze Impact on Codebase (AC: #3)
  - [ ] Search for all references to `categoryId` in TypeScript/JavaScript code
  - [ ] Identify all Prisma queries using `category` relation
  - [ ] Find all API endpoints returning practice data with category info
  - [ ] List all services/repositories accessing `practice.category` relationship
  - [ ] Document required code changes (estimated files affected)

- [ ] Create Migration Script (AC: #2, #4)
  - [ ] Create new Prisma migration: `npx prisma migrate dev --name remove_category_id_from_practices`
  - [ ] Add backup verification step (query current state before migration)
  - [ ] Write SQL to drop FK constraint first: `ALTER TABLE practices DROP CONSTRAINT practices_category_id_fkey`
  - [ ] Write SQL to drop column: `ALTER TABLE practices DROP COLUMN category_id`
  - [ ] Add event logging SQL: `INSERT INTO events (...) VALUES ('schema.category_id_removed', ...)`
  - [ ] Add rollback instructions in migration comments

- [ ] Update Prisma Schema (AC: #3)
  - [ ] Remove `categoryId` field from Practice model (line 175)
  - [ ] Remove `category` relation from Practice model (line 213)
  - [ ] Remove `practices` relation from Category model (line 126)
  - [ ] Update schema comments to reflect JSON-based category access
  - [ ] Run `npx prisma generate` to update Prisma Client types

- [ ] Update Application Code (AC: #3)
  - [ ] Update practice repository to extract category from `rawJson` field
  - [ ] Modify practice DTOs to use JSON-based category extraction
  - [ ] Update practice catalog queries to join via JSON field instead of FK
  - [ ] Fix practice filtering by category (use JSON operators)
  - [ ] Update practice creation/import logic to ensure category in JSON
  - [ ] Update any TypeScript types referencing `practice.category` relation

- [ ] Update Tests (AC: #3)
  - [ ] Fix unit tests expecting `categoryId` field
  - [ ] Update integration tests for practice queries
  - [ ] Add tests for JSON-based category extraction
  - [ ] Verify practice fixtures include category in JSON

- [ ] Verification \u0026 Validation (AC: #4, #5)
  - [ ] Run migration on local database
  - [ ] Verify column no longer exists: `\d practices` in psql
  - [ ] Query practices and verify category accessible via JSON
  - [ ] Check event log for migration event
  - [ ] Run full test suite to catch any missed references
  - [ ] Verify no TypeScript compilation errors
  - [ ] Test practice catalog UI still displays categories correctly

## Dev Notes

### Previous Story Intelligence

**Story 2.1.11 Learnings:**
- Successfully migrated `associated_practices` from JSON to relational `practice_associations` table
- Pattern: JSON → Relational is the **direction of migration** (opposite of this story)
- Migration included:
  - Idempotent data migration with `ON CONFLICT DO NOTHING`
  - Row count logging for verification
  - Deprecation comment in schema.prisma (line 170-171)
  - Verification script to validate migration success
- **Key Insight**: Story 2.1.11 **normalized** data; Story 2.1.12 proposes **denormalizing** category data

**Files Modified in 2.1.11:**
- `server/prisma/migrations/20260126151756_log_association_migration/migration.sql`
- `server/prisma/schema.prisma` (deprecation comment)
- `server/src/scripts/verify-2-1-11.ts` (verification script)

**Testing Approach from 2.1.11:**
- Created verification script using Prisma Client with pg adapter
- Verified row counts match expected values
- Spot-checked specific practice associations
- Fixed Prisma Client initialization issues

### Architecture Compliance

**From architecture.md Decision 3 (Practice Import Pipeline):**
- "Normalized relational structure enables fast queries"
- "Transactional safety ensures clean data from day one"
- Practice data stored in dedicated tables: `practices`, `practice_pillars`, `practice_associations`
- `rawJson` column preserves original JSON "for debugging/traceability" (line 339)

**From schema.prisma:**
- Categories table (lines 112-129): Global reference data for 5 categories
- Pillars table (lines 133-152): References `categoryId` FK
- Practice model (lines 156-223): Uses `categoryId` FK with relation to Category

**Potential Breaking Changes:**
- Any code using `practice.category.name` will break (relation no longer exists)
- Prisma queries with `include: { category: true }` will fail
- Category-based filtering will need JSON operators: `WHERE raw_json->>'category' = ?`
- TypeScript types generated by Prisma will no longer include `category` relation

### Library/Framework Requirements

**Prisma 7.2+ (from project-context.md):**
- Migration command: `npx prisma migrate dev --name remove_category_id_from_practices`
- Schema changes require `npx prisma generate` to update types
- Use `prisma.config.ts` for configuration (new in Prisma 7)

**PostgreSQL 14+ JSON Operators:**
- `->` operator: Extract JSON object field as JSON
- `->>` operator: Extract JSON object field as text
- Example: `SELECT raw_json->>'category' FROM practices WHERE raw_json->>'category' = 'VALEURS HUMAINES'`

**TypeScript 5.2+ Strict Mode:**
- All code must handle potential null/undefined from JSON extraction
- Type guards required for JSON-based category access
- No implicit `any` types allowed

### File Structure Requirements

**Migration Files:**
- Location: `server/prisma/migrations/YYYYMMDDHHMMSS_remove_category_id_from_practices/`
- File: `migration.sql` (generated by Prisma)
- Pattern: Follow existing migration structure from Story 2.1.10 and 2.1.11

**Verification Script:**
- Location: `server/src/scripts/verify-2-1-12.ts`
- Purpose: Validate category_id removed and JSON access works
- Pattern: Similar to `verify-2-1-11.ts`

**Schema File:**
- Location: `server/prisma/schema.prisma`
- Changes: Remove `categoryId` field, `category` relation, update comments

### Testing Requirements

**Unit Tests:**
- Practice repository tests: Verify JSON-based category extraction
- Practice service tests: Verify category filtering works with JSON operators
- DTO tests: Verify category mapping from JSON to API response

**Integration Tests:**
- Practice catalog API: Verify category filtering still works
- Practice creation: Verify category stored in JSON
- Practice queries: Verify category accessible via JSON

**Migration Tests:**
- Verify migration runs without errors
- Verify column no longer exists after migration
- Verify event logged correctly
- Verify no orphaned FK constraints

### References

- [Epics: Story 2.1.12](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/epics.md#L1439-L1472)
- [Architecture: Decision 3 - Practice Import Pipeline](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/architecture.md#L326-L383)
- [Schema: Practice Model](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/server/prisma/schema.prisma#L156-L223)
- [Schema: Category Model](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/server/prisma/schema.prisma#L112-L129)
- [Story 2.1.11 (Previous)](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/implementation-artifacts/2-1-11-database-migration-migrate-associated-practices-from-json-to-relational.md)
- [Story 2.1.10 (Practice Association Table)](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/implementation-artifacts/2-1-10-database-schema-create-practice-association-table.md)
- [Project Context](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/project-context.md)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
