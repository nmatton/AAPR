import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import * as membersRepository from '../repositories/members.repository'
import type { InviteStatus } from './invites.service'

export interface MembershipListItem {
  id: number
  name: string
  email: string
  joinDate: string
  inviteStatus: InviteStatus
  bigFiveCompleted: boolean
}

export interface MemberDetail {
  id: number
  name: string
  email: string
  joinDate: string
  bigFiveCompleted: boolean
  bigFiveProfile: null
  issues: Array<{
    id: number
    title: string
    status: string
    createdAt: string
  }>
}

const buildMemberListItems = (
  members: membersRepository.TeamMemberWithUser[],
  invites: Array<{ id: number; email: string; status: string; invitedUserId: number | null; createdAt: Date }>
): MembershipListItem[] => {
  const memberIds = new Set(members.map((member) => member.userId))
  const memberEmails = new Set(members.map((member) => member.user.email))

  const memberItems: MembershipListItem[] = members.map((member) => ({
    id: member.userId,
    name: member.user.name,
    email: member.user.email,
    joinDate: member.joinedAt.toISOString(),
    inviteStatus: 'Added',
    bigFiveCompleted: false
  }))

  const inviteItems: MembershipListItem[] = invites
    .filter((invite) => invite.status !== 'Added')
    .filter((invite) => !invite.invitedUserId || !memberIds.has(invite.invitedUserId))
    .filter((invite) => !memberEmails.has(invite.email))
    .map((invite) => ({
      id: invite.id,
      name: invite.email,
      email: invite.email,
      joinDate: invite.createdAt.toISOString(),
      inviteStatus: invite.status as InviteStatus,
      bigFiveCompleted: false
    }))

  return [...memberItems, ...inviteItems]
}

/**
 * Retrieve team membership list including members and pending invites
 * 
 * @param teamId - Team identifier
 * @returns Array of members and pending invites with status information
 * @throws Never throws (returns empty array if no members)
 */
export const getTeamMembers = async (teamId: number): Promise<MembershipListItem[]> => {
  const [members, invites] = await Promise.all([
    membersRepository.listTeamMembers(teamId),
    membersRepository.listTeamInvites(teamId)
  ])

  return buildMemberListItems(members, invites)
}

/**
 * Retrieve detailed information about a team member
 * 
 * @param teamId - Team identifier
 * @param userId - User identifier
 * @returns Member detail including profile and activity
 * @throws AppError with code 'member_not_found' if user is not in team
 */
export const getMemberDetail = async (teamId: number, userId: number): Promise<MemberDetail> => {
  const member = await membersRepository.findTeamMember(teamId, userId)

  if (!member) {
    throw new AppError('member_not_found', 'Team member not found', { teamId, userId }, 404)
  }

  // TODO: Query bigFiveResults table when Epic 3 is implemented
  // const bigFiveResult = await prisma.bigFiveResult.findUnique({
  //   where: { userId: member.userId }
  // })
  
  // TODO: Query issues table when Epic 4 is implemented
  // const issues = await prisma.issue.findMany({
  //   where: { teamId, actorId: userId },
  //   select: { id: true, title: true, status: true, createdAt: true },
  //   orderBy: { createdAt: 'desc' }
  // })

  return {
    id: member.userId,
    name: member.user.name,
/**
 * Remove a member from a team
 * 
 * Validates business rules:
 * - User cannot remove themselves (prevents orphaning)
 * - Cannot remove the last team member (teams need at least one member)
 * 
 * Transaction includes:
 * - Member deletion
 * - Event logging (team_member.removed)
 * 
 * @param teamId - Team identifier
 * @param userId - User identifier to remove
 * @param removedBy - User identifier performing the removal
 * @returns Promise that resolves when removal is complete
 * @throws AppError with code 'member_not_found' if user is not in team
 * @throws AppError with code 'self_removal_forbidden' if userId === removedBy
 * @throws AppError with code 'last_member_removal_forbidden' if only one member remains
 */
    email: member.user.email,
    joinDate: member.joinedAt.toISOString(),
    bigFiveCompleted: false,
    bigFiveProfile: null,
    issues: []
  }
}

export const removeMember = async (
  teamId: number,
  userId: number,
  removedBy: number
): Promise<void> => {
  const member = await membersRepository.findTeamMember(teamId, userId)
  if (!member) {
    throw new AppError('member_not_found', 'Team member not found', { teamId, userId }, 404)
  }

  // Prevent self-removal to avoid orphaning user from team
  if (userId === removedBy) {
    throw new AppError(
      'self_removal_forbidden',
      'Cannot remove yourself from the team',
      { teamId, userId },
      400
    )
  }

  const memberCount = await membersRepository.countTeamMembers(teamId)
  if (memberCount <= 1) {
    throw new AppError(
      'last_member_removal_forbidden',
      'Cannot remove the last team member',
      { teamId, userId },
      400
    )
  }

  await prisma.$transaction(async (tx) => {
    await membersRepository.deleteTeamMember(teamId, userId, tx)

    await tx.event.create({
      data: {
        eventType: 'team_member.removed',
        actorId: removedBy,
        teamId,
        entityType: 'team_member',
        entityId: userId,
        action: 'removed',
        payload: {
          teamId,
          userId,
          removedBy
        },
        schemaVersion: 'v1'
      }
    })
  })
}
