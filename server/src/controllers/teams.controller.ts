import { Request, Response, NextFunction } from 'express';
import * as teamsService from '../services/teams.service';

// Extend Express Request type for middleware-added properties
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string };
      id?: string;
    }
  }
}

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
    const userId = req.user!.id;
    
    const teams = await teamsService.getUserTeams(userId);
    
    res.json({
      teams,
      requestId: req.id
    });
  } catch (error: any) {
    // Attach requestId to error for tracing
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};
