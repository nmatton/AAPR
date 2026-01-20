import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPractices, ApiError } from './practices.api'

declare const global: typeof globalThis

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof global.fetch

afterEach(() => {
  vi.clearAllMocks()
})

describe('fetchPractices', () => {
  it('returns parsed practices response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        requestId: 'req-1'
      }))
    })

    const data = await fetchPractices()
    expect(data.page).toBe(1)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/practices?page=1&pageSize=20'), expect.any(Object))
  })

  it('throws ApiError on network failure', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchPractices()).rejects.toThrow(ApiError)
  })

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ code: 'server_error', message: 'boom' }))
    })
    await expect(fetchPractices()).rejects.toThrow('boom')
  })
})
