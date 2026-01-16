import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../api/authApi'

/**
 * Authentication state
 */
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Authentication actions
 */
interface AuthActions {
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
  error: null
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
