import type { NormalizedIssueStatusCounts } from '../services/issue.service';

export type WindowLabel = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'all_time' | 'custom';

export type AdminStatsWindow = {
  from: string;
  to: string;
  label: WindowLabel;
};

export type MethodDistribution = {
  Scrum: number;
  Kanban: number;
  XP: number;
  Lean: number;
  'Scaled Agile': number;
  'Product Management': number;
  'Design Thinking & UX': number;
  'Project Management': number;
  Agile: number;
  'Facilitation & Workshops': number;
};

export type CoverageSubpillar = {
  name: string;
  practices: number;
};

export type CoverageCategory = {
  practices: number;
  subpillars: Record<string, CoverageSubpillar>;
};

export type TeamCoveragePillars = {
  'Technical Quality & Engineering Excellence': CoverageCategory;
  'Team Culture & Psychology': CoverageCategory;
  'Process & Execution': CoverageCategory;
  'Product Value & Customer Alignment': CoverageCategory;
};

export type TeamCoverage = {
  coveredPillarsCount: number;
  coveredCategoriesCount: number;
  coveragePct: number;
  pillars: TeamCoveragePillars;
};

export type TeamStats = {
  teamId: number;
  teamName: string;
  membersCount: number;
  issuesCount: number;
  issuesByStatus: NormalizedIssueStatusCounts;
  lastActivityAt: string | null;
  practices: {
    count: number;
    customPractice: number;
    practiceEdited: number;
    coverage: TeamCoverage;
  };
  collaboration: {
    commentsPerIssueAvg: number;
    issuesWithNoCommentsPct: number;
    uniqueCommentersPerIssueAvg: number;
    crossMemberParticipationPct: number;
  };
  research: {
    teamExperimentationIndex: number;
  };
};

export type AdminStatsResponse = {
  meta: {
    generatedAt: string;
    window: AdminStatsWindow;
    aggregationLevel: 'platform';
    privacy: {
      containsPII: false;
      granularity: 'aggregated_only';
    };
    version: '1.0.0';
  };
  platform: {
    overview: {
      registeredUsers: number;
      activeUsers: number;
      teamsTotal: number;
      activeTeams: number;
      issuesTotal: number;
      teamPracticesTotal: number;
      commentsTotal: number;
      eventsTotal: number;
    };
    issues: {
      createdInWindow: number;
      byStatus: NormalizedIssueStatusCounts;
      flow: {
        open_to_in_progress_rate: number;
        in_progress_to_adaptation_in_progress_rate: number;
        adaptation_in_progress_to_evaluated_rate: number;
        evaluated_to_done_rate: number;
      };
      durationsHours: {
        meanTimeToFirstComment: number;
        meanTimeToDecision: number;
        meanTimeToEvaluation: number;
      };
      backlogHealth: {
        openOlderThan14d: number;
        inProgressOlderThan30d: number;
      };
    };
    practices: {
      avgPracticesPerTeam: number;
      medianPracticesPerTeam: number;
      customPractice: number;
      practiceEdited: number;
      topAdoptedPractices: Array<{
        practiceId: number;
        title: string;
        teamsUsing: number;
      }>;
      methodDistribution: MethodDistribution;
    };
    teamLandscape: {
      sizeDistribution: {
        solo: number;
        small_2_5: number;
        medium_6_10: number;
        large_11_plus: number;
      };
      dormancy: {
        inactive14d: number;
        inactive30d: number;
        inactive60d: number;
      };
    };
    research: {
      workflowCompletionRatio: number;
      practiceIssueLinkDensity: number;
      adaptationMaturityIndex: number;
      teamExperimentationIndexAvg: number;
    };
  };
  teams: TeamStats[];
  quality: {
    metricFreshnessMinutes: number;
    warnings: string[];
    dataCompleteness: {
      issuesWithoutLinkedPracticesPct: number;
      teamsWithMissingActivityTimestampPct: number;
    };
  };
};

export type AdminStatsWindowInput = {
  from: Date;
  to: Date;
  label: WindowLabel;
};

export type AdminUserListItem = {
  name: string;
  email: string;
  teams: string[];
  status: 'invited' | 'account_created';
  BFIcompleted: boolean;
};

export type AdminUsersResponse = {
  users: AdminUserListItem[];
};
