# Directed Tag-Based Recommendation Engine

**Delta Affinity Calculation Engine — Technical Documentation**

Last Updated: March 23, 2026
Story: 4.3.3 — Implement Delta Affinity Calculation Engine
Implementation: `server/src/services/recommendation.service.ts`

---

## 1. Purpose

The Directed Tag-Based Recommendation Engine provides **personality-aware practice adaptation advice** when a team files an issue and tags it with problematic or missing capabilities. Rather than recommending whole practice substitutions (Story 4.2), this engine operates at the **tag level** — given that a team struggles with a specific aspect of their workflow (identified by tags), it recommends alternative approaches (candidate tags) that are better aligned with the team's collective personality profile.

This addresses a core research question of the AAPR platform: can Big Five personality profiles guide teams toward more compatible agile practices when friction is detected?

---

## 2. Relationship to Existing Recommendation System

The AAPR platform has **two recommendation engines** that coexist additively:

| Engine | Entry Point | Trigger | Scope | Story |
|--------|-------------|---------|-------|-------|
| Practice Recommendation | `getRecommendations(teamId, practiceId)` | User explores an alternative to a portfolio practice | Whole-practice substitution with pillar coverage preservation | 4.2.1 |
| **Directed Tag Recommendation** | `getDirectedTagRecommendations(teamId, issueId)` | User submits an issue with tagged problem areas | Tag-level adaptation via delta affinity scoring | **4.3.3** |

The directed engine was implemented as a new export without modifying the existing `getRecommendations` function, preserving full backward compatibility with Epic 4.2.

---

## 3. Architecture — Pipeline Overview

The engine follows a five-stage pipeline defined by Architecture Decision 1.5:

```
┌───────────────────────────────────────────────────────────────────┐
│                     Issue with Tagged Problems                    │
│  issue_tags: ["Verbal-Heavy", "Whole Crowd"]                     │
└────────────────────────┬──────────────────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │  Stage 1: Problem Tag       │
          │  Identification             │
          │  (from issue_tags table)    │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │  Stage 2: Candidate         │
          │  Mapping                    │
          │  (via tag_candidates table) │
          │                             │
          │  "Verbal-Heavy" →           │
          │    Written/Async,           │
          │    Visual/Tactile           │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │  Stage 3: Delta             │
          │  Computation                │
          │  Team affinity for each     │
          │  (problem, candidate) pair  │
          │  → gain class scoring       │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │  Stage 4: Negative          │
          │  Guardrail                  │
          │  Reject candidates where    │
          │  team absolute affinity < 0 │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │  Stage 5: Sort & Hydrate    │
          │  Delta desc → Affinity desc │
          │  → Tag ID asc (stable)      │
          │  Populate explainability    │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │  DirectedTagRecommendation[]│
          │  → Story 4.3.4 UI Panel    │
          └─────────────────────────────┘
```

---

## 4. Data Model Dependencies

### 4.1 Database Tables Used

| Table | Schema Model | Source Story | Role |
|-------|-------------|-------------|------|
| `issue_tags` | `IssueTag` | 4.3.1 | Links issues to problematic/missing tags |
| `tag_candidates` | `TagCandidate` | 4.3.2 | Maps problem tags → solution tags with justification |
| `tag_personality_relations` | `TagPersonalityRelation` | 4.3.2 | Per-tag Big Five trait high/low poles (from DB, not CSV) |
| `big_five_scores` | `BigFiveScore` | Epic 3 | Team member personality profiles |
| `team_members` | `TeamMember` | Epic 1 | Identifies eligible team members |
| `tags` | `Tag` | 4.3.2 | Tag names and metadata |
| `issues` | `Issue` | Epic 4 | Team ownership check (IDOR prevention) |

### 4.2 Data Flow:  Query Joins

```
issue_tags (issueId, teamId filter)
  │
  ├── tagId → tag_candidates.problem_tag_id
  │              │
  │              └── solution_tag_id → tags.id (candidate)
  │
  ├── tagId ─┐
  │          ├──→ tag_personality_relations (all traits for problem + candidate tags)
  │          │
  └── candidate.solutionTagId ─┘

team_members (teamId, exclude admin monitors)
  └── user → big_five_scores (personality profile)
```

All queries use batched `WHERE IN` clauses to avoid N+1 patterns.

### 4.3 Tag Candidate Reference Data

The candidate mapping is defined in `docs/tag_personality_affinity/tags_issue_candidates.csv` and seeded to the `tag_candidates` table (Story 4.3.2). Each row maps a problem tag to one or more solution tags with a justification. Examples:

| Problem Tag | Candidate Tags | Justification |
|-------------|---------------|---------------|
| Verbal-Heavy | Written/Async, Visual/Tactile | Replace oral bandwidth with delayed writing or visual aids to reduce social fatigue |
| Whole Crowd | Small Group/Pair, Solo-Capable | Reduce social density to restore psychological safety or concentration |
| Consensus-Driven | Spontaneous/Improv, Time-Boxed | Unanimous agreement paralysis → force decision through time limit |

---

## 5. Core Algorithm

### 5.1 Affinity Computation — Reuse of Epic 4.1 Foundation

The directed engine reuses the **exact same** piecewise clamp/interpolation model as the affinity foundation from Epic 4.1. This is a non-negotiable consistency requirement.

**Per-trait contribution formula:**

$$
\text{contribution}(v, l_b, h_b, l_e, h_e) = \begin{cases}
l_e & \text{if } v \leq l_b \\
h_e & \text{if } v \geq h_b \\
l_e + \frac{v - l_b}{h_b - l_b} \cdot (h_e - l_e) & \text{otherwise}
\end{cases}
$$

Where:
- $v$ = user's Big Five trait average (1–5 scale)
- $l_b, h_b$ = trait low/high bounds from `personality_score_bounds.csv`
- $l_e, h_e$ = tag's low/high pole values from `tag_personality_relations` (mapped: `'-'→-1`, `'0'→0`, `'+'→+1`)

**Tag affinity score** = arithmetic mean of the five trait contributions:

$$
\text{tagAffinity} = \frac{1}{5} \sum_{t \in \{E, A, C, N, O\}} \text{contribution}_t
$$

**Team tag affinity** = arithmetic mean across all eligible team member scores:

$$
\text{teamTagAffinity} = \frac{1}{|M|} \sum_{m \in M} \text{tagAffinity}_m
$$

Where $M$ is the set of team members with complete Big Five profiles (admin monitors excluded).

Implementation reference: `computeTeamTagAffinityFromTraits()` in [recommendation.service.ts](../../server/src/services/recommendation.service.ts), which calls `computeTraitContribution()` from [affinity-scoring.ts](../../server/src/services/affinity/affinity-scoring.ts).

### 5.2 Delta Transition Scoring

The Delta score classifies the **direction** of the affinity shift, not its magnitude. Each team's affinity for the problem tag and the candidate tag is mapped to a sign class (`-`, `0`, `+`), and the transition between them determines the gain class:

| From → To | Gain Class | Interpretation |
|-----------|-----------|----------------|
| $-$ → $+$ | $+1.0$ | Strong improvement: team friction becomes alignment |
| $-$ → $0$ | $+0.5$ | Moderate improvement: friction becomes neutral |
| $0$ → $+$ | $+0.5$ | Moderate improvement: neutral becomes alignment |
| $0$ → $-$ | $-0.5$ | Moderate degradation: neutral becomes friction |
| $+$ → $-$ | $-1.0$ | Strong degradation: alignment becomes friction |
| Same-sign | $0$ | Neutral: no category shift |

**Decision rationale:** Using a discrete gain class rather than raw delta ($\text{candidate} - \text{current}$) prevents scenarios where small numerical differences within the same sign class dominate the ranking. The gain class captures the **qualitative** improvement that matters for adaptation decisions. The raw delta is still available for within-class tie-breaking.

Implementation: `computeDeltaGainClass()` exported from [recommendation.service.ts](../../server/src/services/recommendation.service.ts).

### 5.3 Negative Affinity Guardrail

**Hard rule:** If the candidate tag's absolute team affinity is strictly negative ($< 0$), the candidate is **immediately rejected**, regardless of how positive the delta gain might appear.

**Rationale:** A negative team affinity indicates that the proposed solution approach creates friction with the team's personality profile. Recommending it would undermine trust in the system, even if the transition from a worse state looks numerically positive. This is a safety-first design decision aligned with the research goal of providing genuinely useful recommendations.

```typescript
// Hard rejection: candidate with negative absolute team affinity (AC 3)
if (candidateAffinity < 0) continue
```

### 5.4 Ranking

Results are sorted using a three-level deterministic ordering:

1. **Primary:** Delta gain class score — descending (strongest improvements first)
2. **Secondary:** Absolute candidate affinity — descending (prefer stronger positive fit among equal deltas)
3. **Tertiary:** Candidate tag ID — ascending (stable fallback for reproducible ordering)

### 5.5 Deduplication

When multiple problem tags in the same issue map to the same candidate tag, the engine keeps only the **best-scoring pair** (highest gain class, then highest absolute affinity). The provenance list (all source problem tags) is tracked internally for potential future use but is not included in the response.

---

## 6. Response Contract

The `DirectedTagRecommendation` interface defines the response shape consumed by Story 4.3.4's UI panel:

```typescript
interface DirectedTagRecommendation {
  candidateTagId: number        // Recommended solution tag ID
  candidateTagName: string      // Human-readable tag name
  sourceProblematicTagId: number // Which issue tag triggered this
  sourceProblematicTagName: string
  absoluteAffinity: number      // Team's average affinity for candidate [-1, 1]
  deltaScore: number            // Gain class value (ranking score)
  reason: string                // Human-readable transition description
}
```

**Design notes:**
- All field names are camelCase per project convention (snake_case in DB, camelCase at API boundary).
- `absoluteAffinity` is the team-level score, never individual member scores (privacy constraint).
- `reason` is a pre-formatted string like `"Transition -→+: Verbal-Heavy → Written / Async"`.
- Internal tracking fields (e.g., `provenanceTagIds`) are stripped before return.

---

## 7. Security and Privacy

| Constraint | Implementation |
|-----------|----------------|
| **Team isolation** | `issueTag.findMany` filters by `issue.teamId` to prevent IDOR access to other teams' issues |
| **No individual trait exposure** | Only aggregated team affinity is returned; individual member Big Five values never appear in responses |
| **Admin monitor exclusion** | Team members with `isAdminMonitor: true` are excluded from personality profile aggregation |
| **Structured error shape** | Follows project-wide `AppError` pattern with `requestId` propagation |

---

## 8. Performance Considerations

| Strategy | Benefit |
|----------|---------|
| Batched `WHERE IN` for tag personality relations | Avoids N+1 when evaluating multiple (problem, candidate) pairs |
| Single team member query | All profiles loaded once, computed in-memory |
| Bounds config from cached reference data | `getReferenceData()` returns cached singleton after first load |
| Deduplication before sorting | Reduces comparison count for sort stage |

Unlike the practice recommendation engine (Story 4.2) which calls `getTeamPracticeAffinity` per candidate (each doing 2 DB queries), the directed engine loads all required data in 4 queries total regardless of candidate count:
1. Issue tags
2. Tag candidates
3. Tag personality relations (all tags at once)
4. Team members with Big Five scores

---

## 9. Test Coverage

All tests are in `server/src/services/recommendation.service.test.ts`.

### 9.1 `computeDeltaGainClass` Unit Tests (9 tests)

| Test | Input | Expected |
|------|-------|----------|
| $-$ → $+$ | `(-0.5, 0.5)` | `1.0` |
| $-$ → $0$ | `(-0.5, 0)` | `0.5` |
| $0$ → $+$ | `(0, 0.5)` | `0.5` |
| $0$ → $-$ | `(0, -0.5)` | `-0.5` |
| $+$ → $-$ | `(0.5, -0.5)` | `-1.0` |
| $+$ → $+$ (same-sign) | `(0.3, 0.7)` | `0` |
| $-$ → $-$ (same-sign) | `(-0.7, -0.3)` | `0` |
| $0$ → $0$ (identity) | `(0, 0)` | `0` |
| Magnitude independence | `(-0.1, 0.1)` and `(-0.9, 0.9)` | Both `1.0` |

### 9.2 `getDirectedTagRecommendations` Integration Tests (12 tests)

| Test | Validates |
|------|-----------|
| No issue tags → empty | Graceful empty input handling |
| No candidates → empty | No `tag_candidates` rows for the problem tags |
| No eligible members → empty | All members lack Big Five profiles |
| Negative candidate disqualified | AC 3: Hard rejection guardrail, candidate affinity < 0 |
| Valid candidate with positive delta | AC 2: Correct affinity-to-delta mapping |
| Sort by delta desc, affinity desc, ID asc | AC 4: Full ranking order verification |
| Stable tie-break by candidate ID | Deterministic ordering when delta and affinity are equal |
| Deduplication across problem tags | Best-scoring pair preservation per candidate |
| Mixed pool: valid + disqualified + equal | Combined scenario coverage |
| All-disqualified → empty | Fallback behavior when every candidate is negative |
| Explainability fields correct | Response shape verification, internal fields stripped |
| Full query chain verification | AC 1: `issue_tags` → `tag_candidates` → personality relations join |

### 9.3 Regression Protection (1 test)

| Test | Validates |
|------|-----------|
| `getRecommendations` signature unchanged | Story 4.2 practice recommendation API contract preserved |

---

## 10. Worked Example

**Scenario:** A team files an issue tagged with "Verbal-Heavy". The team has one member with mid-range personality scores (all trait averages = 3.0).

**Step 1 — Problem tag identification:**
Issue is tagged with "Verbal-Heavy" (tag ID 1).

**Step 2 — Candidate mapping:**
`tag_candidates` maps "Verbal-Heavy" → "Written/Async" (tag ID 2) and "Visual/Tactile" (tag ID 3).

**Step 3 — Affinity computation:**

For "Verbal-Heavy" with the personality relation poles `(highPole=−1, lowPole=−1)` for all traits:
- Each trait: $\text{contribution} = -1 + \frac{3.0 - 1}{5 - 1} \cdot (-1 - (-1)) = -1$
- Tag affinity = mean of 5× $(-1)$ = $-1.0$

For "Written/Async" with poles `(highPole=+1, lowPole=+1)` for all traits:
- Each trait: $\text{contribution} = 1 + \frac{3.0 - 1}{5 - 1} \cdot (1 - 1) = 1$
- Tag affinity = mean of 5× $(+1)$ = $+1.0$

**Step 4 — Delta scoring:**
Current (Verbal-Heavy) = $-1.0$ → sign class $-$
Candidate (Written/Async) = $+1.0$ → sign class $+$
Gain class for $-$ → $+$ = $+1.0$

**Step 5 — Guardrail check:**
Written/Async absolute affinity = $+1.0$ ≥ 0 → **passes** guardrail.

**Result:**
```json
{
  "candidateTagId": 2,
  "candidateTagName": "Written/Async",
  "sourceProblematicTagId": 1,
  "sourceProblematicTagName": "Verbal-Heavy",
  "absoluteAffinity": 1.0,
  "deltaScore": 1.0,
  "reason": "Transition -→+: Verbal-Heavy → Written/Async"
}
```

---

## 11. References

| Document | Relevance |
|----------|-----------|
| [Affinity Scoring Technical Contract](../../_bmad-output/planning-artifacts/affinity-scoring-technical-contract.md) | Defines the interpolation formula, bounds, and trait scoring reused by this engine |
| [Architecture Decision 1.5](../../_bmad-output/planning-artifacts/architecture.md) | Directed Tag-Based Recommendation Engine pipeline definition |
| [PRD — Practice Recommendation Logic](../../_bmad-output/planning-artifacts/prd.md) | Product requirements for directed tag-based recommendations |
| [Epic 4.3 Stories](../../_bmad-output/planning-artifacts/epics.md) | Full epic context (Stories 4.3.1–4.3.4) |
| [tags_issue_candidates.csv](../tag_personality_affinity/tags_issue_candidates.csv) | Source candidate mapping data |
| [tags_personality_relation.csv](../tag_personality_affinity/tags_personality_relation.csv) | Source tag–personality trait poles |
| [personality_score_bounds.csv](../tag_personality_affinity/personality_score_bounds.csv) | Trait interpolation bounds |
| [recommendation.service.ts](../../server/src/services/recommendation.service.ts) | Implementation source |
| [affinity-scoring.ts](../../server/src/services/affinity/affinity-scoring.ts) | Shared `computeTraitContribution` function |
| [recommendation.service.test.ts](../../server/src/services/recommendation.service.test.ts) | Test suite (34 tests) |
| [Story 4.3.3 Spec](../../_bmad-output/implementation-artifacts/4.3.3.md) | Story file with acceptance criteria and task tracking |
