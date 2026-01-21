import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import * as coverageRepository from '../repositories/coverage.repository'
import type { PillarWithCategory, TeamPracticeWithPillars } from '../repositories/coverage.repository'

export interface CoveragePillar {
  id: number
  name: string
  categoryId: string
  categoryName: string
  description?: string | null
}

export interface TeamPillarCoverage {
  overallCoveragePct: number
  coveredCount: number
  totalCount: number
  coveredPillars: CoveragePillar[]
  gapPillars: CoveragePillar[]
}

const mapPillar = (pillar: PillarWithCategory): CoveragePillar => ({
  id: pillar.id,
  name: pillar.name,
  categoryId: pillar.categoryId,
  categoryName: pillar.category?.name ?? pillar.categoryId,
  description: pillar.description ?? null
})

const extractCoveredPillarIds = (teamPractices: TeamPracticeWithPillars[]): Set<number> => {
  const uniquePillarIds = new Set<number>()

  teamPractices.forEach((teamPractice) => {
    teamPractice.practice.practicePillars.forEach((practicePillar) => {
      uniquePillarIds.add(practicePillar.pillar.id)
    })
  })

  return uniquePillarIds
}

export const getTeamPillarCoverage = async (teamId: number): Promise<TeamPillarCoverage> => {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw new AppError('invalid_team_id', 'Valid team ID is required', { teamId }, 400)
  }

  const [teamPractices, allPillars] = await Promise.all([
    coverageRepository.findTeamPracticesWithPillars(teamId),
    coverageRepository.findAllPillars()
  ])

  const coveredPillarIds = extractCoveredPillarIds(teamPractices)
  const coveredPillars = allPillars.filter((pillar) => coveredPillarIds.has(pillar.id)).map(mapPillar)
  const gapPillars = allPillars.filter((pillar) => !coveredPillarIds.has(pillar.id)).map(mapPillar)

  const totalCount = allPillars.length
  const coveredCount = coveredPillars.length
  const overallCoveragePct = totalCount === 0
    ? 0
    : Number(((coveredCount / totalCount) * 100).toFixed(2))

  await prisma.event.create({
    data: {
      eventType: 'coverage.calculated',
      teamId,
      action: 'coverage.calculated',
      payload: {
        coveragePercent: overallCoveragePct,
        coveredCount,
        coveredPillarIds: Array.from(coveredPillarIds)
      },
      createdAt: new Date()
    }
  })

  return {
    overallCoveragePct,
    coveredCount,
    totalCount,
    coveredPillars,
    gapPillars
  }
}
