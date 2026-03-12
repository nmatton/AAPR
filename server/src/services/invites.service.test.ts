process.env.JWT_SECRET = 'test_secret_for_invites_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import * as invitesRepository from '../repositories/invites.repository'
import * as mailer from '../lib/mailer'
import { prisma } from '../lib/prisma'
import { resendInvite } from './invites.service'

jest.mock('../repositories/invites.repository')
jest.mock('../lib/mailer', () => ({
  sendInviteEmail: jest.fn(),
  sendAddedToTeamEmail: jest.fn()
}))

jest.mock('../lib/prisma', () => ({
  prisma: {
    team: {
      findUnique: jest.fn()
    },
    event: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

describe('invites.service resendInvite', () => {
  const teamId = 1
  const inviteId = 33
  const invitedBy = 7

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates lastSentAt and status from Failed to Pending', async () => {
    ; (invitesRepository.findInviteById as jest.MockedFunction<typeof invitesRepository.findInviteById>).mockResolvedValue({
      id: inviteId,
      teamId,
      email: 'pending@example.com',
      status: 'Failed',
      invitedBy,
      invitedUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: null,
      errorMessage: 'smtp error'
    })

      ; (prisma.team.findUnique as jest.MockedFunction<typeof prisma.team.findUnique>).mockResolvedValue({
        id: teamId,
        name: 'Team One',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      })
      ; (mailer.sendInviteEmail as jest.MockedFunction<typeof mailer.sendInviteEmail>).mockResolvedValue(undefined)
      ; (invitesRepository.updateInvite as jest.MockedFunction<typeof invitesRepository.updateInvite>).mockResolvedValue({
        id: inviteId,
        teamId,
        email: 'pending@example.com',
        status: 'Pending',
        invitedBy,
        invitedUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSentAt: new Date(),
        errorMessage: null
      })

    await resendInvite(teamId, inviteId, invitedBy)

    expect(invitesRepository.updateInvite).toHaveBeenCalledWith(
      inviteId,
      teamId,
      expect.objectContaining({
        status: 'Pending',
        lastSentAt: expect.any(Date),
        errorMessage: null
      })
    )
  })
})

describe('invites.service cancelInvite', () => {
  const teamId = 1
  const inviteId = 33
  const canceledBy = 7

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('cancels a pending invite successfully', async () => {
    ;(invitesRepository.findInviteById as jest.MockedFunction<typeof invitesRepository.findInviteById>).mockResolvedValue({
      id: inviteId,
      teamId,
      email: 'pending@example.com',
      status: 'Pending',
      invitedBy: 1,
      invitedUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: new Date(),
      errorMessage: null
    })
    ;(invitesRepository.deleteInvite as jest.MockedFunction<typeof invitesRepository.deleteInvite>).mockResolvedValue({
      id: inviteId,
      teamId,
      email: 'pending@example.com',
      status: 'Pending',
      invitedBy: 1,
      invitedUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: new Date(),
      errorMessage: null
    })
    ;(prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>).mockImplementation(async (cb: any) => {
      return cb(prisma)
    })
    ;(prisma.event.create as jest.MockedFunction<typeof prisma.event.create>).mockResolvedValue({} as any)

    const { cancelInvite } = require('./invites.service')
    await cancelInvite(teamId, inviteId, canceledBy)

    expect(invitesRepository.deleteInvite).toHaveBeenCalledWith(inviteId, prisma)
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'invite.cancelled',
          entityType: 'team_invite',
          entityId: inviteId,
          action: 'cancelled',
          teamId,
          actorId: canceledBy,
          payload: expect.objectContaining({
            timestamp: expect.any(String)
          })
        })
      })
    )
  })

  it('throws error if invite is already Added', async () => {
    ;(invitesRepository.findInviteById as jest.MockedFunction<typeof invitesRepository.findInviteById>).mockResolvedValue({
      id: inviteId,
      teamId,
      email: 'added@example.com',
      status: 'Added',
      invitedBy: 1,
      invitedUserId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: new Date(),
      errorMessage: null
    })

    const { cancelInvite } = require('./invites.service')
    await expect(cancelInvite(teamId, inviteId, canceledBy)).rejects.toThrow('Cannot cancel an accepted invitation')
  })
})
