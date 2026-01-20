import { create } from 'zustand'
import { fetchPractices, logCatalogViewed, ApiError } from '../api/practices.api'
import type { Practice } from '../types'

export interface PracticesState {
  practices: Practice[]
  isLoading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  currentDetail: Practice | null
  catalogViewed: boolean
  searchQuery: string
  selectedPillars: number[]
  loadPractices: (page?: number, pageSize?: number, teamId?: number | null) => Promise<void>
  setCurrentDetail: (practice: Practice | null) => void
  setSearchQuery: (query: string) => void
  setSelectedPillars: (pillars: number[]) => void
  togglePillar: (pillarId: number) => void
  clearFilters: () => void
  retry: () => Promise<void>
}

const initialState: Omit<PracticesState, 'loadPractices' | 'setCurrentDetail' | 'setSearchQuery' | 'setSelectedPillars' | 'togglePillar' | 'clearFilters' | 'retry'> = {
  practices: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
  currentDetail: null,
  catalogViewed: false,
  searchQuery: '',
  selectedPillars: []
}

export const usePracticesStore = create<PracticesState>((set, get) => ({
  ...initialState,

  loadPractices: async (page = 1, pageSize = 20, teamId: number | null = null) => {
    set({ isLoading: true, error: null, page, pageSize })
    try {
      const { searchQuery, selectedPillars } = get()
      const data = await fetchPractices(
        page,
        pageSize,
        searchQuery || undefined,
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
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to load practices. Please refresh the page.'
      set({ error: message, isLoading: false })
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
    const { page, pageSize } = get()
    await get().loadPractices(page, pageSize)
  }
}))
