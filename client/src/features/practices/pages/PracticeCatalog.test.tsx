import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { PracticeCatalog } from './PracticeCatalog'
import * as slice from '../state/practices.slice'
import type { PracticesState } from '../state/practices.slice'
import * as authSlice from '../../auth/state/authSlice'

vi.mock('../state/practices.slice', () => {
  const actual = vi.importActual<typeof import('../state/practices.slice')>('../state/practices.slice')
  return {
    ...actual,
    usePracticesStore: vi.fn()
  }
})

vi.mock('../../auth/state/authSlice', () => {
  const actual = vi.importActual<typeof import('../../auth/state/authSlice')>('../../auth/state/authSlice')
  return {
    ...actual,
    useAuthStore: vi.fn()
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()]
  }
})

const mockLoad = vi.fn()
const mockLoadPillars = vi.fn()
const mockRetry = vi.fn()
const mockSetDetail = vi.fn()
const mockSetSearchQuery = vi.fn()
const mockTogglePillar = vi.fn()
const mockClearFilters = vi.fn()
const mockLogout = vi.fn()
const mockNavigate = vi.fn()
const mockedUseNavigate = useNavigate as unknown as MockedFunction<typeof useNavigate>
const mockedUseAuthStore = authSlice.useAuthStore as unknown as MockedFunction<typeof authSlice.useAuthStore>
const mockedUsePracticesStore = slice.usePracticesStore as unknown as MockedFunction<typeof slice.usePracticesStore>
const mockStore: PracticesState = {
  practices: [],
  availablePillars: [],
  isPillarsLoading: false,
  searchQuery: '',
  selectedPillars: [],
  total: 0,
  isLoading: true,
  error: null,
  currentDetail: null,
  loadPractices: mockLoad,
  loadAvailablePillars: mockLoadPillars,
  retry: mockRetry,
  setCurrentDetail: mockSetDetail,
  setSearchQuery: mockSetSearchQuery,
  setPillarFilters: vi.fn(),
  togglePillar: mockTogglePillar,
  clearFilters: mockClearFilters,
  page: 1,
  pageSize: 20,
  catalogViewed: false,
  lastTeamId: null,
  setSelectedPillars: vi.fn()
}

describe('PracticeCatalog', () => {
  beforeEach(() => {
    mockedUsePracticesStore.mockReturnValue(mockStore)
    mockedUseAuthStore.mockReturnValue({ logout: mockLogout, isLoading: false, user: { id: 42 } })
    mockedUseNavigate.mockReturnValue(mockNavigate)
    mockStore.practices = []
    mockStore.availablePillars = []
    mockStore.isPillarsLoading = false
    mockStore.searchQuery = ''
    mockStore.selectedPillars = []
    mockStore.total = 0
    mockStore.isLoading = true
    mockStore.error = null
    mockStore.currentDetail = null
    mockLoad.mockResolvedValue(undefined)
    mockLoadPillars.mockResolvedValue(undefined)
    mockNavigate.mockReset()
    mockLogout.mockResolvedValue(undefined)
    mockRetry.mockReset()
    mockSetDetail.mockReset()
    mockSetSearchQuery.mockReset()
    mockTogglePillar.mockReset()
    mockClearFilters.mockReset()
  })

  it('shows skeleton while loading', () => {
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )
    expect(screen.getByText(/Practice Catalog/i)).toBeInTheDocument()
    expect(screen.getAllByText((_, el) => Boolean(el?.className.includes('animate-pulse'))).length).toBeGreaterThan(0)
  })

  it('renders practices list', async () => {
    mockStore.isLoading = false
    mockStore.practices = [
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Sync',
        categoryId: 'FEEDBACK_APPRENTISSAGE',
        categoryName: 'FEEDBACK & APPRENTISSAGE',
        pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
      }
    ]
    mockStore.total = 1
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Daily Standup')).toBeInTheDocument())
  })

  it('shows empty state when no practices', () => {
    mockStore.isLoading = false
    mockStore.practices = []
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )
    expect(screen.getByText(/No practices available/i)).toBeInTheDocument()
  })

  it('shows search empty state message with query', () => {
    mockStore.isLoading = false
    mockStore.practices = []
    mockStore.searchQuery = 'standup'
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )
    expect(screen.getByText(/No practices found for "standup"/i)).toBeInTheDocument()
  })

  it('debounces search input and updates query', async () => {
    vi.useFakeTimers()
    mockStore.isLoading = false
    mockStore.practices = [
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Sync',
        categoryId: 'FEEDBACK_APPRENTISSAGE',
        categoryName: 'FEEDBACK & APPRENTISSAGE',
        pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
      }
    ]
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('Search practices...'), { target: { value: 'standup' } })
    vi.advanceTimersByTime(300)

    await waitFor(() => expect(mockSetSearchQuery).toHaveBeenCalledWith('standup'))
    vi.useRealTimers()
  })

  it('clears search input when clicking the clear button', () => {
    mockStore.isLoading = false
    mockStore.practices = [
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Sync',
        categoryId: 'FEEDBACK_APPRENTISSAGE',
        categoryName: 'FEEDBACK & APPRENTISSAGE',
        pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
      }
    ]

    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText('Search practices...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'standup' } })
    expect(input.value).toBe('standup')

    fireEvent.click(screen.getByText('×'))
    expect(input.value).toBe('')
  })

  it('shows pillar dropdown options and toggles selection', async () => {
    mockStore.isLoading = false
    mockStore.practices = [
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Sync',
        categoryId: 'FEEDBACK_APPRENTISSAGE',
        categoryName: 'FEEDBACK & APPRENTISSAGE',
        pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
      }
    ]
    mockStore.availablePillars = Array.from({ length: 19 }).map((_, index) => ({
      id: index + 1,
      name: `Pillar ${index + 1}`,
      category: index < 4 ? 'VALEURS HUMAINES' : 'FEEDBACK & APPRENTISSAGE'
    }))

    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Filter by Pillar'))
    expect(screen.getAllByRole('checkbox').length).toBe(19)

    fireEvent.click(screen.getByLabelText('Pillar 1'))
    expect(mockTogglePillar).toHaveBeenCalledWith(1)
  })

  it('allows multiple pillar selection', () => {
    mockStore.isLoading = false
    mockStore.practices = [
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Sync',
        categoryId: 'FEEDBACK_APPRENTISSAGE',
        categoryName: 'FEEDBACK & APPRENTISSAGE',
        pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
      }
    ]
    mockStore.availablePillars = [
      { id: 1, name: 'Pillar 1', category: 'VALEURS HUMAINES' },
      { id: 2, name: 'Pillar 2', category: 'FEEDBACK & APPRENTISSAGE' }
    ]

    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Filter by Pillar'))
    fireEvent.click(screen.getByLabelText('Pillar 1'))
    fireEvent.click(screen.getByLabelText('Pillar 2'))

    expect(mockTogglePillar).toHaveBeenCalledWith(1)
    expect(mockTogglePillar).toHaveBeenCalledWith(2)
  })

  it('clears filters from the active filters section', () => {
    mockStore.isLoading = false
    mockStore.searchQuery = 'standup'
    mockStore.selectedPillars = [1]
    mockStore.practices = [
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Sync',
        categoryId: 'FEEDBACK_APPRENTISSAGE',
        categoryName: 'FEEDBACK & APPRENTISSAGE',
        pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
      }
    ]
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Clear All Filters'))
    expect(mockClearFilters).toHaveBeenCalled()
  })

  it('shows toast when results update under active filters', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    mockedUsePracticesStore.mockReturnValue({
      ...mockStore,
      isLoading: false,
      searchQuery: 'standup',
      practices: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Sync',
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          categoryName: 'FEEDBACK & APPRENTISSAGE',
          pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
        }
      ],
      total: 1
    })

    rerender(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    mockedUsePracticesStore.mockReturnValue({
      ...mockStore,
      isLoading: false,
      searchQuery: 'standup',
      practices: [
        {
          id: 2,
          title: 'Async Standup',
          goal: 'Sync async',
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          categoryName: 'FEEDBACK & APPRENTISSAGE',
          pillars: [{ id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }]
        }
      ],
      total: 1
    })

    rerender(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )

    expect(screen.getByText(/Results updated/i)).toBeInTheDocument()
  })

  it('shows error state with retry', () => {
    mockStore.isLoading = false
    mockStore.practices = []
    mockStore.error = 'boom'
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )
    expect(screen.getByText(/Unable to load practices/i)).toBeInTheDocument()
    expect(screen.getByText(/boom/)).toBeInTheDocument()
  })
})
