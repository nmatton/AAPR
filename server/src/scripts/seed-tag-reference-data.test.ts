import { describe, expect, it, jest } from '@jest/globals'
import {
  parseTagCandidates,
  parseTagRecommendations,
  resolveTagNameToId,
  seedTagCandidates,
  seedTagPersonalityRelations,
  seedTagRecommendations,
} from './seed-tag-reference-data'
import { VALID_TAGS } from '../constants/tags.constants'
import { normalizeTagKey } from '../services/affinity/affinity-reference-data'

describe('seed-tag-reference-data', () => {
  const tagMap = new Map<string, number>([
    ['written / async-ready', 1],
    ['visual / tactile', 2],
    ['structured / facilitated', 3],
    ['documented / traceable', 4],
    ['critical / introspective', 5],
    ['high visibility', 6],
    ['user-feedback oriented', 7],
    ['small group / pair', 8],
    ['time-boxed', 9],
    ['co-located / on-site', 10],
    ['verbal-heavy', 11],
  ])

  function buildFullTagMap(): Map<string, number> {
    return new Map(VALID_TAGS.map((name, idx) => [normalizeTagKey(name), idx + 1]))
  }

  it('resolves abbreviated aliases to canonical tag ids', () => {
    expect(resolveTagNameToId('Structured / Facilit.', tagMap)).toBe(3)
    expect(resolveTagNameToId('Critical / Introspect. (Ex: Code Review)', tagMap)).toBe(5)
    expect(resolveTagNameToId('Written / Async', tagMap)).toBe(1)
    expect(resolveTagNameToId('Public / High Visib. (Ex: High Exposure)', tagMap)).toBe(6)
  })

  it('parses candidate rows and expands multi-value candidate cells', () => {
    const content = [
      'tag_issue;tag_candidates;justification',
      'Spontaneous / Improv;Structured / Facilitated, Documented / Traceable;Keep the record and add structure.',
      'Written / Async;Verbal-Heavy, Co-located / On-Site;Restore direct communication.',
    ].join('\n')

    const { rows, warnings } = parseTagCandidates(content, tagMap)

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Unresolved problem tag: Spontaneous / Improv')
    expect(rows).toEqual([
      {
        problemTagId: 1,
        solutionTagId: 11,
        justification: 'Restore direct communication.',
      },
      {
        problemTagId: 1,
        solutionTagId: 10,
        justification: 'Restore direct communication.',
      },
    ])
  })

  it('warns and skips pairs where a solution tag is unresolvable', () => {
    const content = [
      'tag_issue;tag_candidates;justification',
      'Written / Async-Ready;Unknown / Tag, Verbal-Heavy;Some justification.',
    ].join('\n')

    const { rows, warnings } = parseTagCandidates(content, tagMap)

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Unresolved solution tag: Unknown / Tag')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ problemTagId: 1, solutionTagId: 11 })
  })

  it('parses recommendation rows with quoted comma-containing fields', () => {
    const content = [
      'Tag,Recommendation,Implementation Example',
      'User-Feedback Orient.,Create direct user contact,"Preview environments, frequent demos, customer interviews."',
    ].join('\n')

    const { rows, warnings } = parseTagRecommendations(content, tagMap)

    expect(warnings).toEqual([])
    expect(rows).toEqual([
      {
        tagId: 7,
        recommendationText: 'Create direct user contact',
        implementationExample: 'Preview environments, frequent demos, customer interviews.',
      },
    ])
  })

  describe('component integration (real CSV files + mocked Prisma client)', () => {
    it('seedTagPersonalityRelations generates 100 rows (20 tags × 5 traits) with alias resolution', async () => {
      const capturedData: unknown[] = []
      const mockClient = {
        tagPersonalityRelation: {
          createMany: jest.fn().mockImplementation(({ data }: { data: unknown[] }) => {
            capturedData.push(...data)
            return Promise.resolve({ count: data.length })
          }),
        },
      } as any

      const count = await seedTagPersonalityRelations(mockClient, buildFullTagMap())

      expect(count).toBe(100)
      expect(capturedData).toHaveLength(100)
      const rows = capturedData as Array<{ trait: string; highPole: number; lowPole: number }>
      expect(new Set(rows.map((r) => r.trait))).toEqual(new Set(['E', 'A', 'C', 'N', 'O']))
      for (const row of rows) {
        expect([-1, 0, 1]).toContain(row.highPole)
        expect([-1, 0, 1]).toContain(row.lowPole)
      }
    })

    it('seedTagCandidates generates 34 candidate rows from real CSV', async () => {
      const mockClient = {
        tagCandidate: {
          createMany: jest.fn().mockImplementation(({ data }: { data: unknown[] }) =>
            Promise.resolve({ count: data.length })
          ),
        },
      } as any

      const count = await seedTagCandidates(mockClient, buildFullTagMap())

      expect(count).toBe(34)
    })

    it('seedTagRecommendations generates 19 rows from real CSV (Remote-Friendly excluded)', async () => {
      const mockClient = {
        tagRecommendation: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      } as any

      const count = await seedTagRecommendations(mockClient, buildFullTagMap())

      expect(count).toBe(19)
    })
  })
})