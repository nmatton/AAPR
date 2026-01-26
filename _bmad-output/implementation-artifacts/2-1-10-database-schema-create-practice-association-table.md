# Story 2.1.10: Database Schema - Create Practice Association Table

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want to **create a new practice_association table to properly model relationships between practices**,
So that **associations are stored relationally instead of as binary JSON**.

## Acceptance Criteria

1. **Given** the database schema is being updated
   **When** I review the new table
   **Then** the practice_association table has columns:
     - id (primary key, UUID or auto-increment)
     - source_practice_id (FK to practices.id)
     - target_practice_id (FK to practices.id)
     - association_type (VARCHAR, e.g., "related_to", "alternative_for", "builds_on", "complements", "conflicts_with")
     - created_at (timestamp)
     - updated_at (timestamp)

2. **Given** the table schema is defined
   **When** I review the constraints
   **Then** I see:
     - Foreign key constraints on both practice IDs
     - Unique constraint on (source_practice_id, target_practice_id, association_type) to prevent duplicates
     - Composite primary key or unique index

3. **Given** the practice_association table is created
   **When** I check the schema
   **Then** the old practice.associated_practices column (binary JSON) is marked for deprecation/removal
   **And** a migration script is created to move data from JSON to the new table

4. **Given** the table is ready
   **When** the migration runs
   **Then** an event is logged: `{ action: "schema.practice_association_created", timestamp }`

## Tasks / Subtasks

- [x] Define `PracticeAssociation` model in `server/prisma/schema.prisma`
  - [x] Add `id`, `sourcePracticeId`, `targetPracticeId`, `associationType`, `createdAt`, `updatedAt`
  - [x] Define relations to `Practice` model (`sourcePractice`, `targetPractice`)
  - [x] Add unique constraint `@@unique([sourcePracticeId, targetPracticeId, associationType])`
  - [x] Add indexes for `sourcePracticeId` and `targetPracticeId`
- [x] Update `Practice` model in `server/prisma/schema.prisma`
  - [x] Add scalar relations `sourceAssociations` and `targetAssociations` to `PracticeAssociation`
  - [x] Add `/// @deprecated` comment to `associatedPractices` field
- [x] Create Prisma migration
  - [x] Run `npx prisma migrate dev --name create_practice_association_table`
- [x] Verify Schema
  - [x] Check generated valid SQL migration file

## Dev Notes

- **Architecture Compliance:**
  - Follows "Decision 3: Practice Import Pipeline" regarding `practice_associations` table.
  - Association types from Architecture: "Configuration", "Equivalence", "Dependency", "Complementarity", "Exclusion" (Consider using an Enum or documented string types).
  - Use `snake_case` mapping for DB columns (`@map`), `camelCase` for fields.

- **Source Tree:**
  - `server/prisma/schema.prisma`
  - `server/prisma/migrations/*`

- **Project Structure Notes:**
  - Alignment with existing `server/prisma/schema.prisma`.
  - Ensure strictly typed relationships for better query capabilities later (e.g., "Find all practices that conflict with X").

### References

- [Epics: Story 2.1.10](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/epics.md#Story-2-1-10)
- [Architecture: Decision 3](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/architecture.md#Decision-3)

## Dev Agent Record

### Agent Model Used

Claude 3.7 Sonnet (Antigravity)

### Completion Notes List

- ✅ Created `PracticeAssociation` model with all required fields (id, sourcePracticeId, targetPracticeId, associationType, createdAt, updatedAt)
- ✅ Added foreign key relationships to `Practice` model with CASCADE delete behavior
- ✅ Implemented unique constraint on (sourcePracticeId, targetPracticeId, associationType) to prevent duplicate associations
- ✅ Added indexes on sourcePracticeId and targetPracticeId for query performance
- ✅ Updated `Practice` model with bidirectional relations: `sourceAssociations` and `targetAssociations`
- ✅ Marked `Practice.associatedPractices` JSON field as deprecated with `/// @deprecated` comment
- ✅ Generated Prisma migration `20260126144148_create_practice_association_table`
- ✅ Verified migration SQL includes all constraints, indexes, and foreign keys
- ✅ Migration applied successfully to database
- ✅ All acceptance criteria satisfied:
  - AC1: Table has all required columns with proper types and constraints
  - AC2: Foreign key constraints and unique constraint implemented
  - AC3: Old associatedPractices field marked for deprecation. Data migration SQL added to migration file.
  - AC4: Migration event logged in database via SQL INSERT in migration file.

### Code Review Fixes (2026-01-26)
- 🐛 **Fixed Critical Issue**: Added missing data migration SQL to `20260126144148_create_practice_association_table/migration.sql` to backfill `practice_associations` from `practice.associated_practices` JSON.
- 🐛 **Fixed Critical Issue**: Added missing `INSERT INTO events` SQL to migration file to satisfy AC4 (event logging).

### File List

- `server/prisma/schema.prisma` (modified)
- `server/prisma/migrations/20260126144148_create_practice_association_table/migration.sql` (created)
