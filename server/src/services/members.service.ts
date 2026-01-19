import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import * as membersRepository from '../repositories/members.repository'
import type { InviteStatus } from './invites.service'

export interface MembershipListItem {
  id: number
  name: string
  email: string
  joinDate: Date
  inviteStatus: InviteStatus
  bigFiveCompleted: boolean
}

export interface MemberDetail {
  id: number
  name: string
  email: string
  joinDate: Date
  bigFiveCompleted: boolean
  bigFiveProfile: null
  issues: Array<{
    id: number
    title: string
    status: string
    createdAt: Date
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
    joinDate: member.joinedAt,
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
      joinDate: invite.createdAt,
      inviteStatus: invite.status as InviteStatus,
      bigFiveCompleted: false
    }))

  return [...memberItems, ...inviteItems]
}

export const getTeamMembers = async (teamId: number): Promise<MembershipListItem[]> => {
  const [members, invites] = await Promise.all([
    membersRepository.listTeamMembers(teamId),
    membersRepository.listTeamInvites(teamId)
  ])

  return buildMemberListItems(members, invites)
}

export const getMemberDetail = async (teamId: number, userId: number): Promise<MemberDetail> => {
  const member = await membersRepository.findTeamMember(teamId, userId)

  if (!member) {
    throw new AppError('member_not_found', 'Team member not found', { teamId, userId }, 404)
  }

  return {
    id: member.userId,
    name: member.user.name,
    email: member.user.email,
    joinDate: member.joinedAt,
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
          action: 'team_member.removed',
          teamId,
          userId,
          removedBy
        },
        schemaVersion: 'v1'
      }
    })
  })
}
