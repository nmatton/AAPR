import { apiClient } from '../../../lib/apiClient'
import type { TeamPillarCoverage } from '../types/coverage.types'
import type { Pillar } from '../../practices/types'

interface CoveragePillarResponse {
  id: number
  name: string
  categoryId: string
  categoryName?: string | null
  description?: string | null
}

interface TeamPillarCoverageResponse {
  overallCoveragePct: number
  coveredCount: number
  totalCount: number
  coveredPillars: CoveragePillarResponse[]
  gapPillars: CoveragePillarResponse[]
  requestId?: string
}

const mapPillar = (pillar: CoveragePillarResponse): Pillar => ({
  id: pillar.id,
  name: pillar.name,
  category: pillar.categoryName ?? pillar.categoryId,
  description: pillar.description ?? null
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
    gapPillars: response.gapPillars.map(mapPillar)
  }
}
