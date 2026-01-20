import { describe, expect, it, vi, beforeEach } from 'vitest'
import { usePracticesStore, selectFilteredPractices, selectHasActiveFilters, selectResultCount } from './practices.slice'
import * as api from '../api/practices.api'

const mockPractices = {
  items: [
    {
      id: 1,
      title: 'Daily Standup',
      goal: 'Sync',
      categoryId: 'FEEDBACK_APPRENTISSAGE',
      categoryName: 'FEEDBACK & APPRENTISSAGE',
      pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
    }
  ],
  page: 1,
  pageSize: 20,
  total: 1
}

vi.mock('../api/practices.api', async () => {
  const actual = await vi.importActual<typeof import('../api/practices.api')>('../api/practices.api')
  return {
    ...actual,
    fetchPractices: vi.fn(),
    logCatalogViewed: vi.fn(),
    logCatalogSearched: vi.fn()
  }
})

const mockedApi = api as unknown as {
  fetchPractices: ReturnType<typeof vi.fn>
  logCatalogViewed: ReturnType<typeof vi.fn>
  logCatalogSearched: ReturnType<typeof vi.fn>
  ApiError: typeof api.ApiError
}

beforeEach(() => {
  usePracticesStore.setState({
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
    searchQuery: '',
    selectedPillars: [],
    loadPractices: usePracticesStore.getState().loadPractices,
    loadAvailablePillars: usePracticesStore.getState().loadAvailablePillars,
    setCurrentDetail: usePracticesStore.getState().setCurrentDetail,
    setSearchQuery: usePracticesStore.getState().setSearchQuery,
    setSelectedPillars: usePracticesStore.getState().setSelectedPillars,
    togglePillar: usePracticesStore.getState().togglePillar,
    clearFilters: usePracticesStore.getState().clearFilters,
    retry: usePracticesStore.getState().retry
  })
})

describe('practices.slice', () => {
  it('loads practices and marks catalog viewed', async () => {
    mockedApi.fetchPractices.mockResolvedValue(mockPractices)
    mockedApi.logCatalogViewed.mockResolvedValue(undefined)

    await usePracticesStore.getState().loadPractices()

    const state = usePracticesStore.getState()
    expect(state.practices).toHaveLength(1)
    expect(state.catalogViewed).toBe(true)
    expect(mockedApi.logCatalogViewed).toHaveBeenCalled()
  })

  it('logs catalog searched when filters are active', async () => {
    mockedApi.fetchPractices.mockResolvedValue(mockPractices)
    mockedApi.logCatalogSearched.mockResolvedValue(undefined)

    usePracticesStore.getState().setSearchQuery('standup')
    await usePracticesStore.getState().loadPractices(1, 20, 5)

    expect(mockedApi.logCatalogSearched).toHaveBeenCalledWith({
      teamId: 5,
      query: 'standup',
      pillarsSelected: [],
      timestamp: expect.any(String)
    })
  })

  it('sets error on failure', async () => {
    mockedApi.fetchPractices.mockRejectedValue(new api.ApiError('network_error', 'boom'))

    await usePracticesStore.getState().loadPractices()
    expect(usePracticesStore.getState().error).toBe('boom')
  })

  it('retries with last page params and logs with teamId', async () => {
    mockedApi.fetchPractices.mockResolvedValue(mockPractices)
    mockedApi.logCatalogViewed.mockResolvedValue(undefined)

    await usePracticesStore.getState().loadPractices(2, 5, 99)
    mockedApi.fetchPractices.mockResolvedValue(mockPractices)

    await usePracticesStore.getState().retry()

    expect(mockedApi.fetchPractices).toHaveBeenNthCalledWith(1, 2, 5)
    expect(mockedApi.fetchPractices).toHaveBeenNthCalledWith(2, 2, 5)
    expect(mockedApi.logCatalogViewed).toHaveBeenCalledWith(99, mockPractices.items.length)
  })

  it('updates search and pillar filters', () => {
    usePracticesStore.getState().setSearchQuery('standup')
    usePracticesStore.getState().setSelectedPillars([1, 2])
    usePracticesStore.getState().togglePillar(2)

    const state = usePracticesStore.getState()
    expect(state.searchQuery).toBe('standup')
    expect(state.selectedPillars).toEqual([1])
  })

  it('setPillarFilters updates selected pillars', () => {
    usePracticesStore.getState().setPillarFilters([3, 4])
    expect(usePracticesStore.getState().selectedPillars).toEqual([3, 4])
  })

  it('clears filters', () => {
    usePracticesStore.getState().setSearchQuery('standup')
    usePracticesStore.getState().setSelectedPillars([3])
    usePracticesStore.getState().clearFilters()

    const state = usePracticesStore.getState()
    expect(state.searchQuery).toBe('')
    expect(state.selectedPillars).toEqual([])
  })

  it('selectFilteredPractices applies search and pillar filters', () => {
    usePracticesStore.setState({
      practices: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Sync',
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          categoryName: 'FEEDBACK & APPRENTISSAGE',
          pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
        },
        {
          id: 2,
          title: 'Retrospective',
          goal: 'Reflect',
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          categoryName: 'FEEDBACK & APPRENTISSAGE',
          pillars: [{ id: 2, name: 'Feedback', category: 'FEEDBACK & APPRENTISSAGE' }]
        }
      ],
      searchQuery: 'standup',
      selectedPillars: [1]
    })

    const filtered = selectFilteredPractices(usePracticesStore.getState())
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Daily Standup')
  })

  it('selectHasActiveFilters returns true when search or pillar filters are set', () => {
    usePracticesStore.setState({ searchQuery: '', selectedPillars: [] })
    expect(selectHasActiveFilters(usePracticesStore.getState())).toBe(false)

    usePracticesStore.setState({ searchQuery: 'standup', selectedPillars: [] })
    expect(selectHasActiveFilters(usePracticesStore.getState())).toBe(true)

    usePracticesStore.setState({ searchQuery: '', selectedPillars: [2] })
    expect(selectHasActiveFilters(usePracticesStore.getState())).toBe(true)
  })

  it('selectResultCount returns total', () => {
    usePracticesStore.setState({ total: 12 })
    expect(selectResultCount(usePracticesStore.getState())).toBe(12)
  })

  it('loads available pillars from practices', async () => {
    mockedApi.fetchPractices.mockResolvedValue({
      ...mockPractices,
      items: [
        {
          ...mockPractices.items[0],
          pillars: [
            { id: 1, name: 'Communication', category: 'VALEURS HUMAINES' },
            { id: 2, name: 'Feedback', category: 'FEEDBACK & APPRENTISSAGE' }
          ]
        }
      ]
    })

    await usePracticesStore.getState().loadAvailablePillars()

    const state = usePracticesStore.getState()
    expect(state.availablePillars).toHaveLength(2)
    expect(state.isPillarsLoading).toBe(false)
  })
})
