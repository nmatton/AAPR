# Affinity Scoring Technical Contract

## 1. Purpose

This document defines the executable technical contract for the Agile Affinity Scoring module introduced by Epic 4.1.

It specifies:

- source datasets,
- parsing rules,
- normalization rules,
- scoring formulas,
- API contracts,
- edge cases,
- privacy constraints,
- acceptance test vectors.

The goal is to make implementation deterministic and reviewable.

## 2. Scope

The module computes two score types for a given practice:

1. Individual practice affinity score.
2. Team practice affinity score.

Each final score must remain in `[-1, 1]`.

The module is coverage-independent. Coverage logic remains a separate recommendation input and affinity is used as an additional signal.

## 3. Source of Truth

### 3.1 Personality Bounds

Canonical file:

- `docs/tag_personality_affinity/personality_score_bounds.csv`

Current canonical values:

| Trait | Low Bound | High Bound |
|------|-----------|------------|
| E | 2.6 | 3.8 |
| A | 3.5 | 4.3 |
| C | 3.0 | 3.9 |
| N | 2.4 | 3.6 |
| O | 3.1 | 3.9 |

### 3.2 Tag-Personality Relations

Canonical file:

- `docs/tag_personality_affinity/tags_personality_relation.csv`

Relation columns are provided as high-pole and low-pole affinities for each Big Five trait.

Example columns:

- `High E`
- `Low E`
- `High A`
- `Low A`
- `High C`
- `Low C`
- `High N`
- `Low N`
- `High O`
- `Low O`

Allowed cell values are:

- `+`
- `0`
- `-`

### 3.3 Practice Tags

Practice tags are loaded from the application database and must be matched against the canonical tag labels from the CSV relation file.

## 4. Parsing and Normalization Rules

### 4.1 Decimal Parsing

The bounds CSV uses decimal commas.

Implementation rule:

- Replace `,` with `.` before numeric parsing.
- Parse as base-10 floating-point values.

Examples:

- `2,6` -> `2.6`
- `3` -> `3.0`

### 4.2 Affinity Symbol Mapping

Symbol values must map as follows:

| Symbol | Numeric Value |
|--------|---------------|
| `-` | `-1` |
| `0` | `0` |
| `+` | `1` |

### 4.3 Trait Keys

Canonical trait keys are:

- `E`
- `A`
- `C`
- `N`
- `O`

No other trait keys are valid.

### 4.4 Tag Matching

Tag matching between database tags and CSV tags must be:

- case-insensitive,
- trimmed,
- whitespace-normalized.

Recommended normalization function:

1. trim leading/trailing whitespace,
2. collapse repeated internal whitespace to a single space,
3. compare using case-insensitive equality.

If a practice tag cannot be matched to the canonical CSV row, that tag must be reported as unmapped.

## 5. Domain Definitions

### 5.1 Trait Contribution

A trait contribution is the affinity contribution of one Big Five trait for one tag.

Range: `[-1, 1]`

### 5.2 Tag Score

A tag score is the arithmetic mean of the five trait contributions for one tag.

Range: `[-1, 1]`

### 5.3 Individual Practice Score

An individual practice score is the arithmetic mean of all eligible tag scores for one practice and one user.

Range: `[-1, 1]`

### 5.4 Team Practice Score

A team practice score is the arithmetic mean of all eligible individual practice scores for one practice and one team.

Range: `[-1, 1]`

## 6. Calculation Rules

### 6.1 Input Preconditions

For individual affinity calculation, the system requires:

- one user Big Five profile with all five trait scores,
- one practice with at least one mapped tag,
- the canonical bounds dataset,
- the canonical tag-personality relation dataset.

For team affinity calculation, the system requires:

- one team,
- one practice,
- zero or more members with complete Big Five profiles.

### 6.2 Trait Contribution Formula

For a given trait:

- `userValue` = user's Big Five score for that trait,
- `lowBound` = trait low bound from CSV,
- `highBound` = trait high bound from CSV,
- `lowEndpoint` = numeric value from `Low <Trait>` relation,
- `highEndpoint` = numeric value from `High <Trait>` relation.

The contribution is defined by a piecewise function:

$$
contribution(userValue) =
\begin{cases}
lowEndpoint & \text{if } userValue \le lowBound \\
highEndpoint & \text{if } userValue \ge highBound \\
lowEndpoint + \frac{(userValue - lowBound)}{(highBound - lowBound)} \times (highEndpoint - lowEndpoint) & \text{otherwise}
\end{cases}
$$

Critical rule:

- There is no extrapolation below `lowBound`.
- There is no extrapolation above `highBound`.
- Outside the bounds, the score remains constant and equal to the score at the nearest boundary.

This rule is mandatory.

### 6.3 Boundary Behavior

If the configured affinity at the low bound is `-1`, then any value lower than the low bound must still return `-1`.

Example:

- relation: `Low E = -`, `High E = +`
- numeric endpoints: `lowEndpoint = -1`, `highEndpoint = 1`
- configured low bound example: `1.56`
- if `E = 0.85`, contribution = `-1`

The result must be exactly `-1`, not a lower extrapolated value.

The same principle applies to the upper bound.

### 6.4 Neutral Pole Cases

If one pole is neutral and the other is positive or negative, interpolation occurs between those numeric endpoints.

Examples:

- `Low E = 0`, `High E = +` -> interpolate between `0` and `1`
- `Low E = -`, `High E = 0` -> interpolate between `-1` and `0`
- `Low E = 0`, `High E = 0` -> contribution is always `0`

### 6.5 Tag Score Formula

For one tag:

$$
tagScore = \frac{contribution_E + contribution_A + contribution_C + contribution_N + contribution_O}{5}
$$

All five traits are always included.

### 6.6 Individual Practice Score Formula

For a practice with `n` mapped tags:

$$
individualPracticeScore = \frac{\sum_{i=1}^{n} tagScore_i}{n}
$$

Only mapped tags are included.

If `n = 0`, the system must return `no_tag_mapping` instead of a numeric score.

### 6.7 Team Practice Score Formula

For a team with `m` eligible members:

$$
teamPracticeScore = \frac{\sum_{j=1}^{m} individualPracticeScore_j}{m}
$$

Only members with complete Big Five profiles are eligible.

If `m = 0`, the system must return `insufficient_profile_data` instead of a numeric score.

## 7. Rounding and Precision

Internal calculations must use full floating-point precision.

Serialization rules:

- intermediate values may be returned with up to 6 decimal places,
- final public API scores should be rounded to 4 decimal places,
- rounding must happen only at serialization time, not during intermediate computation.

## 8. Missing and Invalid Data Rules

### 8.1 Missing User Trait Data

If any of the five trait scores are missing for a user:

- individual affinity response status = `insufficient_profile_data`,
- no numeric score is returned.

### 8.2 Unmapped Practice Tags

If some tags are mapped and some are not:

- compute the score using mapped tags only,
- return `unmappedTags` in the explanation payload.

If no tags are mapped:

- response status = `no_tag_mapping`,
- no numeric score is returned.

### 8.3 Invalid Bounds Configuration

If `highBound <= lowBound` for any trait:

- configuration load must fail,
- the service must not compute scores,
- startup validation or reference-data validation must report the exact trait key.

## 9. Privacy Constraints

Team-level responses must never expose another member's raw Big Five trait values.

Allowed in team responses:

- aggregated team score,
- included member count,
- excluded member count,
- aggregated top positive tags,
- aggregated top negative tags,
- coverage/affinity ordering explanation.

Forbidden in team responses:

- raw trait values of other members,
- per-member full breakdown unless explicitly restricted to the requesting user and approved by product/privacy rules.

## 10. API Contract

### 10.1 GET `/api/teams/:teamId/practices/:practiceId/affinity/me`

Purpose:

- compute the individual affinity score for the authenticated user on one practice.

Success response:

```json
{
  "status": "ok",
  "teamId": "team_123",
  "practiceId": "practice_456",
  "score": 0.2847,
  "scale": { "min": -1, "max": 1 },
  "explanation": {
    "mappedTags": ["Verbal-Heavy", "Whole Crowd"],
    "unmappedTags": [],
    "tagScores": [
      {
        "tag": "Verbal-Heavy",
        "score": 0.4200,
        "traitContributions": {
          "E": 0.8333,
          "A": 0.5000,
          "C": 0.0000,
          "N": -0.5000,
          "O": 0.2667
        }
      }
    ]
  },
  "requestId": "req_123"
}
```

Insufficient profile response:

```json
{
  "status": "insufficient_profile_data",
  "teamId": "team_123",
  "practiceId": "practice_456",
  "score": null,
  "requestId": "req_123"
}
```

No tag mapping response:

```json
{
  "status": "no_tag_mapping",
  "teamId": "team_123",
  "practiceId": "practice_456",
  "score": null,
  "explanation": {
    "mappedTags": [],
    "unmappedTags": ["Custom Tag"]
  },
  "requestId": "req_123"
}
```

### 10.2 GET `/api/teams/:teamId/practices/:practiceId/affinity/team`

Purpose:

- compute the aggregated team affinity score for one practice.

Success response:

```json
{
  "status": "ok",
  "teamId": "team_123",
  "practiceId": "practice_456",
  "score": 0.1934,
  "scale": { "min": -1, "max": 1 },
  "aggregation": {
    "includedMembers": 4,
    "excludedMembers": 1
  },
  "explanation": {
    "topPositiveTags": ["Written / Async-Ready", "Solo-Capable"],
    "topNegativeTags": ["Whole Crowd"]
  },
  "requestId": "req_124"
}
```

No eligible members response:

```json
{
  "status": "insufficient_profile_data",
  "teamId": "team_123",
  "practiceId": "practice_456",
  "score": null,
  "aggregation": {
    "includedMembers": 0,
    "excludedMembers": 5
  },
  "requestId": "req_124"
}
```

## 11. Recommendation Ordering Contract

Recommendation ordering must follow this priority:

1. Coverage rationale first.
2. Affinity score second, only when the team affinity endpoint returns `status = ok`.
3. If affinity is unavailable, keep coverage-only ordering.

Affinity must never override a lower coverage fit with a higher coverage fit penalty unless product explicitly changes the ranking rule later.

## 12. Validation Test Vectors

### 12.1 Constant Clamp Below Lower Bound

Input:

- trait: `E`
- low bound: `2.6`
- high bound: `3.8`
- relation: `Low E = -`, `High E = +`
- user value: `0.85`

Expected result:

- contribution = `-1`

### 12.2 Constant Clamp Above Upper Bound

Input:

- trait: `E`
- low bound: `2.6`
- high bound: `3.8`
- relation: `Low E = -`, `High E = +`
- user value: `4.9`

Expected result:

- contribution = `1`

### 12.3 Interpolation Between Bounds

Input:

- trait: `E`
- low bound: `2.6`
- high bound: `3.8`
- relation: `Low E = 0`, `High E = +`
- user value: `3.2`

Expected result:

$$
0 + \frac{(3.2 - 2.6)}{(3.8 - 2.6)} \times (1 - 0) = 0.5
$$

- contribution = `0.5`

### 12.4 Neutral-Neutral Relation

Input:

- any trait
- relation: `Low = 0`, `High = 0`

Expected result:

- contribution always = `0`

### 12.5 No Tag Mapping

Input:

- practice tags not found in canonical CSV

Expected result:

- status = `no_tag_mapping`
- score = `null`

### 12.6 No Eligible Team Members

Input:

- no member with complete Big Five profile

Expected result:

- status = `insufficient_profile_data`
- score = `null`

## 13. Implementation Notes

- Load and validate reference CSV data once, then cache in memory.
- Fail fast on malformed reference data.
- Keep the calculation engine pure and deterministic.
- Expose a reusable service layer so recommendation features and research exports can share the same implementation.
- Unit tests must cover all piecewise boundary cases.

## 14. Non-Negotiable Rules

The following rules are mandatory and must not be reinterpreted during implementation:

1. Scores outside configured trait bounds are clamped, not extrapolated.
2. Interpolation applies only between the low and high bounds.
3. All final scores must remain in `[-1, 1]`.
4. Team responses expose aggregate context only.
5. Unmapped tags and missing profile data must produce explicit statuses, not silent fallbacks.