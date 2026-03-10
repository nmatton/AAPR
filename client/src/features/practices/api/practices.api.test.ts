import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPractices, logCatalogSearched, logAffinityDisplayed, ApiError } from './practices.api'

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

  it('adds search and pillar query params', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        requestId: 'req-2'
      }))
    })

    await fetchPractices(1, 20, 'standup', [5, 8])
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/practices?page=1&pageSize=20&search=standup&pillars=5%2C8'),
      expect.any(Object)
    )
  })
})

describe('logCatalogSearched', () => {
  it('posts catalog searched event', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('')
    })

    await logCatalogSearched({
      teamId: 1,
      query: 'standup',
      pillarsSelected: [5],
      timestamp: '2026-01-20T00:00:00.000Z'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('logAffinityDisplayed', () => {
  it('posts affinity.displayed event payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('')
    })

    await logAffinityDisplayed({
      context: 'catalog',
      teamId: 1,
      userId: 42,
      practiceCount: 10,
      timestamp: '2026-03-09T00:00:00.000Z'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events'),
      expect.objectContaining({ method: 'POST' })
    )

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.body as string).toContain('affinity.displayed')
  })
})
