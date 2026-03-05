# Tech-Spec Exports — Replace Agile Pillars Taxonomy

**Export Date:** March 5, 2026 | **Status:** `ready-for-dev` | **Version:** 1.0

---

## 📦 Exported Artifacts

### 1. **Markdown Specification**
**File:** `tech-spec-replace-agile-pillars-taxonomy-db-practicegoal-mapping.md`

Full technical specification in Markdown format with:
- Problem statement and solution overview
- Codebase patterns and technical decisions
- 14 concrete, ordered implementation tasks
- 8 Given/When/Then acceptance criteria
- Dependencies, testing strategy, and risk mitigation

**Use for:** Stakeholder review, team handoff, documentation, manual task tracking.

---

### 2. **JSON Metadata Export**
**File:** `tech-spec-replace-agile-pillars-taxonomy-metadata.json`

Structured JSON containing:
- Frontmatter metadata (title, slug, status, version, export date)
- Summary object (objective, strategy, scope, counts)
- Tech stack array
- 14 tasks with IDs, titles, file paths, types, priorities, and dependencies
- 8 acceptance criteria with categories
- 4 identified risks with severity and mitigations
- Dependencies, testing scope, and export info

**Use for:** Programmatic workflows, CI/CD integration, automated validation, version control.

---

## 📋 Specification Overview

| Dimension | Detail |
|-----------|-|
| **Objective** | Replace 5-category / 19-pillar taxonomy with 4-category / 14-pillar framework |
| **Source** | `docs/raw_practices/agile_pillars.md` (single source of truth) |
| **Strategy** | Stable slug IDs, complete reset migration, strict validation update |
| **Scope** | Seed script → DB transition → validation → import → test fixtures → frontend maps → docs |
| **Implementation Tasks** | 14 concrete tasks (sequenced by dependency) |
| **Acceptance Criteria** | 8 Given/When/Then testable criteria |
| **Files Modified** | 13 backend/frontend/docs files |
| **Tech Stack** | Node.js 18+, TypeScript 5.2+, Express, Prisma 7.x, React 18.2, Vitest |
| **Risks Identified** | 4 (FK constraints, strict validation, frontend maps, test fixtures) |
| **Status** | ✅ All steps completed (1-4); ready for development implementation |

---

## 🎯 Implementation Workflow

The specification is fully sequenced for development. Task dependencies are documented in the JSON export:

```
Task 1 (Define slugs)
  ↓
Task 2 (Seed data)
  ↓
Task 3 (Safe DB transition) + Task 4 (Validation enum)
  ↓
Task 5 (Import mappings)
  ↓
Tasks 6-8 (Backend test fixtures)
  ↓
Tasks 9-11 (Frontend category maps)
  ↓
Tasks 12-14 (Documentation)
```

---

## 🔒 Critical Constraints

1. **FK Safety (Task 3):** Category ID replacement requires controlled reset sequence to avoid breaking `practices.categoryId` references.
2. **Strict Validation by Design (Task 4):** Legacy `practice_goal` values will be intentionally rejected until `practices_reference.json` is refreshed.
3. **Frontend Map Sync (Tasks 9-11):** Hardcoded category-key maps in CategoryFilter, PillarFilterDropdown, PracticeCard must be updated synchronously.
4. **Test Fixture Coupling (Tasks 6-8):** Backend tests hardcoded with legacy IDs; fixtures must be updated while preserving assertion logic.

---

## ✅ Acceptance Criteria Categories

| Category | Count | Details |
|----------|-------|---------|
| **Seed Validation** | 1 AC | Verify 4 categories, 14 pillars seeded with stable slugs |
| **Database Safety** | 1 AC | Verify FK-safe transition with controlled reset |
| **Validation** | 1 AC | Verify legacy goals rejected, new goals accepted |
| **Import Integration** | 1 AC | Verify practice_pillars links created correctly |
| **Coverage Preservation** | 1 AC | Verify coverage math unchanged with new taxonomy |
| **Test Suites** | 1 AC | Verify all backend/frontend tests pass |
| **Frontend Regression** | 1 AC | Verify no UI runtime errors in filters/badges/grouping |
| **Documentation Sync** | 1 AC | Verify docs reflect consistent 4-category / 14-pillar taxonomy |

---

## 📊 Task Distribution

| Type | Count | Files |
|------|-------|-------|
| **Backend Data** | 3 | seed-categories-pillars.ts |
| **Backend Validation** | 1 | practice.schema.ts |
| **Backend Service** | 1 | practice-import.service.ts |
| **Backend Tests** | 3 | coverage.service.test.ts, practices.routes.test.ts, practices.service.test.ts |
| **Frontend** | 3 | CategoryFilter, PillarFilterDropdown, PracticeCard |
| **Documentation** | 3 | Database, API, Frontend docs |

---

## 🚀 Next Steps

1. **Review:** Use Markdown export for team review and approval
2. **Planning:** Reference JSON export for project setup (task board, CI/CD integration)
3. **Implementation:** Follow task order (1-14) in development phase
4. **Validation:** Execute acceptance criteria after each task/phase
5. **Future Work:** Schedule `practices_reference.json` refresh and re-import (acknowledged out-of-scope)

---

## 📝 Export Metadata

- **Export Date:** 2026-03-05
- **Quick-Spec Workflow:** Steps 1-4 completed
- **Status:** Ready for development (`ready-for-dev`)
- **Version:** 1.0 (finalized)
- **Archive Location:** `_bmad-output/exports/`
- **Original WIP Location:** `_bmad-output/implementation-artifacts/tech-spec-replace-agile-pillars-taxonomy-db-practicegoal-mapping.md`

---

**Questions? Feedback?** Review the Markdown specification and JSON metadata, then proceed with implementation or request clarifications.
