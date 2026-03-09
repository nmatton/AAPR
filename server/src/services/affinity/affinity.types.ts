/**
 * Canonical Big Five trait keys used throughout the affinity scoring module.
 */
export const TRAIT_KEYS = ['E', 'A', 'C', 'N', 'O'] as const
export type TraitKey = (typeof TRAIT_KEYS)[number]

/**
 * Number of questionnaire items per trait, used to convert stored sums to averages.
 * Must stay in sync with big-five.service.ts TRAIT_ITEMS.
 */
export const TRAIT_ITEM_COUNTS: Record<TraitKey, number> = {
  E: 8,
  A: 9,
  C: 9,
  N: 8,
  O: 10,
}

/**
 * Low and high bounds for a single trait, defining the interpolation range.
 */
export interface TraitBounds {
  lowBound: number
  highBound: number
}

/**
 * Bounds configuration for all five traits.
 */
export type BoundsConfig = Record<TraitKey, TraitBounds>

/**
 * Allowed relation symbols in the CSV, mapped to numeric values.
 */
export type RelationSymbol = '+' | '0' | '-'

/**
 * Numeric mapping of relation symbols.
 */
export const SYMBOL_MAP: Record<RelationSymbol, number> = {
  '-': -1,
  '0': 0,
  '+': 1,
}

/**
 * A single tag-personality relation row parsed from the CSV.
 * Each tag has a high-pole and low-pole numeric value for each trait.
 */
export interface TagRelationRow {
  tag: string
  /** Normalized compare key: trimmed, collapsed whitespace, lowercased */
  normalizedTag: string
  highPoles: Record<TraitKey, number>
  lowPoles: Record<TraitKey, number>
}

/**
 * User Big Five profile as averages (1-5 scale) for each trait.
 */
export type UserProfile = Record<TraitKey, number>

/**
 * Trait contributions for a single tag.
 */
export type TraitContributions = Record<TraitKey, number>

/**
 * Score result for one tag with full detail.
 */
export interface TagScoreDetail {
  tag: string
  score: number
  traitContributions: TraitContributions
}

/**
 * Affinity calculation result status.
 */
export type AffinityStatus = 'ok' | 'insufficient_profile_data' | 'no_tag_mapping'

/**
 * Full individual affinity result (before serialization rounding).
 */
export interface IndividualAffinityResult {
  status: AffinityStatus
  score: number | null
  mappedTags: string[]
  unmappedTags: string[]
  tagScores: TagScoreDetail[]
}
