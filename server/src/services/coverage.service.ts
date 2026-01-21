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

export interface CoveragePracticeSummary {
  id: number
  title: string
}

export interface CategoryCoveragePillar extends CoveragePillar {
  practices: CoveragePracticeSummary[]
}

export interface CategoryCoverage {
  categoryId: string
  categoryName: string
  coveredCount: number
  totalCount: number
  coveragePct: number
  coveredPillars: CategoryCoveragePillar[]
  gapPillars: CategoryCoveragePillar[]
}

export interface TeamPillarCoverage {
  overallCoveragePct: number
  coveredCount: number
  totalCount: number
  coveredPillars: CoveragePillar[]
  gapPillars: CoveragePillar[]
  categoryBreakdown: CategoryCoverage[]
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

const buildPillarPracticeMap = (teamPractices: TeamPracticeWithPillars[]): Map<number, CoveragePracticeSummary[]> => {
  const practiceMap = new Map<number, Map<number, CoveragePracticeSummary>>()

  teamPractices.forEach((teamPractice) => {
    const practiceSummary = {
      id: teamPractice.practice.id,
      title: teamPractice.practice.title
    }

    teamPractice.practice.practicePillars.forEach((practicePillar) => {
      if (!practiceMap.has(practicePillar.pillar.id)) {
        practiceMap.set(practicePillar.pillar.id, new Map<number, CoveragePracticeSummary>())
      }

      practiceMap.get(practicePillar.pillar.id)!.set(practiceSummary.id, practiceSummary)
    })
  })

  return new Map(
    Array.from(practiceMap.entries()).map(([pillarId, practiceEntries]) => [
      pillarId,
      Array.from(practiceEntries.values())
    ])
  )
}

const calculateCategoryBreakdown = (
  allPillars: PillarWithCategory[],
  coveredPillarIds: Set<number>,
  practicesByPillar: Map<number, CoveragePracticeSummary[]>
): CategoryCoverage[] => {
  const categoryMap = new Map<string, { 
    categoryId: string
    categoryName: string
    coveredPillars: CategoryCoveragePillar[]
    gapPillars: CategoryCoveragePillar[]
  }>()

  allPillars.forEach((pillar) => {
    const categoryId = pillar.categoryId
    const categoryName = pillar.category?.name ?? categoryId

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        categoryId,
        categoryName,
        coveredPillars: [],
        gapPillars: []
      })
    }

    const mappedPillar: CategoryCoveragePillar = {
      ...mapPillar(pillar),
      practices: practicesByPillar.get(pillar.id) ?? []
    }
    const categoryData = categoryMap.get(categoryId)!
    
    if (coveredPillarIds.has(pillar.id)) {
      categoryData.coveredPillars.push(mappedPillar)
    } else {
      categoryData.gapPillars.push(mappedPillar)
    }
  })

  return Array.from(categoryMap.values()).map((category) => {
    const totalCount = category.coveredPillars.length + category.gapPillars.length
    const coveredCount = category.coveredPillars.length
    const coveragePct = totalCount === 0 
      ? 0 
      : Number(((coveredCount / totalCount) * 100).toFixed(2))

    return {
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      coveredCount,
      totalCount,
      coveragePct,
      coveredPillars: category.coveredPillars,
      gapPillars: category.gapPillars
    }
  })
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

  const practicesByPillar = buildPillarPracticeMap(teamPractices)
  const categoryBreakdown = calculateCategoryBreakdown(allPillars, coveredPillarIds, practicesByPillar)

  const categoryBreakdownSummary = categoryBreakdown.map((category) => ({
    categoryName: category.categoryName,
    coveragePct: category.coveragePct,
    coveredCount: category.coveredCount,
    totalCount: category.totalCount
  }))

  await prisma.event.create({
    data: {
      eventType: 'coverage.by_category.calculated',
      teamId,
      action: 'coverage.by_category.calculated',
      payload: {
        coveragePercent: overallCoveragePct,
        coveredCount,
        coveredPillarIds: Array.from(coveredPillarIds),
        categoryBreakdown: categoryBreakdownSummary,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date()
    }
  })

  return {
    overallCoveragePct,
    coveredCount,
    totalCount,
    coveredPillars,
    gapPillars,
    categoryBreakdown
  }
}
