process.env.JWT_SECRET = 'test_secret_for_admin_stats_route_12345678901234567890'
process.env.ADMIN_API_KEY = 'test-admin-key'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import request from 'supertest'
import { app } from '../app'
import * as adminStatsService from '../services/admin-stats.service'

jest.mock('../services/admin-stats.service', () => ({
  getGlobalPlatformStats: jest.fn(),
}))

describe('admin stats route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ADMIN_API_KEY = 'test-admin-key'
  })

  it('GET /api/v1/admin/stats returns JSON payload when API key is valid', async () => {
    ;(adminStatsService.getGlobalPlatformStats as jest.MockedFunction<typeof adminStatsService.getGlobalPlatformStats>).mockResolvedValue({
      generatedAt: '2026-03-16T10:00:00.000Z',
      totals: {
        users: 3,
        teams: 2,
        issues: 4,
        teamPracticeLinks: 5,
      },
      issuesByStatus: {
        open: 1,
        in_progress: 1,
        adaptation_in_progress: 1,
        evaluated: 1,
        done: 0,
      },
      teams: [],
    })

    const response = await request(app)
      .get('/api/v1/admin/stats')
      .set('X-API-KEY', 'test-admin-key')

    expect(response.status).toBe(200)
    expect(response.body.totals.users).toBe(3)
    expect(adminStatsService.getGlobalPlatformStats).toHaveBeenCalledTimes(1)
  })

  it('returns 401 when X-API-KEY header is missing', async () => {
    const response = await request(app).get('/api/v1/admin/stats')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('invalid_api_key')
  })

  it('returns 401 when X-API-KEY is invalid', async () => {
    const response = await request(app)
      .get('/api/v1/admin/stats')
      .set('X-API-KEY', 'wrong-key')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('invalid_api_key')
  })

  it('returns 500 when ADMIN_API_KEY is not configured', async () => {
    delete process.env.ADMIN_API_KEY

    const response = await request(app)
      .get('/api/v1/admin/stats')
      .set('X-API-KEY', 'test-admin-key')

    expect(response.status).toBe(500)
    expect(response.body.code).toBe('server_misconfigured')
    expect(response.body.details).toEqual({ field: 'ADMIN_API_KEY' })
  })
})
