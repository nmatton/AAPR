process.env.JWT_SECRET = 'test_secret_for_unit_tests_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import * as coverageService from './coverage.service'
import * as coverageRepository from '../repositories/coverage.repository'
import { prisma } from '../lib/prisma'

jest.mock('../repositories/coverage.repository')
jest.mock('../lib/prisma', () => ({
  prisma: {
    event: {
      create: jest.fn()
    }
  }
}))

describe('coverageService.getTeamPillarCoverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 0% coverage when team has no practices', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([])

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue([
        { id: 1, name: 'Communication', categoryId: 'values', category: { id: 'values', name: 'Human Values' }, description: null },
        { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'Human Values' }, description: null }
      ] as any)

    const result = await coverageService.getTeamPillarCoverage(1)

    expect(result.overallCoveragePct).toBe(0)
    expect(result.coveredCount).toBe(0)
    expect(result.totalCount).toBe(2)
    expect(result.coveredPillars).toHaveLength(0)
    expect(result.gapPillars).toHaveLength(2)
    expect(result.categoryBreakdown).toHaveLength(1)
    expect(result.categoryBreakdown[0].categoryId).toBe('values')
    expect(result.categoryBreakdown[0].coveragePct).toBe(0)
    expect(result.categoryBreakdown[0].coveredCount).toBe(0)
    expect(result.categoryBreakdown[0].totalCount).toBe(2)
    expect(prisma.event.create).toHaveBeenCalled()
  })

  it('calculates coverage with unique pillars and precise percentage', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([
        {
          practice: {
            id: 1,
            title: 'Retrospective',
            practicePillars: [
              { pillar: { id: 1, name: 'Communication', categoryId: 'values', category: { id: 'values', name: 'Human Values' } } },
              { pillar: { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'Human Values' } } }
            ]
          }
        },
        {
          practice: {
            id: 2,
            title: 'Sprint Planning',
            practicePillars: [
              { pillar: { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'Human Values' } } },
              { pillar: { id: 3, name: 'Quality', categoryId: 'delivery', category: { id: 'delivery', name: 'Value Delivery' } } }
            ]
          }
        }
      ] as any)

    const allPillars = Array.from({ length: 19 }, (_, index) => ({
      id: index + 1,
      name: `Pillar ${index + 1}`,
      categoryId: 'values',
      category: { id: 'values', name: 'Human Values' },
      description: null
    }))

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue(allPillars as any)

    const result = await coverageService.getTeamPillarCoverage(2)

    expect(result.coveredCount).toBe(3)
    expect(result.totalCount).toBe(19)
    expect(result.overallCoveragePct).toBe(15.79)
    expect(result.coveredPillars.map((pillar) => pillar.id)).toEqual([1, 2, 3])
    expect(result.gapPillars).toHaveLength(16)
  })

  it('logs coverage.calculated event with payload', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([
        {
          practice: {
            id: 3,
            title: 'Learning Review',
            practicePillars: [
              { pillar: { id: 5, name: 'Learning', categoryId: 'values', category: { id: 'values', name: 'Human Values' } } }
            ]
          }
        }
      ] as any)

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue([
        { id: 5, name: 'Learning', categoryId: 'values', category: { id: 'values', name: 'Human Values' }, description: null },
        { id: 6, name: 'Adaptation', categoryId: 'values', category: { id: 'values', name: 'Human Values' }, description: null }
      ] as any)

    await coverageService.getTeamPillarCoverage(7)

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'coverage.by_category.calculated',
          teamId: 7,
          action: 'coverage.by_category.calculated',
          payload: expect.objectContaining({
            coveredCount: 1,
            coveredPillarIds: [5],
            timestamp: expect.any(String),
            categoryBreakdown: expect.arrayContaining([
              expect.objectContaining({
                categoryName: 'Human Values',
                coveragePct: 50,
                coveredCount: 1,
                totalCount: 2
              })
            ])
          })
        })
      })
    )
  })

  it('calculates category breakdown with multiple categories', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([
        {
          practice: {
            id: 4,
            title: 'Feedback Loop',
            practicePillars: [
              { pillar: { id: 1, name: 'Communication', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' } } },
              { pillar: { id: 5, name: 'Retrospectives', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' } } }
            ]
          }
        },
        {
          practice: {
            id: 5,
            title: 'Transparency Check',
            practicePillars: [
              { pillar: { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' } } }
            ]
          }
        }
      ] as any)

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue([
        { id: 1, name: 'Communication', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 3, name: 'Courage', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 4, name: 'Respect', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 5, name: 'Retrospectives', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null },
        { id: 6, name: 'Experiments', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null },
        { id: 7, name: 'Metrics', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null },
        { id: 8, name: 'Learning', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null }
      ] as any)

    const result = await coverageService.getTeamPillarCoverage(10)

    expect(result.categoryBreakdown).toHaveLength(2)

    const valuesCategory = result.categoryBreakdown.find((c) => c.categoryId === 'values')
    expect(valuesCategory).toBeDefined()
    expect(valuesCategory!.categoryName).toBe('VALEURS HUMAINES')
    expect(valuesCategory!.coveredCount).toBe(2)
    expect(valuesCategory!.totalCount).toBe(4)
    expect(valuesCategory!.coveragePct).toBe(50)

    const feedbackCategory = result.categoryBreakdown.find((c) => c.categoryId === 'feedback')
    expect(feedbackCategory).toBeDefined()
    expect(feedbackCategory!.categoryName).toBe('FEEDBACK & APPRENTISSAGE')
    expect(feedbackCategory!.coveredCount).toBe(1)
    expect(feedbackCategory!.totalCount).toBe(4)
    expect(feedbackCategory!.coveragePct).toBe(25)
  })

  it('returns correct color coding thresholds for categories', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([
        {
          practice: {
            id: 6,
            title: 'Excellence Sprint',
            practicePillars: [
              { pillar: { id: 1, name: 'Communication', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' } } },
              { pillar: { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' } } },
              { pillar: { id: 3, name: 'Courage', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' } } },
              { pillar: { id: 5, name: 'Retrospectives', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' } } },
              { pillar: { id: 6, name: 'Experiments', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' } } },
              { pillar: { id: 9, name: 'TDD', categoryId: 'excellence', category: { id: 'excellence', name: 'EXCELLENCE TECHNIQUE' } } }
            ]
          }
        }
      ] as any)

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue([
        { id: 1, name: 'Communication', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 3, name: 'Courage', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 4, name: 'Respect', categoryId: 'values', category: { id: 'values', name: 'VALEURS HUMAINES' }, description: null },
        { id: 5, name: 'Retrospectives', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null },
        { id: 6, name: 'Experiments', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null },
        { id: 7, name: 'Metrics', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null },
        { id: 8, name: 'Learning', categoryId: 'feedback', category: { id: 'feedback', name: 'FEEDBACK & APPRENTISSAGE' }, description: null },
        { id: 9, name: 'TDD', categoryId: 'excellence', category: { id: 'excellence', name: 'EXCELLENCE TECHNIQUE' }, description: null },
        { id: 10, name: 'CI/CD', categoryId: 'excellence', category: { id: 'excellence', name: 'EXCELLENCE TECHNIQUE' }, description: null },
        { id: 11, name: 'Code Review', categoryId: 'excellence', category: { id: 'excellence', name: 'EXCELLENCE TECHNIQUE' }, description: null },
        { id: 12, name: 'Refactoring', categoryId: 'excellence', category: { id: 'excellence', name: 'EXCELLENCE TECHNIQUE' }, description: null }
      ] as any)

    const result = await coverageService.getTeamPillarCoverage(11)

    const valuesCategory = result.categoryBreakdown.find((c) => c.categoryId === 'values')
    expect(valuesCategory!.coveragePct).toBe(75)

    const feedbackCategory = result.categoryBreakdown.find((c) => c.categoryId === 'feedback')
    expect(feedbackCategory!.coveragePct).toBe(50)

    const excellenceCategory = result.categoryBreakdown.find((c) => c.categoryId === 'excellence')
    expect(excellenceCategory!.coveragePct).toBe(25)
  })

  it('throws 400 for invalid teamId', async () => {
    await expect(coverageService.getTeamPillarCoverage(0)).rejects.toThrow(
      expect.objectContaining({
        code: 'invalid_team_id',
        statusCode: 400
      })
    )
  })
})
