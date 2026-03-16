import { prisma } from '../lib/prisma';
import * as coverageRepository from '../repositories/coverage.repository';
import type { TeamPracticeWithPillars } from '../repositories/coverage.repository';
import { buildExhaustiveCoverageMap } from './coverage.service';
import {
  buildIssueFlowRates,
  createEmptyIssueStatusCounts,
  meanDurationHours,
  normalizeIssueStatusCounts,
} from './issue.service';
import type {
  AdminStatsResponse,
  AdminStatsWindowInput,
  AdminUsersResponse,
  AdminUserListItem,
  MethodDistribution,
  TeamStats,
} from '../types/admin-stats.types';

const METHOD_KEYS = [
  'Scrum',
  'Kanban',
  'XP',
  'Lean',
  'Scaled Agile',
  'Product Management',
  'Design Thinking & UX',
  'Project Management',
  'Agile',
  'Facilitation & Workshops',
] as const;

const ISSUE_MATURITY_WEIGHTS = {
  open: 0,
  in_progress: 0.25,
  adaptation_in_progress: 0.5,
  evaluated: 0.75,
  done: 1,
} as const;

const roundTo2 = (value: number): number => Number(value.toFixed(2));

const safeRate = (numerator: number, denominator: number): number => {
  if (denominator <= 0) {
    return 0;
  }
  return roundTo2(numerator / denominator);
};

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return roundTo2((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle];
};

const getLatestDate = (current: Date | null, candidate?: Date | null): Date | null => {
  if (!candidate) {
    return current;
  }
  if (!current) {
    return candidate;
  }
  return candidate > current ? candidate : current;
};

const buildDefaultMethodDistribution = (): MethodDistribution => ({
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
});

const windowWhere = (window: AdminStatsWindowInput) => ({
  gte: window.from,
  lte: window.to,
});

const isWithinWindow = (value: Date, window: AdminStatsWindowInput): boolean =>
  value >= window.from && value <= window.to;

const computeAdaptationMaturityIndex = (issuesByStatus: ReturnType<typeof createEmptyIssueStatusCounts>): number => {
  const totalIssues = Object.values(issuesByStatus).reduce((sum, value) => sum + value, 0);
  if (totalIssues === 0) {
    return 0;
  }

  const weightedTotal =
    issuesByStatus.open * ISSUE_MATURITY_WEIGHTS.open +
    issuesByStatus.in_progress * ISSUE_MATURITY_WEIGHTS.in_progress +
    issuesByStatus.adaptation_in_progress * ISSUE_MATURITY_WEIGHTS.adaptation_in_progress +
    issuesByStatus.evaluated * ISSUE_MATURITY_WEIGHTS.evaluated +
    issuesByStatus.done * ISSUE_MATURITY_WEIGHTS.done;

  return roundTo2(weightedTotal / totalIssues);
};

export const resolveAdminStatsAllTimeFrom = async (): Promise<Date> => {
  const [team, user, issue, comment, teamPractice, event] = await Promise.all([
    prisma.team.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.issue.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.comment.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.teamPractice.findFirst({ orderBy: { addedAt: 'asc' }, select: { addedAt: true } }),
    prisma.event.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
  ]);

  const candidates = [
    team?.createdAt,
    user?.createdAt,
    issue?.createdAt,
    comment?.createdAt,
    teamPractice?.addedAt,
    event?.createdAt,
  ].filter((value): value is Date => Boolean(value));

  if (candidates.length === 0) {
    return new Date('1970-01-01T00:00:00.000Z');
  }

  return candidates.reduce((min, candidate) => (candidate < min ? candidate : min));
};

export const getGlobalPlatformStats = async (window: AdminStatsWindowInput): Promise<AdminStatsResponse> => {
  const [
    users,
    teams,
    issues,
    teamPracticeLinks,
    commentsTotal,
    eventsTotal,
    issuePracticeLinks,
    globalStatusRows,
    teamRows,
    teamStatusRows,
    issueActivityRows,
    eventActivityRows,
    windowEvents,
    windowIssuesCreated,
    staleOpenIssues,
    staleInProgressIssues,
    issueRows,
    teamPracticeRows,
    allPillars,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.issue.count(),
    prisma.teamPractice.count(),
    prisma.comment.count(),
    prisma.event.count(),
    prisma.issuePractice.count(),
    prisma.issue.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            teamMembers: true,
            teamPractices: true,
            issues: true,
          },
        },
      },
    }),
    prisma.issue.groupBy({
      by: ['teamId', 'status'],
      _count: { _all: true },
    }),
    prisma.issue.groupBy({
      by: ['teamId'],
      _max: { updatedAt: true },
    }),
    prisma.event.groupBy({
      by: ['teamId'],
      where: {
        teamId: {
          not: null,
        },
      },
      _max: { createdAt: true },
    }),
    prisma.event.findMany({
      where: {
        teamId: {
          not: null,
        },
        createdAt: windowWhere(window),
      },
      select: {
        teamId: true,
        actorId: true,
        eventType: true,
      },
    }),
    prisma.issue.count({
      where: {
        createdAt: windowWhere(window),
      },
    }),
    prisma.issue.count({
      where: {
        status: 'OPEN',
        createdAt: {
          lt: new Date(window.to.getTime() - 14 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.issue.count({
      where: {
        status: 'IN_DISCUSSION',
        createdAt: {
          lt: new Date(window.to.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.issue.findMany({
      select: {
        id: true,
        teamId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        decisionRecordedAt: true,
        evaluationRecordedAt: true,
        comments: {
          select: {
            authorId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.teamPractice.findMany({
      select: {
        teamId: true,
        practiceId: true,
        practice: {
          select: {
            id: true,
            title: true,
            method: true,
            practicePillars: {
              select: {
                pillar: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    coverageRepository.findAllPillars(),
  ]);

  const teamStatusMap = new Map<number, Array<{ status: string; _count: { _all: number } }>>();
  teamStatusRows.forEach((row) => {
    const existing = teamStatusMap.get(row.teamId) ?? [];
    existing.push({ status: row.status, _count: { _all: row._count._all } });
    teamStatusMap.set(row.teamId, existing);
  });

  const activityMap = new Map<number, Date | null>();
  issueActivityRows.forEach((row) => {
    const current = activityMap.get(row.teamId) ?? null;
    activityMap.set(row.teamId, getLatestDate(current, row._max.updatedAt));
  });

  eventActivityRows.forEach((row) => {
    if (!row.teamId) {
      return;
    }

    const current = activityMap.get(row.teamId) ?? null;
    activityMap.set(row.teamId, getLatestDate(current, row._max.createdAt));
  });

  const activeUsers = new Set<number>();
  const activeTeamsInWindow = new Set<number>();
  let customPractice = 0;
  let practiceEdited = 0;

  const teamWindowPracticeEvents = new Map<number, { customPractice: number; practiceEdited: number }>();

  windowEvents.forEach((event) => {
    if (event.actorId) {
      activeUsers.add(event.actorId);
    }

    if (event.teamId) {
      activeTeamsInWindow.add(event.teamId);
    }

    if (event.eventType === 'practice.created') {
      customPractice += 1;
      if (event.teamId) {
        const counters = teamWindowPracticeEvents.get(event.teamId) ?? { customPractice: 0, practiceEdited: 0 };
        counters.customPractice += 1;
        teamWindowPracticeEvents.set(event.teamId, counters);
      }
    }

    if (event.eventType === 'practice.edited') {
      practiceEdited += 1;
      if (event.teamId) {
        const counters = teamWindowPracticeEvents.get(event.teamId) ?? { customPractice: 0, practiceEdited: 0 };
        counters.practiceEdited += 1;
        teamWindowPracticeEvents.set(event.teamId, counters);
      }
    }
  });

  const issueDurationsToFirstCommentMs: number[] = [];
  const issueDurationsToDecisionMs: number[] = [];
  const issueDurationsToEvaluationMs: number[] = [];

  const teamIssuesMap = new Map<number, typeof issueRows>();
  const issuesInWindow = issueRows.filter((issue) => isWithinWindow(issue.createdAt, window));

  issueRows.forEach((issue) => {
    const bucket = teamIssuesMap.get(issue.teamId) ?? [];
    bucket.push(issue);
    teamIssuesMap.set(issue.teamId, bucket);

    if (!isWithinWindow(issue.createdAt, window)) {
      return;
    }

    const firstCommentAt = issue.comments[0]?.createdAt;
    if (firstCommentAt) {
      issueDurationsToFirstCommentMs.push(firstCommentAt.getTime() - issue.createdAt.getTime());
    }

    if (issue.decisionRecordedAt) {
      issueDurationsToDecisionMs.push(issue.decisionRecordedAt.getTime() - issue.createdAt.getTime());
    }

    if (issue.evaluationRecordedAt) {
      issueDurationsToEvaluationMs.push(issue.evaluationRecordedAt.getTime() - issue.createdAt.getTime());
    }
  });

  const practicesPerTeamMap = new Map<number, typeof teamPracticeRows>();
  teamPracticeRows.forEach((row) => {
    const bucket = practicesPerTeamMap.get(row.teamId) ?? [];
    bucket.push(row);
    practicesPerTeamMap.set(row.teamId, bucket);
  });

  const methodTotals: MethodDistribution = buildDefaultMethodDistribution();
  teamPracticeRows.forEach((row) => {
    const method = row.practice.method?.trim() as keyof MethodDistribution | undefined;
    if (method && METHOD_KEYS.includes(method)) {
      methodTotals[method] += 1;
    }
  });

  const methodDistribution: MethodDistribution = buildDefaultMethodDistribution();
  METHOD_KEYS.forEach((method) => {
    methodDistribution[method] = safeRate(methodTotals[method], Math.max(teamPracticeLinks, 1));
  });

  const topPracticeUsage = await prisma.teamPractice.groupBy({
    by: ['practiceId'],
    _count: { practiceId: true },
    orderBy: { _count: { practiceId: 'desc' } },
    take: 5,
  });

  const topPracticeIds = topPracticeUsage.map((item) => item.practiceId);
  const topPracticeTitles = await prisma.practice.findMany({
    where: { id: { in: topPracticeIds } },
    select: { id: true, title: true },
  });
  const titleMap = new Map(topPracticeTitles.map((practice) => [practice.id, practice.title]));

  const teamPracticeCounts = teamRows.map((team) => team._count.teamPractices);

  const sizeDistribution = {
    solo: 0,
    small_2_5: 0,
    medium_6_10: 0,
    large_11_plus: 0,
  };

  teamRows.forEach((team) => {
    const members = team._count.teamMembers;
    if (members <= 1) {
      sizeDistribution.solo += 1;
      return;
    }
    if (members <= 5) {
      sizeDistribution.small_2_5 += 1;
      return;
    }
    if (members <= 10) {
      sizeDistribution.medium_6_10 += 1;
      return;
    }
    sizeDistribution.large_11_plus += 1;
  });

  const dormancy = {
    inactive14d: 0,
    inactive30d: 0,
    inactive60d: 0,
  };

  teamRows.forEach((team) => {
    const lastActivity = activityMap.get(team.id);
    if (!lastActivity) {
      dormancy.inactive14d += 1;
      dormancy.inactive30d += 1;
      dormancy.inactive60d += 1;
      return;
    }

    const ageMs = window.to.getTime() - lastActivity.getTime();
    if (ageMs >= 14 * 24 * 60 * 60 * 1000) {
      dormancy.inactive14d += 1;
    }
    if (ageMs >= 30 * 24 * 60 * 60 * 1000) {
      dormancy.inactive30d += 1;
    }
    if (ageMs >= 60 * 24 * 60 * 60 * 1000) {
      dormancy.inactive60d += 1;
    }
  });

  const teamStats: TeamStats[] = await Promise.all(
    teamRows.map(async (team) => {
      const teamStatuses = teamStatusMap.get(team.id)
        ? normalizeIssueStatusCounts(teamStatusMap.get(team.id)!, { teamId: team.id })
        : createEmptyIssueStatusCounts();

      const teamPracticesWithPillars = (practicesPerTeamMap.get(team.id) ?? []) as TeamPracticeWithPillars[];
      const coverage = buildExhaustiveCoverageMap(teamPracticesWithPillars, allPillars);

      const issuesForTeam = teamIssuesMap.get(team.id) ?? [];
      const commentsCount = issuesForTeam.reduce((sum, issue) => sum + issue.comments.length, 0);
      const issuesWithoutComments = issuesForTeam.filter((issue) => issue.comments.length === 0).length;
      const uniqueCommentersPerIssue = issuesForTeam.map((issue) => new Set(issue.comments.map((comment) => comment.authorId)).size);
      const teamMemberCount = team._count.teamMembers;
      const crossMemberParticipationValues = uniqueCommentersPerIssue.map((count) => safeRate(count, Math.max(teamMemberCount, 1)));

      const windowPracticeCounters = teamWindowPracticeEvents.get(team.id) ?? {
        customPractice: 0,
        practiceEdited: 0,
      };

      const issuesForTeamInWindow = issuesForTeam.filter((issue) => isWithinWindow(issue.createdAt, window));
      const issuesCreatedInWindow = issuesForTeamInWindow.length;
      const decisionsRecordedInWindow = issuesForTeam.filter(
        (issue) => issue.decisionRecordedAt && isWithinWindow(issue.decisionRecordedAt, window)
      ).length;
      const experimentationDenominator =
        windowPracticeCounters.customPractice +
        windowPracticeCounters.practiceEdited +
        issuesCreatedInWindow +
        decisionsRecordedInWindow;

      const experimentationIndex = roundTo2(
        Math.min(
          1,
          safeRate(
            windowPracticeCounters.customPractice * 0.4 +
              windowPracticeCounters.practiceEdited * 0.2 +
              issuesCreatedInWindow * 0.3 +
              decisionsRecordedInWindow * 0.1,
            Math.max(experimentationDenominator, 1)
          )
        )
      );

      return {
        teamId: team.id,
        teamName: team.name,
        membersCount: team._count.teamMembers,
        issuesCount: team._count.issues,
        issuesByStatus: teamStatuses,
        lastActivityAt: activityMap.get(team.id)?.toISOString() ?? null,
        practices: {
          count: team._count.teamPractices,
          customPractice: windowPracticeCounters.customPractice,
          practiceEdited: windowPracticeCounters.practiceEdited,
          coverage,
        },
        collaboration: {
          commentsPerIssueAvg: safeRate(commentsCount, Math.max(issuesForTeam.length, 1)),
          issuesWithNoCommentsPct: safeRate(issuesWithoutComments, Math.max(issuesForTeam.length, 1)),
          uniqueCommentersPerIssueAvg: roundTo2(
            uniqueCommentersPerIssue.length === 0
              ? 0
              : uniqueCommentersPerIssue.reduce((sum, value) => sum + value, 0) / uniqueCommentersPerIssue.length
          ),
          crossMemberParticipationPct: roundTo2(
            crossMemberParticipationValues.length === 0
              ? 0
              : crossMemberParticipationValues.reduce((sum, value) => sum + value, 0) / crossMemberParticipationValues.length
          ),
        },
        research: {
          teamExperimentationIndex: experimentationIndex,
        },
      };
    })
  );

  const globalByStatus = normalizeIssueStatusCounts(globalStatusRows, { scope: 'global' });

  const missingActivityTeams = teamRows.filter((team) => !activityMap.get(team.id)).length;
  const issuesWithoutLinkedPractices = await prisma.issue.count({
    where: {
      createdAt: windowWhere(window),
      linkedPractices: {
        none: {},
      },
    },
  });

  const teamExperimentationIndexAvg = roundTo2(
    teamStats.length === 0
      ? 0
      : teamStats.reduce((sum, team) => sum + team.research.teamExperimentationIndex, 0) / teamStats.length
  );

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      window: {
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        label: window.label,
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
        registeredUsers: users,
        activeUsers: activeUsers.size,
        teamsTotal: teams,
        activeTeams: activeTeamsInWindow.size,
        issuesTotal: issues,
        teamPracticesTotal: teamPracticeLinks,
        commentsTotal,
        eventsTotal,
      },
      issues: {
        createdInWindow: windowIssuesCreated,
        byStatus: globalByStatus,
        flow: buildIssueFlowRates(globalByStatus),
        durationsHours: {
          meanTimeToFirstComment: meanDurationHours(issueDurationsToFirstCommentMs),
          meanTimeToDecision: meanDurationHours(issueDurationsToDecisionMs),
          meanTimeToEvaluation: meanDurationHours(issueDurationsToEvaluationMs),
        },
        backlogHealth: {
          openOlderThan14d: staleOpenIssues,
          inProgressOlderThan30d: staleInProgressIssues,
        },
      },
      practices: {
        avgPracticesPerTeam: safeRate(teamPracticeLinks, Math.max(teams, 1)),
        medianPracticesPerTeam: median(teamPracticeCounts),
        customPractice,
        practiceEdited,
        topAdoptedPractices: topPracticeUsage.map((item) => ({
          practiceId: item.practiceId,
          title: titleMap.get(item.practiceId) ?? `Practice ${item.practiceId}`,
          teamsUsing: item._count.practiceId,
        })),
        methodDistribution,
      },
      teamLandscape: {
        sizeDistribution,
        dormancy,
      },
      research: {
        workflowCompletionRatio: safeRate(globalByStatus.done, Math.max(issues, 1)),
        practiceIssueLinkDensity: roundTo2(issuePracticeLinks / Math.max(issues, 1)),
        adaptationMaturityIndex: computeAdaptationMaturityIndex(globalByStatus),
        teamExperimentationIndexAvg,
      },
    },
    teams: teamStats,
    quality: {
      metricFreshnessMinutes: 0,
      warnings: [],
      dataCompleteness: {
        issuesWithoutLinkedPracticesPct: safeRate(issuesWithoutLinkedPractices, Math.max(issuesInWindow.length, 1)),
        teamsWithMissingActivityTimestampPct: safeRate(missingActivityTeams, Math.max(teams, 1)),
      },
    },
  };
};

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : email;
};

export const getAdminUsers = async (): Promise<AdminUsersResponse> => {
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      select: {
        name: true,
        email: true,
        bigFiveScore: {
          select: {
            id: true,
          },
        },
        teamMembers: {
          select: {
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        email: 'asc',
      },
    }),
    prisma.teamInvite.findMany({
      where: {
        invitedUserId: null,
      },
      select: {
        email: true,
        team: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const accountUsers: AdminUserListItem[] = users.map((user) => ({
    name: user.name,
    email: user.email,
    teams: [...new Set(user.teamMembers.map((member) => member.team.name))].sort((a, b) =>
      a.localeCompare(b)
    ),
    status: 'account_created',
    BFIcompleted: Boolean(user.bigFiveScore),
  }));

  const accountEmails = new Set(users.map((user) => user.email.toLowerCase()));
  const inviteTeamsByEmail = new Map<string, Set<string>>();

  invites.forEach((invite) => {
    const normalizedEmail = invite.email.toLowerCase();
    if (accountEmails.has(normalizedEmail)) {
      return;
    }

    const teams = inviteTeamsByEmail.get(normalizedEmail) ?? new Set<string>();
    teams.add(invite.team.name);
    inviteTeamsByEmail.set(normalizedEmail, teams);
  });

  const invitedUsers: AdminUserListItem[] = [...inviteTeamsByEmail.entries()]
    .map(([normalizedEmail, teams]) => ({
      name: deriveNameFromEmail(normalizedEmail),
      email: normalizedEmail,
      teams: [...teams].sort((a, b) => a.localeCompare(b)),
      status: 'invited' as const,
      BFIcompleted: false,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));

  return {
    users: [...accountUsers, ...invitedUsers],
  };
};
