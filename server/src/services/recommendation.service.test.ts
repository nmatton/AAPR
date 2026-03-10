process.env.JWT_SECRET = 'test_secret_for_service_12345678901234567890'

import { getRecommendations } from './recommendation.service'
import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import * as affinityService from './affinity.service'

jest.mock('../lib/prisma', () => ({
  prisma: {
    teamPractice: { findUnique: jest.fn(), findMany: jest.fn() },
    practice: { findUnique: jest.fn(), findMany: jest.fn() },
    practiceAssociation: { findMany: jest.fn() },
  },
}))

jest.mock('./affinity.service', () => ({
  getTeamPracticeAffinity: jest.fn(),
}))

const mockGetTeamPracticeAffinity = affinityService.getTeamPracticeAffinity as jest.Mock

// Helper: build a simplified practice with pillars
const makePractice = (
  id: number,
  title: string,
  categoryId: string,
  pillarIds: number[],
  goal = 'Test goal'
) => ({
  id,
  title,
  goal,
  categoryId,
  practicePillars: pillarIds.map((pillarId) => ({ pillarId })),
})

// Helper: build a team practice with pillars
const makeTeamPractice = (
  practiceId: number,
  pillarIds: number[]
) => ({
  practiceId,
  practice: {
    practicePillars: pillarIds.map((pillarId) => ({ pillarId })),
  },
})

describe('getRecommendations', () => {
  const TEAM_ID = 1
  const TARGET_PRACTICE_ID = 10

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws 404 when practice is not in team portfolio', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue(null)

    await expect(getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)).rejects.toThrow(AppError)
    await expect(getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)).rejects.toMatchObject({
      code: 'not_found',
      statusCode: 404,
    })
  })

  it('returns empty array when target affinity score is null', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target Practice', 'cat-1', [1, 2])
    )
    mockGetTeamPracticeAffinity.mockResolvedValueOnce({
      status: 'insufficient_profile_data',
      score: null,
    })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toEqual([])
  })

  it('returns empty array when no candidates meet affinity filter', async () => {
    // Setup: target has score 0.5, only candidate has score 0.3 (lower)
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Candidate A', 'cat-1', [1]),
    ])

    // Target affinity = 0.5
    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })
      // Candidate affinity = 0.3 (lower than target)
      .mockResolvedValueOnce({ status: 'ok', score: 0.3 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toEqual([])
  })

  it('filters out candidates that do not maintain coverage', async () => {
    // Target covers pillars [1, 2]. Candidate covers only [1] → doesn't maintain coverage
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1, 2])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1, 2]),
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Incomplete Coverage', 'cat-1', [1]),  // missing pillar 2
    ])

    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.3 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    // Candidate is excluded due to coverage gap: affinity not even checked 
    expect(result).toEqual([])
  })

  it('allows candidates when another portfolio practice covers exclusive pillars', async () => {
    // Target covers [1, 2]. Another portfolio practice also covers [2].
    // → Only pillar 1 is exclusive. Candidate covers [1] → OK
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1, 2])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1, 2]),
      makeTeamPractice(30, [2, 3]),  // covers pillar 2
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Partial Coverage Candidate', 'cat-1', [1]),  // covers pillar 1
    ])

    // Target score = 0.3, candidate score = 0.6 (higher)
    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.3 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.6 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(1)
    expect(result[0].practiceId).toBe(20)
    expect(result[0].affinityScore).toBe(0.6)
  })

  it('ranks Tier 1 (Equivalence) above Tier 2 (same category) above Tier 3 (other)', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    // Candidate 21 has Equivalence association
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([
      { sourcePracticeId: TARGET_PRACTICE_ID, targetPracticeId: 21 },
    ])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Same Category', 'cat-1', [1]),   // Tier 2
      makePractice(21, 'Equivalent', 'cat-2', [1]),       // Tier 1
      makePractice(22, 'Other Category', 'cat-3', [1]),   // Tier 3
    ])

    // Target score = 0.1
    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.1 })
      // Each candidate has higher score
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })  // cat-1 same category
      .mockResolvedValueOnce({ status: 'ok', score: 0.4 })  // Equivalence
      .mockResolvedValueOnce({ status: 'ok', score: 0.6 })  // other category

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(3)
    expect(result[0].tier).toBe(1)  // Equivalence first
    expect(result[0].practiceId).toBe(21)
    expect(result[1].tier).toBe(2)  // Same category second
    expect(result[1].practiceId).toBe(20)
    expect(result[2].tier).toBe(3)  // Other third
    expect(result[2].practiceId).toBe(22)
  })

  it('limits results to max 3', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Candidate A', 'cat-1', [1]),
      makePractice(21, 'Candidate B', 'cat-1', [1]),
      makePractice(22, 'Candidate C', 'cat-1', [1]),
      makePractice(23, 'Candidate D', 'cat-1', [1]),
      makePractice(24, 'Candidate E', 'cat-1', [1]),
    ])

    // Target score = 0.1
    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.1 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.6 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.7 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.8 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.9 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(3)
  })

  it('within same tier, sorts by affinity descending', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Low Affinity', 'cat-1', [1]),
      makePractice(21, 'High Affinity', 'cat-1', [1]),
    ])

    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.1 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.3 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.8 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(2)
    expect(result[0].affinityScore).toBe(0.8) // highest first
    expect(result[1].affinityScore).toBe(0.3)
  })

  it('generates appropriate reason for each tier', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([
      { sourcePracticeId: TARGET_PRACTICE_ID, targetPracticeId: 21 },
    ])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Same Category', 'cat-1', [1]),
      makePractice(21, 'Equivalent', 'cat-2', [1]),
      makePractice(22, 'Other', 'cat-3', [1]),
    ])

    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.1 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(3)

    const tier1 = result.find((r) => r.tier === 1)!
    const tier2 = result.find((r) => r.tier === 2)!
    const tier3 = result.find((r) => r.tier === 3)!

    expect(tier1.reason).toContain('Equivalent')
    expect(tier2.reason).toContain('Same category')
    expect(tier3.reason).toContain('higher team affinity')
  })

  it('skips candidates whose affinity computation throws', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Throws Affinity', 'cat-1', [1]),
      makePractice(21, 'Good Candidate', 'cat-1', [1]),
    ])

    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.1 })  // target
      .mockRejectedValueOnce(new Error('Affinity computation failed'))  // candidate 20 throws
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })  // candidate 21 ok

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(1)
    expect(result[0].practiceId).toBe(21)
  })

  it('returns response with correct camelCase field names', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(20, 'Candidate', 'cat-1', [1], 'Candidate goal'),
    ])

    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.1 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(1)

    const rec = result[0]
    expect(rec).toHaveProperty('practiceId')
    expect(rec).toHaveProperty('title')
    expect(rec).toHaveProperty('goal')
    expect(rec).toHaveProperty('categoryId')
    expect(rec).toHaveProperty('tier')
    expect(rec).toHaveProperty('affinityScore')
    expect(rec).toHaveProperty('reason')
    expect(typeof rec.reason).toBe('string')
    expect(rec.reason.length).toBeGreaterThan(0)
  })

  it('Equivalence association is bidirectional (target is targetPracticeId)', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: TEAM_ID, practiceId: TARGET_PRACTICE_ID })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(TARGET_PRACTICE_ID, 'Target', 'cat-1', [1])
    )
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([
      makeTeamPractice(TARGET_PRACTICE_ID, [1]),
    ])
    // Association where target practice is in targetPracticeId position
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([
      { sourcePracticeId: 21, targetPracticeId: TARGET_PRACTICE_ID },
    ])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([
      makePractice(21, 'Reverse Equivalent', 'cat-2', [1]),
    ])

    mockGetTeamPracticeAffinity
      .mockResolvedValueOnce({ status: 'ok', score: 0.1 })
      .mockResolvedValueOnce({ status: 'ok', score: 0.5 })

    const result = await getRecommendations(TEAM_ID, TARGET_PRACTICE_ID)
    expect(result).toHaveLength(1)
    expect(result[0].tier).toBe(1) // Should be Tier 1 even with reverse direction
  })
})
