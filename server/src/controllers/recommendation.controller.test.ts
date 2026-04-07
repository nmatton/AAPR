import { getIssueDirectedRecommendations } from './recommendation.controller'
import * as recommendationService from '../services/recommendation.service'
import { AppError } from '../services/auth.service'

jest.mock('../services/recommendation.service')

describe('Recommendation Controller', () => {
  let req: any
  let res: any
  let next: any

  beforeEach(() => {
    req = {
      params: { issueId: '100' },
    }
    res = {
      json: jest.fn(),
      locals: { teamId: 1 },
      getHeader: jest.fn().mockReturnValue('req-123'),
    }
    next = jest.fn()
    jest.clearAllMocks()
  })

  describe('getIssueDirectedRecommendations', () => {
    it('returns top 3 items and requestId', async () => {
      ;(recommendationService.getDirectedTagRecommendations as jest.Mock).mockResolvedValue([
        {
          candidateTagId: 1,
          candidateTagName: 'A',
          recommendationText: 'Text A',
          implementationOptions: ['One'],
          sourceProblematicTagId: 10,
          sourceProblematicTagName: 'P1',
          absoluteAffinity: 1,
          deltaScore: 1,
          reason: 'r1',
        },
        {
          candidateTagId: 2,
          candidateTagName: 'B',
          recommendationText: 'Text B',
          implementationOptions: ['Two'],
          sourceProblematicTagId: 11,
          sourceProblematicTagName: 'P2',
          absoluteAffinity: 0.5,
          deltaScore: 0.5,
          reason: 'r2',
        },
        {
          candidateTagId: 3,
          candidateTagName: 'C',
          recommendationText: 'Text C',
          implementationOptions: ['Three'],
          sourceProblematicTagId: 12,
          sourceProblematicTagName: 'P3',
          absoluteAffinity: 0.25,
          deltaScore: 0,
          reason: 'r3',
        },
        {
          candidateTagId: 4,
          candidateTagName: 'D',
          recommendationText: 'Text D',
          implementationOptions: ['Four'],
          sourceProblematicTagId: 13,
          sourceProblematicTagName: 'P4',
          absoluteAffinity: 0.1,
          deltaScore: 0,
          reason: 'r4',
        },
      ])

      await getIssueDirectedRecommendations(req, res, next)

      expect(recommendationService.getDirectedTagRecommendations).toHaveBeenCalledWith(1, 100)
      expect(res.json).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({ candidateTagId: 1 }),
          expect.objectContaining({ candidateTagId: 2 }),
          expect.objectContaining({ candidateTagId: 3 }),
        ],
        requestId: 'req-123',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('forwards validation error when issueId is invalid', async () => {
      req.params.issueId = 'abc'

      await getIssueDirectedRecommendations(req, res, next)

      expect(recommendationService.getDirectedTagRecommendations).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalledTimes(1)
      const err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err).toMatchObject({
        code: 'validation_error',
        statusCode: 400,
      })
    })

    it('forwards service errors to next()', async () => {
      const serviceError = new Error('service failed')
      ;(recommendationService.getDirectedTagRecommendations as jest.Mock).mockRejectedValue(serviceError)

      await getIssueDirectedRecommendations(req, res, next)

      expect(next).toHaveBeenCalledWith(serviceError)
    })
  })
})
