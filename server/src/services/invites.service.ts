import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import * as invitesRepository from '../repositories/invites.repository'
import { sendAddedToTeamEmail, sendInviteEmail } from '../lib/mailer'
import type { TeamInvite } from '@prisma/client'

export type InviteStatus = 'Pending' | 'Added' | 'Failed'

const getAppBaseUrl = (): string => {
  return process.env.APP_BASE_URL || 'http://localhost:5173'
}

const getTeamName = async (teamId: number): Promise<string> => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true }
  })

  if (!team) {
    throw new AppError('team_not_found', 'Team not found', { teamId }, 404)
  }

  return team.name
}

const assertInviteStatus = (status: string): InviteStatus => {
  if (status === 'Pending' || status === 'Added' || status === 'Failed') {
    return status
  }

  throw new AppError('invalid_invite_status', 'Invalid invite status', { status }, 500)
}

const updateInviteAfterEmail = async (
  inviteId: number,
  teamId: number,
  data: { status?: InviteStatus; errorMessage?: string | null; lastSentAt?: Date }
): Promise<TeamInvite> => {
  const updateData: {
    status?: InviteStatus
    errorMessage?: string | null
    lastSentAt?: Date
  } = {}

  if (data.status !== undefined) {
    updateData.status = data.status
  }

  if (Object.prototype.hasOwnProperty.call(data, 'errorMessage')) {
    updateData.errorMessage = data.errorMessage ?? null
  }

  if (data.lastSentAt !== undefined) {
    updateData.lastSentAt = data.lastSentAt
  }

  return invitesRepository.updateInvite(inviteId, teamId, updateData)
}

/**
 * Create a new team invite or add existing user to team immediately
 * 
 * Business Logic:
 * - If user exists and is already a member: throw 409 error (idempotent)
 * - If user exists and not a member: add to team immediately with status "Added"
 * - If user doesn't exist: create pending invite with status "Pending"
 * 
 * @param teamId - Team identifier
 * @param email - Email address to invite
 * @param invitedBy - User ID of the inviter (for audit trail)
 * @returns Created or updated TeamInvite record
 * @throws AppError with code 'team_not_found' if team doesn't exist (404)
 * @throws AppError with code 'already_team_member' if user is already a member (409)
 */
export const createInvite = async (
  teamId: number,
  email: string,
  invitedBy: number
): Promise<TeamInvite> => {
  const teamName = await getTeamName(teamId)
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: existingUser.id } }
    })

    if (existingMember) {
      throw new AppError(
        'already_team_member',
        'User is already a team member',
        { teamId, userId: existingUser.id },
        409
      )
    }

    const invite = await prisma.$transaction(async (tx) => {
      const createdInvite = await invitesRepository.createInvite(
        {
          teamId,
          email,
          status: 'Added',
          invitedBy,
          invitedUserId: existingUser.id
        },
        tx
      )

      await tx.teamMember.create({
        data: {
          teamId,
          userId: existingUser.id,
          role: 'member'
        }
      })

      await tx.event.create({
        data: {
          eventType: 'team_member.added',
          actorId: invitedBy,
          teamId,
          entityType: 'team_member',
          entityId: existingUser.id,
          action: 'added',
          payload: {
            teamId,
            userId: existingUser.id
          },
          schemaVersion: 'v1'
        }
      })

      return createdInvite
    })

    try {
      await sendAddedToTeamEmail({
        email,
        teamName,
        ctaUrl: `${getAppBaseUrl()}/teams/${teamId}`
      })

      return await updateInviteAfterEmail(invite.id, teamId, { lastSentAt: new Date() })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email send failed'
      
      // CRITICAL: Update invite status and log failure event in transaction
      const failedInvite = await prisma.$transaction(async (tx) => {
        const updated = await invitesRepository.updateInvite(
          invite.id,
          teamId,
          {
            status: 'Failed',
            errorMessage,
            lastSentAt: new Date()
          },
          tx
        )

        await tx.event.create({
          data: {
            eventType: 'invite.email_failed',
            actorId: invitedBy,
            teamId,
            entityType: 'team_invite',
            entityId: invite.id,
            action: 'failed',
            payload: {
              inviteId: invite.id,
              teamId,
              error: errorMessage
            },
            schemaVersion: 'v1'
          }
        })

        return updated
      })

      return failedInvite
    }
  }

  const existingInvite = await invitesRepository.findInviteByTeamAndEmail(teamId, email)
  if (existingInvite) {
    return existingInvite
  }

  const invite = await prisma.$transaction(async (tx) => {
    const createdInvite = await invitesRepository.createInvite(
      {
        teamId,
        email,
        status: 'Pending',
        invitedBy
      },
      tx
    )

    await tx.event.create({
      data: {
        eventType: 'invite.created',
        actorId: invitedBy,
        teamId,
        entityType: 'team_invite',
        entityId: createdInvite.id,
        action: 'created',
        payload: {
          inviteId: createdInvite.id,
          teamId,
          email,
          isNewUser: true
        },
        schemaVersion: 'v1'
      }
    })

    return createdInvite
  })

  try {
    await sendInviteEmail({
      email,
      teamName,
      ctaUrl: `${getAppBaseUrl()}/register?email=${encodeURIComponent(email)}`
    })

    return await updateInviteAfterEmail(invite.id, teamId, { lastSentAt: new Date() })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Email send failed'
    
    // CRITICAL: Update invite status and log failure event in transaction
    const failedInvite = await prisma.$transaction(async (tx) => {
      const updated = await invitesRepository.updateInvite(
        invite.id,
        teamId,
        {
          status: 'Failed' as InviteStatus,
          errorMessage,
          lastSentAt: new Date()
        },
        tx
      )

      await tx.event.create({
        data: {
          eventType: 'invite.email_failed',
          actorId: invitedBy,
          teamId,
          entityType: 'team_invite',
          entityId: invite.id,
          action: 'failed',
          payload: {
            inviteId: invite.id,
            teamId,
            error: errorMessage
          },
          schemaVersion: 'v1'
        }
      })

      return updated
    })

    return failedInvite
  }
}

/**
 * List all invites for a team (Pending, Added, Failed)
 * 
 * @param teamId - Team identifier
 * @returns Array of TeamInvite records ordered by creation date (newest first)
 */
export const listInvites = async (teamId: number): Promise<TeamInvite[]> => {
  return invitesRepository.listInvitesByTeam(teamId)
}

/**
 * Resend invite email (for Pending or Failed invites)
 * 
 * @param teamId - Team identifier
 * @param inviteId - Invite identifier
 * @param invitedBy - User ID requesting the resend (for audit trail)
 * @returns Updated TeamInvite record
 * @throws AppError with code 'invite_not_found' if invite doesn't exist (404)
 * @throws AppError with code 'team_not_found' if team doesn't exist (404)
 */
export const resendInvite = async (
  teamId: number,
  inviteId: number,
  invitedBy: number
): Promise<TeamInvite> => {
  const invite = await invitesRepository.findInviteById(teamId, inviteId)
  if (!invite) {
    throw new AppError('invite_not_found', 'Invite not found', { inviteId }, 404)
  }

  const teamName = await getTeamName(teamId)
  const currentStatus = assertInviteStatus(invite.status)

  try {
    if (currentStatus === 'Added') {
      await sendAddedToTeamEmail({
        email: invite.email,
        teamName,
        ctaUrl: `${getAppBaseUrl()}/teams/${teamId}`
      })
    } else {
      await sendInviteEmail({
        email: invite.email,
        teamName,
        ctaUrl: `${getAppBaseUrl()}/register?email=${encodeURIComponent(invite.email)}`
      })
    }

    return await updateInviteAfterEmail(invite.id, teamId, {
      status: currentStatus === 'Failed' ? ('Pending' as InviteStatus) : currentStatus,
      errorMessage: null,
      lastSentAt: new Date()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Email send failed'
    
    // CRITICAL: Update invite status and log failure event in transaction
    const failedInvite = await prisma.$transaction(async (tx) => {
      const updated = await invitesRepository.updateInvite(
        invite.id,
        teamId,
        {
          status: 'Failed' as InviteStatus,
          errorMessage,
          lastSentAt: new Date()
        },
        tx
      )

      await tx.event.create({
        data: {
          eventType: 'invite.email_failed',
          actorId: invitedBy,
          teamId,
          entityType: 'team_invite',
          entityId: invite.id,
          action: 'failed',
          payload: {
            inviteId: invite.id,
            teamId,
            error: errorMessage
          },
          schemaVersion: 'v1'
        }
      })

      return updated
    })

    return failedInvite
  }
}

/**
 * Auto-resolve pending invites when a user signs up with matching email
 * Called during user registration transaction
 * 
 * @param userId - Newly created user ID
 * @param email - User's email address
 * @param tx - Prisma transaction client
 */
export const autoResolveInvitesOnSignup = async (
  userId: number,
  email: string,
  tx: invitesRepository.PrismaClientLike
): Promise<void> => {
  const pendingInvites = await tx.teamInvite.findMany({
    where: {
      email,
      status: 'Pending' as InviteStatus
    }
  })

  for (const invite of pendingInvites) {
    await tx.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId,
        role: 'member'
      }
    })

    await tx.teamInvite.update({
      where: { id: invite.id },
      data: {
        status: 'Added' as InviteStatus,
        invitedUserId: userId
      }
    })

    await tx.event.create({
      data: {
        eventType: 'invite.auto_resolved',
        actorId: userId,
        teamId: invite.teamId,
        entityType: 'team_invite',
        entityId: invite.id,
        action: 'resolved',
        payload: {
          inviteId: invite.id,
          userId
        },
        schemaVersion: 'v1'
      }
    })
  }
}
