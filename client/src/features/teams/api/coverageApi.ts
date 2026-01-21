import { apiClient } from '../../../lib/apiClient'
import type { TeamPillarCoverage, CategoryCoverage } from '../types/coverage.types'
import type { Pillar } from '../../practices/types'

interface CoveragePillarResponse {
  id: number
  name: string
  categoryId: string
  categoryName?: string | null
  description?: string | null
}

interface CategoryCoveragePillarResponse extends CoveragePillarResponse {
  practices?: Array<{ id: number; title: string }>
}

interface CategoryCoverageResponse {
  categoryId: string
  categoryName: string
  coveredCount: number
  totalCount: number
  coveragePct: number
  coveredPillars: CategoryCoveragePillarResponse[]
  gapPillars: CategoryCoveragePillarResponse[]
}

interface TeamPillarCoverageResponse {
  overallCoveragePct: number
  coveredCount: number
  totalCount: number
  coveredPillars: CoveragePillarResponse[]
  gapPillars: CoveragePillarResponse[]
  categoryBreakdown?: CategoryCoverageResponse[]
  requestId?: string
}

const mapPillar = (pillar: CoveragePillarResponse): Pillar => ({
  id: pillar.id,
  name: pillar.name,
  category: pillar.categoryName ?? pillar.categoryId,
  description: pillar.description ?? null
})

const mapCategoryCoverage = (category: CategoryCoverageResponse): CategoryCoverage => ({
  categoryId: category.categoryId,
  categoryName: category.categoryName,
  coveredCount: category.coveredCount,
  totalCount: category.totalCount,
  coveragePct: category.coveragePct,
  coveredPillars: category.coveredPillars.map((pillar) => ({
    ...pillar,
    practices: pillar.practices ?? []
  })),
  gapPillars: category.gapPillars.map((pillar) => ({
    ...pillar,
    practices: pillar.practices ?? []
  }))
})

export const getTeamPillarCoverage = async (teamId: number): Promise<TeamPillarCoverage> => {
  const response = await apiClient<TeamPillarCoverageResponse>(
    `/api/v1/teams/${teamId}/coverage/pillars`
  )

  return {
    overallCoveragePct: response.overallCoveragePct,
    coveredCount: response.coveredCount,
    totalCount: response.totalCount,
    coveredPillars: response.coveredPillars.map(mapPillar),
    gapPillars: response.gapPillars.map(mapPillar),
    categoryBreakdown: response.categoryBreakdown?.map(mapCategoryCoverage) ?? []
  }
}
