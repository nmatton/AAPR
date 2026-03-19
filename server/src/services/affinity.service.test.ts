process.env.JWT_SECRET = 'test_secret_for_service_12345678901234567890'

import { getTeamPracticeAffinity } from './affinity.service'
import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'

jest.mock('../lib/prisma', () => ({
  prisma: {
    practice: { findFirst: jest.fn() },
    bigFiveScore: { findUnique: jest.fn() },
    teamMember: { findMany: jest.fn() },
  },
}))

// Standard Big Five raw scores (sum values, not averages)
const makeBigFive = (e: number, a: number, c: number, n: number, o: number) => ({
  id: 1,
  userId: 1,
  extraversion: e,
  agreeableness: a,
  conscientiousness: c,
  neuroticism: n,
  openness: o,
  createdAt: new Date(),
  updatedAt: new Date(),
})

// Standard profile: mid-range values → sums that produce ~3.5 averages
const PROFILE_MID = makeBigFive(28, 32, 32, 24, 35) // E=3.5, A=3.56, C=3.56, N=3.0, O=3.5
const PROFILE_HIGH = makeBigFive(36, 40, 38, 16, 42) // E=4.5, A=4.44, C=4.22, N=2.0, O=4.2
const PROFILE_LOW = makeBigFive(16, 18, 18, 32, 20) // E=2.0, A=2.0, C=2.0, N=4.0, O=2.0

const PRACTICE_WITH_TAGS = {
  id: 42,
  tags: ['Verbal-Heavy', 'High-Autonomy'],
}

describe('getTeamPracticeAffinity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns insufficient_profile_data when no team members exist', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('insufficient_profile_data')
    expect(result.score).toBeNull()
    expect(result.aggregation).toEqual({ includedMembers: 0, excludedMembers: 0 })
      expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
        where: { teamId: 1, user: { isAdminMonitor: false } },
        select: {
          userId: true,
          user: {
            select: {
              bigFiveScore: true,
            },
          },
        },
      })
  })

  it('returns insufficient_profile_data when all members lack Big Five profiles', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: null } },
      { userId: 2, user: { bigFiveScore: null } },
      { userId: 3, user: { bigFiveScore: null } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('insufficient_profile_data')
    expect(result.score).toBeNull()
    expect(result.aggregation).toEqual({ includedMembers: 0, excludedMembers: 3 })
  })

  it('returns insufficient_profile_data when effective member set is empty after admin-monitor exclusion', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    // Repository-layer query excludes admin-monitor users, so service receives no effective members.
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('insufficient_profile_data')
    expect(result.score).toBeNull()
    expect(result.aggregation).toEqual({ includedMembers: 0, excludedMembers: 0 })
  })

  it('calculates correct team score when all members are eligible (N=3)', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      { userId: 2, user: { bigFiveScore: { ...PROFILE_HIGH, userId: 2 } } },
      { userId: 3, user: { bigFiveScore: { ...PROFILE_LOW, userId: 3 } } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('ok')
    expect(result.score).not.toBeNull()
    expect(result.score!).toBeGreaterThanOrEqual(-1)
    expect(result.score!).toBeLessThanOrEqual(1)
    expect(result.aggregation).toEqual({ includedMembers: 3, excludedMembers: 0 })
    expect(result.scale).toEqual({ min: -1, max: 1 })
  })

  it('excludes members without profiles and calculates from eligible only', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      { userId: 2, user: { bigFiveScore: null } },
      { userId: 3, user: { bigFiveScore: { ...PROFILE_HIGH, userId: 3 } } },
      { userId: 4, user: { bigFiveScore: null } },
      { userId: 5, user: { bigFiveScore: null } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('ok')
    expect(result.aggregation).toEqual({ includedMembers: 2, excludedMembers: 3 })
  })

  it('returns single member score when only one eligible member', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      { userId: 2, user: { bigFiveScore: null } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('ok')
    expect(result.aggregation).toEqual({ includedMembers: 1, excludedMembers: 1 })
    // Team score for a single member should equal their individual score
    expect(result.score).not.toBeNull()
  })

  it('team score is arithmetic mean of individual scores', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)

    // Two members with same profile → team score should equal individual score
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      { userId: 2, user: { bigFiveScore: { ...PROFILE_MID, userId: 2 } } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('ok')
    // With identical profiles, team score = individual score
    expect(result.aggregation).toEqual({ includedMembers: 2, excludedMembers: 0 })
  })

  it('throws not_found when practice does not exist', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(null)

    await expect(getTeamPracticeAffinity(1, 999)).rejects.toThrow(AppError)
    await expect(getTeamPracticeAffinity(1, 999)).rejects.toMatchObject({
      code: 'not_found',
      statusCode: 404,
    })
  })

  it('handles practice with unmapped tags gracefully', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue({
      id: 42,
      tags: ['Totally Unknown Tag'],
    })
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    // Member has profile but no tags map → excluded from aggregation
    expect(result.status).toBe('insufficient_profile_data')
    expect(result.score).toBeNull()
  })

  it('handles empty practice tags array as insufficient_profile_data at team level', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue({
      id: 42,
      tags: [],
    })
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('insufficient_profile_data')
    expect(result.score).toBeNull()
    expect(result.aggregation).toEqual({ includedMembers: 0, excludedMembers: 1 })
  })

  it('queries practice with global-or-team access rule for downstream recommendation compatibility', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
    ])

    await getTeamPracticeAffinity(7, 42)

    expect(prisma.practice.findFirst).toHaveBeenCalledWith({
      where: {
        id: 42,
        OR: [{ isGlobal: true }, { teamPractices: { some: { teamId: 7 } } }],
      },
      select: { id: true, tags: true },
    })
  })

  it('rounds team score to 4 decimal places', async () => {
    ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      { userId: 2, user: { bigFiveScore: { ...PROFILE_HIGH, userId: 2 } } },
    ])

    const result = await getTeamPracticeAffinity(1, 42)

    expect(result.status).toBe('ok')
    // Verify rounding: score string should have at most 4 decimal places
    const scoreStr = result.score!.toString()
    const decimalPart = scoreStr.split('.')[1] || ''
    expect(decimalPart.length).toBeLessThanOrEqual(4)
  })

  describe('explanation payload', () => {
    it('includes topPositiveTags and topNegativeTags', async () => {
      ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
      ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      ])

      const result = await getTeamPracticeAffinity(1, 42)

      expect(result.status).toBe('ok')
      expect(result.explanation).toBeDefined()
      expect(result.explanation).toHaveProperty('topPositiveTags')
      expect(result.explanation).toHaveProperty('topNegativeTags')
      expect(Array.isArray(result.explanation!.topPositiveTags)).toBe(true)
      expect(Array.isArray(result.explanation!.topNegativeTags)).toBe(true)
    })

    it('limits positive and negative tags to 3 each', async () => {
      // Practice with many tags
      ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue({
        id: 42,
        tags: ['Verbal-Heavy', 'High-Autonomy', 'Structured', 'Iterative', 'Cross-Functional', 'Consensus-Seeking'],
      })
      ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      ])

      const result = await getTeamPracticeAffinity(1, 42)

      if (result.status === 'ok' && result.explanation) {
        expect(result.explanation.topPositiveTags.length).toBeLessThanOrEqual(3)
        expect(result.explanation.topNegativeTags.length).toBeLessThanOrEqual(3)
      }
    })

    it('returns all tags when practice has fewer than 3', async () => {
      ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue({
        id: 42,
        tags: ['Verbal-Heavy'],
      })
      ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      ])

      const result = await getTeamPracticeAffinity(1, 42)

      if (result.status === 'ok' && result.explanation) {
        const totalTags = result.explanation.topPositiveTags.length + result.explanation.topNegativeTags.length
        expect(totalTags).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('privacy enforcement', () => {
    it('response does not contain traitContributions', async () => {
      ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
      ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
        { userId: 2, user: { bigFiveScore: { ...PROFILE_HIGH, userId: 2 } } },
      ])

      const result = await getTeamPracticeAffinity(1, 42)

      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain('traitContributions')
    })

    it('response does not contain individual member IDs', async () => {
      ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
      ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
        { userId: 2, user: { bigFiveScore: { ...PROFILE_HIGH, userId: 2 } } },
      ])

      const result = await getTeamPracticeAffinity(1, 42)

      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain('"userId"')
      expect(resultStr).not.toContain('"memberId"')
    })

    it('response does not contain per-member scores', async () => {
      ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
      ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
        { userId: 2, user: { bigFiveScore: { ...PROFILE_HIGH, userId: 2 } } },
      ])

      const result = await getTeamPracticeAffinity(1, 42)

      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain('tagScores')
      expect(resultStr).not.toContain('mappedTags')
      expect(resultStr).not.toContain('unmappedTags')
    })

    it('explanation contains only tag names, no numeric details', async () => {
      ;(prisma.practice.findFirst as jest.Mock).mockResolvedValue(PRACTICE_WITH_TAGS)
      ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, user: { bigFiveScore: { ...PROFILE_MID, userId: 1 } } },
      ])

      const result = await getTeamPracticeAffinity(1, 42)

      if (result.status === 'ok' && result.explanation) {
        // Explanation should only contain tag name arrays
        const explanationKeys = Object.keys(result.explanation)
        expect(explanationKeys).toEqual(['topPositiveTags', 'topNegativeTags'])
        // Each array should contain only strings (tag names)
        for (const tag of result.explanation.topPositiveTags) {
          expect(typeof tag).toBe('string')
        }
        for (const tag of result.explanation.topNegativeTags) {
          expect(typeof tag).toBe('string')
        }
      }
    })
  })
})
