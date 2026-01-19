import { Prisma, PrismaClient, TeamInvite } from '@prisma/client'
import { prisma } from '../lib/prisma'

export type PrismaClientLike = Prisma.TransactionClient | PrismaClient

const getDb = (db?: PrismaClientLike): PrismaClientLike => db ?? prisma

export const findInviteByTeamAndEmail = async (
  teamId: number,
  email: string,
  db?: PrismaClientLike
): Promise<TeamInvite | null> => {
  return getDb(db).teamInvite.findUnique({
    where: {
      teamId_email: { teamId, email }
    }
  })
}

export const findInviteById = async (
  teamId: number,
  inviteId: number,
  db?: PrismaClientLike
): Promise<TeamInvite | null> => {
  return getDb(db).teamInvite.findFirst({
    where: {
      id: inviteId,
      teamId
    }
  })
}

export const listInvitesByTeam = async (
  teamId: number,
  db?: PrismaClientLike
): Promise<TeamInvite[]> => {
  return getDb(db).teamInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' }
  })
}

export const createInvite = async (
  data: Prisma.TeamInviteUncheckedCreateInput,
  db?: PrismaClientLike
): Promise<TeamInvite> => {
  return getDb(db).teamInvite.create({ data })
}

export const updateInvite = async (
  inviteId: number,
  teamId: number,
  data: Prisma.TeamInviteUncheckedUpdateInput,
  db?: PrismaClientLike
): Promise<TeamInvite> => {
  return getDb(db).teamInvite.update({
    where: {
      id: inviteId,
      teamId
    },
    data
  })
}
