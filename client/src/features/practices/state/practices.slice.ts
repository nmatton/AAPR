import { create } from 'zustand'
import { fetchPractices, logCatalogViewed, logCatalogSearched, ApiError } from '../api/practices.api'
import type { Practice, Pillar } from '../types'

export interface PracticesState {
  practices: Practice[]
  availablePillars: Pillar[]
  isPillarsLoading: boolean
  isLoading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  currentDetail: Practice | null
  catalogViewed: boolean
  lastTeamId: number | null
  searchQuery: string
  selectedPillars: number[]
  loadPractices: (page?: number, pageSize?: number, teamId?: number | null) => Promise<void>
  loadAvailablePillars: () => Promise<void>
  setCurrentDetail: (practice: Practice | null) => void
  setSearchQuery: (query: string) => void
  setSelectedPillars: (pillars: number[]) => void
  setPillarFilters: (pillars: number[]) => void
  togglePillar: (pillarId: number) => void
  clearFilters: () => void
  retry: () => Promise<void>
}

const initialState: Omit<PracticesState, 'loadPractices' | 'loadAvailablePillars' | 'setCurrentDetail' | 'setSearchQuery' | 'setSelectedPillars' | 'setPillarFilters' | 'togglePillar' | 'clearFilters' | 'retry'> = {
  practices: [],
  availablePillars: [],
  isPillarsLoading: false,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
  currentDetail: null,
  catalogViewed: false,
  lastTeamId: null,
  searchQuery: '',
  selectedPillars: []
}

export const usePracticesStore = create<PracticesState>((set, get) => ({
  ...initialState,

  loadPractices: async (page = 1, pageSize = 20, teamId: number | null = null) => {
    set({ isLoading: true, error: null, page, pageSize, lastTeamId: teamId })
    try {
      const { searchQuery, selectedPillars } = get()
      const trimmedSearch = searchQuery.trim()
      const hasFilters = trimmedSearch.length > 0 || selectedPillars.length > 0
      const data = await fetchPractices(
        page,
        pageSize,
        trimmedSearch || undefined,
        selectedPillars.length > 0 ? selectedPillars : undefined
      )
      set({
        practices: data.items,
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        isLoading: false,
        error: null,
        catalogViewed: true
      })
      await logCatalogViewed(teamId, data.items.length)
      if (hasFilters) {
        await logCatalogSearched({
          teamId,
          query: trimmedSearch,
          pillarsSelected: selectedPillars,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to load practices. Please refresh the page.'
      set({ error: message, isLoading: false })
    }
  },

  loadAvailablePillars: async () => {
    set({ isPillarsLoading: true })
    try {
      const data = await fetchPractices(1, 100)
      const pillarMap = new Map<number, Pillar>()
      data.items.forEach((practice) => {
        practice.pillars.forEach((pillar) => {
          pillarMap.set(pillar.id, pillar)
        })
      })
      const availablePillars = Array.from(pillarMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      set({ availablePillars, isPillarsLoading: false })
    } catch (error) {
      set({ availablePillars: [], isPillarsLoading: false })
    }
  },

  setCurrentDetail: (practice) => set({ currentDetail: practice }),

  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1 })
    // Debounce will be handled in the component
  },

  setSelectedPillars: (pillars) => {
    set({ selectedPillars: pillars, page: 1 })
  },

  setPillarFilters: (pillars) => {
    set({ selectedPillars: pillars, page: 1 })
  },

  togglePillar: (pillarId) => {
    const { selectedPillars } = get()
    const newPillars = selectedPillars.includes(pillarId)
      ? selectedPillars.filter(id => id !== pillarId)
      : [...selectedPillars, pillarId]
    set({ selectedPillars: newPillars, page: 1 })
  },

  clearFilters: () => {
    set({ searchQuery: '', selectedPillars: [], page: 1 })
  },

  retry: async () => {
    const { page, pageSize, lastTeamId } = get()
    await get().loadPractices(page, pageSize, lastTeamId)
  }
}))

export const selectFilteredPractices = (state: PracticesState): Practice[] => {
  const searchValue = state.searchQuery.trim().toLowerCase()
  const hasSearch = searchValue.length > 0
  const hasPillarFilters = state.selectedPillars.length > 0

  if (!hasSearch && !hasPillarFilters) {
    return state.practices
  }

  return state.practices.filter((practice) => {
    const matchesSearch = !hasSearch
      || practice.title.toLowerCase().includes(searchValue)
      || practice.goal.toLowerCase().includes(searchValue)

    const matchesPillars = !hasPillarFilters
      || practice.pillars.some((pillar) => state.selectedPillars.includes(pillar.id))

    return matchesSearch && matchesPillars
  })
}

export const selectHasActiveFilters = (state: PracticesState): boolean =>
  state.searchQuery.trim().length > 0 || state.selectedPillars.length > 0

export const selectResultCount = (state: PracticesState): number => state.total
