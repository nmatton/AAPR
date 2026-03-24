process.env.JWT_SECRET = 'test_secret_for_service_12345678901234567890'

import { getRecommendations, getDirectedTagRecommendations, computeDeltaGainClass } from './recommendation.service'
import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import * as affinityService from './affinity.service'
import * as affinityReferenceData from './affinity/affinity-reference-data'

jest.mock('../lib/prisma', () => ({
  prisma: {
    teamPractice: { findUnique: jest.fn(), findMany: jest.fn() },
    practice: { findUnique: jest.fn(), findMany: jest.fn() },
    practiceAssociation: { findMany: jest.fn() },
    issueTag: { findMany: jest.fn() },
    tagCandidate: { findMany: jest.fn() },
    tagPersonalityRelation: { findMany: jest.fn() },
    teamMember: { findMany: jest.fn() },
  },
}))

jest.mock('./affinity.service', () => ({
  getTeamPracticeAffinity: jest.fn(),
}))

jest.mock('./affinity/affinity-reference-data', () => ({
  ...jest.requireActual('./affinity/affinity-reference-data'),
  getReferenceData: jest.fn(),
}))

const mockGetTeamPracticeAffinity = affinityService.getTeamPracticeAffinity as jest.Mock
const mockGetReferenceData = affinityReferenceData.getReferenceData as jest.Mock

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

// ============================================================
// Story 4.3.3: Directed Tag-Based Recommendation Engine Tests
// ============================================================

// Bounds config for testing: all traits 1-5 range
const TEST_BOUNDS = {
  E: { lowBound: 1, highBound: 5 },
  A: { lowBound: 1, highBound: 5 },
  C: { lowBound: 1, highBound: 5 },
  N: { lowBound: 1, highBound: 5 },
  O: { lowBound: 1, highBound: 5 },
}

// Team member producing mid-range user profile (all trait averages = 3.0)
// E: 24/8=3, A: 27/9=3, C: 27/9=3, N: 24/8=3, O: 30/10=3
const makeMidRangeMember = () => ({
  user: {
    bigFiveScore: {
      extraversion: 24,
      agreeableness: 27,
      conscientiousness: 27,
      neuroticism: 24,
      openness: 30,
    },
  },
})

// Create tag personality relation rows for a tag (uniform poles across all traits).
// With mid-range user (3.0) and bounds [1, 5]:
//   highPole=1,  lowPole=-1  → score = 0.0
//   highPole=1,  lowPole=1   → score = 1.0
//   highPole=-1, lowPole=-1  → score = -1.0
//   highPole=1,  lowPole=0   → score = 0.5
//   highPole=0,  lowPole=-1  → score = -0.5
function makeTagRelations(tagId: number, highPole: number, lowPole: number) {
  return ['E', 'A', 'C', 'N', 'O'].map((trait) => ({
    tagId,
    trait,
    highPole,
    lowPole,
  }))
}

describe('computeDeltaGainClass', () => {
  it('returns 1.0 for - → + transition', () => {
    expect(computeDeltaGainClass(-0.5, 0.5)).toBe(1.0)
  })

  it('returns 0.5 for - → 0 transition', () => {
    expect(computeDeltaGainClass(-0.5, 0)).toBe(0.5)
  })

  it('returns 0.5 for 0 → + transition', () => {
    expect(computeDeltaGainClass(0, 0.5)).toBe(0.5)
  })

  it('returns -0.5 for 0 → - transition', () => {
    expect(computeDeltaGainClass(0, -0.5)).toBe(-0.5)
  })

  it('returns -1.0 for + → - transition', () => {
    expect(computeDeltaGainClass(0.5, -0.5)).toBe(-1.0)
  })

  it('returns 0 for same-sign + → + transition', () => {
    expect(computeDeltaGainClass(0.3, 0.7)).toBe(0)
  })

  it('returns 0 for same-sign - → - transition', () => {
    expect(computeDeltaGainClass(-0.7, -0.3)).toBe(0)
  })

  it('returns 0 for 0 → 0 transition', () => {
    expect(computeDeltaGainClass(0, 0)).toBe(0)
  })

  it('returns same gain class regardless of magnitude within same transition type', () => {
    expect(computeDeltaGainClass(-0.1, 0.1)).toBe(1.0)
    expect(computeDeltaGainClass(-0.9, 0.9)).toBe(1.0)
  })
})

describe('getDirectedTagRecommendations', () => {
  const TEAM_ID = 1
  const ISSUE_ID = 100

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetReferenceData.mockReturnValue({ bounds: TEST_BOUNDS, relations: [] })
  })

  it('returns empty array when issue has no tags', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toEqual([])
  })

  it('returns empty array when no candidates exist', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem Tag' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toEqual([])
  })

  it('returns empty array when team has no eligible members', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem Tag' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      {
        problemTagId: 1,
        solutionTagId: 2,
        justification: 'test',
        problemTag: { id: 1, name: 'Problem Tag' },
        solutionTag: { id: 2, name: 'Solution Tag' },
      },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, 1, -1),
      ...makeTagRelations(2, 1, 1),
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      { user: { bigFiveScore: null } },
    ])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toEqual([])
  })

  it('disqualifies candidate with negative absolute team affinity (AC 3)', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem Tag' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      {
        problemTagId: 1,
        solutionTagId: 2,
        justification: 'test',
        problemTag: { id: 1, name: 'Problem Tag' },
        solutionTag: { id: 2, name: 'Negative Tag' },
      },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, 1, -1),  // zero affinity
      ...makeTagRelations(2, -1, -1), // negative affinity → disqualified
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toEqual([])
  })

  it('returns valid candidate with positive delta gain (AC 2)', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Friction Tag' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      {
        problemTagId: 1,
        solutionTagId: 2,
        justification: 'test',
        problemTag: { id: 1, name: 'Friction Tag' },
        solutionTag: { id: 2, name: 'Alignment Tag' },
      },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, -1, -1), // problem: affinity -1
      ...makeTagRelations(2, 1, 1),   // candidate: affinity +1
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toHaveLength(1)
    expect(result[0].candidateTagId).toBe(2)
    expect(result[0].candidateTagName).toBe('Alignment Tag')
    expect(result[0].sourceProblematicTagId).toBe(1)
    expect(result[0].absoluteAffinity).toBe(1)
    expect(result[0].deltaScore).toBe(1.0)
    expect(result[0].reason).toContain('-')
    expect(result[0].reason).toContain('+')
  })

  it('sorts by delta score desc, absolute affinity desc, candidate ID asc (AC 4)', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      { problemTagId: 1, solutionTagId: 4, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 4, name: 'Zero Tag' } },
      { problemTagId: 1, solutionTagId: 3, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 3, name: 'Strong Positive' } },
      { problemTagId: 1, solutionTagId: 5, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 5, name: 'Moderate Positive' } },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, -1, -1),  // problem: -1
      ...makeTagRelations(3, 1, 1),    // candidate: +1 (gain 1.0)
      ...makeTagRelations(4, 1, -1),   // candidate: 0  (gain 0.5, -→0)
      ...makeTagRelations(5, 1, 0),    // candidate: +0.5 (gain 1.0)
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toHaveLength(3)
    // Tag 3: gain 1.0, abs 1.0
    expect(result[0].candidateTagId).toBe(3)
    expect(result[0].deltaScore).toBe(1.0)
    // Tag 5: gain 1.0, abs 0.5
    expect(result[1].candidateTagId).toBe(5)
    expect(result[1].deltaScore).toBe(1.0)
    // Tag 4: gain 0.5, abs 0
    expect(result[2].candidateTagId).toBe(4)
    expect(result[2].deltaScore).toBe(0.5)
  })

  it('stable tie-break by candidate tag ID ascending when delta and affinity are equal', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      { problemTagId: 1, solutionTagId: 5, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 5, name: 'Tag B' } },
      { problemTagId: 1, solutionTagId: 3, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 3, name: 'Tag A' } },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, 1, -1),  // problem: 0
      ...makeTagRelations(3, 1, 1),   // candidate: +1
      ...makeTagRelations(5, 1, 1),   // candidate: +1
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toHaveLength(2)
    expect(result[0].candidateTagId).toBe(3)  // lower ID first
    expect(result[1].candidateTagId).toBe(5)
  })

  it('deduplicates candidate tags from multiple problem tags, keeping best scoring pair', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem A' } },
      { issueId: ISSUE_ID, tagId: 10, tag: { id: 10, name: 'Problem B' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      { problemTagId: 1, solutionTagId: 2, justification: '', problemTag: { id: 1, name: 'Problem A' }, solutionTag: { id: 2, name: 'Solution' } },
      { problemTagId: 10, solutionTagId: 2, justification: '', problemTag: { id: 10, name: 'Problem B' }, solutionTag: { id: 2, name: 'Solution' } },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, -1, -1),   // problem A: -1
      ...makeTagRelations(10, 1, -1),   // problem B: 0
      ...makeTagRelations(2, 1, 1),     // solution: +1
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toHaveLength(1)
    expect(result[0].candidateTagId).toBe(2)
    expect(result[0].sourceProblematicTagId).toBe(1) // problem A has better gain (-→+ = 1.0)
    expect(result[0].deltaScore).toBe(1.0)
  })

  it('handles mixed candidate pool: valid, disqualified, and equal delta', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      { problemTagId: 1, solutionTagId: 2, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 2, name: 'Good' } },
      { problemTagId: 1, solutionTagId: 3, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 3, name: 'Bad' } },
      { problemTagId: 1, solutionTagId: 4, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 4, name: 'Moderate' } },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, -1, -1),  // problem: -1
      ...makeTagRelations(2, 1, 1),    // candidate: +1 (valid)
      ...makeTagRelations(3, -1, -1),  // candidate: -1 (disqualified)
      ...makeTagRelations(4, 1, 0),    // candidate: +0.5 (valid)
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toHaveLength(2) // tag 3 disqualified
    expect(result[0].candidateTagId).toBe(2)
    expect(result[0].absoluteAffinity).toBe(1)
    expect(result[1].candidateTagId).toBe(4)
    expect(result[1].absoluteAffinity).toBe(0.5)
    expect(result[0].deltaScore).toBe(result[1].deltaScore) // both gain 1.0
  })

  it('returns all-disqualified pool as empty array', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Problem' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      { problemTagId: 1, solutionTagId: 2, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 2, name: 'Bad A' } },
      { problemTagId: 1, solutionTagId: 3, justification: '', problemTag: { id: 1, name: 'Problem' }, solutionTag: { id: 3, name: 'Bad B' } },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, 1, -1),   // problem: 0
      ...makeTagRelations(2, -1, -1),  // candidate: -1 (disqualified)
      ...makeTagRelations(3, 0, -1),   // candidate: -0.5 (disqualified)
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toEqual([])
  })

  it('returns correct explainability fields without internal tracking', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Issue Tag' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      {
        problemTagId: 1,
        solutionTagId: 2,
        justification: 'test',
        problemTag: { id: 1, name: 'Issue Tag' },
        solutionTag: { id: 2, name: 'Solution Tag' },
      },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, -1, -1),
      ...makeTagRelations(2, 1, 1),
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)
    expect(result).toHaveLength(1)
    const rec = result[0]
    expect(rec).toHaveProperty('candidateTagId', 2)
    expect(rec).toHaveProperty('candidateTagName', 'Solution Tag')
    expect(rec).toHaveProperty('sourceProblematicTagId', 1)
    expect(rec).toHaveProperty('sourceProblematicTagName', 'Issue Tag')
    expect(rec).toHaveProperty('absoluteAffinity')
    expect(rec).toHaveProperty('deltaScore')
    expect(rec).toHaveProperty('reason')
    expect(typeof rec.reason).toBe('string')
    expect(rec.reason.length).toBeGreaterThan(0)
    // Internal tracking fields must not leak
    expect(rec).not.toHaveProperty('provenanceTagIds')
  })

  it('correctly chains issue_tags → tag_candidates → personality relations (AC 1)', async () => {
    ;(prisma.issueTag.findMany as jest.Mock).mockResolvedValue([
      { issueId: ISSUE_ID, tagId: 1, tag: { id: 1, name: 'Lack of Tests' } },
      { issueId: ISSUE_ID, tagId: 10, tag: { id: 10, name: 'Poor Communication' } },
    ])
    ;(prisma.tagCandidate.findMany as jest.Mock).mockResolvedValue([
      { problemTagId: 1, solutionTagId: 2, justification: 'TDD addresses lack of tests', problemTag: { id: 1, name: 'Lack of Tests' }, solutionTag: { id: 2, name: 'TDD' } },
      { problemTagId: 10, solutionTagId: 3, justification: 'Pairing improves communication', problemTag: { id: 10, name: 'Poor Communication' }, solutionTag: { id: 3, name: 'Pair Programming' } },
    ])
    ;(prisma.tagPersonalityRelation.findMany as jest.Mock).mockResolvedValue([
      ...makeTagRelations(1, 0, -1),   // Lack of Tests: -0.5
      ...makeTagRelations(10, -1, -1), // Poor Communication: -1
      ...makeTagRelations(2, 1, 0),    // TDD: +0.5
      ...makeTagRelations(3, 1, 1),    // Pair Programming: +1
    ])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([makeMidRangeMember()])

    const result = await getDirectedTagRecommendations(TEAM_ID, ISSUE_ID)

    // Verify query chain
    expect(prisma.issueTag.findMany).toHaveBeenCalledWith({
      where: { issueId: ISSUE_ID, issue: { teamId: TEAM_ID } },
      include: { tag: { select: { id: true, name: true } } },
    })
    expect(prisma.tagCandidate.findMany).toHaveBeenCalledWith({
      where: { problemTagId: { in: [1, 10] } },
      include: {
        solutionTag: { select: { id: true, name: true } },
        problemTag: { select: { id: true, name: true } },
      },
    })
    expect(prisma.tagPersonalityRelation.findMany).toHaveBeenCalledWith({
      where: { tagId: { in: expect.arrayContaining([1, 2, 3, 10]) } },
    })
    expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
      where: { teamId: TEAM_ID, user: { isAdminMonitor: false } },
      select: { user: { select: { bigFiveScore: true } } },
    })

    // Both candidates valid: Pair Programming (abs 1) and TDD (abs 0.5)
    expect(result).toHaveLength(2)
    expect(result[0].candidateTagName).toBe('Pair Programming')
    expect(result[0].absoluteAffinity).toBe(1)
    expect(result[1].candidateTagName).toBe('TDD')
    expect(result[1].absoluteAffinity).toBe(0.5)
  })
})

// Story 4.2 regression: Existing getRecommendations tests above validate
// that Story 4.2 practice recommendation path remains unchanged.
describe('Story 4.2 regression protection', () => {
  it('getRecommendations remains callable with (teamId, practiceId) signature', async () => {
    ;(prisma.teamPractice.findUnique as jest.Mock).mockResolvedValue({ teamId: 1, practiceId: 10 })
    ;(prisma.practice.findUnique as jest.Mock).mockResolvedValue(
      makePractice(10, 'Target', 'cat-1', [1])
    )
    mockGetTeamPracticeAffinity.mockResolvedValueOnce({ status: 'ok', score: 0.5 })
    ;(prisma.teamPractice.findMany as jest.Mock).mockResolvedValue([makeTeamPractice(10, [1])])
    ;(prisma.practiceAssociation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.practice.findMany as jest.Mock).mockResolvedValue([])

    const result = await getRecommendations(1, 10)
    expect(Array.isArray(result)).toBe(true)
  })
})
