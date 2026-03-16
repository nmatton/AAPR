export const adminStatsResponseSchema = {
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
} as const;
