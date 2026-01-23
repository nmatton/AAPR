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
  selectedCategories: string[]
  selectedMethods: string[]
  selectedTags: string[]
  loadPractices: (page?: number, pageSize?: number, teamId?: number | null) => Promise<void>
  loadAvailablePillars: () => Promise<void>
  setCurrentDetail: (practice: Practice | null) => void
  setSearchQuery: (query: string) => void
  setSelectedPillars: (pillars: number[]) => void
  setPillarFilters: (pillars: number[]) => void
  togglePillar: (pillarId: number) => void
  toggleCategory: (categoryId: string) => void
  toggleMethod: (method: string) => void
  setTags: (tags: string[]) => void
  clearFilters: () => void
  retry: () => Promise<void>
}

const initialState: Omit<PracticesState, 'loadPractices' | 'loadAvailablePillars' | 'setCurrentDetail' | 'setSearchQuery' | 'setSelectedPillars' | 'setPillarFilters' | 'togglePillar' | 'toggleCategory' | 'toggleMethod' | 'setTags' | 'clearFilters' | 'retry'> = {
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
  selectedPillars: [],
  selectedCategories: [],
  selectedMethods: [],
  selectedTags: []
}

export const usePracticesStore = create<PracticesState>((set, get) => ({
  ...initialState,

  loadPractices: async (page = 1, pageSize = 20, teamId: number | null = null) => {
    set({ isLoading: true, error: null, page, pageSize, lastTeamId: teamId })
    try {
      const { searchQuery, selectedPillars, selectedCategories, selectedMethods, selectedTags } = get()
      const trimmedSearch = searchQuery.trim()
      const hasFilters = trimmedSearch.length > 0 || selectedPillars.length > 0 || selectedCategories.length > 0 || selectedMethods.length > 0 || selectedTags.length > 0
      const data = await fetchPractices(
        page,
        pageSize,
        trimmedSearch || undefined,
        selectedPillars.length > 0 ? selectedPillars : undefined,
        selectedCategories.length > 0 ? selectedCategories : undefined,
        selectedMethods.length > 0 ? selectedMethods : undefined,
        selectedTags.length > 0 ? selectedTags : undefined
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
          categoriesSelected: selectedCategories,
          methodsSelected: selectedMethods,
          tagsSelected: selectedTags,
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

  toggleCategory: (categoryId) => {
    const { selectedCategories } = get()
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId]
    set({ selectedCategories: newCategories, page: 1 })
  },

  toggleMethod: (method) => {
    const { selectedMethods } = get()
    const newMethods = selectedMethods.includes(method)
      ? selectedMethods.filter(m => m !== method)
      : [...selectedMethods, method]
    set({ selectedMethods: newMethods, page: 1 })
  },

  setTags: (tags) => {
    set({ selectedTags: tags, page: 1 })
  },

  clearFilters: () => {
    set({ searchQuery: '', selectedPillars: [], selectedCategories: [], selectedMethods: [], selectedTags: [], page: 1 })
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
  const hasCategoryFilters = state.selectedCategories.length > 0
  const hasMethodFilters = state.selectedMethods.length > 0
  const hasTagFilters = state.selectedTags.length > 0

  if (!hasSearch && !hasPillarFilters && !hasCategoryFilters && !hasMethodFilters && !hasTagFilters) {
    return state.practices
  }

  return state.practices.filter((practice) => {
    const matchesSearch = !hasSearch
      || practice.title.toLowerCase().includes(searchValue)
      || practice.goal.toLowerCase().includes(searchValue)

    const matchesPillars = !hasPillarFilters
      || practice.pillars.some((pillar) => state.selectedPillars.includes(pillar.id))

    const matchesCategories = !hasCategoryFilters
      || state.selectedCategories.includes(practice.categoryId)

    const matchesMethods = !hasMethodFilters
      || (practice.method && state.selectedMethods.includes(practice.method))

    // For tags, existing client side logic would need to inspect practice.tags
    // But practice.tags in store is normalized string array
    const matchesTags = !hasTagFilters
      || (practice.tags && state.selectedTags.some(tag => practice.tags!.includes(tag)))

    return matchesSearch && matchesPillars && matchesCategories && matchesMethods && matchesTags
  })
}

export const selectHasActiveFilters = (state: PracticesState): boolean =>
  state.searchQuery.trim().length > 0 ||
  state.selectedPillars.length > 0 ||
  state.selectedCategories.length > 0 ||
  state.selectedMethods.length > 0 ||
  state.selectedTags.length > 0

export const selectResultCount = (state: PracticesState): number => state.total
