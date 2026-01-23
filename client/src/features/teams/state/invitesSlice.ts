import { create } from 'zustand'
import { getInvites, createInvite, resendInvite } from '../api/invitesApi'
import type { TeamInvite } from '../types/invite.types'

const getErrorMeta = (error: unknown): { code?: string; statusCode?: number; message?: string } => {
  if (error && typeof error === 'object') {
    const maybeError = error as { code?: string; statusCode?: number; message?: string }
    return { code: maybeError.code, statusCode: maybeError.statusCode, message: maybeError.message }
  }

  return {}
}

/**
 * Invites state interface
 */
export interface InvitesState {
  invites: TeamInvite[]
  isLoading: boolean
  isCreating: boolean
  isResending: boolean
  error: string | null

  // Actions
  fetchInvites: (teamId: number) => Promise<void>
  createNewInvite: (teamId: number, email: string) => Promise<TeamInvite>
  resendInviteEmail: (teamId: number, inviteId: number) => Promise<void>
  reset: () => void
}

/**
 * Zustand store for invites management
 */
export const useInvitesStore = create<InvitesState>((set) => ({
  invites: [],
  isLoading: false,
  isCreating: false,
  isResending: false,
  error: null,

  fetchInvites: async (teamId: number) => {
    set({ isLoading: true, error: null })
    try {
      const invites = await getInvites(teamId)
      set({ invites, isLoading: false })
    } catch (error: unknown) {
      const { code, statusCode, message } = getErrorMeta(error)
      let errorMessage = 'Failed to fetch invites'

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

  createNewInvite: async (teamId: number, email: string) => {
    set({ isCreating: true, error: null })
    try {
      const invite = await createInvite(teamId, email)
      // Add to local state
      set((state) => ({
        invites: [...state.invites, invite],
        isCreating: false
      }))
      return invite
    } catch (error: unknown) {
      const { code, statusCode, message } = getErrorMeta(error)
      let errorMessage = 'Failed to send invite'

      if (statusCode === 401 || code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.'
      } else if (code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.'
      } else if (code === 'duplicate_invite') {
        errorMessage = 'This email has already been invited.'
      } else if (code === 'invalid_email') {
        errorMessage = 'Invalid email address.'
      } else if (message) {
        errorMessage = message
      }

      set({ error: errorMessage, isCreating: false })
      throw error
    }
  },

  resendInviteEmail: async (teamId: number, inviteId: number) => {
    set({ isResending: true, error: null })
    try {
      const updatedInvite = await resendInvite(teamId, inviteId)
      // Update in local state
      set((state) => ({
        invites: state.invites.map((invite) =>
          invite.id === inviteId ? updatedInvite : invite
        ),
        isResending: false
      }))
    } catch (error: unknown) {
      const { code, statusCode, message } = getErrorMeta(error)
      let errorMessage = 'Failed to resend invite'

      if (statusCode === 401 || code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.'
      } else if (code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.'
      } else if (message) {
        errorMessage = message
      }

      set({ error: errorMessage, isResending: false })
      throw error
    }
  },

  reset: () => set({ invites: [], isLoading: false, isCreating: false, isResending: false, error: null })
}))
