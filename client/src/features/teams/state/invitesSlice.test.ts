import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInvitesStore } from '../state/invitesSlice'
import * as invitesApi from '../api/invitesApi'

vi.mock('../api/invitesApi')

const mockInvites = [
  {
    id: 1,
    teamId: 1,
    email: 'pending@example.com',
    status: 'Pending' as const,
    createdAt: '2025-01-10T00:00:00Z'
  },
  {
    id: 2,
    teamId: 1,
    email: 'failed@example.com',
    status: 'Failed' as const,
    createdAt: '2025-01-09T00:00:00Z'
  }
]

const mockNewInvite = {
  id: 3,
  teamId: 1,
  email: 'new@example.com',
  status: 'Pending' as const,
  createdAt: '2025-01-11T00:00:00Z'
}

describe('invitesSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useInvitesStore.setState({
      invites: [],
      isLoading: false,
      isCreating: false,
      isResending: false,
      error: null
    })
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useInvitesStore())

    expect(result.current.invites).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isCreating).toBe(false)
    expect(result.current.isResending).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches invites successfully', async () => {
    vi.mocked(invitesApi.getInvites).mockResolvedValue(mockInvites)

    const { result } = renderHook(() => useInvitesStore())

    await act(async () => {
      await result.current.fetchInvites(1)
    })

    expect(result.current.invites).toEqual(mockInvites)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading state while fetching', async () => {
    vi.mocked(invitesApi.getInvites).mockImplementation(
      () => new Promise<typeof mockInvites>((resolve) => setTimeout(() => resolve(mockInvites), 100))
    )

    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      void result.current.fetchInvites(1)
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150))
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('handles fetch error', async () => {
    const error = {
      code: 'network_error',
      message: 'Connection failed',
      statusCode: 500
    }
    vi.mocked(invitesApi.getInvites).mockRejectedValue(error)

    const { result } = renderHook(() => useInvitesStore())

    await act(async () => {
      await result.current.fetchInvites(1)
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Connection failed')
    })
    expect(result.current.invites).toEqual([])
  })

  it('creates invite successfully', async () => {
    vi.mocked(invitesApi.createInvite).mockResolvedValue(mockNewInvite)

    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      useInvitesStore.setState({ invites: mockInvites })
    })

    let createdInvite: any

    await act(async () => {
      createdInvite = await result.current.createNewInvite(1, 'new@example.com')
    })

    expect(createdInvite).toEqual(mockNewInvite)
    expect(result.current.invites).toContain(mockNewInvite)
    expect(result.current.isCreating).toBe(false)
  })

  it('sets creating state while creating invite', async () => {
    vi.mocked(invitesApi.createInvite).mockImplementation(
      () => new Promise<typeof mockNewInvite>((resolve) => setTimeout(() => resolve(mockNewInvite), 100))
    )

    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      void result.current.createNewInvite(1, 'new@example.com')
    })

    expect(result.current.isCreating).toBe(true)
  })

  it('handles create error', async () => {
    const error = {
      code: 'duplicate_invite',
      message: 'This email has already been invited.',
      statusCode: 400
    }
    vi.mocked(invitesApi.createInvite).mockRejectedValue(error)

    const { result } = renderHook(() => useInvitesStore())

    await act(async () => {
      try {
        await result.current.createNewInvite(1, 'duplicate@example.com')
      } catch {
        // swallow
      }
    })

    await waitFor(() => {
      expect(result.current.error).toContain('already been invited')
    })
  })

  it('handles invalid email error', async () => {
    const error = {
      code: 'invalid_email',
      message: 'Invalid email address.',
      statusCode: 400
    }
    vi.mocked(invitesApi.createInvite).mockRejectedValue(error)

    const { result } = renderHook(() => useInvitesStore())

    await act(async () => {
      try {
        await result.current.createNewInvite(1, 'invalid')
      } catch {
        // swallow
      }
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Invalid email')
    })
  })

  it('resends invite successfully', async () => {
    const updatedInvite = { ...mockInvites[1], status: 'Pending' as const }
    vi.mocked(invitesApi.resendInvite).mockResolvedValue(updatedInvite)

    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      useInvitesStore.setState({ invites: mockInvites })
    })

    await act(async () => {
      await result.current.resendInviteEmail(1, 2)
    })

    const resendedInvite = result.current.invites.find((i) => i.id === 2)
    expect(resendedInvite).toEqual(updatedInvite)
    expect(result.current.isResending).toBe(false)
  })

  it('sets resending state while resending', async () => {
    vi.mocked(invitesApi.resendInvite).mockImplementation(
      () => new Promise<typeof mockInvites[0]>((resolve) => setTimeout(() => resolve(mockInvites[0]), 100))
    )

    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      useInvitesStore.setState({ invites: mockInvites })
    })

    act(() => {
      void result.current.resendInviteEmail(1, 1)
    })

    expect(result.current.isResending).toBe(true)
  })

  it('handles resend error', async () => {
    const error = {
      code: 'network_error',
      message: 'Connection failed',
      statusCode: 500
    }
    vi.mocked(invitesApi.resendInvite).mockRejectedValue(error)

    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      useInvitesStore.setState({ invites: mockInvites })
    })

    await act(async () => {
      try {
        await result.current.resendInviteEmail(1, 1)
      } catch {
        // swallow
      }
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Connection failed')
    })
  })

  it('resets state', () => {
    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      useInvitesStore.setState({
        invites: mockInvites,
        isLoading: true,
        isCreating: true,
        error: 'Some error'
      })
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.invites).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isCreating).toBe(false)
    expect(result.current.isResending).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('calls API with correct parameters', async () => {
    vi.mocked(invitesApi.getInvites).mockResolvedValue(mockInvites)

    const { result } = renderHook(() => useInvitesStore())

    await act(async () => {
      await result.current.fetchInvites(42)
    })

    expect(vi.mocked(invitesApi.getInvites)).toHaveBeenCalledWith(42)
  })

  it('handles session expired during create', async () => {
    const error = {
      code: 'session_expired',
      statusCode: 401
    }
    vi.mocked(invitesApi.createInvite).mockRejectedValue(error)

    const { result } = renderHook(() => useInvitesStore())

    await act(async () => {
      try {
        await result.current.createNewInvite(1, 'test@example.com')
      } catch {
        // swallow
      }
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Session expired')
    })
  })

  it('maintains existing invites when adding new one', async () => {
    vi.mocked(invitesApi.createInvite).mockResolvedValue(mockNewInvite)

    const { result } = renderHook(() => useInvitesStore())

    act(() => {
      useInvitesStore.setState({ invites: mockInvites })
    })

    await act(async () => {
      await result.current.createNewInvite(1, 'new@example.com')
    })

    expect(result.current.invites).toHaveLength(3)
    expect(result.current.invites).toContain(mockInvites[0])
    expect(result.current.invites).toContain(mockInvites[1])
    expect(result.current.invites).toContain(mockNewInvite)
  })
})
