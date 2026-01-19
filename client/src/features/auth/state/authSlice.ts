import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, loginUser, logoutUser, refreshAccessToken } from '../api/authApi'

/**
 * Authentication state
 */
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  lastRefreshTime?: number
}

/**
 * Authentication actions
 */
interface AuthActions {
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  setCurrentUser: (user: User) => void
  setUser: (user: User) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

/**
 * Initial authentication state
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastRefreshTime: undefined
}

/**
 * Zustand store for authentication state
 * CRITICAL: Persists only non-sensitive data (user ID, name, email)
 * Tokens are stored in HTTP-only cookies (backend sets)
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await loginUser(email, password)
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          return response.user
        } catch (error) {
          const message = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: string }).message)
            : 'Login failed. Please try again.'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await logoutUser()
        } finally {
          set(initialState)
        }
      },

      refreshSession: async () => {
        try {
          await refreshAccessToken()
          set({ lastRefreshTime: Date.now() })
        } catch (error) {
          // If refresh fails, reset auth state and throw for caller to handle
          set(initialState)
          throw error
        }
      },

      setCurrentUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }),

      setLoading: (isLoading) =>
        set({ isLoading }),

      setError: (error) =>
        set({
          error,
          isLoading: false
        }),

      reset: () => set(initialState)
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist user data (not tokens)
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
