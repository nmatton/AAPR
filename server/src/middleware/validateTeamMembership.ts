import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from '../services/auth.service'

/**
 * Middleware to validate that the authenticated user is a member of the team
 * specified in the route parameters. Enforces team isolation boundary.
 * 
 * CRITICAL: This middleware MUST be used on all routes that access team-specific data
 * to prevent cross-team data leaks.
 * 
 * Requirements:
 * - Must be used AFTER requireAuth middleware (depends on req.user)
 * - Route must have :teamId parameter
 * 
 * @throws AppError with code 'invalid_team_id' if teamId is invalid
 * @throws AppError with code 'forbidden' if user is not a team member
 */
export const validateTeamMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamIdParam = req.params.teamId
    const teamId = parseInt(teamIdParam, 10)

    if (!teamIdParam || isNaN(teamId)) {
      throw new AppError(
        'invalid_team_id',
        'Valid team ID is required',
        { teamId: teamIdParam },
        400
      )
    }

    if (!req.user?.userId) {
      throw new AppError(
        'unauthorized',
        'Authentication required',
        {},
        401
      )
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: req.user.userId
        }
      }
    })

    if (!membership) {
      throw new AppError(
        'forbidden',
        'You do not have access to this team',
        { teamId, userId: req.user.userId },
        403
      )
    }

    // Store validated teamId in res.locals for use in controllers
    res.locals.teamId = teamId

    next()
  } catch (error) {
    next(error)
  }
}
