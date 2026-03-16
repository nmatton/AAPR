// @ts-nocheck
process.env.JWT_SECRET = 'test_secret_for_admin_stats_service_12345678901234567890';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getAdminUsers, getGlobalPlatformStats } from './admin-stats.service';
import { prisma } from '../lib/prisma';
import type { AdminStatsWindowInput } from '../types/admin-stats.types';

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: { count: jest.fn(), findMany: jest.fn() },
    team: { count: jest.fn(), findMany: jest.fn() },
    teamInvite: { findMany: jest.fn() },
    issue: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    teamPractice: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    event: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    comment: { count: jest.fn() },
    issuePractice: { count: jest.fn() },
    practice: { findMany: jest.fn() },
  },
}));

jest.mock('../repositories/coverage.repository', () => ({
  findAllPillars: jest.fn(),
  findTeamPracticesWithPillars: jest.fn(),
}));

const coverageRepository = jest.requireMock('../repositories/coverage.repository') as {
  findAllPillars: jest.Mock;
  findTeamPracticesWithPillars: jest.Mock;
};

const windowInput: AdminStatsWindowInput = {
  from: new Date('2026-03-01T00:00:00.000Z'),
  to: new Date('2026-03-31T23:59:59.999Z'),
  label: 'last_30_days',
};

const allPillarsFixture = [
  { id: 11, name: 'Code Quality & Simple Design', categoryId: 'c1', category: { name: 'Technical Quality & Engineering Excellence' } },
  { id: 12, name: 'Automation & Continuous Integration', categoryId: 'c1', category: { name: 'Technical Quality & Engineering Excellence' } },
  { id: 13, name: 'Technical Debt Management', categoryId: 'c1', category: { name: 'Technical Quality & Engineering Excellence' } },
  { id: 14, name: 'Technical Collective Ownership', categoryId: 'c1', category: { name: 'Technical Quality & Engineering Excellence' } },
  { id: 21, name: 'Psychological Safety & Core Values', categoryId: 'c2', category: { name: 'Team Culture & Psychology' } },
  { id: 22, name: 'Self-Organization & Autonomy', categoryId: 'c2', category: { name: 'Team Culture & Psychology' } },
  { id: 23, name: 'Cross-Functionality & Shared Skills', categoryId: 'c2', category: { name: 'Team Culture & Psychology' } },
  { id: 24, name: 'Sustainable Pace', categoryId: 'c2', category: { name: 'Team Culture & Psychology' } },
  { id: 31, name: 'Flow & Delivery Cadence', categoryId: 'c3', category: { name: 'Process & Execution' } },
  { id: 32, name: 'Inspection & Adaptation', categoryId: 'c3', category: { name: 'Process & Execution' } },
  { id: 33, name: 'Work Transparency & Synchronization', categoryId: 'c3', category: { name: 'Process & Execution' } },
  { id: 41, name: 'Customer Involvement & Active Feedback', categoryId: 'c4', category: { name: 'Product Value & Customer Alignment' } },
  { id: 42, name: 'Value-Driven Prioritization', categoryId: 'c4', category: { name: 'Product Value & Customer Alignment' } },
];

describe('admin-stats.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.user.count as jest.Mock).mockResolvedValue(8);
    (prisma.team.count as jest.Mock).mockResolvedValue(2);
    (prisma.issue.count as jest.Mock)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    (prisma.teamPractice.count as jest.Mock).mockResolvedValue(6);
    (prisma.comment.count as jest.Mock).mockResolvedValue(4);
    (prisma.event.count as jest.Mock).mockResolvedValue(5);
    (prisma.issuePractice.count as jest.Mock).mockResolvedValue(3);

    (prisma.issue.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { status: 'OPEN', _count: { _all: 1 } },
        { status: 'IN_DISCUSSION', _count: { _all: 1 } },
        { status: 'ADAPTATION_IN_PROGRESS', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { teamId: 1, status: 'OPEN', _count: { _all: 1 } },
        { teamId: 1, status: 'RESOLVED', _count: { _all: 1 } },
        { teamId: 2, status: 'ADAPTATION_IN_PROGRESS', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { teamId: 1, _max: { updatedAt: new Date('2026-03-10T10:00:00.000Z') } },
      ]);

    (prisma.event.groupBy as jest.Mock).mockResolvedValue([
      { teamId: 1, _max: { createdAt: new Date('2026-03-12T10:00:00.000Z') } },
    ]);

    (prisma.team.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Alpha Team',
        _count: {
          teamMembers: 4,
          teamPractices: 3,
          issues: 2,
        },
      },
      {
        id: 2,
        name: 'Beta Team',
        _count: {
          teamMembers: 2,
          teamPractices: 3,
          issues: 1,
        },
      },
    ]);

    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      { teamId: 1, actorId: 101, eventType: 'practice.created' },
      { teamId: 1, actorId: 102, eventType: 'practice.edited' },
      { teamId: 2, actorId: 103, eventType: 'issue.created' },
    ]);

    (prisma.issue.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        status: 'OPEN',
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-02T10:00:00.000Z'),
        decisionRecordedAt: new Date('2026-03-03T10:00:00.000Z'),
        evaluationRecordedAt: new Date('2026-03-04T10:00:00.000Z'),
        comments: [{ authorId: 11, createdAt: new Date('2026-03-01T16:00:00.000Z') }],
      },
      {
        id: 2,
        teamId: 1,
        status: 'RESOLVED',
        createdAt: new Date('2026-03-06T10:00:00.000Z'),
        updatedAt: new Date('2026-03-07T10:00:00.000Z'),
        decisionRecordedAt: null,
        evaluationRecordedAt: null,
        comments: [],
      },
      {
        id: 3,
        teamId: 2,
        status: 'ADAPTATION_IN_PROGRESS',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T10:00:00.000Z'),
        decisionRecordedAt: null,
        evaluationRecordedAt: null,
        comments: [{ authorId: 21, createdAt: new Date('2026-03-09T12:00:00.000Z') }],
      },
    ]);

    (prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      {
        teamId: 1,
        practiceId: 1,
        practice: {
          id: 1,
          title: 'Daily Standup',
          method: 'Scrum',
          practicePillars: [{ pillar: { id: 11 } }, { pillar: { id: 31 } }],
        },
      },
      {
        teamId: 1,
        practiceId: 2,
        practice: {
          id: 2,
          title: 'Retro',
          method: 'Scrum',
          practicePillars: [{ pillar: { id: 21 } }, { pillar: { id: 31 } }],
        },
      },
      {
        teamId: 2,
        practiceId: 3,
        practice: {
          id: 3,
          title: 'Board',
          method: 'Kanban',
          practicePillars: [],
        },
      },
    ]);

    (prisma.teamPractice.groupBy as jest.Mock).mockResolvedValue([
      { practiceId: 1, _count: { practiceId: 2 } },
      { practiceId: 3, _count: { practiceId: 1 } },
    ]);

    (prisma.practice.findMany as jest.Mock).mockResolvedValue([
      { id: 1, title: 'Daily Standup' },
      { id: 3, title: 'Board' },
    ]);

    coverageRepository.findAllPillars.mockResolvedValue(allPillarsFixture);
    coverageRepository.findTeamPracticesWithPillars.mockResolvedValue([]);
  });

  it('returns full contract sections and canonical status keys', async () => {
    const result = await getGlobalPlatformStats(windowInput);

    expect(result.meta.window.label).toBe('last_30_days');
    expect(result.platform.overview.registeredUsers).toBe(8);
    expect(result.platform.issues.byStatus).toEqual({
      open: 1,
      in_progress: 1,
      adaptation_in_progress: 1,
      evaluated: 0,
      done: 0,
    });
    expect(result.platform.practices.methodDistribution).toEqual(
      expect.objectContaining({
        Scrum: expect.any(Number),
        Kanban: expect.any(Number),
        XP: 0,
      })
    );
    expect(result.teams).toHaveLength(2);
    expect(result.platform.research.adaptationMaturityIndex).toBeCloseTo(0.25, 2);
    expect(result.teams[0].research.teamExperimentationIndex).toBeCloseTo(0.26, 2);
    expect(result.teams[0].practices.coverage.pillars).toEqual(
      expect.objectContaining({
        'Technical Quality & Engineering Excellence': expect.any(Object),
        'Team Culture & Psychology': expect.any(Object),
        'Process & Execution': expect.any(Object),
        'Product Value & Customer Alignment': expect.any(Object),
      })
    );
    expect(result).toHaveProperty('quality');
  });

  it('throws when unsupported statuses are returned by aggregation query', async () => {
    (prisma.issue.groupBy as jest.Mock).mockReset();
    (prisma.issue.groupBy as jest.Mock)
      .mockResolvedValueOnce([{ status: 'UNKNOWN_STATUS', _count: { _all: 1 } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(getGlobalPlatformStats(windowInput)).rejects.toThrow(
      'Unsupported issue status in stats aggregation'
    );
  });

  it('keeps durations and quality metrics scoped to the requested window', async () => {
    (prisma.issue.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        teamId: 1,
        status: 'OPEN',
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-02T10:00:00.000Z'),
        decisionRecordedAt: new Date('2026-03-03T10:00:00.000Z'),
        evaluationRecordedAt: new Date('2026-03-04T10:00:00.000Z'),
        comments: [{ authorId: 11, createdAt: new Date('2026-03-01T16:00:00.000Z') }],
      },
      {
        id: 2,
        teamId: 2,
        status: 'ADAPTATION_IN_PROGRESS',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T10:00:00.000Z'),
        decisionRecordedAt: null,
        evaluationRecordedAt: null,
        comments: [{ authorId: 21, createdAt: new Date('2026-03-09T12:00:00.000Z') }],
      },
      {
        id: 99,
        teamId: 1,
        status: 'RESOLVED',
        createdAt: new Date('2025-12-01T10:00:00.000Z'),
        updatedAt: new Date('2025-12-02T10:00:00.000Z'),
        decisionRecordedAt: new Date('2025-12-20T10:00:00.000Z'),
        evaluationRecordedAt: new Date('2025-12-25T10:00:00.000Z'),
        comments: [{ authorId: 99, createdAt: new Date('2025-12-10T10:00:00.000Z') }],
      },
    ]);

    (prisma.issue.count as jest.Mock).mockImplementation((args?: any) => {
      if (args?.where?.linkedPractices?.none && args?.where?.createdAt) {
        return Promise.resolve(1);
      }

      if (args?.where?.createdAt) {
        return Promise.resolve(2);
      }

      if (args?.where?.status === 'OPEN') {
        return Promise.resolve(1);
      }

      if (args?.where?.status === 'IN_DISCUSSION') {
        return Promise.resolve(1);
      }

      return Promise.resolve(3);
    });

    const result = await getGlobalPlatformStats(windowInput);

    expect(result.platform.issues.durationsHours.meanTimeToFirstComment).toBe(16);
    expect(result.platform.issues.durationsHours.meanTimeToDecision).toBe(48);
    expect(result.platform.issues.durationsHours.meanTimeToEvaluation).toBe(72);
    expect(result.quality.dataCompleteness.issuesWithoutLinkedPracticesPct).toBe(0.5);
    expect(result.teams[0].research.teamExperimentationIndex).toBeCloseTo(0.25, 2);
  });

  it('returns account_created and invited users with team aggregation', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Alice',
        email: 'alice@example.com',
        bigFiveScore: { id: 10 },
        teamMembers: [{ team: { name: 'Team Atlas' } }, { team: { name: 'Team Beta' } }],
      },
      {
        name: 'Bob',
        email: 'bob@example.com',
        bigFiveScore: null,
        teamMembers: [],
      },
    ]);

    (prisma.teamInvite.findMany as jest.Mock).mockResolvedValue([
      {
        email: 'invitee@example.com',
        team: { name: 'Team Atlas' },
      },
      {
        email: 'invitee@example.com',
        team: { name: 'Team Gamma' },
      },
      {
        email: 'alice@example.com',
        team: { name: 'Team Delta' },
      },
    ]);

    const result = await getAdminUsers();

    expect(result).toEqual({
      users: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          teams: ['Team Atlas', 'Team Beta'],
          status: 'account_created',
          BFIcompleted: true,
        },
        {
          name: 'Bob',
          email: 'bob@example.com',
          teams: [],
          status: 'account_created',
          BFIcompleted: false,
        },
        {
          name: 'invitee',
          email: 'invitee@example.com',
          teams: ['Team Atlas', 'Team Gamma'],
          status: 'invited',
          BFIcompleted: false,
        },
      ],
    });
  });
});
