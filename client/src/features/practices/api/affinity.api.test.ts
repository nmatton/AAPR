import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './practices.api'
import { fetchMyPracticeAffinity, fetchTeamPracticeAffinity } from './affinity.api'

declare const global: typeof globalThis

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof global.fetch

afterEach(() => {
  vi.clearAllMocks()
})

describe('affinity.api', () => {
  it('calls individual affinity route with request id header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({
        status: 'ok',
        teamId: 5,
        practiceId: 12,
        score: 0.55,
        requestId: 'res-1'
      }))
    })

    const result = await fetchMyPracticeAffinity(5, 12, 'req-abc')

    expect(result.status).toBe('ok')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/teams/5/practices/12/affinity/me'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Request-Id': 'req-abc' })
      })
    )
  })

  it('calls team affinity route and parses status payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({
        status: 'insufficient_profile_data',
        teamId: 1,
        practiceId: 99,
        score: null,
        aggregation: { includedMembers: 0, excludedMembers: 3 }
      }))
    })

    const result = await fetchTeamPracticeAffinity(1, 99, 'req-team')

    expect(result.status).toBe('insufficient_profile_data')
    expect(result.score).toBeNull()
  })

  it('maps non-ok responses to ApiError', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ code: 'not_found', message: 'Missing' }))
    })

    await expect(fetchMyPracticeAffinity(1, 999)).rejects.toThrow(ApiError)
    await expect(fetchMyPracticeAffinity(1, 999)).rejects.toThrow('Missing')
  })
})
