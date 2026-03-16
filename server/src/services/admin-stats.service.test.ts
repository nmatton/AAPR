process.env.JWT_SECRET = 'test_secret_for_admin_stats_service_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { getAdminUsers, getGlobalPlatformStats } from './admin-stats.service'
import { prisma } from '../lib/prisma'

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: { count: jest.fn(), findMany: jest.fn() },
    team: { count: jest.fn(), findMany: jest.fn() },
    teamInvite: { findMany: jest.fn() },
    issue: { count: jest.fn(), groupBy: jest.fn() },
    teamPractice: { count: jest.fn() },
    event: { groupBy: jest.fn() },
  },
}))

describe('admin-stats.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns global and per-team usage stats with normalized status keys', async () => {
    ;(prisma.user.count as jest.Mock<any>).mockResolvedValue(8)
    ;(prisma.team.count as jest.Mock<any>).mockResolvedValue(2)
    ;(prisma.issue.count as jest.Mock<any>).mockResolvedValue(3)
    ;(prisma.teamPractice.count as jest.Mock<any>).mockResolvedValue(6)

    ;(prisma.team.findMany as jest.Mock<any>).mockResolvedValue([
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
    ])

    ;(prisma.issue.groupBy as jest.Mock<any>)
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
      ])

    ;(prisma.event.groupBy as jest.Mock<any>).mockResolvedValue([
      { teamId: 1, _max: { createdAt: new Date('2026-03-12T10:00:00.000Z') } },
    ])

    const result = await getGlobalPlatformStats()

    expect(result.totals).toEqual({
      users: 8,
      teams: 2,
      issues: 3,
      teamPracticeLinks: 6,
    })

    expect(result.issuesByStatus).toEqual({
      open: 1,
      in_progress: 1,
      adaptation_in_progress: 1,
      evaluated: 0,
      done: 0,
    })

    expect(result.teams).toEqual([
      {
        teamId: 1,
        teamName: 'Alpha Team',
        membersCount: 4,
        practicesCount: 3,
        issuesCount: 2,
        issuesByStatus: {
          open: 1,
          in_progress: 0,
          adaptation_in_progress: 0,
          evaluated: 0,
          done: 1,
        },
        lastActivityAt: '2026-03-12T10:00:00.000Z',
      },
      {
        teamId: 2,
        teamName: 'Beta Team',
        membersCount: 2,
        practicesCount: 3,
        issuesCount: 1,
        issuesByStatus: {
          open: 0,
          in_progress: 0,
          adaptation_in_progress: 1,
          evaluated: 0,
          done: 0,
        },
        lastActivityAt: null,
      },
    ])
  })

  it('throws when unsupported statuses are returned by aggregation query', async () => {
    ;(prisma.user.count as jest.Mock<any>).mockResolvedValue(1)
    ;(prisma.team.count as jest.Mock<any>).mockResolvedValue(1)
    ;(prisma.issue.count as jest.Mock<any>).mockResolvedValue(1)
    ;(prisma.teamPractice.count as jest.Mock<any>).mockResolvedValue(1)

    ;(prisma.issue.groupBy as jest.Mock<any>)
      .mockResolvedValueOnce([{ status: 'INVALID_STATUS', _count: { _all: 1 } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    ;(prisma.team.findMany as jest.Mock<any>).mockResolvedValue([])
    ;(prisma.event.groupBy as jest.Mock<any>).mockResolvedValue([])

    await expect(getGlobalPlatformStats()).rejects.toThrow('Unsupported issue status in stats aggregation')
  })

  it('returns account_created and invited users with team aggregation', async () => {
    ;(prisma.user.findMany as jest.Mock<any>).mockResolvedValue([
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
    ])

    ;(prisma.teamInvite.findMany as jest.Mock<any>).mockResolvedValue([
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
    ])

    const result = await getAdminUsers()

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
    })
  })
})
