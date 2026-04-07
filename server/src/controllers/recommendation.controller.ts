import { Request, Response, NextFunction } from 'express'
import * as recommendationService from '../services/recommendation.service'
import { AppError } from '../services/auth.service'

/**
 * GET /api/v1/teams/:teamId/practices/:practiceId/recommendations
 *
 * Get up to 3 recommended alternative practices for a team practice.
 */
export const getRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { practiceId } = req.params
    const teamId = res.locals.teamId as number

    // Emulate Zod error format for validation failure
    if (!practiceId || isNaN(Number(practiceId))) {
      throw new AppError(
        'validation_error',
        'Validation failed',
        [{ path: 'practiceId', message: 'Valid practice ID is required', code: 'invalid_type' }],
        400
      )
    }

    const recommendations = await recommendationService.getRecommendations(
      teamId,
      Number(practiceId)
    )

    res.json({
      items: recommendations,
      requestId: res.getHeader('x-request-id'),
    })
  } catch (error) {
    next(error)
  }
}

export const getIssueDirectedRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { issueId } = req.params
    const teamId = res.locals.teamId as number

    if (!issueId || isNaN(Number(issueId))) {
      throw new AppError(
        'validation_error',
        'Validation failed',
        [{ path: 'issueId', message: 'Valid issue ID is required', code: 'invalid_type' }],
        400
      )
    }

    const recommendations = await recommendationService.getDirectedTagRecommendations(
      teamId,
      Number(issueId)
    )

    res.json({
      items: recommendations.slice(0, 3),
      requestId: res.getHeader('x-request-id'),
    })
  } catch (error) {
    next(error)
  }
}
