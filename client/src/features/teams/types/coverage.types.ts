import type { Pillar } from '../../practices/types'

export interface TeamPillarCoverage {
  overallCoveragePct: number
  coveredCount: number
  totalCount: number
  coveredPillars: Pillar[]
  gapPillars: Pillar[]
}
