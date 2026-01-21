process.env.JWT_SECRET = 'test_secret_for_routes_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import request from 'supertest'
import { app } from '../app'
import * as coverageService from '../services/coverage.service'
import * as authService from '../services/auth.service'
import { prisma } from '../lib/prisma'

jest.mock('../services/coverage.service')
jest.mock('../services/auth.service', () => {
  const actual = jest.requireActual('../services/auth.service') as typeof import('../services/auth.service')
  return {
    ...actual,
    verifyToken: jest.fn()
  }
})

jest.mock('../lib/prisma', () => ({
  prisma: {
    teamMember: {
      findUnique: jest.fn()
    }
  }
}))

describe('teams routes - pillar coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(authService.verifyToken as jest.MockedFunction<typeof authService.verifyToken>).mockReturnValue({
      userId: 1,
      email: 'test@example.com'
    })
    ;(prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValue({
      id: 1,
      teamId: 1,
      userId: 1,
      role: 'member',
      joinedAt: new Date()
    })
  })

  it('GET /api/v1/teams/:teamId/coverage/pillars returns coverage data', async () => {
    ;(coverageService.getTeamPillarCoverage as jest.MockedFunction<typeof coverageService.getTeamPillarCoverage>)
      .mockResolvedValue({
        overallCoveragePct: 73.68,
        coveredCount: 14,
        totalCount: 19,
        coveredPillars: [{ id: 1, name: 'Communication', categoryId: 'values', categoryName: 'Human Values' }],
        gapPillars: [{ id: 2, name: 'Transparency', categoryId: 'values', categoryName: 'Human Values' }],
        categoryBreakdown: [
          {
            categoryId: 'values',
            categoryName: 'Human Values',
            coveredCount: 1,
            totalCount: 2,
            coveragePct: 50,
            coveredPillars: [{ id: 1, name: 'Communication', categoryId: 'values', categoryName: 'Human Values' }],
            gapPillars: [{ id: 2, name: 'Transparency', categoryId: 'values', categoryName: 'Human Values' }]
          }
        ]
      })

    const response = await request(app)
      .get('/api/v1/teams/1/coverage/pillars')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.overallCoveragePct).toBe(73.68)
    expect(response.body.coveredCount).toBe(14)
    expect(response.body.totalCount).toBe(19)
    expect(response.body.coveredPillars).toHaveLength(1)
    expect(response.body.gapPillars).toHaveLength(1)
    expect(response.body.categoryBreakdown).toBeDefined()
    expect(response.body.categoryBreakdown).toHaveLength(1)
    expect(response.body.categoryBreakdown[0].categoryName).toBe('Human Values')
    expect(response.body.requestId).toBeDefined()
  })

  it('returns 400 for invalid teamId', async () => {
    const response = await request(app)
      .get('/api/v1/teams/invalid/coverage/pillars')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    const response = await request(app)
      .get('/api/v1/teams/1/coverage/pillars')

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      code: expect.any(String),
      message: expect.any(String)
    })
  })

  it('returns 403 for non-member', async () => {
    ;(prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValueOnce(null)

    const response = await request(app)
      .get('/api/v1/teams/1/coverage/pillars')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(403)
  })
})
