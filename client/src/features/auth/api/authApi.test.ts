import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as authApi from './authApi'

describe('authApi race condition handling', () => {
  beforeEach(() => {
    authApi.__test__.resetRefreshPromise()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle multiple simultaneous refresh calls without duplicate requests', async () => {
    let fetchCallCount = 0

    // Mock global fetch to track how many times it's called
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      if (urlString.includes('/api/v1/auth/refresh')) {
        fetchCallCount++
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ message: 'Token refreshed' })
        } as Response
      }
      return originalFetch(url as RequestInfo | URL)
    }) as typeof fetch

    // Call refreshAccessToken 3 times simultaneously
    const promises = [
      authApi.refreshAccessToken(),
      authApi.refreshAccessToken(),
      authApi.refreshAccessToken()
    ]

    // Wait for all to complete
    await Promise.all(promises)

    // Verify only ONE fetch call was made (race condition handled)
    expect(fetchCallCount).toBe(1)

    global.fetch = originalFetch
  })

  it('should allow subsequent refresh after first completes', async () => {
    let fetchCallCount = 0

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      if (urlString.includes('/api/v1/auth/refresh')) {
        fetchCallCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ message: 'Token refreshed' })
        } as Response
      }
      return originalFetch(url as RequestInfo | URL)
    }) as typeof fetch

    // First refresh
    await authApi.refreshAccessToken()
    expect(fetchCallCount).toBe(1)

    // Second refresh (should be allowed after first completes)
    await authApi.refreshAccessToken()
    expect(fetchCallCount).toBe(2)

    global.fetch = originalFetch
  })

  it('should reset refreshPromise after failure', async () => {
    let fetchCallCount = 0

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      if (urlString.includes('/api/v1/auth/refresh')) {
        fetchCallCount++
        return {
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ code: 'invalid_token', message: 'Invalid token' })
        } as Response
      }
      return originalFetch(url as RequestInfo | URL)
    }) as typeof fetch

    // First refresh (fails)
    try {
      await authApi.refreshAccessToken()
    } catch (error) {
      // Expected to fail
    }
    expect(fetchCallCount).toBe(1)

    // Second refresh (should be allowed after first fails)
    try {
      await authApi.refreshAccessToken()
    } catch (error) {
      // Expected to fail
    }
    expect(fetchCallCount).toBe(2)

    global.fetch = originalFetch
  })
})

describe('authApi forgot/reset methods', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forgotPassword returns success payload', async () => {
    const originalFetch = global.fetch
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ message: 'If an account exists for that email, a reset link has been sent.' })
      } as Response) as typeof fetch

      const result = await authApi.forgotPassword('user@example.com')
      expect(result.message).toContain('If an account exists')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('resetPassword bubbles API error payload', async () => {
    const originalFetch = global.fetch
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ code: 'invalid_reset_token', message: 'Reset token is invalid or expired' })
      } as Response) as typeof fetch

      await expect(authApi.resetPassword('bad-token', 'newpassword123')).rejects.toMatchObject({
        code: 'invalid_reset_token',
        message: 'Reset token is invalid or expired'
      })
    } finally {
      global.fetch = originalFetch
    }
  })
})
