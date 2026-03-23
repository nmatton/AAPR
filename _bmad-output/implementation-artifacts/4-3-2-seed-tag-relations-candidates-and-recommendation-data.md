# Story 4.3.2: Seed Tag Relations, Candidates, and Recommendation Data

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system administrator / researcher**,
I want **the database to be seeded with tag-personality relations, issue-candidate mappings, and per-tag recommendation text from the canonical CSV/MD data files**,
so that **the directed recommendation engine (Stories 4.3.3 and 4.3.4) has the reference data it needs to compute Delta Affinity scores and display actionable advice**.

## Acceptance Criteria

1. **New Database Tables Created**
   - [ ] **Given** a fresh or existing database
   - [ ] **When** the Prisma migration runs
   - [ ] **Then** three new tables exist:
     - `tag_personality_relations` (tag_id FK→tags, trait CHAR(1), high_pole SMALLINT, low_pole SMALLINT) — one row per (tag, trait) pair
     - `tag_candidates` (problem_tag_id FK→tags, solution_tag_id FK→tags, justification TEXT) — maps a problem tag to its candidate solution tags
     - `tag_recommendations` (tag_id FK→tags UNIQUE, recommendation_text TEXT, implementation_example TEXT) — one row per tag with actionable recommendation text

2. **Personality Relations Seeded**
   - [ ] **Given** the seed script runs
   - [ ] **Then** all rows from `docs/tag_personality_affinity/tags_personality_relation.csv` are parsed and inserted into `tag_personality_relations`, producing **20 tags × 5 traits = 100 rows**.
   - [ ] **Then** the `high_pole` and `low_pole` columns use the same numeric mapping as the existing affinity engine: `+` → `1`, `0` → `0`, `-` → `-1`.

3. **Issue Candidates Seeded**
   - [ ] **Given** the seed script runs
   - [ ] **Then** all rows from `docs/tag_personality_affinity/tags_issue_candidates.csv` are parsed and inserted into `tag_candidates`.
   - [ ] **Then** tag names in CSV are resolved to `tags.id` using case-insensitive, trimmed, whitespace-normalized matching (same `normalizeTagKey` function from `affinity-reference-data.ts`).
   - [ ] **Then** unresolvable tag names cause a logged warning but do not abort the seed.

4. **Recommendations Seeded**
   - [ ] **Given** the seed script runs
   - [ ] **Then** all rows from `docs/tag_personality_affinity/tag_recommendations.md` (comma-separated: `Tag,Recommendation,Implementation Example`) are parsed and inserted into `tag_recommendations`.
   - [ ] **Then** each tag is matched to `tags.id` via the same normalized matching.

5. **Idempotent Seeding**
   - [ ] **Given** the seed script is run multiple times
   - [ ] **Then** no duplicate rows are created (upsert or skip-duplicates strategy).

6. **API Surface (Optional — Verify Existing Endpoint Sufficiency)**
   - [ ] **Given** I query `GET /api/v1/teams/:teamId/tags` (existing endpoint)
   - [ ] **Then** it returns tag details including `id`, `name`, `description`, and `type`.
   - [ ] *(No new API endpoint required for this story; the existing tags endpoint is sufficient. The delta engine in Story 4.3.3 will query the new tables internally.)*

## Tasks / Subtasks

- [x] **Database Schema Extension** (AC: #1)
  - [x] Add `TagPersonalityRelation` model to `schema.prisma` (tag_id, trait, high_pole, low_pole; composite @@id on [tagId, trait])
  - [x] Add `TagCandidate` model to `schema.prisma` (problemTagId, solutionTagId, justification; composite @@id on [problemTagId, solutionTagId])
  - [x] Add `TagRecommendation` model to `schema.prisma` (tagId @unique, recommendationText, implementationExample)
  - [x] Add relations on `Tag` model pointing to new tables
  - [x] Run `npx prisma migrate dev --name add_tag_reference_data_tables` and commit generated SQL

- [x] **Seed Script Implementation** (AC: #2, #3, #4, #5)
  - [x] Create `server/prisma/seed-tag-reference-data.ts` (or extend existing seed)
  - [x] Implement `seedTagPersonalityRelations()` — parse `tags_personality_relation.csv` (`;`-separated), resolve tag names → tag IDs, insert into `tag_personality_relations`
  - [x] Implement `seedTagCandidates()` — parse `tags_issue_candidates.csv` (`;`-separated), handle multi-value `tag_candidates` column (comma-separated within cell), resolve both problem and solution tag names → IDs, insert into `tag_candidates`
  - [x] Implement `seedTagRecommendations()` — parse `tag_recommendations.md` (comma-separated with quoted fields), resolve tag name → ID, insert into `tag_recommendations`
  - [x] Ensure idempotency with `createMany({ skipDuplicates: true })` or upsert pattern
  - [x] Wire seed into Prisma seed command (`package.json` → `prisma.seed` or invoke from existing seed entry)

- [x] **Tag Name Resolution Utility** (AC: #3)
  - [x] Reuse or import `normalizeTagKey()` from `server/src/services/affinity/affinity-reference-data.ts`
  - [x] Build a helper `resolveTagNameToId(name, tagMap)` that normalizes and looks up against a pre-loaded `Map<normalizedName, tagId>` built from `ensureTagCatalog()` output

- [x] **Testing** (AC: #1–#5)
  - [x] Unit test CSV/MD parsing functions in isolation (mock file content, verify row counts and data integrity)
  - [x] Unit test tag name resolution including edge cases (abbreviated CSV names like `Structured / Facilit.` → DB name `Structured / Facilitated`)
  - [x] Integration test: run seed against test DB, assert expected row counts (100 personality relations, expected candidate count, 20 recommendations)

## Dev Notes

- **Critical Data-Match Issue:** The CSV files use *abbreviated* tag names in some places that do **not** exactly match the canonical names in `VALID_TAGS` (from `tags.constants.ts`) or the `tags` DB table. Specific known mismatches:
  - CSV: `Structured / Facilit.` → DB: `Structured / Facilitated`
  - CSV: `Critical / Introspect.` → DB: `Critical / Introspective`
  - CSV: `User-Feedback Orien.` → DB: `User-Feedback Oriented`
  - CSV: `Public / High Visib. (Ex: High Exposure)` → DB: `High Visibility`
  - CSV: `Written / Async` (in candidates CSV) → DB: `Written / Async-Ready`
  - CSV: `Critical / Introspect. (Ex: Code Review)` → DB: `Critical / Introspective`
  
  **Resolution approach:** Build a fuzzy alias map or prefix-match strategy. The simplest approach: maintain a `TAG_ALIASES` constant mapping abbreviated CSV names to canonical DB names. This is safer and more explicit than fuzzy matching.

- **CSV Parsing Notes:**
  - `tags_personality_relation.csv`: Semicolon (`;`) delimiter, 11 columns (Tag + 10 pole columns)
  - `tags_issue_candidates.csv`: Semicolon (`;`) delimiter, 3 columns (`tag_issue`, `tag_candidates`, `justification`). The `tag_candidates` column contains comma-separated tag names (some with parenthetical aliases). The `justification` column may contain quoted strings with commas.
  - `tag_recommendations.md`: Despite `.md` extension, it is actually comma-separated with 3 columns (`Tag`, `Recommendation`, `Implementation Example`). The `Implementation Example` column is quoted and contains commas.
  - `personality_score_bounds.csv`: Tab-separated — already loaded by `affinity-reference-data.ts`, no action needed.

- **Existing `ensureTagCatalog()`:** The function in `tags.service.ts` already creates the 20 canonical tags using `createMany({ skipDuplicates: true })`. The seed script should call this first to guarantee all tags exist before trying to resolve names to IDs.

- **Prisma Schema Conventions:** Follow existing patterns:
  - Use `@map("snake_case")` for column names
  - Use `@@map("table_name")` for table names
  - Use `@@index` for foreign key columns
  - Use `onDelete: Cascade` for reference-data relations (if parent tag is deleted, clean up child rows)

- **Transaction Safety:** The entire seed should run inside a `prisma.$transaction()` so that partial failures don't leave the DB in an inconsistent state.

### Project Structure Notes

- **New files:**
  - `server/prisma/seed-tag-reference-data.ts` — seed script
  - `server/prisma/migrations/<timestamp>_add_tag_reference_data_tables/migration.sql` — migration
  - `server/src/constants/tag-aliases.constants.ts` (optional) — alias map for abbreviated CSV names

- **Modified files:**
  - `server/prisma/schema.prisma` — add 3 new models + relations on Tag
  - `server/package.json` — wire seed command if not already configured

- **No new API endpoints** — the existing tags endpoint (`GET /api/v1/teams/:teamId/tags`) already returns tag details. The new tables are consumed internally by the delta engine in Story 4.3.3.

### References

- **Epic 4.3 Definition:** `_bmad-output/planning-artifacts/epics.md` lines 2105–2169
- **Sprint Change Proposal:** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-19.md`
- **Affinity Scoring Technical Contract:** `_bmad-output/planning-artifacts/affinity-scoring-technical-contract.md`
- **Reference Data Files:**
  - `docs/tag_personality_affinity/tags_personality_relation.csv` (20 tags × 10 pole columns)
  - `docs/tag_personality_affinity/tags_issue_candidates.csv` (18 problem→solution mappings)
  - `docs/tag_personality_affinity/tag_recommendations.md` (20 tags × recommendation + example)
  - `docs/tag_personality_affinity/personality_score_bounds.csv` (already loaded, no action)
- **Existing Code Patterns:**
  - `server/src/services/affinity/affinity-reference-data.ts` — CSV parsing, `normalizeTagKey()`, `loadTagRelations()`, `loadBoundsConfig()`
  - `server/src/services/tags.service.ts` — `ensureTagCatalog()`, `getTagsByPracticeIds()`
  - `server/src/constants/tags.constants.ts` — `VALID_TAGS`, `TAG_DESCRIPTIONS`, `TAG_CATEGORIES`
- **Previous Story:** `_bmad-output/implementation-artifacts/4-3-1-enhance-issue-submission-with-tag-identification.md`

### Previous Story 4.3.1 Learnings

- Story 4.3.1 established the `tags` and `issue_tags` tables and the `ensureTagCatalog()` auto-seeder. The 20 canonical tag names and descriptions are already in `tags.constants.ts`.
- Code review uncovered N+1 query issues (H1/H2) which were fixed by batching validations into single `findMany` queries. Apply the same batch-first approach.
- Vitest was upgraded to `^3.2.4` for Node 22 compatibility. Use the same version.
- Practice-specific tag filtering resolved tags from `Practice.tags` JSON arrays, matching against canonical `Tag` rows — this same pattern will be useful for resolving CSV names to tag IDs.

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

- ✅ AC#1: Three new models (`TagPersonalityRelation`, `TagCandidate`, `TagRecommendation`) added to `schema.prisma` with correct composite PKs, FK cascade, and snake_case column mappings. Migration `20260323130234_add_tag_reference_data_tables` created and applied successfully.
- ✅ AC#2: `seedTagPersonalityRelations()` parses `tags_personality_relation.csv` and inserts **100 rows** (20 tags × 5 traits) into `tag_personality_relations`. `+`/`0`/`-` → `1`/`0`/`-1` mapping reused from existing `SYMBOL_MAP`.
- ✅ AC#3: `seedTagCandidates()` parses `tags_issue_candidates.csv`, expands multi-value candidate cells, resolves both problem and solution tag names via `resolveTagNameToId()`. Inserted **34 rows** into `tag_candidates`; unresolvable names log a warning without aborting.
- ✅ AC#4: `seedTagRecommendations()` parses `tag_recommendations.md` (comma-separated with quoted fields containing commas). Inserted **19 rows** into `tag_recommendations` (Remote-Friendly has no entry in source file — correct).
- ✅ AC#5: `createMany({ skipDuplicates: true })` used for personality relations and candidates; `upsert` used for recommendations. Re-running produces no duplicates.
- ✅ AC#6: No new API endpoint added — existing `GET /api/v1/teams/:teamId/tags` endpoint remains sufficient for story 4.3.3.
- ✅ `TAG_ALIASES` constant handles all known abbreviated CSV names (6 aliases covering `Structured / Facilit.`, `Critical / Introspect.`, `User-Feedback Orien.`, `Public / High Visib.`, `Written / Async`, and case variations).

**Code Review Fixes (2026-03-23):**
- ✅ [H1] `TagRecommendation.tagId` promoted from `@unique` to `@id`; new migration `20260323200000_fix_tag_recommendations_pk` adds PRIMARY KEY using existing unique index and drops redundant secondary index.
- ✅ [H2] `ensureTagCatalog()` moved inside `$transaction` callback (via new optional `client` parameter on `ensureTagCatalog` in `tags.service.ts`); seed is now fully atomic.
- ✅ [M1] `seedTagReferenceData` now captures and logs seeded row counts; warns if personality relations < 100 or recommendations < 19.
- ✅ [C1/M3] Added component integration tests reading real CSV files with mocked Prisma client: asserts 100 personality relation rows, 34 candidate rows, 19 recommendation rows.
- ✅ [M2] Added test covering the unresolved solution-tag code path in `parseTagCandidates`.

### Change Log

- 2026-03-23: Story 4.3.2 implemented — added Prisma schema extension for `TagPersonalityRelation`, `TagCandidate`, `TagRecommendation`; migration applied; seed script `seed-tag-reference-data.ts` created and wired into `seed-all.ts`; `TAG_ALIASES` constant added; unit tests added for parsing and alias resolution; schema test assertions extended.
- 2026-03-23: Code review fixes — promoted `TagRecommendation.tagId` to `@id`; added atomicity migration; moved `ensureTagCatalog` inside transaction; added count logging/warnings; added component integration tests (100/34/19 row counts); added unresolved-solution-tag test.

### File List

- `server/prisma/schema.prisma` (modified — added 3 models + Tag relations)
- `server/prisma/migrations/20260323130234_add_tag_reference_data_tables/migration.sql` (new)
- `server/prisma/migrations/20260323200000_fix_tag_recommendations_pk/migration.sql` (new — promotes tag_recommendations.tag_id to PRIMARY KEY)
- `server/src/scripts/seed-tag-reference-data.ts` (new)
- `server/src/scripts/seed-tag-reference-data.test.ts` (new)
- `server/src/scripts/seed-all.ts` (modified — wired seedTagReferenceData)
- `server/src/constants/tag-aliases.constants.ts` (new)
- `server/src/services/tags.service.ts` (modified — added optional `client` parameter to `ensureTagCatalog`)
- `server/src/__tests__/prisma.schema.test.ts` (modified — added tag reference data model assertions)
