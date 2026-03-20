# Sprint Change Proposal: Directed Tag-Based Recommendations

## Section 1: Issue Summary

**Trigger:** The user has requested the addition of a new, more directive practice adaptation recommendation system. 
**Problem Statement:** Currently, issues are linked to practices, and recommendations are based on overall pillar coverage and basic affinity. The system lacks granular problem identification (what exact aspect of the practice is failing?) and targeted resolution advice.
**Context & Evidence:** The user provided explicit mapping files (`tags_personality_relation.csv`, `tags_issue_candidates.csv`, `tag_recommendations.md`) that describe how specific practice characteristics (Tags) relate to personality traits, which tags can solve problems caused by other tags, and what specific advice to give.

## Section 2: Impact Analysis

- **Epic Impact:** Requires the creation of a new Epic (e.g., Epic 4.2: Directed Tag-Based Recommendations) to encompass the new data structures, delta calculations, and UI updates. Modifies Epic 4 slightly to include tag selection during issue submission.
- **Story Impact:** New stories needed for: Seeding tag reference data, updating the issue submission form (practice-linked and standalone), implementing the Delta sorting algorithm, and updating the issue detail page recommendation UI.
- **Artifact Conflicts:**
  - **PRD:** The "Practice Recommendation Logic" section needs to be expanded to include the tag-based Delta calculation and standalone issue handling.
  - **Architecture:** The database schema requires new tables (`tags`, `tag_relations`, `tag_candidates`, `tag_recommendations`) and updates to the `issues` table to store related tags. The Recommendation Engine logic (`services/recommendation.service.ts`) needs a significant update.
  - **UX/UI:** The Issue Submission form must support tag selection (problematic tags from a practice, or missing tags for standalone issues). The Issue Detail view needs a new panel for the textual tag recommendations.

## Section 3: Recommended Approach

**Selected Approach:** Direct Adjustment (New Epic Integration)
**Rationale:** The feature builds upon the foundational Affinity Scoring (Epic 4.1) but brings a distinct, self-contained business value (directed recommendations). Creating a new Epic (Epic 4.2) isolates this complexity while allowing it to cleanly integrate with the existing Issue and Recommendation flows without requiring a rollback of previous work.
**Effort Estimate:** Moderate-High (Database updates, complex algorithmic logic for Delta, UI modifications).
**Risk Level:** Medium (The delta logic and filtering rules must be rigorously tested).

## Section 4: Detailed Change Proposals

### 1. PRD Updates
- **Update "Practice Recommendation Logic"** to describe:
  - Issues can have associated "problematic tags" (if linked to a practice) or "missing tags" (if standalone).
  - The recommendation engine will map the issue tags to "candidate tags" using a new relation matrix.
  - A Delta (`Δ`) score will be calculated: `Affinity(Candidate Tag) - Affinity(Current Tag)`. The delta is mapped to discrete gains (+1, +0.5, -0.5, -1).
  - Candidates with a strictly negative affinity for the team/user are rejected.
  - The system displays the specific textual recommendation associated with the winning Candidate Tag.

### 2. Architecture Updates
- **New Tables:** 
  - `tags` (id, name)
  - `tag_personality_relations` (tag_id, trait, bounds...)
  - `tag_candidates` (problem_tag_id, solution_tag_id, justification)
  - `tag_recommendations` (tag_id, recommendation_text, implementation_example)
- **Table Modifications:**
  - `issues`: add `is_standalone` boolean, and a join table `issue_tags` to link the selected tags.
  - `practice_tags`: Link practices to their tags.
- **Service Layer:** `recommendation.service.ts` updated to compute the Delta logic pipeline.

### 3. Epics & Stories Updates
- **Modify Epic 4 (Issue Submission):** Add tag selection to the issue creation flow.
- **Create Epic 4.2 (Directed Tag-Based Recommendations):**
  - Story 4.2.1: Seed Tag relation and recommendation data from CSV/MD sources.
  - Story 4.2.2: Implement Delta Affinity Calculation Engine.
  - Story 4.2.3: Integrate Tag Recommendations into the Issue Detail UI.

## Section 5: Implementation Handoff

- **Scope Classification:** Major
- **Routing:** Product Manager / Solution Architect agents
- **Responsibilities:** 
  1. Approve this proposal.
  2. The PM agent will update the PRD and Epics documents with the specific proposals.
  3. The Architect agent will update the Architecture and UX documents.
  4. The Dev agent will pick up the new stories in Epic 4.2 for implementation.
- **Success Criteria:** The issue submission form allows tag selection, and the issue detail page displays a tag-based textual recommendation sorted by the defined Delta logic, with negative-affinity candidate rejection functioning correctly.
