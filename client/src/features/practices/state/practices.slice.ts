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
  loadPractices: (page?: number, pageSize?: number, teamId?: number | null) => Promise<void>
  setCurrentDetail: (practice: Practice | null) => void
  retry: () => Promise<void>
}

const initialState: Omit<PracticesState, 'loadPractices' | 'setCurrentDetail' | 'retry'> = {
  practices: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
  currentDetail: null,
  catalogViewed: false
}

export const usePracticesStore = create<PracticesState>((set, get) => ({
  ...initialState,

  loadPractices: async (page = 1, pageSize = 20, teamId: number | null = null) => {
    set({ isLoading: true, error: null, page, pageSize })
    try {
      const data = await fetchPractices(page, pageSize)
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

  retry: async () => {
    const { page, pageSize } = get()
    await get().loadPractices(page, pageSize)
  }
}))
