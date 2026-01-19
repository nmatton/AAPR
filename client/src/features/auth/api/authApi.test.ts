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
