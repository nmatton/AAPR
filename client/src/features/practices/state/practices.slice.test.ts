import { describe, expect, it, vi, beforeEach } from 'vitest'
import { usePracticesStore } from './practices.slice'
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
    logCatalogViewed: vi.fn()
  }
})

const mockedApi = api as unknown as {
  fetchPractices: ReturnType<typeof vi.fn>
  logCatalogViewed: ReturnType<typeof vi.fn>
  ApiError: typeof api.ApiError
}

beforeEach(() => {
  usePracticesStore.setState({
    practices: [],
    isLoading: false,
    error: null,
    total: 0,
    page: 1,
    pageSize: 20,
    currentDetail: null,
    catalogViewed: false,
    loadPractices: usePracticesStore.getState().loadPractices,
    setCurrentDetail: usePracticesStore.getState().setCurrentDetail,
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
})
