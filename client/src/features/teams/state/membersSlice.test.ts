import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMembersStore } from '../state/membersSlice'
import * as membersApi from '../api/membersApi'

vi.mock('../api/membersApi')

const mockMembers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    joinDate: '2025-01-01T00:00:00Z',
    inviteStatus: 'Added' as const,
    bigFiveCompleted: true
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    joinDate: '2025-01-05T00:00:00Z',
    inviteStatus: 'Added' as const,
    bigFiveCompleted: false
  }
]

describe('membersSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useMembersStore.setState({
      members: [],
      isLoading: false,
      isRemoving: false,
      error: null
    })
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useMembersStore())

    expect(result.current.members).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isRemoving).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches members successfully', async () => {
    vi.mocked(membersApi.getMembers).mockResolvedValue(mockMembers)

    const { result } = renderHook(() => useMembersStore())

    await act(async () => {
      await result.current.fetchMembers(1)
    })

    expect(result.current.members).toEqual(mockMembers)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading state while fetching', async () => {
    vi.mocked(membersApi.getMembers).mockImplementation(
      () => new Promise<typeof mockMembers>((resolve) => setTimeout(() => resolve(mockMembers), 100))
    )

    const { result } = renderHook(() => useMembersStore())

    act(() => {
      void result.current.fetchMembers(1)
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
      message: 'Connection failed. Check your internet and retry.',
      statusCode: 500
    }
    vi.mocked(membersApi.getMembers).mockRejectedValue(error)

    const { result } = renderHook(() => useMembersStore())

    await act(async () => {
      await result.current.fetchMembers(1)
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Connection failed')
    })
    expect(result.current.members).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('handles session expired error', async () => {
    const error = {
      code: 'session_expired',
      statusCode: 401
    }
    vi.mocked(membersApi.getMembers).mockRejectedValue(error)

    const { result } = renderHook(() => useMembersStore())

    await act(async () => {
      await result.current.fetchMembers(1)
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Session expired')
    })
  })

  it('removes member successfully', async () => {
    vi.mocked(membersApi.removeMember).mockResolvedValue(true)

    const { result } = renderHook(() => useMembersStore())

    // Set initial members
    act(() => {
      useMembersStore.setState({ members: mockMembers })
    })

    await act(async () => {
      await result.current.removeTeamMember(1, 1)
    })

    expect(result.current.members).toEqual([mockMembers[1]])
    expect(result.current.isRemoving).toBe(false)
  })

  it('sets removing state while removing member', async () => {
    vi.mocked(membersApi.removeMember).mockImplementation(
      () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 100))
    )

    const { result } = renderHook(() => useMembersStore())

    act(() => {
      useMembersStore.setState({ members: mockMembers })
    })

    act(() => {
      void result.current.removeTeamMember(1, 1)
    })

    expect(result.current.isRemoving).toBe(true)
  })

  it('handles remove error', async () => {
    const error = {
      code: 'network_error',
      message: 'Connection failed',
      statusCode: 500
    }
    vi.mocked(membersApi.removeMember).mockRejectedValue(error)

    const { result } = renderHook(() => useMembersStore())

    act(() => {
      useMembersStore.setState({ members: mockMembers })
    })

    await act(async () => {
      try {
        await result.current.removeTeamMember(1, 1)
      } catch {
        // swallow
      }
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Connection failed')
    })
    // Members should not be removed
    expect(result.current.members).toEqual(mockMembers)
  })

  it('resets state', () => {
    const { result } = renderHook(() => useMembersStore())

    act(() => {
      useMembersStore.setState({
        members: mockMembers,
        isLoading: false,
        error: 'Some error'
      })
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.members).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isRemoving).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('calls API with correct parameters', async () => {
    vi.mocked(membersApi.getMembers).mockResolvedValue(mockMembers)

    const { result } = renderHook(() => useMembersStore())

    await act(async () => {
      await result.current.fetchMembers(42)
    })

    expect(vi.mocked(membersApi.getMembers)).toHaveBeenCalledWith(42)
  })

  it('removes only the specified member', async () => {
    vi.mocked(membersApi.removeMember).mockResolvedValue(true)

    const { result } = renderHook(() => useMembersStore())

    act(() => {
      useMembersStore.setState({ members: mockMembers })
    })

    await act(async () => {
      await result.current.removeTeamMember(1, 2)
    })

    expect(result.current.members).toEqual([mockMembers[0]])
  })
})
