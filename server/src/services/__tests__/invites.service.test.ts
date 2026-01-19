process.env.JWT_SECRET = 'test_secret_for_unit_tests_12345678901234567890'

import { createInvite } from '../invites.service'
import { prisma } from '../../lib/prisma'
import * as mailer from '../../lib/mailer'

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    team: { findUnique: jest.fn() },
    teamMember: { findUnique: jest.fn(), create: jest.fn() },
    teamInvite: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    event: { create: jest.fn() },
    $transaction: jest.fn()
  }
}))

jest.mock('../../lib/mailer', () => ({
  sendInviteEmail: jest.fn(),
  sendAddedToTeamEmail: jest.fn()
}))

describe('Invites Service', () => {
  const teamId = 10
  const invitedBy = 5
  const email = 'invitee@example.com'
  const team = { id: teamId, name: 'Alpha Team' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates pending invite for new user and sends email', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.team.findUnique as jest.Mock).mockResolvedValue(team)
    ;(prisma.teamInvite.findUnique as jest.Mock).mockResolvedValue(null)

    const createdInvite = {
      id: 1,
      teamId,
      email,
      status: 'Pending',
      invitedBy,
      invitedUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: null,
      errorMessage: null
    }

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        teamInvite: { create: jest.fn().mockResolvedValue(createdInvite) },
        event: { create: jest.fn().mockResolvedValue({}) }
      })
    })

    const updatedInvite = { ...createdInvite, lastSentAt: new Date() }
    ;(prisma.teamInvite.update as jest.Mock).mockResolvedValue(updatedInvite)
    ;(mailer.sendInviteEmail as jest.Mock).mockResolvedValue(undefined)

    const result = await createInvite(teamId, email, invitedBy)

    expect(result.status).toBe('Pending')
    expect(mailer.sendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email, teamName: team.name })
    )
  })

  it('adds existing user to team and sends added email', async () => {
    const existingUser = { id: 42, email }
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)
    ;(prisma.team.findUnique as jest.Mock).mockResolvedValue(team)
    ;(prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null)

    const createdInvite = {
      id: 2,
      teamId,
      email,
      status: 'Added',
      invitedBy,
      invitedUserId: existingUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: null,
      errorMessage: null
    }

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        teamInvite: { create: jest.fn().mockResolvedValue(createdInvite) },
        teamMember: { create: jest.fn().mockResolvedValue({ id: 99 }) },
        event: { create: jest.fn().mockResolvedValue({}) }
      })
    })

    const updatedInvite = { ...createdInvite, lastSentAt: new Date() }
    ;(prisma.teamInvite.update as jest.Mock).mockResolvedValue(updatedInvite)
    ;(mailer.sendAddedToTeamEmail as jest.Mock).mockResolvedValue(undefined)

    const result = await createInvite(teamId, email, invitedBy)

    expect(result.status).toBe('Added')
    expect(mailer.sendAddedToTeamEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email, teamName: team.name })
    )
  })

  it('throws already_team_member when user is already on team', async () => {
    const existingUser = { id: 42, email }
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)
    ;(prisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ id: 7 })

    await expect(createInvite(teamId, email, invitedBy)).rejects.toMatchObject({
      code: 'already_team_member',
      statusCode: 409
    })

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('marks invite as Failed and logs event when email send fails', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.team.findUnique as jest.Mock).mockResolvedValue(team)
    ;(prisma.teamInvite.findUnique as jest.Mock).mockResolvedValue(null)

    const createdInvite = {
      id: 3,
      teamId,
      email,
      status: 'Pending',
      invitedBy,
      invitedUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: null,
      errorMessage: null
    }

    // First transaction creates the invite
    let transactionCallCount = 0
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      transactionCallCount++
      if (transactionCallCount === 1) {
        // First transaction: create invite
        return callback({
          teamInvite: { create: jest.fn().mockResolvedValue(createdInvite) },
          event: { create: jest.fn().mockResolvedValue({}) }
        })
      } else {
        // Second transaction: update to Failed and log error event
        const failedInvite = { ...createdInvite, status: 'Failed', errorMessage: 'SMTP error' }
        return callback({
          teamInvite: { update: jest.fn().mockResolvedValue(failedInvite) },
          event: { create: jest.fn().mockResolvedValue({}) }
        })
      }
    })

    ;(mailer.sendInviteEmail as jest.Mock).mockRejectedValue(new Error('SMTP error'))

    const result = await createInvite(teamId, email, invitedBy)

    expect(result.status).toBe('Failed')
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
  })
})
