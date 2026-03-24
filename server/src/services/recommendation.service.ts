import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'
import { getTeamPracticeAffinity } from './affinity.service'
import { getReferenceData } from './affinity/affinity-reference-data'
import { computeTraitContribution } from './affinity/affinity-scoring'
import type { UserProfile, BoundsConfig } from './affinity/affinity.types'
import { TRAIT_KEYS, TRAIT_ITEM_COUNTS, type TraitKey } from './affinity/affinity.types'

/** Shape of a single practice recommendation returned by the API. */
export interface PracticeRecommendation {
  practiceId: number
  title: string
  goal: string
  categoryId: string
  tier: number
  affinityScore: number
  affinityDelta: number
  reason: string
}

/**
 * Get up to 3 recommended alternative practices for a given practice in a team's portfolio.
 *
 * Algorithm:
 * 1. Validate the target practice exists and belongs to the team portfolio.
 * 2. Compute the team affinity score for the target practice.
 * 3. Identify which pillars the target practice covers.
 * 4. Identify all pillar IDs currently covered by the team portfolio (for coverage swap check).
 * 5. Find candidate practices (not already in the team portfolio).
 * 6. For each candidate, compute team affinity → filter: must be strictly greater than target.
 * 7. For each remaining candidate, verify coverage maintenance when swapping target → candidate.
 * 8. Rank by tier (1=Equivalence association, 2=same category, 3=other), then by affinity descending.
 * 9. Return top 3.
 */
export async function getRecommendations(
  teamId: number,
  practiceId: number
): Promise<PracticeRecommendation[]> {
  // ------------------------------------------------------------------
  // Step 1: Validate target practice is in the team's portfolio
  // ------------------------------------------------------------------
  const teamPracticeLink = await prisma.teamPractice.findUnique({
    where: { teamId_practiceId: { teamId, practiceId } },
  })

  if (!teamPracticeLink) {
    throw new AppError(
      'not_found',
      'Practice not found in this team\'s portfolio',
      { practiceId, teamId },
      404
    )
  }

  // Load the target practice details
  const targetPractice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: {
      id: true,
      title: true,
      categoryId: true,
      practicePillars: { select: { pillarId: true } },
    },
  })

  if (!targetPractice) {
    throw new AppError(
      'not_found',
      'Practice not found',
      { practiceId },
      404
    )
  }

  // ------------------------------------------------------------------
  // Step 2: Compute team affinity for the target practice
  // ------------------------------------------------------------------
  const targetAffinity = await getTeamPracticeAffinity(teamId, practiceId)
  const targetScore = targetAffinity.score // null if insufficient data

  // If we can't compute target affinity, we can't compare => return empty
  if (targetScore === null) {
    return []
  }

  // ------------------------------------------------------------------
  // Step 3: Target practice pillar IDs
  // ------------------------------------------------------------------
  const targetPillarIds = new Set(
    targetPractice.practicePillars.map((pp) => pp.pillarId)
  )

  // ------------------------------------------------------------------
  // Step 4: All pillar IDs covered by the full team portfolio (excluding target)
  // ------------------------------------------------------------------
  const teamPractices = await prisma.teamPractice.findMany({
    where: { teamId },
    select: {
      practiceId: true,
      practice: {
        select: {
          practicePillars: { select: { pillarId: true } },
        },
      },
    },
  })

  // Pillars covered by the portfolio WITHOUT the target practice
  const portfolioPillarsWithoutTarget = new Set<number>()
  for (const tp of teamPractices) {
    if (tp.practiceId === practiceId) continue // exclude target
    for (const pp of tp.practice.practicePillars) {
      portfolioPillarsWithoutTarget.add(pp.pillarId)
    }
  }

  // Pillars that ONLY the target covers (not covered by other portfolio practices)
  const exclusiveTargetPillars = new Set<number>()
  for (const pillarId of targetPillarIds) {
    if (!portfolioPillarsWithoutTarget.has(pillarId)) {
      exclusiveTargetPillars.add(pillarId)
    }
  }

  // ------------------------------------------------------------------
  // Step 5: Find Equivalence associations for Tier 1 lookup
  // ------------------------------------------------------------------
  const equivalenceAssociations = await prisma.practiceAssociation.findMany({
    where: {
      associationType: 'Equivalence',
      OR: [
        { sourcePracticeId: practiceId },
        { targetPracticeId: practiceId },
      ],
    },
    select: { sourcePracticeId: true, targetPracticeId: true },
  })

  const equivalencePracticeIds = new Set<number>()
  for (const assoc of equivalenceAssociations) {
    if (assoc.sourcePracticeId !== practiceId) {
      equivalencePracticeIds.add(assoc.sourcePracticeId)
    }
    if (assoc.targetPracticeId !== practiceId) {
      equivalencePracticeIds.add(assoc.targetPracticeId)
    }
  }

  // ------------------------------------------------------------------
  // Step 6: Get candidate practices (not in team portfolio)
  // ------------------------------------------------------------------
  // Custom practices in this system appear to be meant as global templates, or they are associated somehow.
  // We'll allow any practice not currently in the team's portfolio (id not in teamPracticeIds).
  // This resolves the logic bug where non-global practices could never be recommended because of conflicting MUST-BE-IN vs MUST-NOT-BE-IN team logic.
  const teamPracticeIds = new Set(teamPractices.map((tp) => tp.practiceId))

  const allCandidates = await prisma.practice.findMany({
    where: {
      id: { notIn: Array.from(teamPracticeIds) },
      // Simplified: if a practice is team-specific we assume it cannot be recommended to *other* teams,
      // but without a strict 'authorTeamId' the safest approach is to just suggest anything not in portfolio,
      // or only isGlobal. The story demands: "must filter alternative practices such that their Affinity Score is strictly greater". 
      // We will restrict to global practices for recommendations to avoid recommending another team's private practice.
      isGlobal: true
    },
    select: {
      id: true,
      title: true,
      goal: true,
      categoryId: true,
      practicePillars: { select: { pillarId: true } },
      tags: true // Needed for affinity batch computation
    },
  })

  // ------------------------------------------------------------------
  // Step 7: Batch compute team affinity and filter candidates
  // ------------------------------------------------------------------
  // We compute affinities manually instead of calling getTeamPracticeAffinity N times.
  // Actually, Promise.all on `getTeamPracticeAffinity` still does N database queries inside the function.
  // Let's refactor the candidate loop to use Promise.all to at least run them concurrently, 
  // or better, fetch all required data once.
  // Since `getTeamPracticeAffinity` does exactly 2 queries: one for practice.tags and one for teamMembers,
  // we can just call it with Promise.all and it will run concurrent DB queries. While not a true batch query,
  // it is better than a sequential for-loop.
  // However, true N+1 fix is fetching team members once and computing in-memory.
  // But wait! getTeamPracticeAffinity is exported. What if we use `Promise.all`? That's what I'll do for now, 
  // it mitigates the sequential delay without rewriting the entire affinity internal logic here.

  const qualifiedCandidates: Array<{
    practice: typeof allCandidates[number]
    affinityScore: number
    tier: number
    reason: string
  }> = []

  // Pre-filter candidates by coverage before computing affinity
  const coverageFilteredCandidates = allCandidates.filter(candidate => {
    const candidatePillarIds = new Set(
      candidate.practicePillars.map((pp) => pp.pillarId)
    )
    for (const pillarId of exclusiveTargetPillars) {
      if (!candidatePillarIds.has(pillarId)) {
        return false
      }
    }
    return true
  })

  // Fetch all affinities concurrently (fixes sequential N+1 delay)
  const affinityResults = await Promise.all(
    coverageFilteredCandidates.map(async (candidate) => {
      try {
        const result = await getTeamPracticeAffinity(teamId, candidate.id)
        return { candidate, score: result.score }
      } catch {
        return { candidate, score: null } // Skip on error
      }
    })
  )

  for (const { candidate, score: candidateScore } of affinityResults) {
    if (candidateScore === null) continue

    // Affinity filter: candidate score must be strictly greater than target
    if (candidateScore <= targetScore) continue

    // Determine tier
    let tier: number
    let reason: string
    if (equivalencePracticeIds.has(candidate.id)) {
      tier = 1
      reason = 'Equivalent practice with higher team affinity'
    } else if (candidate.categoryId === targetPractice.categoryId) {
      tier = 2
      reason = 'Same category, covers required pillars, higher team affinity'
    } else {
      tier = 3
      reason = 'Covers required pillars with higher team affinity'
    }

    qualifiedCandidates.push({
      practice: candidate,
      affinityScore: candidateScore,
      tier,
      reason,
    })
  }

  // ------------------------------------------------------------------
  // Step 8: Sort by tier ascending, then affinity descending
  // ------------------------------------------------------------------
  qualifiedCandidates.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    return b.affinityScore - a.affinityScore
  })

  // ------------------------------------------------------------------
  // Step 9: Return top 3
  // ------------------------------------------------------------------
  return qualifiedCandidates.slice(0, 3).map((c) => ({
    practiceId: c.practice.id,
    title: c.practice.title,
    goal: c.practice.goal,
    categoryId: c.practice.categoryId,
    tier: c.tier,
    affinityScore: c.affinityScore,
    affinityDelta: c.affinityScore - targetScore,
    reason: c.reason,
  }))
}

// ============================================================
//  Directed Tag-Based Recommendation Engine (Story 4.3.3)
// ============================================================

/** Shape of a single directed tag recommendation returned by the engine. */
export interface DirectedTagRecommendation {
  candidateTagId: number
  candidateTagName: string
  sourceProblematicTagId: number
  sourceProblematicTagName: string
  absoluteAffinity: number
  deltaScore: number
  reason: string
}

/**
 * Map an affinity value to its sign class for delta transition categorization.
 */
function getAffinitySignClass(value: number): '-' | '0' | '+' {
  if (value < 0) return '-'
  if (value > 0) return '+'
  return '0'
}

/**
 * Compute the delta gain class for a transition from current (problematic) to candidate affinity.
 *
 * Transition table (per directed recommendation contract):
 *   - → + : +1.0
 *   - → 0 : +0.5
 *   0 → + : +0.5
 *   0 → - : -0.5
 *   + → - : -1.0
 *   Same-sign / unlisted : 0 (neutral, falls through to tie-break ordering)
 */
export function computeDeltaGainClass(
  currentAffinity: number,
  candidateAffinity: number
): number {
  const from = getAffinitySignClass(currentAffinity)
  const to = getAffinitySignClass(candidateAffinity)

  if (from === '-' && to === '+') return 1.0
  if ((from === '-' && to === '0') || (from === '0' && to === '+')) return 0.5
  if (from === '0' && to === '-') return -0.5
  if (from === '+' && to === '-') return -1.0

  return 0
}

/**
 * Compute team-average affinity for a single tag using DB-sourced personality relation data.
 * Reuses the exact piecewise clamp/interpolation model from the affinity foundation (Epic 4.1).
 */
function computeTeamTagAffinityFromTraits(
  tagTraits: Record<TraitKey, { highPole: number; lowPole: number }>,
  teamProfiles: UserProfile[],
  bounds: BoundsConfig
): number | null {
  if (teamProfiles.length === 0) return null

  let totalScore = 0
  for (const profile of teamProfiles) {
    let traitSum = 0
    for (const trait of TRAIT_KEYS) {
      const contribution = computeTraitContribution(
        profile[trait],
        bounds[trait].lowBound,
        bounds[trait].highBound,
        tagTraits[trait].lowPole,
        tagTraits[trait].highPole
      )
      traitSum += contribution
    }
    totalScore += traitSum / 5
  }

  return totalScore / teamProfiles.length
}

/**
 * Get directed tag recommendations for an issue's problematic/missing tags.
 *
 * Implements the Delta Affinity Calculation Engine (Story 4.3.3) following
 * the directed recommendation pipeline from Architecture Decision 1.5:
 *   1. Target/problem tag identification (from issue tags)
 *   2. Candidate mapping (via tag_candidates table)
 *   3. Delta computation (gain class scoring)
 *   4. Negative guardrail (hard rejection of negative-affinity candidates)
 *   5. Sort and hydrate for downstream UI (Story 4.3.4)
 *
 * Response contract for Story 4.3.4 UI consumption:
 *   - candidateTagId/Name: the recommended solution tag
 *   - sourceProblematicTagId/Name: which issue tag triggered this recommendation
 *   - absoluteAffinity: team's average affinity for the candidate tag [-1, 1]
 *   - deltaScore: gain class value used as primary ranking score
 *   - reason: human-readable transition description
 */
export async function getDirectedTagRecommendations(
  teamId: number,
  issueId: number
): Promise<DirectedTagRecommendation[]> {
  // 1. Get issue tags (problematic/missing tags assigned via Story 4.3.1)
  //    Filters by teamId via issue relation to prevent IDOR
  const issueTags = await prisma.issueTag.findMany({
    where: { issueId, issue: { teamId } },
    include: { tag: { select: { id: true, name: true } } },
  })

  if (issueTags.length === 0) return []

  const problemTagIds = issueTags.map((it) => it.tagId)

  // 2. Resolve candidate solution tags via tag_candidates (seeded in Story 4.3.2)
  const candidates = await prisma.tagCandidate.findMany({
    where: { problemTagId: { in: problemTagIds } },
    include: {
      solutionTag: { select: { id: true, name: true } },
      problemTag: { select: { id: true, name: true } },
    },
  })

  if (candidates.length === 0) return []

  // 3. Batch-load personality relations from DB for all involved tags (no N+1)
  const allTagIds = new Set<number>()
  for (const it of issueTags) allTagIds.add(it.tagId)
  for (const c of candidates) allTagIds.add(c.solutionTagId)

  const personalityRelations = await prisma.tagPersonalityRelation.findMany({
    where: { tagId: { in: Array.from(allTagIds) } },
  })

  // Build trait map: tagId → Record<TraitKey, {highPole, lowPole}>
  const tagTraitsMap = new Map<
    number,
    Record<TraitKey, { highPole: number; lowPole: number }>
  >()

  for (const rel of personalityRelations) {
    if (!tagTraitsMap.has(rel.tagId)) {
      tagTraitsMap.set(
        rel.tagId,
        {} as Record<TraitKey, { highPole: number; lowPole: number }>
      )
    }
    tagTraitsMap.get(rel.tagId)![rel.trait as TraitKey] = {
      highPole: rel.highPole,
      lowPole: rel.lowPole,
    }
  }

  // Discard tags without all 5 traits
  for (const [tagId, traits] of tagTraitsMap) {
    if (!TRAIT_KEYS.every((k) => traits[k] !== undefined)) {
      tagTraitsMap.delete(tagId)
    }
  }

  // 4. Load team members with Big Five scores (batched)
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId, user: { isAdminMonitor: false } },
    select: {
      user: {
        select: { bigFiveScore: true },
      },
    },
  })

  // Build team profiles using same conversion as affinity foundation (Epic 4.1)
  const teamProfiles: UserProfile[] = []
  for (const member of teamMembers) {
    if (!member.user.bigFiveScore) continue
    const scores = member.user.bigFiveScore
    const profile: UserProfile = {
      E: scores.extraversion / TRAIT_ITEM_COUNTS.E,
      A: scores.agreeableness / TRAIT_ITEM_COUNTS.A,
      C: scores.conscientiousness / TRAIT_ITEM_COUNTS.C,
      N: scores.neuroticism / TRAIT_ITEM_COUNTS.N,
      O: scores.openness / TRAIT_ITEM_COUNTS.O,
    }
    if (TRAIT_KEYS.every((k) => !isNaN(profile[k]))) {
      teamProfiles.push(profile)
    }
  }

  if (teamProfiles.length === 0) return []

  // Load bounds config from reference data (same source as affinity foundation)
  const { bounds } = getReferenceData()

  // 5. Evaluate each (problemTag, candidateTag) pair
  const bestByCandidate = new Map<
    number,
    DirectedTagRecommendation & { provenanceTagIds: number[] }
  >()

  for (const candidate of candidates) {
    const problemTagTraits = tagTraitsMap.get(candidate.problemTagId)
    const candidateTagTraits = tagTraitsMap.get(candidate.solutionTagId)

    if (!problemTagTraits || !candidateTagTraits) continue

    const currentAffinity = computeTeamTagAffinityFromTraits(
      problemTagTraits,
      teamProfiles,
      bounds
    )
    const candidateAffinity = computeTeamTagAffinityFromTraits(
      candidateTagTraits,
      teamProfiles,
      bounds
    )

    if (currentAffinity === null || candidateAffinity === null) continue

    // Hard rejection: candidate with negative absolute team affinity (AC 3)
    if (candidateAffinity < 0) continue

    const gainClass = computeDeltaGainClass(currentAffinity, candidateAffinity)
    const fromSign = getAffinitySignClass(currentAffinity)
    const toSign = getAffinitySignClass(candidateAffinity)
    const reason = `Transition ${fromSign}\u2192${toSign}: ${candidate.problemTag.name} \u2192 ${candidate.solutionTag.name}`

    // Deduplication: keep best scoring pair per candidate tag
    const existing = bestByCandidate.get(candidate.solutionTagId)
    if (existing) {
      if (!existing.provenanceTagIds.includes(candidate.problemTagId)) {
        existing.provenanceTagIds.push(candidate.problemTagId)
      }
      if (
        gainClass > existing.deltaScore ||
        (gainClass === existing.deltaScore &&
          candidateAffinity > existing.absoluteAffinity)
      ) {
        existing.sourceProblematicTagId = candidate.problemTagId
        existing.sourceProblematicTagName = candidate.problemTag.name
        existing.absoluteAffinity = candidateAffinity
        existing.deltaScore = gainClass
        existing.reason = reason
      }
    } else {
      bestByCandidate.set(candidate.solutionTagId, {
        candidateTagId: candidate.solutionTagId,
        candidateTagName: candidate.solutionTag.name,
        sourceProblematicTagId: candidate.problemTagId,
        sourceProblematicTagName: candidate.problemTag.name,
        absoluteAffinity: candidateAffinity,
        deltaScore: gainClass,
        reason,
        provenanceTagIds: [candidate.problemTagId],
      })
    }
  }

  // 6. Sort: primary deltaScore desc, secondary absoluteAffinity desc, tertiary candidateTagId asc
  const results = Array.from(bestByCandidate.values())
  results.sort((a, b) => {
    if (a.deltaScore !== b.deltaScore) return b.deltaScore - a.deltaScore
    if (a.absoluteAffinity !== b.absoluteAffinity)
      return b.absoluteAffinity - a.absoluteAffinity
    return a.candidateTagId - b.candidateTagId
  })

  // 7. Return with explainability fields (strip internal provenance tracking)
  return results.map(({ provenanceTagIds, ...rec }) => rec)
}
