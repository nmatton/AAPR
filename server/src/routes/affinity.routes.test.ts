process.env.JWT_SECRET = 'test_secret_for_routes_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import request from 'supertest'
import { app } from '../app'
import * as authService from '../services/auth.service'
import { prisma } from '../lib/prisma'

jest.mock('../services/auth.service', () => {
  const actual = jest.requireActual('../services/auth.service') as typeof import('../services/auth.service')
  return {
    ...actual,
    verifyToken: jest.fn(),
  }
})

jest.mock('../lib/prisma', () => ({
  prisma: {
    teamMember: {
      findUnique: jest.fn(),
    },
    practice: {
      findFirst: jest.fn(),
    },
    bigFiveScore: {
      findUnique: jest.fn(),
    },
  },
}))

describe('affinity routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(authService.verifyToken as jest.MockedFunction<typeof authService.verifyToken>).mockReturnValue({
      userId: 1,
      email: 'test@example.com',
    })

    ;(prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValue({
      id: 1,
      teamId: 1,
      userId: 1,
      role: 'member',
      joinedAt: new Date(),
    })

    ;(prisma.practice.findFirst as jest.MockedFunction<typeof prisma.practice.findFirst>).mockResolvedValue({
      id: 42,
      tags: ['Verbal-Heavy'],
    } as never)
  })

  it('GET /api/v1/teams/:teamId/practices/:practiceId/affinity/me returns ok payload with requestId', async () => {
    ;(prisma.bigFiveScore.findUnique as jest.MockedFunction<typeof prisma.bigFiveScore.findUnique>).mockResolvedValue({
      id: 1,
      userId: 1,
      extraversion: 30,
      agreeableness: 36,
      conscientiousness: 33,
      neuroticism: 24,
      openness: 38,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/42/affinity/me')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.teamId).toBe(1)
    expect(response.body.practiceId).toBe(42)
    expect(response.body.scale).toEqual({ min: -1, max: 1 })
    expect(response.body.requestId).toBeDefined()
    expect(response.body.explanation.mappedTags).toContain('Verbal-Heavy')
  })

  it('returns insufficient_profile_data when user has no Big Five score', async () => {
    ;(prisma.bigFiveScore.findUnique as jest.MockedFunction<typeof prisma.bigFiveScore.findUnique>).mockResolvedValue(null)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/42/affinity/me')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('insufficient_profile_data')
    expect(response.body.score).toBeNull()
  })

  it('returns no_tag_mapping when practice tags have no relation mapping', async () => {
    ;(prisma.practice.findFirst as jest.MockedFunction<typeof prisma.practice.findFirst>).mockResolvedValue({
      id: 42,
      tags: ['Totally Unknown Tag'],
    } as never)

    ;(prisma.bigFiveScore.findUnique as jest.MockedFunction<typeof prisma.bigFiveScore.findUnique>).mockResolvedValue({
      id: 1,
      userId: 1,
      extraversion: 30,
      agreeableness: 36,
      conscientiousness: 33,
      neuroticism: 24,
      openness: 38,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/42/affinity/me')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('no_tag_mapping')
    expect(response.body.score).toBeNull()
    expect(response.body.explanation.unmappedTags).toContain('Totally Unknown Tag')
  })

  it('returns 404 when practice is not accessible in current team context', async () => {
    ;(prisma.practice.findFirst as jest.MockedFunction<typeof prisma.practice.findFirst>).mockResolvedValue(null)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/999/affinity/me')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('not_found')
  })

  it('returns 401 when auth token is missing', async () => {
    const response = await request(app).get('/api/v1/teams/1/practices/42/affinity/me')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('missing_token')
  })
})
