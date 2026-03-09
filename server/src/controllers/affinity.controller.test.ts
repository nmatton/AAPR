import { getMyPracticeAffinity } from './affinity.controller'
import * as affinityService from '../services/affinity.service'
import { AppError } from '../services/auth.service'

jest.mock('../services/affinity.service')

describe('Affinity Controller', () => {
  let req: any
  let res: any
  let next: any

  beforeEach(() => {
    req = {
      params: { practiceId: '42' },
      user: { userId: 7 },
    }
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      locals: { teamId: 1 },
      getHeader: jest.fn().mockReturnValue('req-123'),
    }
    next = jest.fn()
    jest.clearAllMocks()
  })

  describe('getMyPracticeAffinity', () => {
    it('returns ok response with score rounded to 4 decimals', async () => {
      const serviceResult = {
        status: 'ok',
        teamId: 1,
        practiceId: 42,
        score: 0.2847,
        scale: { min: -1, max: 1 },
        explanation: {
          mappedTags: ['Verbal-Heavy'],
          unmappedTags: [],
          tagScores: [
            {
              tag: 'Verbal-Heavy',
              score: 0.284700,
              traitContributions: { E: 0.5, A: 0.3, C: 0, N: -0.2, O: 0.4 },
            },
          ],
        },
      }

      ;(affinityService.getMyPracticeAffinity as jest.Mock).mockResolvedValue(serviceResult)

      await getMyPracticeAffinity(req, res, next)

      expect(affinityService.getMyPracticeAffinity).toHaveBeenCalledWith(7, 1, 42)
      expect(res.json).toHaveBeenCalledWith({
        ...serviceResult,
        requestId: 'req-123',
      })
    })

    it('returns insufficient_profile_data when user has no Big Five scores', async () => {
      const serviceResult = {
        status: 'insufficient_profile_data',
        teamId: 1,
        practiceId: 42,
        score: null,
      }

      ;(affinityService.getMyPracticeAffinity as jest.Mock).mockResolvedValue(serviceResult)

      await getMyPracticeAffinity(req, res, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'insufficient_profile_data',
          score: null,
        })
      )
    })

    it('returns no_tag_mapping when practice has no matching tags', async () => {
      const serviceResult = {
        status: 'no_tag_mapping',
        teamId: 1,
        practiceId: 42,
        score: null,
        explanation: {
          mappedTags: [],
          unmappedTags: ['Custom Tag'],
          tagScores: [],
        },
      }

      ;(affinityService.getMyPracticeAffinity as jest.Mock).mockResolvedValue(serviceResult)

      await getMyPracticeAffinity(req, res, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'no_tag_mapping',
          score: null,
        })
      )
    })

    it('passes invalid practiceId to next as AppError', async () => {
      req.params.practiceId = 'invalid'

      await getMyPracticeAffinity(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
    })

    it('passes service errors to next middleware', async () => {
      const error = new AppError('not_found', 'Practice not found', {}, 404)
      ;(affinityService.getMyPracticeAffinity as jest.Mock).mockRejectedValue(error)

      await getMyPracticeAffinity(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })

    it('includes requestId in response', async () => {
      ;(affinityService.getMyPracticeAffinity as jest.Mock).mockResolvedValue({
        status: 'ok',
        teamId: 1,
        practiceId: 42,
        score: 0.1,
        scale: { min: -1, max: 1 },
        explanation: { mappedTags: [], unmappedTags: [], tagScores: [] },
      })

      await getMyPracticeAffinity(req, res, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'req-123' })
      )
    })
  })
})
