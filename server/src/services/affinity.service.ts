import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import { getReferenceData } from './affinity/affinity-reference-data'
import { computeIndividualPracticeAffinity } from './affinity/affinity-scoring'
import type { UserProfile, IndividualAffinityResult } from './affinity/affinity.types'
import { TRAIT_ITEM_COUNTS, TRAIT_KEYS } from './affinity/affinity.types'

/**
 * Convert stored BigFiveScore (raw sums) to averaged user profile (1-5 scale).
 */
function toUserProfile(scores: {
  extraversion: number
  agreeableness: number
  conscientiousness: number
  neuroticism: number
  openness: number
}): UserProfile {
  return {
    E: scores.extraversion / TRAIT_ITEM_COUNTS.E,
    A: scores.agreeableness / TRAIT_ITEM_COUNTS.A,
    C: scores.conscientiousness / TRAIT_ITEM_COUNTS.C,
    N: scores.neuroticism / TRAIT_ITEM_COUNTS.N,
    O: scores.openness / TRAIT_ITEM_COUNTS.O,
  }
}

/**
 * Extract tags from a practice's JSON tags field safely.
 */
function extractPracticeTags(tags: unknown): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === 'string')
  }
  return []
}

/**
 * Round a number to a given number of decimal places.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Compute and return the individual affinity score for a user on a practice.
 *
 * Validates team membership has already been checked by middleware.
 * Fetches user Big Five profile and practice tags from DB.
 */
export async function getMyPracticeAffinity(
  userId: number,
  teamId: number,
  practiceId: number
): Promise<{
  status: string
  teamId: number
  practiceId: number
  score: number | null
  scale?: { min: number; max: number }
  explanation?: {
    mappedTags: string[]
    unmappedTags: string[]
    tagScores: Array<{
      tag: string
      score: number
      traitContributions: Record<string, number>
    }>
  }
}> {
  // Fetch practice to verify it exists and get tags
  const practice = await prisma.practice.findFirst({
    where: {
      id: practiceId,
      OR: [
        { isGlobal: true },
        { teamPractices: { some: { teamId } } },
      ],
    },
    select: { id: true, tags: true },
  })

  if (!practice) {
    throw new AppError(
      'not_found',
      'Practice not found for this team',
      { practiceId, teamId },
      404
    )
  }

  // Fetch user Big Five scores
  const bigFiveScore = await prisma.bigFiveScore.findUnique({
    where: { userId },
  })

  // Load reference data (cached after first call)
  const { bounds, relations } = getReferenceData()

  // Build user profile (null if no scores)
  const userProfile = bigFiveScore ? toUserProfile(bigFiveScore) : null

  // Extract practice tags
  const practiceTags = extractPracticeTags(practice.tags)

  // Compute affinity using the pure scoring engine
  const result: IndividualAffinityResult = computeIndividualPracticeAffinity(
    userProfile,
    practiceTags,
    bounds,
    relations
  )

  // Build response shape
  if (result.status === 'insufficient_profile_data') {
    return {
      status: 'insufficient_profile_data',
      teamId,
      practiceId,
      score: null,
    }
  }

  if (result.status === 'no_tag_mapping') {
    return {
      status: 'no_tag_mapping',
      teamId,
      practiceId,
      score: null,
      explanation: {
        mappedTags: [],
        unmappedTags: result.unmappedTags,
        tagScores: [],
      },
    }
  }

  // Success: round scores at serialization time only
  return {
    status: 'ok',
    teamId,
    practiceId,
    score: roundTo(result.score!, 4),
    scale: { min: -1, max: 1 },
    explanation: {
      mappedTags: result.mappedTags,
      unmappedTags: result.unmappedTags,
      tagScores: result.tagScores.map((ts) => ({
        tag: ts.tag,
        score: roundTo(ts.score, 6),
        traitContributions: Object.fromEntries(
          TRAIT_KEYS.map((k) => [k, roundTo(ts.traitContributions[k], 6)])
        ),
      })),
    },
  }
}
