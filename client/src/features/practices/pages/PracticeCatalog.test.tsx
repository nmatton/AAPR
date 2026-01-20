import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { PracticeCatalog } from './PracticeCatalog'
import * as slice from '../state/practices.slice'
import * as authSlice from '../../auth/state/authSlice'
import React from 'react'

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
    useNavigate: vi.fn()
  }
})

const mockLoad = vi.fn()
const mockRetry = vi.fn()
const mockSetDetail = vi.fn()
const mockLogout = vi.fn()
const mockNavigate = vi.fn()
const mockedUseNavigate = useNavigate as unknown as vi.Mock
const mockedUseAuthStore = authSlice.useAuthStore as unknown as vi.Mock
const mockedUsePracticesStore = slice.usePracticesStore as unknown as vi.Mock
const mockStore = {
  practices: [],
  isLoading: true,
  error: null,
  currentDetail: null,
  loadPractices: mockLoad,
  retry: mockRetry,
  setCurrentDetail: mockSetDetail
}

describe('PracticeCatalog', () => {
  beforeEach(() => {
    mockedUsePracticesStore.mockReturnValue(mockStore)
    mockedUseAuthStore.mockReturnValue({ logout: mockLogout, isLoading: false })
    mockedUseNavigate.mockReturnValue(mockNavigate)
    mockStore.practices = []
    mockStore.isLoading = true
    mockStore.error = null
    mockStore.currentDetail = null
    mockLoad.mockResolvedValue(undefined)
    mockNavigate.mockReset()
    mockLogout.mockResolvedValue(undefined)
    mockRetry.mockReset()
    mockSetDetail.mockReset()
  })

  it('shows skeleton while loading', () => {
    render(
      <MemoryRouter>
        <PracticeCatalog />
      </MemoryRouter>
    )
    expect(screen.getByText(/Practice Catalog/i)).toBeInTheDocument()
    expect(screen.getAllByText((_, el) => el?.className.includes('animate-pulse')).length).toBeGreaterThan(0)
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
