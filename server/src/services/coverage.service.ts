import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import * as coverageRepository from '../repositories/coverage.repository'
import type { PillarWithCategory, TeamPracticeWithPillars } from '../repositories/coverage.repository'
import type { TeamCoveragePillars } from '../types/admin-stats.types'

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

type CoverageCategoryDefinition = {
  categoryName: keyof TeamCoveragePillars
  subpillars: Array<{ code: string; name: string }>
}

const COVERAGE_TAXONOMY: CoverageCategoryDefinition[] = [
  {
    categoryName: 'Technical Quality & Engineering Excellence',
    subpillars: [
      { code: '1.1', name: 'Code Quality & Simple Design' },
      { code: '1.2', name: 'Automation & Continuous Integration' },
      { code: '1.3', name: 'Technical Debt Management' },
      { code: '1.4', name: 'Technical Collective Ownership' },
    ],
  },
  {
    categoryName: 'Team Culture & Psychology',
    subpillars: [
      { code: '2.1', name: 'Psychological Safety & Core Values' },
      { code: '2.2', name: 'Self-Organization & Autonomy' },
      { code: '2.3', name: 'Cross-Functionality & Shared Skills' },
      { code: '2.4', name: 'Sustainable Pace' },
    ],
  },
  {
    categoryName: 'Process & Execution',
    subpillars: [
      { code: '3.1', name: 'Flow & Delivery Cadence' },
      { code: '3.2', name: 'Inspection & Adaptation' },
      { code: '3.3', name: 'Work Transparency & Synchronization' },
    ],
  },
  {
    categoryName: 'Product Value & Customer Alignment',
    subpillars: [
      { code: '4.1', name: 'Customer Involvement & Active Feedback' },
      { code: '4.2', name: 'Value-Driven Prioritization' },
    ],
  },
]

const normalizePillarName = (value: string): string => value.trim().replace(/^[0-9]+\.[0-9]+\s*/, '')

const resolveCoveragePillarIds = (allPillars: PillarWithCategory[]): Map<string, number> => {
  const pillarIdsByCode = new Map<string, number>()

  COVERAGE_TAXONOMY.forEach((category) => {
    category.subpillars.forEach((subpillar) => {
      const match = allPillars.find(
        (pillar) =>
          (pillar.category?.name ?? pillar.categoryId) === category.categoryName &&
          normalizePillarName(pillar.name) === subpillar.name
      )

      if (!match) {
        throw new AppError(
          'internal_error',
          'Coverage taxonomy is out of sync with pillar reference data',
          {
            category: category.categoryName,
            subpillarCode: subpillar.code,
            subpillarName: subpillar.name,
          },
          500
        )
      }

      pillarIdsByCode.set(subpillar.code, match.id)
    })
  })

  return pillarIdsByCode
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
        systemReason: 'Coverage computation triggered by API request for team coverage pillars.',
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

export const buildExhaustiveCoverageMap = (
  teamPractices: TeamPracticeWithPillars[],
  allPillars: PillarWithCategory[]
): {
  coveredPillarsCount: number
  coveredCategoriesCount: number
  coveragePct: number
  pillars: TeamCoveragePillars
} => {
  const coverageTemplate: TeamCoveragePillars = {
    'Technical Quality & Engineering Excellence': { practices: 0, subpillars: {} },
    'Team Culture & Psychology': { practices: 0, subpillars: {} },
    'Process & Execution': { practices: 0, subpillars: {} },
    'Product Value & Customer Alignment': { practices: 0, subpillars: {} },
  }

  COVERAGE_TAXONOMY.forEach((category) => {
    category.subpillars.forEach((subpillar) => {
      coverageTemplate[category.categoryName].subpillars[subpillar.code] = {
        name: subpillar.name,
        practices: 0,
      }
    })
  })

  const pillarIdsByCode = resolveCoveragePillarIds(allPillars)

  const practiceIdsByPillar = new Map<number, Set<number>>()
  teamPractices.forEach((teamPractice) => {
    teamPractice.practice.practicePillars.forEach((practicePillar) => {
      const set = practiceIdsByPillar.get(practicePillar.pillar.id) ?? new Set<number>()
      set.add(teamPractice.practice.id)
      practiceIdsByPillar.set(practicePillar.pillar.id, set)
    })
  })

  const coveredPillarCodes = new Set<string>()
  const practiceIdsByCategory = new Map<keyof TeamCoveragePillars, Set<number>>()

  COVERAGE_TAXONOMY.forEach((category) => {
    practiceIdsByCategory.set(category.categoryName, new Set<number>())

    category.subpillars.forEach((subpillar) => {
      const pillarId = pillarIdsByCode.get(subpillar.code)
      const practiceIds = pillarId ? (practiceIdsByPillar.get(pillarId) ?? new Set<number>()) : new Set<number>()
      const practiceCount = practiceIds.size
      coverageTemplate[category.categoryName].subpillars[subpillar.code].practices = practiceCount

      practiceIds.forEach((practiceId) => {
        practiceIdsByCategory.get(category.categoryName)!.add(practiceId)
      })

      if (practiceCount > 0) {
        coveredPillarCodes.add(subpillar.code)
      }
    })

    coverageTemplate[category.categoryName].practices = practiceIdsByCategory.get(category.categoryName)!.size
  })

  const coveredCategoriesCount = COVERAGE_TAXONOMY.reduce((count, category) => {
    return count + (coverageTemplate[category.categoryName].practices > 0 ? 1 : 0)
  }, 0)

  const totalPillars = COVERAGE_TAXONOMY.reduce((sum, category) => sum + category.subpillars.length, 0)
  const coveragePct = totalPillars === 0 ? 0 : Number((coveredPillarCodes.size / totalPillars).toFixed(2))

  return {
    coveredPillarsCount: coveredPillarCodes.size,
    coveredCategoriesCount,
    coveragePct,
    pillars: coverageTemplate,
  }
}
