import { Request, Response, NextFunction } from 'express'
import * as affinityService from '../services/affinity.service'
import { AuthenticatedRequest } from '../middleware/requireAuth'
import { AppError } from '../services/auth.service'

/**
 * GET /api/v1/teams/:teamId/practices/:practiceId/affinity/me
 *
 * Compute individual practice affinity score for the authenticated user.
 */
export const getMyPracticeAffinity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { practiceId } = req.params
    const teamId = res.locals.teamId as number
    const userId = (req as AuthenticatedRequest).user?.userId

    if (!practiceId || isNaN(Number(practiceId))) {
      throw new AppError('validation_error', 'Valid practice ID is required', { practiceId }, 400)
    }

    if (!userId) {
      throw new AppError('unauthorized', 'User not authenticated', {}, 401)
    }

    const result = await affinityService.getMyPracticeAffinity(
      userId,
      teamId,
      Number(practiceId)
    )

    res.json({
      ...result,
      requestId: res.getHeader('x-request-id'),
    })
  } catch (error) {
    next(error)
  }
}
