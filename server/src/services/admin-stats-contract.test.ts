import { describe, expect, it } from '@jest/globals';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { adminStatsResponseSchema } from '../schemas/admin-stats-response.schema';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(adminStatsResponseSchema);

const validPayload = {
  meta: {
    generatedAt: '2026-03-16T12:00:00.000Z',
    window: {
      from: '2026-02-15T00:00:00.000Z',
      to: '2026-03-16T23:59:59.999Z',
      label: 'last_30_days',
    },
    aggregationLevel: 'platform',
    privacy: {
      containsPII: false,
      granularity: 'aggregated_only',
    },
    version: '1.0.0',
  },
  platform: {
    overview: {
      registeredUsers: 1,
      activeUsers: 1,
      teamsTotal: 1,
      activeTeams: 1,
      issuesTotal: 1,
      teamPracticesTotal: 1,
      commentsTotal: 1,
      eventsTotal: 1,
    },
    issues: {
      createdInWindow: 1,
      byStatus: {
        open: 1,
        in_progress: 0,
        adaptation_in_progress: 0,
        evaluated: 0,
        done: 0,
      },
      flow: {
        open_to_in_progress_rate: 0,
        in_progress_to_adaptation_in_progress_rate: 0,
        adaptation_in_progress_to_evaluated_rate: 0,
        evaluated_to_done_rate: 0,
      },
      durationsHours: {
        meanTimeToFirstComment: 0,
        meanTimeToDecision: 0,
        meanTimeToEvaluation: 0,
      },
      backlogHealth: {
        openOlderThan14d: 0,
        inProgressOlderThan30d: 0,
      },
    },
    practices: {
      avgPracticesPerTeam: 1,
      medianPracticesPerTeam: 1,
      customPractice: 0,
      practiceEdited: 0,
      topAdoptedPractices: [{ practiceId: 1, title: 'P', teamsUsing: 1 }],
      methodDistribution: {
        Scrum: 0,
        Kanban: 0,
        XP: 0,
        Lean: 0,
        'Scaled Agile': 0,
        'Product Management': 0,
        'Design Thinking & UX': 0,
        'Project Management': 0,
        Agile: 0,
        'Facilitation & Workshops': 0,
      },
    },
    teamLandscape: {
      sizeDistribution: {
        solo: 0,
        small_2_5: 1,
        medium_6_10: 0,
        large_11_plus: 0,
      },
      dormancy: {
        inactive14d: 0,
        inactive30d: 0,
        inactive60d: 0,
      },
    },
    research: {
      workflowCompletionRatio: 0,
      practiceIssueLinkDensity: 0,
      adaptationMaturityIndex: 0,
      teamExperimentationIndexAvg: 0,
    },
  },
  teams: [
    {
      teamId: 1,
      teamName: 'Team Atlas',
      membersCount: 3,
      issuesCount: 1,
      issuesByStatus: {
        open: 1,
        in_progress: 0,
        adaptation_in_progress: 0,
        evaluated: 0,
        done: 0,
      },
      lastActivityAt: null,
      practices: {
        count: 1,
        customPractice: 0,
        practiceEdited: 0,
        coverage: {
          coveredPillarsCount: 0,
          coveredCategoriesCount: 0,
          coveragePct: 0,
          pillars: {
            'Technical Quality & Engineering Excellence': {
              practices: 0,
              subpillars: {
                '1.1': { name: 'Code Quality & Simple Design', practices: 0 },
                '1.2': { name: 'Automation & Continuous Integration', practices: 0 },
                '1.3': { name: 'Technical Debt Management', practices: 0 },
                '1.4': { name: 'Technical Collective Ownership', practices: 0 },
              },
            },
            'Team Culture & Psychology': {
              practices: 0,
              subpillars: {
                '2.1': { name: 'Psychological Safety & Core Values', practices: 0 },
                '2.2': { name: 'Self-Organization & Autonomy', practices: 0 },
                '2.3': { name: 'Cross-Functionality & Shared Skills', practices: 0 },
                '2.4': { name: 'Sustainable Pace', practices: 0 },
              },
            },
            'Process & Execution': {
              practices: 0,
              subpillars: {
                '3.1': { name: 'Flow & Delivery Cadence', practices: 0 },
                '3.2': { name: 'Inspection & Adaptation', practices: 0 },
                '3.3': { name: 'Work Transparency & Synchronization', practices: 0 },
              },
            },
            'Product Value & Customer Alignment': {
              practices: 0,
              subpillars: {
                '4.1': { name: 'Customer Involvement & Active Feedback', practices: 0 },
                '4.2': { name: 'Value-Driven Prioritization', practices: 0 },
              },
            },
          },
        },
      },
      collaboration: {
        commentsPerIssueAvg: 0,
        issuesWithNoCommentsPct: 0,
        uniqueCommentersPerIssueAvg: 0,
        crossMemberParticipationPct: 0,
      },
      research: {
        teamExperimentationIndex: 0,
      },
    },
  ],
  quality: {
    metricFreshnessMinutes: 0,
    warnings: [],
    dataCompleteness: {
      issuesWithoutLinkedPracticesPct: 0,
      teamsWithMissingActivityTimestampPct: 0,
    },
  },
};

describe('admin-stats contract schema', () => {
  it('accepts a valid payload', () => {
    const isValid = validate(validPayload);
    expect(isValid).toBe(true);
  });

  it('rejects missing required top-level section', () => {
    const payload = { ...validPayload } as Record<string, unknown>;
    delete payload.quality;

    const isValid = validate(payload);
    expect(isValid).toBe(false);
  });

  it('rejects extra unknown top-level key', () => {
    const payload = { ...validPayload, extra: true };

    const isValid = validate(payload);
    expect(isValid).toBe(false);
  });

  it('rejects missing status key in byStatus', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.platform.issues.byStatus.done;

    const isValid = validate(payload);
    expect(isValid).toBe(false);
  });

  it('rejects missing method key in methodDistribution', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.platform.practices.methodDistribution.Scrum;

    const isValid = validate(payload);
    expect(isValid).toBe(false);
  });

  it('rejects missing coverage category and out-of-range rate', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.teams[0].practices.coverage.pillars['Team Culture & Psychology'];
    payload.teams[0].collaboration.issuesWithNoCommentsPct = 1.5;

    const isValid = validate(payload);
    expect(isValid).toBe(false);
  });
});
