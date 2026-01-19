import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './authSlice'
import * as authApi from '../api/authApi'

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastRefreshTime: undefined,
      login: useAuthStore.getState().login,
      logout: useAuthStore.getState().logout,
      refreshSession: useAuthStore.getState().refreshSession,
      setCurrentUser: useAuthStore.getState().setCurrentUser,
      setUser: useAuthStore.getState().setUser,
      setLoading: useAuthStore.getState().setLoading,
      setError: useAuthStore.getState().setError,
      reset: useAuthStore.getState().reset
    }, true)
    vi.restoreAllMocks()
  })

  it('login() calls authApi.loginUser and sets user', async () => {
    const mockUser = { id: 1, name: 'User', email: 'user@example.com', createdAt: '2026-01-19T10:00:00.000Z' }
    vi.spyOn(authApi, 'loginUser').mockResolvedValue({
      user: mockUser,
      message: 'Login successful'
    })

    await useAuthStore.getState().login('user@example.com', 'password123')

    expect(authApi.loginUser).toHaveBeenCalledWith('user@example.com', 'password123')
    expect(useAuthStore.getState().user).toEqual(mockUser)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('logout() calls authApi.logoutUser and resets state', async () => {
    vi.spyOn(authApi, 'logoutUser').mockResolvedValue({
      message: 'Logout successful'
    })

    useAuthStore.setState({
      user: { id: 2, name: 'Test', email: 'test@example.com', createdAt: '2026-01-19T10:00:00.000Z' },
      isAuthenticated: true
    })

    await useAuthStore.getState().logout()

    expect(authApi.logoutUser).toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('refreshSession() calls authApi.refreshAccessToken', async () => {
    vi.spyOn(authApi, 'refreshAccessToken').mockResolvedValue()

    await useAuthStore.getState().refreshSession()

    expect(authApi.refreshAccessToken).toHaveBeenCalled()
    expect(useAuthStore.getState().lastRefreshTime).toBeDefined()
  })

  it('persists user and isAuthenticated to localStorage', async () => {
    const mockUser = { id: 3, name: 'Persist', email: 'persist@example.com', createdAt: '2026-01-19T10:00:00.000Z' }
    useAuthStore.getState().setUser(mockUser)

    const stored = JSON.parse(localStorage.getItem('auth-storage') || '{}')

    expect(stored.state.user).toEqual(mockUser)
    expect(stored.state.isAuthenticated).toBe(true)
  })

  it('reset() clears state', () => {
    useAuthStore.setState({
      user: { id: 4, name: 'Clear', email: 'clear@example.com', createdAt: '2026-01-19T10:00:00.000Z' },
      isAuthenticated: true,
      error: 'error'
    })

    useAuthStore.getState().reset()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().error).toBeNull()
  })
})
