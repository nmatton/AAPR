import {
  computeTraitContribution,
  computeTagScore,
  computeIndividualPracticeAffinity,
} from './affinity-scoring'
import {
  loadBoundsConfig,
  loadTagRelations,
  normalizeTagKey,
} from './affinity-reference-data'
import type {
  BoundsConfig,
  TagRelationRow,
  UserProfile,
} from './affinity.types'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

// ============================
// Test helpers
// ============================

/** Build a minimal relation row for testing */
function makeRelation(
  tag: string,
  highPoles: Record<string, number>,
  lowPoles: Record<string, number>
): TagRelationRow {
  return {
    tag,
    normalizedTag: normalizeTagKey(tag),
    highPoles: highPoles as TagRelationRow['highPoles'],
    lowPoles: lowPoles as TagRelationRow['lowPoles'],
  }
}

/** Standard E bounds from the canonical CSV */
const E_LOW = 2.6
const E_HIGH = 3.8

/** Full canonical bounds config for comprehensive tests */
const CANONICAL_BOUNDS: BoundsConfig = {
  E: { lowBound: 2.6, highBound: 3.8 },
  A: { lowBound: 3.5, highBound: 4.3 },
  C: { lowBound: 3.0, highBound: 3.9 },
  N: { lowBound: 2.4, highBound: 3.6 },
  O: { lowBound: 3.1, highBound: 3.9 },
}

// ============================
// computeTraitContribution
// ============================

describe('computeTraitContribution', () => {
  describe('Test Vector 12.1: Clamp below lower bound', () => {
    it('returns exact lowEndpoint when userValue <= lowBound', () => {
      // relation: Low E = -, High E = +  → lowEndpoint=-1, highEndpoint=1
      // userValue = 0.85, lowBound = 2.6
      const result = computeTraitContribution(0.85, E_LOW, E_HIGH, -1, 1)
      expect(result).toBe(-1)
    })

    it('returns lowEndpoint when userValue equals lowBound exactly', () => {
      const result = computeTraitContribution(2.6, E_LOW, E_HIGH, -1, 1)
      expect(result).toBe(-1)
    })
  })

  describe('Test Vector 12.2: Clamp above upper bound', () => {
    it('returns exact highEndpoint when userValue >= highBound', () => {
      // userValue = 4.9, highBound = 3.8
      const result = computeTraitContribution(4.9, E_LOW, E_HIGH, -1, 1)
      expect(result).toBe(1)
    })

    it('returns highEndpoint when userValue equals highBound exactly', () => {
      const result = computeTraitContribution(3.8, E_LOW, E_HIGH, -1, 1)
      expect(result).toBe(1)
    })
  })

  describe('Test Vector 12.3: Interpolation between bounds', () => {
    it('interpolates correctly for mid-point value', () => {
      // Low E = 0, High E = +  → lowEndpoint=0, highEndpoint=1
      // userValue=3.2, lowBound=2.6, highBound=3.8
      // expected: 0 + (3.2 - 2.6)/(3.8 - 2.6) * (1 - 0) = 0.6/1.2 = 0.5
      const result = computeTraitContribution(3.2, E_LOW, E_HIGH, 0, 1)
      expect(result).toBeCloseTo(0.5, 10)
    })

    it('interpolates between -1 and 1', () => {
      // midpoint of E bounds: (2.6 + 3.8) / 2 = 3.2
      // lowEndpoint=-1, highEndpoint=1
      // expected: -1 + (3.2-2.6)/(3.8-2.6) * (1-(-1)) = -1 + 0.5*2 = 0
      const result = computeTraitContribution(3.2, E_LOW, E_HIGH, -1, 1)
      expect(result).toBeCloseTo(0, 10)
    })

    it('interpolates between -1 and 0', () => {
      // lowEndpoint=-1, highEndpoint=0
      // userValue=3.2 (midpoint)
      // expected: -1 + 0.5*(0-(-1)) = -1 + 0.5 = -0.5
      const result = computeTraitContribution(3.2, E_LOW, E_HIGH, -1, 0)
      expect(result).toBeCloseTo(-0.5, 10)
    })
  })

  describe('Test Vector 12.4: Neutral-neutral always returns 0', () => {
    it('returns 0 regardless of user value', () => {
      expect(computeTraitContribution(1.0, E_LOW, E_HIGH, 0, 0)).toBe(0)
      expect(computeTraitContribution(3.2, E_LOW, E_HIGH, 0, 0)).toBe(0)
      expect(computeTraitContribution(5.0, E_LOW, E_HIGH, 0, 0)).toBe(0)
    })
  })

  describe('no extrapolation outside bounds', () => {
    it('never returns value below -1', () => {
      const result = computeTraitContribution(0.0, E_LOW, E_HIGH, -1, 1)
      expect(result).toBe(-1)
    })

    it('never returns value above 1', () => {
      const result = computeTraitContribution(100.0, E_LOW, E_HIGH, -1, 1)
      expect(result).toBe(1)
    })
  })
})

// ============================
// computeTagScore
// ============================

describe('computeTagScore', () => {
  it('computes arithmetic mean of five trait contributions', () => {
    // All traits at midpoint of their bounds → all contributions = 0 when endpoints are -1/1
    const midProfile: UserProfile = {
      E: (2.6 + 3.8) / 2,  // 3.2
      A: (3.5 + 4.3) / 2,  // 3.9
      C: (3.0 + 3.9) / 2,  // 3.45
      N: (2.4 + 3.6) / 2,  // 3.0
      O: (3.1 + 3.9) / 2,  // 3.5
    }

    // Relation with all -/+ → all lowEndpoint=-1, highEndpoint=1
    const relation = makeRelation('Test Tag', {
      E: 1, A: 1, C: 1, N: 1, O: 1,
    }, {
      E: -1, A: -1, C: -1, N: -1, O: -1,
    })

    const { score, traitContributions } = computeTagScore(midProfile, CANONICAL_BOUNDS, relation)

    // All at midpoint → all contributions ≈ 0
    expect(traitContributions.E).toBeCloseTo(0, 10)
    expect(traitContributions.A).toBeCloseTo(0, 10)
    expect(traitContributions.C).toBeCloseTo(0, 10)
    expect(traitContributions.N).toBeCloseTo(0, 10)
    expect(traitContributions.O).toBeCloseTo(0, 10)
    expect(score).toBeCloseTo(0, 10)
  })

  it('returns per-trait contributions in result', () => {
    const profile: UserProfile = { E: 0.5, A: 5.0, C: 3.45, N: 0.1, O: 5.0 }
    const relation = makeRelation('Tag', {
      E: 1, A: 1, C: 0, N: -1, O: 1,
    }, {
      E: -1, A: 0, C: 0, N: 0, O: -1,
    })

    const { traitContributions } = computeTagScore(profile, CANONICAL_BOUNDS, relation)

    // E=0.5 <= 2.6 → lowEndpoint=-1
    expect(traitContributions.E).toBe(-1)
    // A=5.0 >= 4.3 → highEndpoint=1
    expect(traitContributions.A).toBe(1)
    // C=3.45 midpoint, endpoints 0/0 → 0
    expect(traitContributions.C).toBe(0)
    // N=0.1 <= 2.4 → lowEndpoint=0
    expect(traitContributions.N).toBe(0)
    // O=5.0 >= 3.9 → highEndpoint=1
    expect(traitContributions.O).toBe(1)
  })
})

// ============================
// computeIndividualPracticeAffinity
// ============================

describe('computeIndividualPracticeAffinity', () => {
  const relations: TagRelationRow[] = [
    makeRelation('Verbal-Heavy', {
      E: 1, A: 1, C: 0, N: -1, O: 1,
    }, {
      E: -1, A: 0, C: 0, N: 0, O: 0,
    }),
    makeRelation('Whole Crowd', {
      E: 1, A: 0, C: 0, N: -1, O: 1,
    }, {
      E: -1, A: 0, C: 0, N: 1, O: 0,
    }),
  ]

  describe('Test Vector 12.5: No tag mapping', () => {
    it('returns no_tag_mapping when no practice tags match', () => {
      const profile: UserProfile = { E: 3.0, A: 4.0, C: 3.5, N: 3.0, O: 3.5 }
      const result = computeIndividualPracticeAffinity(profile, ['Unknown Tag'], CANONICAL_BOUNDS, relations)

      expect(result.status).toBe('no_tag_mapping')
      expect(result.score).toBeNull()
      expect(result.unmappedTags).toEqual(['Unknown Tag'])
      expect(result.mappedTags).toEqual([])
    })
  })

  describe('Test Vector 12.6: Missing user traits → insufficient_profile_data', () => {
    it('returns insufficient_profile_data when profile is null', () => {
      const result = computeIndividualPracticeAffinity(null, ['Verbal-Heavy'], CANONICAL_BOUNDS, relations)

      expect(result.status).toBe('insufficient_profile_data')
      expect(result.score).toBeNull()
    })

    it('returns insufficient_profile_data when a trait is NaN', () => {
      const profile = { E: 3.0, A: NaN, C: 3.5, N: 3.0, O: 3.5 }
      const result = computeIndividualPracticeAffinity(profile, ['Verbal-Heavy'], CANONICAL_BOUNDS, relations)

      expect(result.status).toBe('insufficient_profile_data')
      expect(result.score).toBeNull()
    })
  })

  describe('successful score computation', () => {
    it('computes score as average of mapped tag scores', () => {
      // Use midpoint values for deterministic expectation
      const profile: UserProfile = {
        E: (2.6 + 3.8) / 2,
        A: (3.5 + 4.3) / 2,
        C: (3.0 + 3.9) / 2,
        N: (2.4 + 3.6) / 2,
        O: (3.1 + 3.9) / 2,
      }

      const result = computeIndividualPracticeAffinity(profile, ['Verbal-Heavy', 'Whole Crowd'], CANONICAL_BOUNDS, relations)

      expect(result.status).toBe('ok')
      expect(result.score).not.toBeNull()
      expect(result.mappedTags).toEqual(['Verbal-Heavy', 'Whole Crowd'])
      expect(result.unmappedTags).toEqual([])
      expect(result.tagScores).toHaveLength(2)

      // At midpoints all contributions = 0 (endpoints are symmetric or 0)
      // Verbal-Heavy: E midpoint with -1/1→0, A midpoint with 0/1→0.5, C 0/0→0, N 0/-1→-0.5, O 0/1→0.5
      // Wait, let me calculate carefully:
      // Verbal-Heavy: highPoles E=1,A=1,C=0,N=-1,O=1 lowPoles E=-1,A=0,C=0,N=0,O=0
      // At midpoints: 
      //   E: -1 + 0.5*(1-(-1)) = -1+1 = 0
      //   A: 0 + 0.5*(1-0) = 0.5
      //   C: 0 + 0.5*(0-0) = 0
      //   N: 0 + 0.5*(-1-0) = -0.5
      //   O: 0 + 0.5*(1-0) = 0.5
      //   tagScore = (0 + 0.5 + 0 + (-0.5) + 0.5) / 5 = 0.5/5 = 0.1

      expect(result.tagScores[0].score).toBeCloseTo(0.1, 10)
    })

    it('reports unmapped tags while scoring mapped ones', () => {
      const profile: UserProfile = { E: 3.0, A: 4.0, C: 3.5, N: 3.0, O: 3.5 }
      const result = computeIndividualPracticeAffinity(
        profile,
        ['Verbal-Heavy', 'Custom Tag'],
        CANONICAL_BOUNDS,
        relations
      )

      expect(result.status).toBe('ok')
      expect(result.score).not.toBeNull()
      expect(result.mappedTags).toEqual(['Verbal-Heavy'])
      expect(result.unmappedTags).toEqual(['Custom Tag'])
      expect(result.tagScores).toHaveLength(1)
    })

    it('handles case-insensitive tag matching', () => {
      const profile: UserProfile = { E: 3.0, A: 4.0, C: 3.5, N: 3.0, O: 3.5 }
      const result = computeIndividualPracticeAffinity(
        profile,
        ['verbal-heavy'],
        CANONICAL_BOUNDS,
        relations
      )

      expect(result.status).toBe('ok')
      expect(result.mappedTags).toEqual(['verbal-heavy'])
    })

    it('handles tags with extra whitespace', () => {
      const profile: UserProfile = { E: 3.0, A: 4.0, C: 3.5, N: 3.0, O: 3.5 }
      const result = computeIndividualPracticeAffinity(
        profile,
        ['  Verbal-Heavy  '],
        CANONICAL_BOUNDS,
        relations
      )

      expect(result.status).toBe('ok')
      expect(result.mappedTags).toEqual(['  Verbal-Heavy  '])
    })
  })

  describe('score remains in [-1, 1]', () => {
    it('extreme high user values produce score in valid range', () => {
      const profile: UserProfile = { E: 5.0, A: 5.0, C: 5.0, N: 5.0, O: 5.0 }
      const result = computeIndividualPracticeAffinity(profile, ['Verbal-Heavy'], CANONICAL_BOUNDS, relations)

      expect(result.score).not.toBeNull()
      expect(result.score!).toBeGreaterThanOrEqual(-1)
      expect(result.score!).toBeLessThanOrEqual(1)
    })

    it('extreme low user values produce score in valid range', () => {
      const profile: UserProfile = { E: 1.0, A: 1.0, C: 1.0, N: 1.0, O: 1.0 }
      const result = computeIndividualPracticeAffinity(profile, ['Verbal-Heavy'], CANONICAL_BOUNDS, relations)

      expect(result.score).not.toBeNull()
      expect(result.score!).toBeGreaterThanOrEqual(-1)
      expect(result.score!).toBeLessThanOrEqual(1)
    })
  })

  describe('determinism', () => {
    it('produces identical output for identical input', () => {
      const profile: UserProfile = { E: 3.2, A: 3.8, C: 3.5, N: 2.9, O: 3.6 }
      const tags = ['Verbal-Heavy', 'Whole Crowd']

      const result1 = computeIndividualPracticeAffinity(profile, tags, CANONICAL_BOUNDS, relations)
      const result2 = computeIndividualPracticeAffinity(profile, tags, CANONICAL_BOUNDS, relations)

      expect(result1).toEqual(result2)
    })
  })
})

// ============================
// CSV Parsing and Validation
// ============================

describe('loadBoundsConfig', () => {
  const boundsPath = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'tag_personality_affinity', 'personality_score_bounds.csv')

  it('loads canonical bounds CSV with decimal comma parsing', () => {
    const bounds = loadBoundsConfig(boundsPath)

    expect(bounds.E).toEqual({ lowBound: 2.6, highBound: 3.8 })
    expect(bounds.A).toEqual({ lowBound: 3.5, highBound: 4.3 })
    expect(bounds.C).toEqual({ lowBound: 3.0, highBound: 3.9 })
    expect(bounds.N).toEqual({ lowBound: 2.4, highBound: 3.6 })
    expect(bounds.O).toEqual({ lowBound: 3.1, highBound: 3.9 })
  })

  it('validates all five traits are present', () => {
    expect(Object.keys(loadBoundsConfig(boundsPath)).sort()).toEqual(['A', 'C', 'E', 'N', 'O'])
  })

  it('fails fast on malformed numeric values', () => {
    const tempPath = path.join(os.tmpdir(), `affinity-bounds-invalid-number-${Date.now()}.csv`)
    fs.writeFileSync(
      tempPath,
      [
        'trait\tlow\thigh',
        'E\t2,6abc\t3,8',
        'A\t3,5\t4,3',
        'C\t3\t3,9',
        'N\t2,4\t3,6',
        'O\t3,1\t3,9',
      ].join('\n'),
      'utf-8'
    )

    try {
      expect(() => loadBoundsConfig(tempPath)).toThrow('non-numeric bound values')
    } finally {
      fs.unlinkSync(tempPath)
    }
  })

  it('fails fast when trait rows are duplicated', () => {
    const tempPath = path.join(os.tmpdir(), `affinity-bounds-duplicate-trait-${Date.now()}.csv`)
    fs.writeFileSync(
      tempPath,
      [
        'trait\tlow\thigh',
        'E\t2,6\t3,8',
        'E\t2,6\t3,8',
        'A\t3,5\t4,3',
        'C\t3\t3,9',
        'N\t2,4\t3,6',
        'O\t3,1\t3,9',
      ].join('\n'),
      'utf-8'
    )

    try {
      expect(() => loadBoundsConfig(tempPath)).toThrow("duplicate trait 'E'")
    } finally {
      fs.unlinkSync(tempPath)
    }
  })
})

describe('loadTagRelations', () => {
  const relationsPath = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'tag_personality_affinity', 'tags_personality_relation.csv')

  it('loads canonical tag relations CSV', () => {
    const relations = loadTagRelations(relationsPath)

    expect(relations.length).toBe(20) // 20 tags in the CSV

    // Verify first row: Written / Async-Ready
    const first = relations[0]
    expect(first.tag).toBe('Written / Async-Ready')
    expect(first.highPoles.E).toBe(-1)  // High E = -
    expect(first.lowPoles.E).toBe(1)    // Low E = +
    expect(first.highPoles.A).toBe(1)   // High A = +
    expect(first.lowPoles.A).toBe(0)    // Low A = 0
  })

  it('correctly maps all symbols', () => {
    const relations = loadTagRelations(relationsPath)

    for (const row of relations) {
      for (const key of ['E', 'A', 'C', 'N', 'O'] as const) {
        expect([-1, 0, 1]).toContain(row.highPoles[key])
        expect([-1, 0, 1]).toContain(row.lowPoles[key])
      }
    }
  })
})

describe('normalizeTagKey', () => {
  it('trims whitespace', () => {
    expect(normalizeTagKey('  Verbal-Heavy  ')).toBe('verbal-heavy')
  })

  it('collapses internal whitespace', () => {
    expect(normalizeTagKey('Written /  Async-Ready')).toBe('written / async-ready')
  })

  it('lowercases', () => {
    expect(normalizeTagKey('VERBAL-HEAVY')).toBe('verbal-heavy')
  })
})
