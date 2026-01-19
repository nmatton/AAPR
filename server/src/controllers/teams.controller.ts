import { Request, Response, NextFunction } from 'express';
import * as teamsService from '../services/teams.service';

/**
 * GET /api/v1/teams
 * Get all teams for the authenticated user
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 */
export const getTeams = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // @ts-ignore - req.user is set by requireAuth middleware
    const userId = req.user.id;
    
    const teams = await teamsService.getUserTeams(userId);
    
    res.json({
      teams,
      // @ts-ignore - req.id is set by request ID middleware
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};
