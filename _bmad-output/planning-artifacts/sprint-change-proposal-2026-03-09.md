# Sprint Change Proposal - 2026-03-09

## 1. Issue Summary

The next planned implementation block is Epic 5, but the current backlog still assumes recommendations are coverage-only. A new requirement has now been identified: before implementing Epic 5 recommendation work, the project needs an explainable agile affinity scoring module that calculates practice fit from Big Five profiles and practice tags.

The requested change has two explicit phases:

1. Calculate an individual affinity score for a given practice.
2. Calculate a team affinity score for a given practice by aggregating available member scores.

The calculation is based on two curated reference datasets:

- Personality trait bounds per Big Five dimension.
- Tag-personality relation matrix using `{ -, 0, + }` polarity at low/high trait poles.

Evidence supporting the change:

- Existing PRD language still defers personality-ranked recommendations to a later phase.
- Epic 5 currently plans recommendation work without a prerequisite scoring engine.
- The research objective explicitly depends on personality-practice relationships being computed in a transparent, reproducible way.

## 2. Impact Analysis

### Epic Impact

- Epic 4 remains valid and complete as-is.
- A new Epic 4.1 is required before Epic 5 to provide the missing scoring foundation.
- Epic 5 remains valid, but Story 5.3 must be updated so recommendation ordering can consume team affinity context when available.
- Epic 6 is not structurally changed, though it remains relevant for later research analysis of these scores.

### Artifact Impact

- Epics document: add FR12A/FR12B, add Epic 4.1, update Epic 5 recommendation story, update delivery sequence.
- PRD: move affinity scoring foundation out of a vague future state and define its algorithmic role before recommendation ranking.
- Architecture: add an explicit affinity scoring service boundary and calculation rules.
- UX specification: clarify that affinity is supporting context in the sidebar, not a prescriptive recommendation.
- Sprint status: insert Epic 4.1 backlog entries before Epic 5 execution.

### Technical Impact

- New backend scoring service is required.
- Recommendation flows need a coverage-first, affinity-second ordering rule.
- API contracts are needed for individual and team affinity retrieval.
- Privacy constraints matter: raw teammate Big Five scores must not leak through recommendation views.

## 3. Recommended Approach

**Selected path:** Direct Adjustment

**Why this is the best fit:**

- No rollback is needed; prior epics remain valid.
- The new requirement is additive and has a clear dependency shape.
- Adding a focused foundation epic before Epic 5 is lower risk than retrofitting affinity logic during recommendation implementation.
- The change preserves the product direction while improving research validity and implementation clarity.

**Effort estimate:** Moderate

**Risk level:** Moderate

**Timeline impact:** Epic 5 should not begin until Epic 4.1 stories are planned and accepted as the new prerequisite sequence.

## 4. Detailed Change Proposals

### Stories / Epics

#### New Epic

OLD:
- Epic 4 is followed directly by Epic 5.

NEW:
- Add Epic 4.1: Affinity Scoring Foundation.
- Add Story 4.1.1: Calculate Individual Practice Affinity Score.
- Add Story 4.1.2: Calculate Team Practice Affinity Score.

Rationale:
- Epic 5 recommendation behavior needs a reusable, explainable scoring layer before implementation starts.

#### Story 5.3

OLD:
- Recommendations are coverage-based and explicitly unranked when multiple practices match the same pillars.

NEW:
- Recommendations remain coverage-first.
- Team affinity becomes a secondary ordering signal when enough profile data exists.
- If profile data is insufficient, the flow falls back to coverage-only ordering with clear messaging.

Rationale:
- This preserves the original pillar-coverage rationale while enabling the new research-oriented scoring requirement.

### PRD

OLD:
- Personality-informed recommendation logic is only described as a later-phase concept.

NEW:
- Add an affinity scoring foundation section describing:
  - trait bounds,
  - pole-to-numeric mapping,
  - linear interpolation,
  - tag average,
  - practice average,
  - team average.

Rationale:
- The project now needs a precise, implementation-ready description instead of a generic future note.

### Architecture

OLD:
- Big Five integration covers questionnaire and profile display only.

NEW:
- Add an affinity scoring service boundary and explicit privacy rule for aggregated outputs.

Rationale:
- The scoring engine becomes a first-class backend capability and should not be hidden inside future recommendation work.

### UX

OLD:
- Personality context is described as a gentle sidebar hint.

NEW:
- Affinity context is also shown as supporting evidence in the sidebar, never as a directive.

Rationale:
- This keeps the product aligned with the non-prescriptive UX principle.

## 5. Implementation Handoff

**Scope classification:** Moderate

**Handoff recipients:**

- Product Owner / Scrum Master: confirm Epic 4.1 priority and sequencing before Epic 5.
- Development team: implement the scoring engine and expose the new affinity endpoints.
- Architect: validate the service boundary, explanation payload, and privacy constraints.

**Success criteria:**

- Epic 4.1 is present in backlog and sprint-status.
- Individual and team affinity stories define the interpolation and aggregation rules unambiguously.
- Epic 5 recommendation story explicitly consumes affinity context only as a secondary signal.
- Documentation stays consistent across epics, PRD, architecture, and UX artifacts.