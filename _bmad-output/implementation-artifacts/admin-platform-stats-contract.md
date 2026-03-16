# Admin Platform Stats API Contract

## 1. Purpose

This document is the implementation handoff for the admin statistics endpoint discussed in party mode and subsequent refinements.

It defines:
- The final high-level response shape.
- Object and metric definitions, including formulas and semantics.
- A strict JSON Schema (Draft 2020-12) to validate responses.

The goal is to provide aggregated, research-useful usage visibility across the app without granular export-level detail.

## 2. Endpoint and Security Contract

- Method: `GET`
- Route: `/api/v1/admin/stats`
- Auth header: `X-API-KEY: <key>`
- Server env variable: `ADMIN_API_KEY`
- Scope: Admin-only, aggregated analytics

### Time Window Behavior

The response must always include:
- `meta.window` (current window)

Recommended labels:
- `last_7_days`
- `last_30_days`
- `last_90_days`
- `all_time`
- `custom`

## 3. Final High-Level Response Shape

```json
{
  "meta": {
    "generatedAt": "2026-03-16T12:00:00.000Z",
    "window": {
      "from": "2026-02-15T00:00:00.000Z",
      "to": "2026-03-16T23:59:59.999Z",
      "label": "last_30_days"
    },
    "aggregationLevel": "platform",
    "privacy": {
      "containsPII": false,
      "granularity": "aggregated_only"
    },
    "version": "1.0.0"
  },
  "platform": {
    "overview": {
      "registeredUsers": 128,
      "activeUsers": 74,
      "teamsTotal": 19,
      "activeTeams": 14,
      "issuesTotal": 462,
      "teamPracticesTotal": 391,
      "commentsTotal": 1250,
      "eventsTotal": 9320
    },
    "issues": {
      "createdInWindow": 140,
      "byStatus": {
        "open": 96,
        "in_progress": 121,
        "adaptation_in_progress": 64,
        "evaluated": 88,
        "done": 93
      },
      "flow": {
        "open_to_in_progress_rate": 0.72,
        "in_progress_to_adaptation_in_progress_rate": 0.51,
        "adaptation_in_progress_to_evaluated_rate": 0.63,
        "evaluated_to_done_rate": 0.54
      },
      "durationsHours": {
        "meanTimeToFirstComment": 18.4,
        "meanTimeToDecision": 73.2,
        "meanTimeToEvaluation": 122.7
      },
      "backlogHealth": {
        "openOlderThan14d": 38,
        "inProgressOlderThan30d": 22
      }
    },
    "practices": {
      "avgPracticesPerTeam": 20.6,
      "medianPracticesPerTeam": 18,
      "customPractice": 17,
      "practiceEdited": 43,
      "topAdoptedPractices": [
        { "practiceId": 12, "title": "Daily Stand-up", "teamsUsing": 16 }
      ],
      "methodDistribution": {
        "Scrum": 0.20,
        "Kanban": 0.12,
        "XP": 0.08,
        "Lean": 0.10,
        "Scaled Agile": 0.07,
        "Product Management": 0.09,
        "Design Thinking & UX": 0.08,
        "Project Management": 0.11,
        "Agile": 0.09,
        "Facilitation & Workshops": 0.06
      }
    },
    "teamLandscape": {
      "sizeDistribution": {
        "solo": 2,
        "small_2_5": 9,
        "medium_6_10": 6,
        "large_11_plus": 2
      },
      "dormancy": {
        "inactive14d": 3,
        "inactive30d": 2,
        "inactive60d": 1
      }
    },
    "research": {
      "workflowCompletionRatio": 0.39,
      "practiceIssueLinkDensity": 1.6,
      "adaptationMaturityIndex": 0.58,
      "teamExperimentationIndexAvg": 0.41
    }
  },
  "teams": [
    {
      "teamId": 3,
      "teamName": "Team Atlas",
      "membersCount": 7,
      "issuesCount": 51,
      "issuesByStatus": {
        "open": 9,
        "in_progress": 15,
        "adaptation_in_progress": 7,
        "evaluated": 10,
        "done": 10
      },
      "lastActivityAt": "2026-03-16T10:44:00.000Z",
      "practices": {
        "count": 24,
        "customPractice": 2,
        "practiceEdited": 7,
        "coverage": {
          "coveredPillarsCount": 13,
          "coveredCategoriesCount": 4,
          "coveragePct": 0.68,
          "pillars": {
            "Technical Quality & Engineering Excellence": {
              "practices": 12,
              "subpillars": {
                "1.1": { "name": "Code Quality & Simple Design", "practices": 6 },
                "1.2": { "name": "Automation & Continuous Integration", "practices": 3 },
                "1.3": { "name": "Technical Debt Management", "practices": 2 },
                "1.4": { "name": "Technical Collective Ownership", "practices": 1 }
              }
            },
            "Team Culture & Psychology": {
              "practices": 5,
              "subpillars": {
                "2.1": { "name": "Psychological Safety & Core Values", "practices": 2 },
                "2.2": { "name": "Self-Organization & Autonomy", "practices": 1 },
                "2.3": { "name": "Cross-Functionality & Shared Skills", "practices": 2 },
                "2.4": { "name": "Sustainable Pace", "practices": 0 }
              }
            },
            "Process & Execution": {
              "practices": 7,
              "subpillars": {
                "3.1": { "name": "Flow & Delivery Cadence", "practices": 2 },
                "3.2": { "name": "Inspection & Adaptation", "practices": 4 },
                "3.3": { "name": "Work Transparency & Synchronization", "practices": 1 }
              }
            },
            "Product Value & Customer Alignment": {
              "practices": 2,
              "subpillars": {
                "4.1": { "name": "Customer Involvement & Active Feedback", "practices": 1 },
                "4.2": { "name": "Value-Driven Prioritization", "practices": 1 }
              }
            }
          }
        }
      },
      "collaboration": {
        "commentsPerIssueAvg": 2.7,
        "issuesWithNoCommentsPct": 0.19,
        "uniqueCommentersPerIssueAvg": 1.8,
        "crossMemberParticipationPct": 0.46
      },
      "research": {
        "teamExperimentationIndex": 0.44
      }
    }
  ],
  "quality": {
    "metricFreshnessMinutes": 2,
    "warnings": [],
    "dataCompleteness": {
      "issuesWithoutLinkedPracticesPct": 0.12,
      "teamsWithMissingActivityTimestampPct": 0.03
    }
  }
}
```

## 4. Object and Metric Definitions

## 4.1 Top-Level Objects

- `meta`: generation metadata, window scope, privacy and schema version.
- `platform`: cross-team aggregated metrics.
- `teams`: per-team aggregated metrics (no row-level detail).
- `quality`: metric freshness and data quality indicators.

## 4.2 Method Distribution (`platform.practices.methodDistribution`)

Must always contain all keys below (even if `0`):

- `Scrum`
- `Kanban`
- `XP`
- `Lean`
- `Scaled Agile`
- `Product Management`
- `Design Thinking & UX`
- `Project Management`
- `Agile`
- `Facilitation & Workshops`

Interpretation: each value is a normalized ratio in `[0,1]`.

## 4.3 Team-Level Practice Coverage (`teams[].practices.coverage`)

Team-level only (not cross-team aggregate):

- `coveredPillarsCount`: number of unique pillars covered by practices used by the team.
- `coveredCategoriesCount`: number of unique categories covered by the team.
- `coveragePct`: normalized ratio for covered pillars vs total pillar universe.
- `pillars`: two-level exhaustive coverage map: categories -> subpillars.

Per `pillars[categoryName]` item:
- `practices`: total number of team practices mapped to that category.
- `subpillars`: exhaustive map of taxonomy subpillars for the category.

Per `subpillars[pillarId]` item:
- `name`: subpillar label from taxonomy.
- `practices`: number of team practices that cover that subpillar.

Contract rule: all 4 categories and all 13 subpillars must always be present; use `practices: 0` when none match.

Taxonomy source: `docs/raw_practices/agile_pillars.md`.

## 4.4 Practice Activity Counters

- `platform.practices.customPractice`: total number of custom practices created in the selected `meta.window`.
- `platform.practices.practiceEdited`: total number of practice edit operations in the selected `meta.window`.
- `teams[].practices.customPractice`: number of custom practices created by that team in the selected `meta.window`.
- `teams[].practices.practiceEdited`: number of practice edit operations for practices owned/edited within that team context in the selected `meta.window`.

Notes:
- `practiceEdited` counts edit actions (for example typo fixes included).
- These are action counters, not unique-practice counters.

## 4.5 Research Indices Definitions

- `practiceIssueLinkDensity` (platform):
  - Formula: total issue-practice links / max(total issues, 1)
  - Meaning: how strongly issues are linked to explicit practices.

- `adaptationMaturityIndex` (platform, 0..1):
  - Weighted status maturity ratio using issue status distribution.
  - Example weights:
    - open = 0.00
    - in_progress = 0.25
    - adaptation_in_progress = 0.50
    - evaluated = 0.75
    - done = 1.00
  - Formula:
    \[ \text{index} = \frac{\sum (w_s \cdot count_s)}{\max(totalIssues,1)} \]

- `teamExperimentationIndex` (team, 0..1):
  - Team-level normalized weighted score for experimentation behavior in current window.
  - Example components:
    - new custom practices (weight 0.4)
    - practice edits (weight 0.2)
    - issues opened (weight 0.3)
    - decisions recorded (weight 0.1)

- `teamExperimentationIndexAvg` (platform): mean of `teams[].research.teamExperimentationIndex`.

## 4.6 Backlog Health Semantics

- `openOlderThan14d`: count of issues currently in `OPEN` whose `createdAt` is older than 14 days.
- `inProgressOlderThan30d`: count of issues currently in `IN_DISCUSSION` only whose `createdAt` is older than 30 days.

Note:
- `inProgressOlderThan30d` does not include `ADAPTATION_IN_PROGRESS`. This field is intentionally aligned to the discussion-stage backlog only.

## 5. Strict JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://aapr.local/schemas/admin-platform-stats-response.v1.schema.json",
  "title": "Admin Platform Stats Response V1",
  "type": "object",
  "additionalProperties": false,
  "required": ["meta", "platform", "teams", "quality"],
  "properties": {
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "required": ["generatedAt", "window", "aggregationLevel", "privacy", "version"],
      "properties": {
        "generatedAt": { "type": "string", "format": "date-time" },
        "window": { "$ref": "#/$defs/window" },
        "aggregationLevel": { "type": "string", "const": "platform" },
        "privacy": {
          "type": "object",
          "additionalProperties": false,
          "required": ["containsPII", "granularity"],
          "properties": {
            "containsPII": { "type": "boolean", "const": false },
            "granularity": { "type": "string", "const": "aggregated_only" }
          }
        },
        "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" }
      }
    },
    "platform": {
      "type": "object",
      "additionalProperties": false,
      "required": ["overview", "issues", "practices", "teamLandscape", "research"],
      "properties": {
        "overview": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "registeredUsers",
            "activeUsers",
            "teamsTotal",
            "activeTeams",
            "issuesTotal",
            "teamPracticesTotal",
            "commentsTotal",
            "eventsTotal"
          ],
          "properties": {
            "registeredUsers": { "type": "integer", "minimum": 0 },
            "activeUsers": { "type": "integer", "minimum": 0 },
            "teamsTotal": { "type": "integer", "minimum": 0 },
            "activeTeams": { "type": "integer", "minimum": 0 },
            "issuesTotal": { "type": "integer", "minimum": 0 },
            "teamPracticesTotal": { "type": "integer", "minimum": 0 },
            "commentsTotal": { "type": "integer", "minimum": 0 },
            "eventsTotal": { "type": "integer", "minimum": 0 }
          }
        },
        "issues": {
          "type": "object",
          "additionalProperties": false,
          "required": ["createdInWindow", "byStatus", "flow", "durationsHours", "backlogHealth"],
          "properties": {
            "createdInWindow": { "type": "integer", "minimum": 0 },
            "byStatus": { "$ref": "#/$defs/statusCounts" },
            "flow": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "open_to_in_progress_rate",
                "in_progress_to_adaptation_in_progress_rate",
                "adaptation_in_progress_to_evaluated_rate",
                "evaluated_to_done_rate"
              ],
              "properties": {
                "open_to_in_progress_rate": { "$ref": "#/$defs/rate01" },
                "in_progress_to_adaptation_in_progress_rate": { "$ref": "#/$defs/rate01" },
                "adaptation_in_progress_to_evaluated_rate": { "$ref": "#/$defs/rate01" },
                "evaluated_to_done_rate": { "$ref": "#/$defs/rate01" }
              }
            },
            "durationsHours": {
              "type": "object",
              "additionalProperties": false,
              "required": ["meanTimeToFirstComment", "meanTimeToDecision", "meanTimeToEvaluation"],
              "properties": {
                "meanTimeToFirstComment": { "type": "number", "minimum": 0 },
                "meanTimeToDecision": { "type": "number", "minimum": 0 },
                "meanTimeToEvaluation": { "type": "number", "minimum": 0 }
              }
            },
            "backlogHealth": {
              "type": "object",
              "additionalProperties": false,
              "required": ["openOlderThan14d", "inProgressOlderThan30d"],
              "properties": {
                "openOlderThan14d": { "type": "integer", "minimum": 0 },
                "inProgressOlderThan30d": { "type": "integer", "minimum": 0 }
              }
            }
          }
        },
        "practices": {
          "type": "object",
          "additionalProperties": false,
          "required": ["avgPracticesPerTeam", "medianPracticesPerTeam", "customPractice", "practiceEdited", "topAdoptedPractices", "methodDistribution"],
          "properties": {
            "avgPracticesPerTeam": { "type": "number", "minimum": 0 },
            "medianPracticesPerTeam": { "type": "number", "minimum": 0 },
            "customPractice": { "type": "integer", "minimum": 0 },
            "practiceEdited": { "type": "integer", "minimum": 0 },
            "topAdoptedPractices": {
              "type": "array",
              "items": { "$ref": "#/$defs/adoptedPractice" }
            },
            "methodDistribution": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "Scrum",
                "Kanban",
                "XP",
                "Lean",
                "Scaled Agile",
                "Product Management",
                "Design Thinking & UX",
                "Project Management",
                "Agile",
                "Facilitation & Workshops"
              ],
              "properties": {
                "Scrum": { "$ref": "#/$defs/rate01" },
                "Kanban": { "$ref": "#/$defs/rate01" },
                "XP": { "$ref": "#/$defs/rate01" },
                "Lean": { "$ref": "#/$defs/rate01" },
                "Scaled Agile": { "$ref": "#/$defs/rate01" },
                "Product Management": { "$ref": "#/$defs/rate01" },
                "Design Thinking & UX": { "$ref": "#/$defs/rate01" },
                "Project Management": { "$ref": "#/$defs/rate01" },
                "Agile": { "$ref": "#/$defs/rate01" },
                "Facilitation & Workshops": { "$ref": "#/$defs/rate01" }
              }
            }
          }
        },
        "teamLandscape": {
          "type": "object",
          "additionalProperties": false,
          "required": ["sizeDistribution", "dormancy"],
          "properties": {
            "sizeDistribution": {
              "type": "object",
              "additionalProperties": false,
              "required": ["solo", "small_2_5", "medium_6_10", "large_11_plus"],
              "properties": {
                "solo": { "type": "integer", "minimum": 0 },
                "small_2_5": { "type": "integer", "minimum": 0 },
                "medium_6_10": { "type": "integer", "minimum": 0 },
                "large_11_plus": { "type": "integer", "minimum": 0 }
              }
            },
            "dormancy": {
              "type": "object",
              "additionalProperties": false,
              "required": ["inactive14d", "inactive30d", "inactive60d"],
              "properties": {
                "inactive14d": { "type": "integer", "minimum": 0 },
                "inactive30d": { "type": "integer", "minimum": 0 },
                "inactive60d": { "type": "integer", "minimum": 0 }
              }
            }
          }
        },
        "research": {
          "type": "object",
          "additionalProperties": false,
          "required": ["workflowCompletionRatio", "practiceIssueLinkDensity", "adaptationMaturityIndex", "teamExperimentationIndexAvg"],
          "properties": {
            "workflowCompletionRatio": { "$ref": "#/$defs/rate01" },
            "practiceIssueLinkDensity": { "type": "number", "minimum": 0 },
            "adaptationMaturityIndex": { "$ref": "#/$defs/rate01" },
            "teamExperimentationIndexAvg": { "$ref": "#/$defs/rate01" }
          }
        }
      }
    },
    "teams": {
      "type": "array",
      "items": { "$ref": "#/$defs/teamStats" }
    },
    "quality": {
      "type": "object",
      "additionalProperties": false,
      "required": ["metricFreshnessMinutes", "warnings", "dataCompleteness"],
      "properties": {
        "metricFreshnessMinutes": { "type": "integer", "minimum": 0 },
        "warnings": {
          "type": "array",
          "items": { "type": "string" }
        },
        "dataCompleteness": {
          "type": "object",
          "additionalProperties": false,
          "required": ["issuesWithoutLinkedPracticesPct", "teamsWithMissingActivityTimestampPct"],
          "properties": {
            "issuesWithoutLinkedPracticesPct": { "$ref": "#/$defs/rate01" },
            "teamsWithMissingActivityTimestampPct": { "$ref": "#/$defs/rate01" }
          }
        }
      }
    }
  },
  "$defs": {
    "window": {
      "type": "object",
      "additionalProperties": false,
      "required": ["from", "to", "label"],
      "properties": {
        "from": { "type": "string", "format": "date-time" },
        "to": { "type": "string", "format": "date-time" },
        "label": {
          "type": "string",
          "enum": [
            "last_7_days",
            "last_30_days",
            "last_90_days",
            "all_time",
            "custom"
          ]
        }
      }
    },
    "rate01": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "statusCounts": {
      "type": "object",
      "additionalProperties": false,
      "required": ["open", "in_progress", "adaptation_in_progress", "evaluated", "done"],
      "properties": {
        "open": { "type": "integer", "minimum": 0 },
        "in_progress": { "type": "integer", "minimum": 0 },
        "adaptation_in_progress": { "type": "integer", "minimum": 0 },
        "evaluated": { "type": "integer", "minimum": 0 },
        "done": { "type": "integer", "minimum": 0 }
      }
    },
    "adoptedPractice": {
      "type": "object",
      "additionalProperties": false,
      "required": ["practiceId", "title", "teamsUsing"],
      "properties": {
        "practiceId": { "type": "integer", "minimum": 1 },
        "title": { "type": "string", "minLength": 1 },
        "teamsUsing": { "type": "integer", "minimum": 0 }
      }
    },
    "teamStats": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "teamId",
        "teamName",
        "membersCount",
        "issuesCount",
        "issuesByStatus",
        "lastActivityAt",
        "practices",
        "collaboration",
        "research"
      ],
      "properties": {
        "teamId": { "type": "integer", "minimum": 1 },
        "teamName": { "type": "string", "minLength": 1 },
        "membersCount": { "type": "integer", "minimum": 0 },
        "issuesCount": { "type": "integer", "minimum": 0 },
        "issuesByStatus": { "$ref": "#/$defs/statusCounts" },
        "lastActivityAt": {
          "anyOf": [
            { "type": "string", "format": "date-time" },
            { "type": "null" }
          ]
        },
        "practices": {
          "type": "object",
          "additionalProperties": false,
          "required": ["count", "customPractice", "practiceEdited", "coverage"],
          "properties": {
            "count": { "type": "integer", "minimum": 0 },
            "customPractice": { "type": "integer", "minimum": 0 },
            "practiceEdited": { "type": "integer", "minimum": 0 },
            "coverage": {
              "type": "object",
              "additionalProperties": false,
              "required": ["coveredPillarsCount", "coveredCategoriesCount", "coveragePct", "pillars"],
              "properties": {
                "coveredPillarsCount": { "type": "integer", "minimum": 0 },
                "coveredCategoriesCount": { "type": "integer", "minimum": 0 },
                "coveragePct": { "$ref": "#/$defs/rate01" },
                "pillars": { "$ref": "#/$defs/teamCoveragePillars" }
              }
            }
          }
        },
        "collaboration": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "commentsPerIssueAvg",
            "issuesWithNoCommentsPct",
            "uniqueCommentersPerIssueAvg",
            "crossMemberParticipationPct"
          ],
          "properties": {
            "commentsPerIssueAvg": { "type": "number", "minimum": 0 },
            "issuesWithNoCommentsPct": { "$ref": "#/$defs/rate01" },
            "uniqueCommentersPerIssueAvg": { "type": "number", "minimum": 0 },
            "crossMemberParticipationPct": { "$ref": "#/$defs/rate01" }
          }
        },
        "research": {
          "type": "object",
          "additionalProperties": false,
          "required": ["teamExperimentationIndex"],
          "properties": {
            "teamExperimentationIndex": { "$ref": "#/$defs/rate01" }
          }
        }
      }
    },
    "teamCoveragePillars": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "Technical Quality & Engineering Excellence",
        "Team Culture & Psychology",
        "Process & Execution",
        "Product Value & Customer Alignment"
      ],
      "properties": {
        "Technical Quality & Engineering Excellence": { "$ref": "#/$defs/teamCoverageCategory1" },
        "Team Culture & Psychology": { "$ref": "#/$defs/teamCoverageCategory2" },
        "Process & Execution": { "$ref": "#/$defs/teamCoverageCategory3" },
        "Product Value & Customer Alignment": { "$ref": "#/$defs/teamCoverageCategory4" }
      }
    },
    "teamCoverageCategory1": {
      "type": "object",
      "additionalProperties": false,
      "required": ["practices", "subpillars"],
      "properties": {
        "practices": { "type": "integer", "minimum": 0 },
        "subpillars": {
          "type": "object",
          "additionalProperties": false,
          "required": ["1.1", "1.2", "1.3", "1.4"],
          "properties": {
            "1.1": { "$ref": "#/$defs/subpillar_1_1" },
            "1.2": { "$ref": "#/$defs/subpillar_1_2" },
            "1.3": { "$ref": "#/$defs/subpillar_1_3" },
            "1.4": { "$ref": "#/$defs/subpillar_1_4" }
          }
        }
      }
    },
    "teamCoverageCategory2": {
      "type": "object",
      "additionalProperties": false,
      "required": ["practices", "subpillars"],
      "properties": {
        "practices": { "type": "integer", "minimum": 0 },
        "subpillars": {
          "type": "object",
          "additionalProperties": false,
          "required": ["2.1", "2.2", "2.3", "2.4"],
          "properties": {
            "2.1": { "$ref": "#/$defs/subpillar_2_1" },
            "2.2": { "$ref": "#/$defs/subpillar_2_2" },
            "2.3": { "$ref": "#/$defs/subpillar_2_3" },
            "2.4": { "$ref": "#/$defs/subpillar_2_4" }
          }
        }
      }
    },
    "teamCoverageCategory3": {
      "type": "object",
      "additionalProperties": false,
      "required": ["practices", "subpillars"],
      "properties": {
        "practices": { "type": "integer", "minimum": 0 },
        "subpillars": {
          "type": "object",
          "additionalProperties": false,
          "required": ["3.1", "3.2", "3.3"],
          "properties": {
            "3.1": { "$ref": "#/$defs/subpillar_3_1" },
            "3.2": { "$ref": "#/$defs/subpillar_3_2" },
            "3.3": { "$ref": "#/$defs/subpillar_3_3" }
          }
        }
      }
    },
    "teamCoverageCategory4": {
      "type": "object",
      "additionalProperties": false,
      "required": ["practices", "subpillars"],
      "properties": {
        "practices": { "type": "integer", "minimum": 0 },
        "subpillars": {
          "type": "object",
          "additionalProperties": false,
          "required": ["4.1", "4.2"],
          "properties": {
            "4.1": { "$ref": "#/$defs/subpillar_4_1" },
            "4.2": { "$ref": "#/$defs/subpillar_4_2" }
          }
        }
      }
    },
    "subpillar_1_1": { "$ref": "#/$defs/subpillarNamedCount_CodeQualitySimpleDesign" },
    "subpillar_1_2": { "$ref": "#/$defs/subpillarNamedCount_AutomationContinuousIntegration" },
    "subpillar_1_3": { "$ref": "#/$defs/subpillarNamedCount_TechnicalDebtManagement" },
    "subpillar_1_4": { "$ref": "#/$defs/subpillarNamedCount_TechnicalCollectiveOwnership" },
    "subpillar_2_1": { "$ref": "#/$defs/subpillarNamedCount_PsychologicalSafetyCoreValues" },
    "subpillar_2_2": { "$ref": "#/$defs/subpillarNamedCount_SelfOrganizationAutonomy" },
    "subpillar_2_3": { "$ref": "#/$defs/subpillarNamedCount_CrossFunctionalitySharedSkills" },
    "subpillar_2_4": { "$ref": "#/$defs/subpillarNamedCount_SustainablePace" },
    "subpillar_3_1": { "$ref": "#/$defs/subpillarNamedCount_FlowDeliveryCadence" },
    "subpillar_3_2": { "$ref": "#/$defs/subpillarNamedCount_InspectionAdaptation" },
    "subpillar_3_3": { "$ref": "#/$defs/subpillarNamedCount_WorkTransparencySynchronization" },
    "subpillar_4_1": { "$ref": "#/$defs/subpillarNamedCount_CustomerInvolvementActiveFeedback" },
    "subpillar_4_2": { "$ref": "#/$defs/subpillarNamedCount_ValueDrivenPrioritization" },
    "subpillarNamedCount_CodeQualitySimpleDesign": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Code Quality & Simple Design" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_AutomationContinuousIntegration": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Automation & Continuous Integration" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_TechnicalDebtManagement": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Technical Debt Management" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_TechnicalCollectiveOwnership": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Technical Collective Ownership" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_PsychologicalSafetyCoreValues": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Psychological Safety & Core Values" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_SelfOrganizationAutonomy": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Self-Organization & Autonomy" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_CrossFunctionalitySharedSkills": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Cross-Functionality & Shared Skills" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_SustainablePace": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Sustainable Pace" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_FlowDeliveryCadence": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Flow & Delivery Cadence" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_InspectionAdaptation": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Inspection & Adaptation" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_WorkTransparencySynchronization": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Work Transparency & Synchronization" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_CustomerInvolvementActiveFeedback": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Customer Involvement & Active Feedback" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    },
    "subpillarNamedCount_ValueDrivenPrioritization": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "practices"],
      "properties": {
        "name": { "type": "string", "const": "Value-Driven Prioritization" },
        "practices": { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

## 6. Implementation Notes and Constraints

- Status keys are canonical and must always be present with zero-defaults:
  - `open`, `in_progress`, `adaptation_in_progress`, `evaluated`, `done`
- `teams` array may be empty but must exist.
- `lastActivityAt` is nullable and must be `null` when no activity exists.
- Method distribution keys are fixed and exhaustive by contract.
- No extra keys are allowed at any object level (`additionalProperties: false`).

## 7. Validation and Testing Guidance

Minimum contract tests to implement:
- Valid payload passes schema.
- Missing required top-level section fails.
- Unknown extra key at any level fails.
- Missing one status key in `byStatus` fails.
- Missing one method key in `methodDistribution` fails.
- Missing any coverage category object in `coverage.pillars` fails.
- Missing any required subpillar object in a category fails.
- Invalid subpillar name constant for a given subpillar id fails.
- `coveragePct` or rate-like fields outside `[0,1]` fail.
- `lastActivityAt` accepts only RFC3339 date-time or `null`.

## 8. Versioning Guidance

- Current contract version: `1.0.0`
- Backward-compatible additions:
  - Add optional fields only.
- Breaking changes:
  - Rename/remove fields, change required sets, or alter semantics.
  - Must bump major version and publish migration notes.
