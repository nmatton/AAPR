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
    ;(invitesRepository.findInviteById as jest.MockedFunction<typeof invitesRepository.findInviteById>).mockResolvedValue({
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

    ;(prisma.team.findUnique as jest.MockedFunction<typeof prisma.team.findUnique>).mockResolvedValue({
      id: teamId,
      name: 'Team One',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    ;(mailer.sendInviteEmail as jest.MockedFunction<typeof mailer.sendInviteEmail>).mockResolvedValue(undefined)
    ;(invitesRepository.updateInvite as jest.MockedFunction<typeof invitesRepository.updateInvite>).mockResolvedValue({
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
