---
title: 'Replace Agile Pillars Taxonomy (L1/L2) in Database and PracticeGoal Mapping'
slug: 'replace-agile-pillars-taxonomy-db-practicegoal-mapping'
created: '2026-03-05T14:47:20.6826024+01:00'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Node.js 18+', 'TypeScript (strict)', 'Express 4.18+', 'Prisma 7.x', 'PostgreSQL 14+', 'Zod', 'Jest', 'React 18.2', 'Vitest']
files_to_modify: ['docs/raw_practices/agile_pillars.md', 'server/src/scripts/seed-categories-pillars.ts', 'server/src/schemas/practice.schema.ts', 'server/src/services/practice-import.service.ts', 'server/src/services/coverage.service.test.ts', 'server/src/routes/__tests__/practices.routes.test.ts', 'server/src/services/practices.service.test.ts', 'client/src/features/practices/components/CategoryFilter.tsx', 'client/src/features/practices/components/PillarFilterDropdown.tsx', 'client/src/features/practices/components/PracticeCard.tsx', 'docs/04-database.md', 'docs/05-backend-api.md', 'docs/06-frontend.md']
code_patterns: ['Reference data seeded via idempotent Prisma upsert scripts', 'Practice import pipeline validates JSON via Zod then maps practice_goal names to pillar IDs', 'Coverage calculation is data-driven from practice_pillars and pillars/category joins', 'Category IDs are string slugs used across API payloads and frontend filters', 'Category visual styling in catalog UI uses hardcoded category-key maps']
test_patterns: ['Backend unit tests with Jest and mocked repositories/prisma', 'Route tests under server/src/routes/__tests__', 'Service tests in server/src/services/*.test.ts and server/src/services/__tests__/*.test.ts', 'Frontend component/store tests with Vitest and fixed categoryId fixtures']
---

# Tech-Spec: Replace Agile Pillars Taxonomy (L1/L2) in Database and PracticeGoal Mapping

**Created:** 2026-03-05T14:47:20.6826024+01:00

## Overview

### Problem Statement

The current Agile taxonomy used by the application (level-1 categories and level-2 pillars) is outdated and no longer aligned with the latest reference taxonomy. The dashboard coverage mechanism (presence/absence, overview, and percentages) must remain unchanged, but the underlying taxonomy labels and descriptions must be replaced in the database and strict validation layers.

### Solution

Adopt `docs/raw_practices/agile_pillars.md` as the single source of truth and replace current taxonomy definitions with stable slugs for categories and pillars. Update database seed/migration inputs and strict `PracticeGoal` validation to reflect the new taxonomy, while keeping coverage computation logic unchanged.

### Scope

**In Scope:**
- Replace level-1 category names/descriptions with new taxonomy values.
- Replace level-2 pillar names/descriptions with new taxonomy values.
- Use stable slug identifiers for taxonomy entries.
- Update backend strict validation for `practice_goal` to the new goals.
- Prepare for full remapping via a future re-import of `practice_reference.json`.
- Keep existing coverage behavior and formulas intact.

**Out of Scope:**
- Redesign of coverage UI/UX behavior.
- Changes to coverage formulas or presence/absence logic.
- Final `practice_reference.json` content update itself (planned in a future step).
- Type/tag taxonomy updates beyond what is needed for this specific taxonomy replacement.

## Context for Development

### Codebase Patterns

- Taxonomy reference data is seeded by `server/src/scripts/seed-categories-pillars.ts` via Prisma `upsert` on `category.id` and `(pillar.name, pillar.categoryId)`.
- Practice import (`server/src/services/practice-import.service.ts`) enforces strict validation with `PracticeSchema`, maps `practice_goal` names to DB pillar IDs, and persists links in `practice_pillars`.
- Coverage logic (`server/src/services/coverage.service.ts`) is fully data-driven from `team_practices -> practice_pillars -> pillars -> categories`; it does not hardcode taxonomy labels.
- Database constraints in `server/prisma/schema.prisma` create hard coupling through foreign keys: `practices.categoryId -> categories.id` and `pillars.categoryId -> categories.id`.
- Several frontend catalog and filtering components still use hardcoded category key maps; changing category IDs without synchronizing these maps will cause UI color/filter regressions.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `docs/raw_practices/agile_pillars.md` | Single source of truth for new categories/pillars |
| `server/prisma/schema.prisma` | FK constraints and taxonomy data model (`Category`, `Pillar`, `Practice`, `PracticePillar`) |
| `server/src/scripts/seed-categories-pillars.ts` | Current 5-category / 19-pillar seed data and upsert strategy |
| `server/src/schemas/practice.schema.ts` | Strict `practice_goal` enum used for JSON import validation |
| `server/src/services/practice-import.service.ts` | Mapping of `type -> categoryId`, `practice_goal -> pillarIds`, and transactional import |
| `server/src/services/coverage.service.ts` | Coverage computation behavior to preserve unchanged |
| `server/src/services/coverage.service.test.ts` | Category/pillar fixture assumptions that must be updated |
| `server/src/routes/__tests__/practices.routes.test.ts` | Route fixtures tied to current category IDs |
| `server/src/services/practices.service.test.ts` | Service fixtures tied to current category IDs |
| `client/src/features/practices/components/CategoryFilter.tsx` | Hardcoded category IDs/labels in catalog filters |
| `client/src/features/practices/components/PillarFilterDropdown.tsx` | Category order/colors keyed by normalized category strings |
| `client/src/features/practices/components/PracticeCard.tsx` | Category/pillar badges keyed by hardcoded category maps |

### Technical Decisions

- Source of truth: `docs/raw_practices/agile_pillars.md` only.
- Identifier strategy: stable slugs for L1 and L2 entries (not display labels).
- Migration strategy: no legacy mapping preservation; practice mappings will be fully redone later via refreshed `practices_reference.json` import.
- Validation strategy: strict enum update to new goals now (no backward compatibility aliases).
- Constraint identified: category ID replacement impacts existing `practices.categoryId` foreign keys and frontend category-key assumptions. Implementation must include a safe transitional DB strategy (controlled reset/reseed/update sequence) to avoid FK violations.
- Constraint identified: changing pillar names breaks current `practice_goal` imports until `practices_reference.json` is updated and re-imported.

## Implementation Plan

### Tasks

- [ ] Task 1: Define stable slug taxonomy from source of truth
	- File: `docs/raw_practices/agile_pillars.md`
	- Action: Confirm and freeze canonical L1/L2 naming and descriptions as implementation input.
	- Notes: Create a deterministic mapping table (L1 slug, L1 display name, L1 description, L2 slug, L2 display name, L2 description) to avoid ambiguities during seed/validation updates.

- [ ] Task 2: Replace category and pillar seed data with new taxonomy
	- File: `server/src/scripts/seed-categories-pillars.ts`
	- Action: Replace existing 5-category/19-pillar constants with 4-category/14-pillar constants from `agile_pillars.md` using stable slugs.
	- Notes: Keep idempotent upsert behavior; update comments/logs/count expectations; ensure category `id` values are slug-safe and consistent with frontend/API usage.

- [ ] Task 3: Implement safe DB transition strategy for FK-coupled taxonomy IDs
	- File: `server/src/scripts/seed-categories-pillars.ts`
	- Action: Add controlled reset sequence for taxonomy reference data so old category IDs do not violate FK constraints.
	- Notes: Because `practices.categoryId` references `categories.id`, enforce ordering: clear dependent mappings (`practice_pillars`) and practice rows intended for re-import, then update categories/pillars. Keep operation explicit and guarded to avoid partial state.

- [ ] Task 4: Update strict PracticeGoal validation to the new goals
	- File: `server/src/schemas/practice.schema.ts`
	- Action: Replace `ValidPracticeGoals` enum values with the 14 new L2 pillar names exactly.
	- Notes: No backward-compatible aliases; invalid old goals must fail validation immediately by design.

- [ ] Task 5: Align practice import mappings with new category slugs
	- File: `server/src/services/practice-import.service.ts`
	- Action: Update `PRACTICE_TYPE_TO_CATEGORY` and heuristic fallback returns to new L1 slugs.
	- Notes: Keep mapping behavior deterministic; preserve existing idempotency/checksum logic and pillar-name-to-ID lookup flow.

- [ ] Task 6: Update backend tests tied to old taxonomy IDs/names
	- File: `server/src/services/coverage.service.test.ts`
	- Action: Replace hardcoded legacy category IDs/names and pillar fixtures with new taxonomy fixtures.
	- Notes: Preserve assertions on coverage math and event payload structure.

- [ ] Task 7: Update additional backend tests using legacy category fixtures
	- File: `server/src/routes/__tests__/practices.routes.test.ts`
	- Action: Update category fixtures and expectations to new slugs and labels.
	- Notes: Ensure route behavior remains unchanged except taxonomy values.

- [ ] Task 8: Update service-level practice tests with new taxonomy fixtures
	- File: `server/src/services/practices.service.test.ts`
	- Action: Replace legacy category references (`FEEDBACK_APPRENTISSAGE`, etc.) with new stable slugs.
	- Notes: Keep sorting/filtering semantics intact.

- [ ] Task 9: Synchronize frontend category key maps with new slugs
	- File: `client/src/features/practices/components/CategoryFilter.tsx`
	- Action: Replace hardcoded category IDs/labels with new 4-category values.
	- Notes: Maintain filter UX behavior, only taxonomy labels/keys change.

- [ ] Task 10: Update pillar/category visual mapping for new category keys
	- File: `client/src/features/practices/components/PillarFilterDropdown.tsx`
	- Action: Replace `CATEGORY_COLORS` and `CATEGORY_ORDER` keys with new slugs.
	- Notes: Keep grouping/order/color behavior stable for new taxonomy.

- [ ] Task 11: Update practice card badge mapping for new taxonomy keys
	- File: `client/src/features/practices/components/PracticeCard.tsx`
	- Action: Update category color map and normalization assumptions to support new slugs cleanly.
	- Notes: Preserve existing fallback styling for unknown categories.

- [ ] Task 12: Update technical documentation to reflect new taxonomy
	- File: `docs/04-database.md`
	- Action: Update category/pillar reference sections and expected counts (4 categories, 14 pillars).
	- Notes: Reflect slug strategy and reset/reimport workflow.

- [ ] Task 13: Update backend API docs for taxonomy values
	- File: `docs/05-backend-api.md`
	- Action: Update examples containing category IDs/pillar labels.
	- Notes: Response shape remains unchanged; only taxonomy values update.

- [ ] Task 14: Update frontend docs for filters and coverage categories
	- File: `docs/06-frontend.md`
	- Action: Update category labels/keys used by filters and coverage displays.
	- Notes: Document that visual components consume slug-based category IDs.

### Acceptance Criteria

- [ ] AC 1: Given the updated seed script and an empty taxonomy state, when taxonomy seeding runs, then exactly 4 categories and 14 pillars matching `docs/raw_practices/agile_pillars.md` are persisted with stable slug IDs.
- [ ] AC 2: Given pre-existing legacy taxonomy data, when the controlled reset/reseed sequence executes, then no FK constraint error occurs and the database ends in a consistent state containing only the new taxonomy reference data.
- [ ] AC 3: Given a practice payload containing any legacy `practice_goal` value, when validation runs, then import is rejected with a validation error on `practice_goal`.
- [ ] AC 4: Given a practice payload containing only new taxonomy goals, when import runs, then all goals map to valid pillar IDs and corresponding `practice_pillars` links are created.
- [ ] AC 5: Given coverage endpoints are called after taxonomy replacement, when coverage is computed, then percentage and covered/gap logic remain unchanged and are based on the new category/pillar values.
- [ ] AC 6: Given backend unit/route tests are executed, when taxonomy fixtures are updated, then tests pass without changing business logic beyond taxonomy naming/ID updates.
- [ ] AC 7: Given frontend catalog/filters render categories and pillars, when category IDs switch to new slugs, then category filters, color badges, and grouping continue to work with no runtime errors.
- [ ] AC 8: Given project docs are consulted, when reading DB/API/frontend taxonomy sections, then they reflect 4 categories, 14 pillars, and slug-based IDs consistently.

## Additional Context

### Dependencies

- `docs/raw_practices/agile_pillars.md` as canonical taxonomy input.
- Existing Prisma models and FK constraints in `server/prisma/schema.prisma`.
- Existing seed pipeline: `server/src/scripts/seed-all.ts` orchestrating category/pillar seed before practice import.
- Future dependency: refreshed `docs/raw_practices/practices_reference.json` aligned to new goals for full data reload.
- Test suites relying on hardcoded category IDs/pillar names (backend and frontend).

### Testing Strategy

- Unit tests:
	- Run `server/src/services/coverage.service.test.ts` and update fixtures for new slugs/names while preserving expected coverage math.
	- Run service and route suites that contain category fixtures (`practices.service.test.ts`, `routes/__tests__/practices.routes.test.ts`).
- Integration/data validation:
	- Execute seed workflow in a test DB and verify counts: 4 categories, 14 pillars.
	- Execute import with one invalid legacy-goal payload and one valid new-goals payload.
	- Confirm `practice_pillars` links resolve and no orphan FK records remain.
- Manual verification:
	- Call coverage endpoint and validate response structure unchanged.
	- Open practices catalog UI and verify category filters, badge colors, and pillar grouping with new slugs.

### Notes

- High risk: replacing category IDs without a controlled cleanup can break FK-linked rows (`practices`, `pillars`, `practice_pillars`).
- High risk: strict validation update will intentionally reject old `practice_goal` values until JSON source is refreshed.
- Known limitation for this step: taxonomy and validation are updated now; full practice remapping depends on the future `practices_reference.json` refresh/reimport.
- Out-of-scope but recommended next: centralize category color/order maps in one shared frontend constant to reduce future taxonomy migration effort.
