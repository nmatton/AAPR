import { create } from 'zustand'
import { getTeamPillarCoverage } from '../api/coverageApi'
import type { TeamPillarCoverage } from '../types/coverage.types'

export interface CoverageState {
  coverage: TeamPillarCoverage | null
  isLoading: boolean
  error: string | null
  fetchCoverage: (teamId: number) => Promise<void>
  reset: () => void
}

export const useCoverageStore = create<CoverageState>((set) => ({
  coverage: null,
  isLoading: false,
  error: null,

  fetchCoverage: async (teamId: number) => {
    set({ isLoading: true, error: null })
    try {
      const coverage = await getTeamPillarCoverage(teamId)
      set({ coverage, isLoading: false })
    } catch (error: any) {
      const message = error?.message ?? 'Failed to load team coverage.'
      set({ error: message, isLoading: false })
    }
  },

  reset: () => set({ coverage: null, isLoading: false, error: null })
}))
