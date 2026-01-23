import { create } from 'zustand'
import { getMembers, removeMember } from '../api/membersApi'
import type { TeamMemberSummary } from '../types/member.types'

const getErrorMeta = (error: unknown): { code?: string; statusCode?: number; message?: string } => {
  if (error && typeof error === 'object') {
    const maybeError = error as { code?: string; statusCode?: number; message?: string }
    return { code: maybeError.code, statusCode: maybeError.statusCode, message: maybeError.message }
  }

  return {}
}

/**
 * Members state interface
 */
export interface MembersState {
  members: TeamMemberSummary[]
  isLoading: boolean
  isRemoving: boolean
  error: string | null

  // Actions
  fetchMembers: (teamId: number) => Promise<void>
  removeTeamMember: (teamId: number, memberId: number) => Promise<void>
  reset: () => void
}

/**
 * Zustand store for members management
 */
export const useMembersStore = create<MembersState>((set) => ({
  members: [],
  isLoading: false,
  isRemoving: false,
  error: null,

  fetchMembers: async (teamId: number) => {
    set({ isLoading: true, error: null })
    try {
      const members = await getMembers(teamId)
      set({ members, isLoading: false })
    } catch (error: unknown) {
      const { code, statusCode, message } = getErrorMeta(error)
      let errorMessage = 'Failed to fetch members'

      if (statusCode === 401 || code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.'
      } else if (code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.'
      } else if (message) {
        errorMessage = message
      }

      set({
        error: errorMessage,
        isLoading: false
      })
    }
  },

  removeTeamMember: async (teamId: number, memberId: number) => {
    set({ isRemoving: true, error: null })
    try {
      await removeMember(teamId, memberId)
      // Remove from local state
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        isRemoving: false
      }))
    } catch (error: unknown) {
      const { code, statusCode, message } = getErrorMeta(error)
      let errorMessage = 'Failed to remove member'

      if (statusCode === 401 || code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.'
      } else if (code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.'
      } else if (message) {
        errorMessage = message
      }

      set({ error: errorMessage, isRemoving: false })
      throw error
    }
  },

  reset: () => set({ members: [], isLoading: false, isRemoving: false, error: null })
}))
