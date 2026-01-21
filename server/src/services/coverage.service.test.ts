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
    expect(prisma.event.create).toHaveBeenCalled()
  })

  it('calculates coverage with unique pillars and precise percentage', async () => {
    ;(coverageRepository.findTeamPracticesWithPillars as jest.MockedFunction<typeof coverageRepository.findTeamPracticesWithPillars>)
      .mockResolvedValue([
        {
          practice: {
            practicePillars: [
              { pillar: { id: 1, name: 'Communication', categoryId: 'values', category: { id: 'values', name: 'Human Values' } } },
              { pillar: { id: 2, name: 'Transparency', categoryId: 'values', category: { id: 'values', name: 'Human Values' } } }
            ]
          }
        },
        {
          practice: {
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
          eventType: 'coverage.calculated',
          teamId: 7,
          action: 'coverage.calculated',
          payload: expect.objectContaining({
            coveredCount: 1,
            coveredPillarIds: [5]
          })
        })
      })
    )
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
