import {
  type BoundsConfig,
  type TagRelationRow,
  type UserProfile,
  type TraitContributions,
  type TagScoreDetail,
  type IndividualAffinityResult,
  TRAIT_KEYS,
} from './affinity.types'
import { normalizeTagKey } from './affinity-reference-data'

/**
 * Compute a single trait's contribution using the piecewise clamp/interpolate formula.
 *
 * - userValue <= lowBound  → lowEndpoint (clamped)
 * - userValue >= highBound → highEndpoint (clamped)
 * - otherwise              → linear interpolation between endpoints
 *
 * No extrapolation outside bounds. Result is always in [-1, 1].
 */
export function computeTraitContribution(
  userValue: number,
  lowBound: number,
  highBound: number,
  lowEndpoint: number,
  highEndpoint: number
): number {
  if (userValue <= lowBound) {
    return lowEndpoint
  }
  if (userValue >= highBound) {
    return highEndpoint
  }
  return lowEndpoint + ((userValue - lowBound) / (highBound - lowBound)) * (highEndpoint - lowEndpoint)
}

/**
 * Compute the tag score: arithmetic mean of the five trait contributions.
 *
 * Returns both the score and the per-trait contributions for the explanation payload.
 */
export function computeTagScore(
  userProfile: UserProfile,
  bounds: BoundsConfig,
  relation: TagRelationRow
): { score: number; traitContributions: TraitContributions } {
  const contributions: TraitContributions = {} as TraitContributions
  let sum = 0

  for (const trait of TRAIT_KEYS) {
    const contribution = computeTraitContribution(
      userProfile[trait],
      bounds[trait].lowBound,
      bounds[trait].highBound,
      relation.lowPoles[trait],
      relation.highPoles[trait]
    )
    contributions[trait] = contribution
    sum += contribution
  }

  return {
    score: sum / 5,
    traitContributions: contributions,
  }
}

/**
 * Compute the individual practice affinity score.
 *
 * Pure function — no DB or IO calls.
 *
 * @param userProfile - User Big Five averages (1-5 scale per trait)
 * @param practiceTags - Raw tag strings from the practice
 * @param bounds - Trait bounds configuration
 * @param relations - Tag-personality relation rows
 * @returns Full affinity result with status, score, and explanation data
 */
export function computeIndividualPracticeAffinity(
  userProfile: UserProfile | null,
  practiceTags: string[],
  bounds: BoundsConfig,
  relations: TagRelationRow[]
): IndividualAffinityResult {
  // Check user profile completeness
  if (!userProfile) {
    return {
      status: 'insufficient_profile_data',
      score: null,
      mappedTags: [],
      unmappedTags: [],
      tagScores: [],
    }
  }

  for (const trait of TRAIT_KEYS) {
    if (userProfile[trait] === undefined || userProfile[trait] === null || isNaN(userProfile[trait])) {
      return {
        status: 'insufficient_profile_data',
        score: null,
        mappedTags: [],
        unmappedTags: [],
        tagScores: [],
      }
    }
  }

  // Build a lookup from normalized tag key to relation row
  const relationMap = new Map<string, TagRelationRow>()
  for (const row of relations) {
    relationMap.set(row.normalizedTag, row)
  }

  const mappedTags: string[] = []
  const unmappedTags: string[] = []
  const tagScores: TagScoreDetail[] = []

  for (const rawTag of practiceTags) {
    const normalizedKey = normalizeTagKey(rawTag)
    const relation = relationMap.get(normalizedKey)

    if (!relation) {
      unmappedTags.push(rawTag)
      continue
    }

    mappedTags.push(rawTag)
    const { score, traitContributions } = computeTagScore(userProfile, bounds, relation)
    tagScores.push({ tag: rawTag, score, traitContributions })
  }

  if (mappedTags.length === 0) {
    return {
      status: 'no_tag_mapping',
      score: null,
      mappedTags: [],
      unmappedTags,
      tagScores: [],
    }
  }

  const totalScore = tagScores.reduce((acc, ts) => acc + ts.score, 0) / tagScores.length

  return {
    status: 'ok',
    score: totalScore,
    mappedTags,
    unmappedTags,
    tagScores,
  }
}
