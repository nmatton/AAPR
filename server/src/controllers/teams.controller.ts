import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as teamsService from '../services/teams.service';
import { AppError } from '../services/auth.service';

// Extend Express Request type for middleware-added properties
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; email?: string };
      id?: string;
    }
  }
}

/**
 * Validation schema for team creation
 */
const createTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(100, 'Team name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Team name can only contain letters, numbers, spaces, and hyphens'),
  practiceIds: z.array(z.number().int().positive())
    .min(1, 'At least one practice must be selected')
});

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
    const userId = req.user!.userId;
    
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

/**
 * POST /api/v1/teams
 * Create a new team with selected practices
 * 
 * @param req - Express request with authenticated user and team data
 * @param res - Express response
 * @param next - Express next function
 */
export const createTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    // Validate request body
    const validationResult = createTeamSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }));
      
      throw new AppError(
        'validation_error',
        'Request validation failed',
        details,
        400
      );
    }
    
    const { name, practiceIds } = validationResult.data;
    
    // Create team
    const team = await teamsService.createTeam(userId, name, practiceIds);
    
    res.status(201).json({
      team,
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
