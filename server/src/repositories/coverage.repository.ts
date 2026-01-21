import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'

export type TeamPracticeWithPillars = Prisma.TeamPracticeGetPayload<{
  include: {
    practice: {
      include: {
        practicePillars: {
          include: {
            pillar: { include: { category: true } }
          }
        }
      }
    }
  }
}>

export type PillarWithCategory = Prisma.PillarGetPayload<{
  include: { category: true }
}>

export const findTeamPracticesWithPillars = async (
  teamId: number
): Promise<TeamPracticeWithPillars[]> => {
  return prisma.teamPractice.findMany({
    where: { teamId },
    include: {
      practice: {
        include: {
          practicePillars: {
            include: {
              pillar: { include: { category: true } }
            }
          }
        }
      }
    }
  })
}

export const findAllPillars = async (): Promise<PillarWithCategory[]> => {
  return prisma.pillar.findMany({
    include: { category: true },
    orderBy: { id: 'asc' }
  })
}
