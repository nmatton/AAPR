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
      findMany: jest.fn(),
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

describe('GET /api/v1/teams/:teamId/practices/:practiceId/affinity/team', () => {
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

  it('returns ok payload with team score when members have profiles', async () => {
    ;(prisma.teamMember.findMany as jest.MockedFunction<typeof prisma.teamMember.findMany>).mockResolvedValue([
      {
        userId: 1,
        user: {
          bigFiveScore: {
            id: 1, userId: 1,
            extraversion: 30, agreeableness: 36, conscientiousness: 33,
            neuroticism: 24, openness: 38,
            createdAt: new Date(), updatedAt: new Date(),
          },
        },
      },
      {
        userId: 2,
        user: {
          bigFiveScore: {
            id: 2, userId: 2,
            extraversion: 32, agreeableness: 38, conscientiousness: 35,
            neuroticism: 20, openness: 40,
            createdAt: new Date(), updatedAt: new Date(),
          },
        },
      },
    ] as never)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/42/affinity/team')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.teamId).toBe(1)
    expect(response.body.practiceId).toBe(42)
    expect(response.body.scale).toEqual({ min: -1, max: 1 })
    expect(response.body.aggregation.includedMembers).toBe(2)
    expect(response.body.requestId).toBeDefined()
    expect(response.body.explanation).toHaveProperty('topPositiveTags')
    expect(response.body.explanation).toHaveProperty('topNegativeTags')
  })

  it('returns insufficient_profile_data when no members have profiles', async () => {
    ;(prisma.teamMember.findMany as jest.MockedFunction<typeof prisma.teamMember.findMany>).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: null } },
      { userId: 2, user: { bigFiveScore: null } },
    ] as never)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/42/affinity/team')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('insufficient_profile_data')
    expect(response.body.score).toBeNull()
    expect(response.body.aggregation.includedMembers).toBe(0)
  })

  it('returns 404 when practice does not exist', async () => {
    ;(prisma.practice.findFirst as jest.MockedFunction<typeof prisma.practice.findFirst>).mockResolvedValue(null)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/999/affinity/team')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('not_found')
  })

  it('returns 401 when auth token is missing', async () => {
    const response = await request(app).get('/api/v1/teams/1/practices/42/affinity/team')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('missing_token')
  })

  it('privacy: response does not contain traitContributions or individual data', async () => {
    ;(prisma.teamMember.findMany as jest.MockedFunction<typeof prisma.teamMember.findMany>).mockResolvedValue([
      {
        userId: 1,
        user: {
          bigFiveScore: {
            id: 1, userId: 1,
            extraversion: 30, agreeableness: 36, conscientiousness: 33,
            neuroticism: 24, openness: 38,
            createdAt: new Date(), updatedAt: new Date(),
          },
        },
      },
    ] as never)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/42/affinity/team')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    const bodyStr = JSON.stringify(response.body)
    expect(bodyStr).not.toContain('traitContributions')
    expect(bodyStr).not.toContain('"userId"')
    expect(bodyStr).not.toContain('tagScores')
  })

  it('downstream contract: returns stable aggregation payload for coverage-first, affinity-second consumers', async () => {
    ;(prisma.teamMember.findMany as jest.MockedFunction<typeof prisma.teamMember.findMany>).mockResolvedValue([
      {
        userId: 1,
        user: {
          bigFiveScore: {
            id: 1, userId: 1,
            extraversion: 30, agreeableness: 36, conscientiousness: 33,
            neuroticism: 24, openness: 38,
            createdAt: new Date(), updatedAt: new Date(),
          },
        },
      },
      { userId: 2, user: { bigFiveScore: null } },
    ] as never)

    const response = await request(app)
      .get('/api/v1/teams/1/practices/42/affinity/team')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({
      status: 'ok',
      teamId: 1,
      practiceId: 42,
      score: expect.any(Number),
      scale: { min: -1, max: 1 },
      aggregation: {
        includedMembers: 1,
        excludedMembers: 1,
      },
      explanation: expect.objectContaining({
        topPositiveTags: expect.any(Array),
        topNegativeTags: expect.any(Array),
      }),
      requestId: expect.any(String),
    }))
  })
})
