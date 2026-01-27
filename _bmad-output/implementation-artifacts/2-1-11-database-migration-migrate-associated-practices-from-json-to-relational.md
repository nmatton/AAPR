# Story 2.1.11: Database Migration - Migrate Associated Practices from JSON to Relational

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want to **migrate all practice associations from binary JSON to the new practice_association table**,
So that **the data model is normalized and queries are efficient**.

## Acceptance Criteria

1. **Given** the practice_association table exists
   **When** the migration script runs
   **Then** for each practice with associated_practices JSON data:
     1. Parse the binary JSON
     2. Extract each association (source, target, type)
     3. Insert a row into practice_association

2. **Given** the migration is running
   **When** each association is migrated
   **Then** association_type is preserved (or mapped if the JSON format differs)
     - Example: JSON `{ "target_practice": "X", "association_type": "Y" }` maps directly.
     - Note: `docs/raw_practices/practices_reference.json` shows structure: `[{ "target_practice": "Name", "association_type": "Type" }]`.

3. **Given** the migration completes
   **When** I verify the data
   **Then** all practice associations are in the practice_association table
   **And** no data is lost (spot-check: old JSON and new relational rows match)

4. **Given** the migration is successful
   **When** the migration script finishes
   **Then** an event is logged: `{ action: "migration.practice_associations_completed", migratedCount, timestamp }`
   **And** a backup of the old data is taken (Note: Data remains in `practices.associated_practices` column until Story 2.1.12 drops it, so redundancy covers backup requirement).

## Tasks / Subtasks

- [x] Verify Existing Migration Logic
  - [x] Check `server/prisma/migrations/20260126144148_create_practice_association_table/migration.sql` (created in Story 2.1.10).
  - [x] Confirm it includes the `INSERT INTO ... SELECT` logic for backfilling data.
  - [x] Confirm it properly handles the JSON structure found in `docs/raw_practices/practices_reference.json`.
  - [x] Confirm it logs the event as per AC.
- [x] Verify Data Integrity (Local DB)
  - [x] Ensure migration has been applied (`npx prisma migrate dev` or `deploy`).
  - [x] Query `practice_associations` table to verify row count matches expected count from JSON data.
  - [x] Spot check a few associations (e.g., "Sprint Planning" should have associations).
- [x] Fix/Update Migration if Needed
  - [x] If 2.1.10 migration is incomplete or incorrect, create a *new* migration (`npx prisma migrate dev --name fix_association_migration`) to correct it.
  - [x] If 2.1.10 migration is perfect, mark this story as Done with verification evidence.

## Dev Notes

- **Migration Overlap Warning:**
  - Story 2.1.10 (`create_practice_association_table`) apparently included the data migration SQL.
  - **Action:** You may not need to write new SQL. Your primary task is **Verification**.
  - If the SQL in `20260126144148...` is correct, you are done after verifying.
  - **Do not duplicate** the migration if it ran.

- **JSON Structure Source of Truth:**
  - `docs/raw_practices/practices_reference.json`
  - Format: Array of objects `{ "target_practice": string, "association_type": string }`.
  - The SQL `json_array_elements` approach seen in 2.1.10 output seems correct for this.

- **Architecture Compliance:**
  - Event Logging: Must log `migration.practice_associations_completed` (or similar). 2.1.10 logged `schema.practice_association_created`. You might need to log the *completion* of data migration if 2.1.10 didn't cover "migratedCount".
  - 2.1.10 SQL logs `system.migration` / `schema.practice_association_created`. It does *not* log `migratedCount`.
  - **Gap Identifier:** The current SQL does not log the *count* of migrated rows. It just logs that the migration ran.
  - **Refinement:** You might need to add a step (or a separate script/migration) to log the actual count, OR accept that the migration run event is sufficient if strict row counting logic in SQL is too complex for a migration value. (Actually, in Postgres `GET DIAGNOSTICS` after insert can get row count, but typically migrations are static SQL).
  - **Decision:** If verifying, checking the count via a query is sufficient proof.

### Project Structure Notes

- `server/prisma/migrations/`: Location of migration files.
- `docs/raw_practices/`: Reference for JSON data.

### References

- [Epics: Story 2.1.11](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/epics.md#Story-2-1-11)
- [Architecture: Decision 3](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/planning-artifacts/architecture.md#Decision-3)
- [Story 2.1.10](file:///c:/Users/nmatton/OneDrive%20-%20Universit%C3%A9%20de%20Namur/PhD_Nicolas_Matton/AgilePractices/APR_proto/bmad_version/_bmad-output/implementation-artifacts/2-1-10-database-schema-create-practice-association-table.md)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- Validation Script (failed locally due to Prisma environment issues)
- Manual Seed & Migration Apply (Success)

### Completion Notes List

- Verified existing migration logic from Story 2.1.10. It lacked the specific `migratedCount` logging required by ACs.
- Created a new migration `log_association_migration` which:
    - Re-runs the data migration (idempotent via `ON CONFLICT DO NOTHING`) to ensure integrity.
    - Counts the migrated rows.
    - Logs the `migration.practice_associations_completed` event with the count.
- Applied the migration successfully.
- Verified that Seeding populates practices, allowing the migration to find and migrate data.

**Code Review Fixes (2026-01-27):**
- Fixed H1: Added `schema.prisma` to File List (deprecation comment update)
- Fixed H2: Fixed verification script Prisma Client initialization (now uses proper pg adapter pattern)
- Fixed M1: ✅ **Verification successful!** Migration confirmed:
  - 33 practice associations migrated
  - Sprint Planning has 3 associations: Planning Poker (Complementarity), Definition of Done (Dependency), Backlog Refinement (Dependency)
  - Data matches expected JSON structure from `practices_reference.json`
- Fixed M2: Enhanced deprecation comment to reference Story 2.1.12 removal timeline
- Fixed L1: Deleted unused `verify-js.js` file
- Note M3: Event logging taxonomy documented (2.1.10 logs schema creation, 2.1.11 logs data migration completion)

### File List

- server/prisma/migrations/20260126151756_log_association_migration/migration.sql
- server/prisma/schema.prisma (updated deprecation comment)
- server/src/scripts/verify-2-1-11.ts (verification script)
