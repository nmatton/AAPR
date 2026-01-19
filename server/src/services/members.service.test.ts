process.env.JWT_SECRET = 'test_secret_for_members_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AppError } from './auth.service'
import * as membersRepository from '../repositories/members.repository'
import { prisma } from '../lib/prisma'
import { getTeamMembers, removeMember } from './members.service'

jest.mock('../repositories/members.repository')
jest.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn()
  }
}))

describe('members.service', () => {
  const teamId = 7
  const userId = 42

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds membership list with members and pending invites', async () => {
    const members: membersRepository.TeamMemberWithUser[] = [
      {
        id: 1,
        teamId,
        userId,
        role: 'member',
        joinedAt: new Date('2026-01-15T10:00:00.000Z'),
        user: {
          id: userId,
          name: 'Alex Member',
          email: 'alex@example.com'
        }
      }
    ]

    const invites = [
      {
        id: 10,
        teamId,
        email: 'invitee@example.com',
        status: 'Pending',
        invitedUserId: null,
        createdAt: new Date('2026-01-16T10:00:00.000Z'),
        updatedAt: new Date('2026-01-16T10:00:00.000Z'),
        invitedBy: 1,
        lastSentAt: null,
        errorMessage: null
      }
    ]

    const listTeamMembers = membersRepository.listTeamMembers as jest.MockedFunction<typeof membersRepository.listTeamMembers>
    const listTeamInvites = membersRepository.listTeamInvites as jest.MockedFunction<typeof membersRepository.listTeamInvites>

    listTeamMembers.mockResolvedValue(members)
    listTeamInvites.mockResolvedValue(invites)

    const result = await getTeamMembers(teamId)

    expect(result).toHaveLength(2)
    expect(result).toEqual([
      {
        id: userId,
        name: 'Alex Member',
        email: 'alex@example.com',
        joinDate: '2026-01-15T10:00:00.000Z',
        inviteStatus: 'Added',
        bigFiveCompleted: false
      },
      {
        id: 10,
        name: 'invitee@example.com',
        email: 'invitee@example.com',
        joinDate: '2026-01-16T10:00:00.000Z',
        inviteStatus: 'Pending',
        bigFiveCompleted: false
      }
    ])
  })

  it('prevents removing the last team member', async () => {
    const findTeamMember = membersRepository.findTeamMember as jest.MockedFunction<typeof membersRepository.findTeamMember>
    const countTeamMembers = membersRepository.countTeamMembers as jest.MockedFunction<typeof membersRepository.countTeamMembers>

    findTeamMember.mockResolvedValue({
      id: 2,
      teamId,
      userId,
      role: 'member',
      joinedAt: new Date(),
      user: { id: userId, name: 'Sam', email: 'sam@example.com' }
    })
    countTeamMembers.mockResolvedValue(1)

    await expect(removeMember(teamId, userId, 1)).rejects.toThrow(AppError)
    await expect(removeMember(teamId, userId, 1)).rejects.toMatchObject({
      code: 'last_member_removal_forbidden'
    })
  })

  it('prevents self-removal from team', async () => {
    const findTeamMember = membersRepository.findTeamMember as jest.MockedFunction<typeof membersRepository.findTeamMember>

    findTeamMember.mockResolvedValue({
      id: 2,
      teamId,
      userId,
      role: 'member',
      joinedAt: new Date(),
      user: { id: userId, name: 'Sam', email: 'sam@example.com' }
    })

    // User tries to remove themselves (userId === removedBy)
    await expect(removeMember(teamId, userId, userId)).rejects.toThrow(AppError)
    await expect(removeMember(teamId, userId, userId)).rejects.toMatchObject({
      code: 'self_removal_forbidden'
    })
  })

  it('removes member and logs event in a transaction', async () => {
    const findTeamMember = membersRepository.findTeamMember as jest.MockedFunction<typeof membersRepository.findTeamMember>
    const countTeamMembers = membersRepository.countTeamMembers as jest.MockedFunction<typeof membersRepository.countTeamMembers>
    const deleteTeamMember = membersRepository.deleteTeamMember as jest.MockedFunction<typeof membersRepository.deleteTeamMember>
    const transaction = prisma.$transaction as unknown as jest.Mock

    const tx = {
      event: {
        create: jest.fn()
      }
    }

    findTeamMember.mockResolvedValue({
      id: 2,
      teamId,
      userId,
      role: 'member',
      joinedAt: new Date(),
      user: { id: userId, name: 'Sam', email: 'sam@example.com' }
    })
    countTeamMembers.mockResolvedValue(2)
    deleteTeamMember.mockResolvedValue({
      id: 2,
      teamId,
      userId,
      role: 'member',
      joinedAt: new Date()
    })

    transaction.mockImplementation((callback: any) => {
      return callback(tx)
    })

    await removeMember(teamId, userId, 99)

    expect(transaction).toHaveBeenCalledTimes(1)
    expect(deleteTeamMember).toHaveBeenCalledWith(teamId, userId, expect.anything())
    expect(tx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'team_member.removed',
          teamId,
          entityId: userId,
          action: 'removed',
          payload: expect.objectContaining({
            teamId,
            userId,
            removedBy: 99
          })
        })
      })
    )
  })
})
