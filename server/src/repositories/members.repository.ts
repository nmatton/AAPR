import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'

export type PrismaClientLike = Prisma.TransactionClient | PrismaClient

const getDb = (db?: PrismaClientLike): PrismaClientLike => db ?? prisma

export type TeamMemberWithUser = Prisma.TeamMemberGetPayload<{
  include: {
    user: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

export const listTeamMembers = async (
  teamId: number,
  db?: PrismaClientLike
): Promise<TeamMemberWithUser[]> => {
  return getDb(db).teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { joinedAt: 'asc' }
  })
}

export const listTeamInvites = async (
  teamId: number,
  db?: PrismaClientLike
) => {
  return getDb(db).teamInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' }
  })
}

export const findTeamMember = async (
  teamId: number,
  userId: number,
  db?: PrismaClientLike
): Promise<TeamMemberWithUser | null> => {
  return getDb(db).teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })
}

export const countTeamMembers = async (
  teamId: number,
  db?: PrismaClientLike
): Promise<number> => {
  return getDb(db).teamMember.count({
    where: { teamId }
  })
}

export const deleteTeamMember = async (
  teamId: number,
  userId: number,
  db?: PrismaClientLike
) => {
  return getDb(db).teamMember.delete({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    }
  })
}
