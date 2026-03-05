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
        { id: 1, name: 'Psychological Safety & Core Values', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 2, name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null }
      ] as any)

    const result = await coverageService.getTeamPillarCoverage(1)

    expect(result.overallCoveragePct).toBe(0)
    expect(result.coveredCount).toBe(0)
    expect(result.totalCount).toBe(2)
    expect(result.coveredPillars).toHaveLength(0)
    expect(result.gapPillars).toHaveLength(2)
    expect(result.categoryBreakdown).toHaveLength(1)
    expect(result.categoryBreakdown[0].categoryId).toBe('TEAM_CULTURE')
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
              { pillar: { id: 1, name: 'Psychological Safety & Core Values', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } },
              { pillar: { id: 2, name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } }
            ]
          }
        },
        {
          practice: {
            id: 2,
            title: 'Sprint Planning',
            practicePillars: [
              { pillar: { id: 2, name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } },
              { pillar: { id: 3, name: 'Flow & Delivery Cadence', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' } } }
            ]
          }
        }
      ] as any)

    const allPillars = Array.from({ length: 13 }, (_, index) => ({
      id: index + 1,
      name: `Pillar ${index + 1}`,
      categoryId: 'TEAM_CULTURE',
      category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' },
      description: null
    }))

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue(allPillars as any)

    const result = await coverageService.getTeamPillarCoverage(2)

    expect(result.coveredCount).toBe(3)
    expect(result.totalCount).toBe(13)
    expect(result.overallCoveragePct).toBe(23.08)
    expect(result.coveredPillars.map((pillar) => pillar.id)).toEqual([1, 2, 3])
    expect(result.gapPillars).toHaveLength(10)
  })

  it('logs coverage.calculated event with payload', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([
        {
          practice: {
            id: 3,
            title: 'Learning Review',
            practicePillars: [
              { pillar: { id: 5, name: 'Inspection & Adaptation', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' } } }
            ]
          }
        }
      ] as any)

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue([
        { id: 5, name: 'Inspection & Adaptation', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null },
        { id: 6, name: 'Work Transparency & Synchronization', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null }
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
                categoryName: 'Process & Execution',
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
              { pillar: { id: 1, name: 'Psychological Safety & Core Values', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } },
              { pillar: { id: 5, name: 'Inspection & Adaptation', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' } } }
            ]
          }
        },
        {
          practice: {
            id: 5,
            title: 'Transparency Check',
            practicePillars: [
              { pillar: { id: 2, name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } }
            ]
          }
        }
      ] as any)

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue([
        { id: 1, name: 'Psychological Safety & Core Values', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 2, name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 3, name: 'Cross-Functionality & Shared Skills', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 4, name: 'Sustainable Pace', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 5, name: 'Inspection & Adaptation', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null },
        { id: 6, name: 'Flow & Delivery Cadence', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null },
        { id: 7, name: 'Work Transparency & Synchronization', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null },
      ] as any)

    const result = await coverageService.getTeamPillarCoverage(10)

    expect(result.categoryBreakdown).toHaveLength(2)

    const teamCultureCategory = result.categoryBreakdown.find((c) => c.categoryId === 'TEAM_CULTURE')
    expect(teamCultureCategory).toBeDefined()
    expect(teamCultureCategory!.categoryName).toBe('Team Culture & Psychology')
    expect(teamCultureCategory!.coveredCount).toBe(2)
    expect(teamCultureCategory!.totalCount).toBe(4)
    expect(teamCultureCategory!.coveragePct).toBe(50)

    const processCategory = result.categoryBreakdown.find((c) => c.categoryId === 'PROCESS_EXECUTION')
    expect(processCategory).toBeDefined()
    expect(processCategory!.categoryName).toBe('Process & Execution')
    expect(processCategory!.coveredCount).toBe(1)
    expect(processCategory!.totalCount).toBe(3)
    expect(processCategory!.coveragePct).toBe(33.33)
  })

  it('returns correct color coding thresholds for categories', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([
        {
          practice: {
            id: 6,
            title: 'Excellence Sprint',
            practicePillars: [
              { pillar: { id: 1, name: 'Psychological Safety & Core Values', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } },
              { pillar: { id: 2, name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } },
              { pillar: { id: 3, name: 'Cross-Functionality & Shared Skills', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' } } },
              { pillar: { id: 5, name: 'Inspection & Adaptation', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' } } },
              { pillar: { id: 6, name: 'Flow & Delivery Cadence', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' } } },
              { pillar: { id: 9, name: 'Code Quality & Simple Design', categoryId: 'TECHNICAL_QUALITY', category: { id: 'TECHNICAL_QUALITY', name: 'Technical Quality & Engineering Excellence' } } }
            ]
          }
        }
      ] as any)

    ;(coverageRepository.findAllPillars as jest.MockedFunction<typeof coverageRepository.findAllPillars>)
      .mockResolvedValue([
        { id: 1, name: 'Psychological Safety & Core Values', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 2, name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 3, name: 'Cross-Functionality & Shared Skills', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 4, name: 'Sustainable Pace', categoryId: 'TEAM_CULTURE', category: { id: 'TEAM_CULTURE', name: 'Team Culture & Psychology' }, description: null },
        { id: 5, name: 'Inspection & Adaptation', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null },
        { id: 6, name: 'Flow & Delivery Cadence', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null },
        { id: 7, name: 'Work Transparency & Synchronization', categoryId: 'PROCESS_EXECUTION', category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }, description: null },
        { id: 9, name: 'Code Quality & Simple Design', categoryId: 'TECHNICAL_QUALITY', category: { id: 'TECHNICAL_QUALITY', name: 'Technical Quality & Engineering Excellence' }, description: null },
        { id: 10, name: 'Automation & Continuous Integration', categoryId: 'TECHNICAL_QUALITY', category: { id: 'TECHNICAL_QUALITY', name: 'Technical Quality & Engineering Excellence' }, description: null },
        { id: 11, name: 'Technical Debt Management', categoryId: 'TECHNICAL_QUALITY', category: { id: 'TECHNICAL_QUALITY', name: 'Technical Quality & Engineering Excellence' }, description: null },
        { id: 12, name: 'Technical Collective Ownership', categoryId: 'TECHNICAL_QUALITY', category: { id: 'TECHNICAL_QUALITY', name: 'Technical Quality & Engineering Excellence' }, description: null }
      ] as any)

    const result = await coverageService.getTeamPillarCoverage(11)

    const teamCultureCategory = result.categoryBreakdown.find((c) => c.categoryId === 'TEAM_CULTURE')
    expect(teamCultureCategory!.coveragePct).toBe(75)

    const processCategory = result.categoryBreakdown.find((c) => c.categoryId === 'PROCESS_EXECUTION')
    expect(processCategory!.coveragePct).toBe(66.67)

    const technicalCategory = result.categoryBreakdown.find((c) => c.categoryId === 'TECHNICAL_QUALITY')
    expect(technicalCategory!.coveragePct).toBe(25)
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
