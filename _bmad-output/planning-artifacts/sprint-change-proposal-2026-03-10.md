# Sprint Change Proposal: Practice Recommendations on Issues
**Date**: 2026-03-10
**Author**: Antigravity (Correct Course Workflow)

## 1. Issue Summary

**Trigger:** The user requested to pull a post-MVP feature forward, implementing it before Epic 5 (Adaptation Decision) and Epic 6. 
**Feature:** Add practice recommendations when creating/viewing an issue. The recommendations act as informative tips ("hey, did you know these practices might fit your team better?"). 
**Requirements:** Max 3 recommendations. Must have higher affinity score than current practice, must not decrease agile coverage, ideally same practice "type", and "equivalence" associations are strongly favored if affinity goes up.

## 2. Impact Analysis

- **Epic Impact:** 
  - This inserts a new Epic/Story block right after Epic 4.1 (Affinity Scoring Foundation) and before Epic 5 (Adaptation Decision & Tracking). We will define **Epic 4.2: Issue Practice Recommendations**.
  - No existing Epics need to be cancelled, but the timeline for Epic 5/6 will shift.
- **PRD Impact:** 
  - Elevates "Practice Recommendations (Affinity & Coverage-based)" from Post-MVP/Growth phase into the MVP scope.
- **Architecture Impact:**
  - Logic is required to aggregate the new scoring dimensions: team affinity, coverage delta, practice type matching, and explicit `practice_associations` (type `Equivalence`).
  - Existing DB schema already stores `practice_associations` and `team_coverage`, so no major database refactoring is required. The new recommendation algorithm service will rely on the output of Epic 4.1.
- **UI/UX Impact:** 
  - The Issue Detail view will need a new "Recommendations" widget in the right sidebar.

## 3. Recommended Approach

**Path Forward:** Direct Adjustment (Option 1)
- We will add Epic 4.2 containing stories to implement the Recommendation Engine and the UI component on the Issue page.
- **Rationale:** The infrastructure (Affinity Scoring in Epic 4.1, DB schemas for associations) is already in place. Extracting this feature into its own Epic directly preceding Epic 5 ensures the Adaptation decisions in Epic 5 can actually leverage these recommendations. 
- **Effort Estimate:** Medium.
- **Risk Level:** Low. The algorithm is scoped strictly (max 3 practices, specific filter criteria) and data models support it.

## 4. Detailed Change Proposals

### Story Edits

**NEW EPIC 4.2: Practice Recommendations on Issues**
**Goal:** Provide alternative practice suggestions on the issue detail page to guide team adaptation decisions.

**New Story 4.2.1: Recommendation Engine API**
- **Description:** Create an endpoint `GET /api/teams/:id/practices/:practiceId/recommendations` that returns max 3 alternative practices.
- **Acceptance Criteria:**
  - Must filter practices where Team Affinity Score > Current Practice's Team Affinity Score.
  - Must ensure the alternative practice maintains or increases team Agile Coverage (covers all pillars the current one covers, or overlaps in a way that doesn't drop coverage).
  - Prioritizes practices of the same "type" or category.
  - Heavily prioritizes practices linked via `practice_associations` with `association_type = 'Equivalence'`.

**New Story 4.2.2: Issue Detail Recommendations UI**
- **Description:** Add a Recommendations panel to the Issue Detail sidebar.
- **Acceptance Criteria:**
  - Shows up to 3 recommended practices.
  - Each item displays practice name, affinity score delta, and a brief "Why?" (e.g., "Covers same pillars, higher team affinity").
  - Clickable to view details of the practice.

### PRD Edits
**Section:** Post-MVP Roadmap -> MVP Scope
- Add "Practice Recommendations (Coverage & Affinity based)" to the MVP Scope. Remove it from Growth Features.

### Architecture Edits
- Add a section defining the Recommendation Algorithm query logic combining `team_coverage`, `practice_associations`, and `affinity_scores`.

### UI/UX Edits
- Add `RecommendationWidget` component specification to the Issue Detail View.

## 5. Implementation Handoff

- **Scope Classification:** Moderate
- **Routing:** Product Owner / Scrum Master
- **Deliverables:** This accepted proposal will result in the `epics.md`, `prd.md`, `architecture.md`, and `ux-design-specification.md` being updated, and the creation of the stories for Epic 4.2.
