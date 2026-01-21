import type { Pillar } from '../../practices/types'

export interface CategoryCoveragePractice {
  id: number
  title: string
}

export interface CategoryCoveragePillar {
  id: number
  name: string
  categoryId: string
  categoryName?: string | null
  description?: string | null
  practices?: CategoryCoveragePractice[]
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
  coveredPillars: Pillar[]
  gapPillars: Pillar[]
  categoryBreakdown: CategoryCoverage[]
}
