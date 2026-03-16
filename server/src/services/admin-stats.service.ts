import { prisma } from '../lib/prisma';
import { normalizeIssueStatusCounts, createEmptyIssueStatusCounts, NormalizedIssueStatusCounts } from './issue.service';

type TeamStatusRow = {
  teamId: number;
  status: string;
  _count: {
    _all: number;
  };
};

type TeamActivityRow = {
  teamId: number;
  _max: {
    updatedAt?: Date | null;
    createdAt?: Date | null;
  };
};

export type GlobalPlatformStats = {
  generatedAt: string;
  totals: {
    users: number;
    teams: number;
    issues: number;
    teamPracticeLinks: number;
  };
  issuesByStatus: NormalizedIssueStatusCounts;
  teams: Array<{
    teamId: number;
    teamName: string;
    membersCount: number;
    practicesCount: number;
    issuesCount: number;
    issuesByStatus: NormalizedIssueStatusCounts;
    lastActivityAt: string | null;
  }>;
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

export const getGlobalPlatformStats = async (): Promise<GlobalPlatformStats> => {
  const [
    users,
    teams,
    issues,
    teamPracticeLinks,
    globalStatusRows,
    teamRows,
    teamStatusRows,
    issueActivityRows,
    eventActivityRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.issue.count(),
    prisma.teamPractice.count(),
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
  ]);

  const teamStatusMap = new Map<number, TeamStatusRow[]>();
  teamStatusRows.forEach((row) => {
    const existing = teamStatusMap.get(row.teamId) ?? [];
    existing.push(row as TeamStatusRow);
    teamStatusMap.set(row.teamId, existing);
  });

  const activityMap = new Map<number, Date | null>();
  (issueActivityRows as TeamActivityRow[]).forEach((row) => {
    const current = activityMap.get(row.teamId) ?? null;
    activityMap.set(row.teamId, getLatestDate(current, row._max.updatedAt));
  });

  (eventActivityRows as TeamActivityRow[]).forEach((row) => {
    const teamId = row.teamId;
    if (!teamId) {
      return;
    }

    const current = activityMap.get(teamId) ?? null;
    activityMap.set(teamId, getLatestDate(current, row._max.createdAt));
  });

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users,
      teams,
      issues,
      teamPracticeLinks,
    },
    issuesByStatus: normalizeIssueStatusCounts(globalStatusRows, { scope: 'global' }),
    teams: teamRows.map((team) => {
      const normalizedTeamStatuses = teamStatusMap.get(team.id)
        ? normalizeIssueStatusCounts(teamStatusMap.get(team.id)!, { teamId: team.id })
        : createEmptyIssueStatusCounts();

      return {
        teamId: team.id,
        teamName: team.name,
        membersCount: team._count.teamMembers,
        practicesCount: team._count.teamPractices,
        issuesCount: team._count.issues,
        issuesByStatus: normalizedTeamStatuses,
        lastActivityAt: activityMap.get(team.id)?.toISOString() ?? null,
      };
    }),
  };
};