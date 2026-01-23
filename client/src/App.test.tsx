import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import * as authApi from './features/auth/api/authApi'
import * as teamsApi from './features/teams/api/teamsApi'
import { useAuthStore } from './features/auth/state/authSlice'

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  createdAt: '2026-01-19T10:00:00.000Z'
}

describe('App auth flow integration', () => {
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

  it('login redirects to /teams', async () => {
    vi.spyOn(authApi, 'loginUser').mockResolvedValue({
      user: mockUser,
      message: 'Login successful'
    })
    vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({
      ...mockUser,
      requestId: 'req-1'
    })
    vi.spyOn(teamsApi, 'getTeams').mockResolvedValue([])

    window.history.pushState({}, '', '/login')
    render(<App />)

    await userEvent.type(screen.getByLabelText(/email address/i), mockUser.email)
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    await waitFor(() => expect(signInButton).toBeEnabled())
    await userEvent.click(signInButton)

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    await waitFor(() => {
      expect(authApi.getCurrentUser).toHaveBeenCalled()
    })

    expect(await screen.findByText('My Teams')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create team/i })).toBeInTheDocument()
  })

  it('restores session on refresh and stays on /teams', async () => {
    vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({
      ...mockUser,
      requestId: 'req-1'
    })
    vi.spyOn(teamsApi, 'getTeams').mockResolvedValue([])

    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true
    })

    window.history.pushState({}, '', '/teams')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Teams', level: 1 })).toBeInTheDocument()
    })
  })

  it('logout redirects to /login', async () => {
    vi.spyOn(authApi, 'logoutUser').mockResolvedValue({
      message: 'Logout successful'
    })
    vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({
      ...mockUser,
      requestId: 'req-1'
    })
    vi.spyOn(teamsApi, 'getTeams').mockResolvedValue([])

    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true
    })

    window.history.pushState({}, '', '/teams')
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /logout/i }))

    expect(await screen.findByText(/sign in to your account/i)).toBeInTheDocument()
  })
})
