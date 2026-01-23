import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as teamsService from '../services/teams.service';
import * as coverageService from '../services/coverage.service';
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
 * Validation schema for team name update
 */
const updateTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must be less than 50 characters'),
  version: z.number().int().positive('Version is required for optimistic locking')
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

/**
 * PATCH /api/v1/teams/:teamId
 * Update team name with optimistic locking
 * 
 * @param req - Express request with teamId param and name + version in body
 * @param res - Express response
 * @param next - Express next function
 */
export const updateTeam = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const userId = req.user!.userId;
    
    // Validate request body
    const validationResult = updateTeamSchema.safeParse(req.body);
    
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
    
    const { name, version } = validationResult.data;
    
    // Update team name
    const updatedTeam = await teamsService.updateTeamName(teamId, name, version, userId);
    
    res.json({
      data: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        version: updatedTeam.version,
        updatedAt: updatedTeam.updatedAt.toISOString()
      },
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
 * Validation schema for adding practice to team
 */
const addPracticeSchema = z.object({
  practiceId: z.number().int().positive('Practice ID must be a positive integer')
});

/**
 * Validation schema for creating a custom practice
 */
const createCustomPracticeSchema = z.object({
  title: z.string()
    .min(2, 'Title is required')
    .max(100, 'Title must be between 2 and 100 characters'),
  goal: z.string()
    .min(1, 'Goal is required')
    .max(500, 'Goal must be between 1 and 500 characters'),
  pillarIds: z.array(z.number().int().positive())
    .min(1, 'Select at least one pillar'),
  categoryId: z.string()
    .min(1, 'Category is required'),
  templatePracticeId: z.number().int().positive().optional()
});

/**
 * Validation schema for editing a practice
 */
const editPracticeSchema = z.object({
  title: z.string()
    .min(2, 'Title is required')
    .max(100, 'Title must be between 2 and 100 characters'),
  goal: z.string()
    .min(1, 'Goal is required')
    .max(500, 'Goal must be between 1 and 500 characters'),
  pillarIds: z.array(z.number().int().positive())
    .min(1, 'Select at least one pillar'),
  categoryId: z.string()
    .min(1, 'Category is required'),
  saveAsCopy: z.boolean().optional(),
  version: z.number().int().positive()
});

/**
 * GET /api/v1/teams/:teamId/practices/available
 * Get practices not yet selected by team
 * 
 * @param req - Express request with teamId param and optional query filters
 * @param res - Express response
 * @param next - Express next function
 */
export const getAvailablePractices = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    
    // Parse query parameters
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
    const search = req.query.search as string | undefined;
    const pillarsParam = req.query.pillars as string | undefined;
    const pillars = pillarsParam 
      ? pillarsParam.split(',').map(id => parseInt(id.trim(), 10))
      : undefined;
    
    const result = await teamsService.getAvailablePractices(teamId, {
      page,
      pageSize,
      search,
      pillars
    });
    
    res.json({
      ...result,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * GET /api/v1/teams/:teamId/practices
 * Get practices currently selected by team
 * 
 * @param req - Express request with teamId param
 * @param res - Express response
 * @param next - Express next function
 */
export const getTeamPractices = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);

    const practices = await teamsService.getTeamPractices(teamId);

    res.json({
      items: practices,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * POST /api/v1/teams/:teamId/practices
 * Add a practice to team portfolio
 * 
 * @param req - Express request with teamId param and practiceId in body
 * @param res - Express response
 * @param next - Express next function
 */
export const addPracticeToTeam = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const userId = req.user!.userId;
    
    // Validate request body
    const validationResult = addPracticeSchema.safeParse(req.body);
    
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
    
    const { practiceId } = validationResult.data;
    
    const result = await teamsService.addPracticeToTeam(teamId, userId, practiceId);
    
    res.status(201).json({
      ...result,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * POST /api/v1/teams/:teamId/practices/custom
 * Create a custom practice for a team (scratch or template)
 * 
 * @param req - Express request with teamId param and practice data
 * @param res - Express response
 * @param next - Express next function
 */
export const createCustomPractice = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const userId = req.user!.userId;

    const validationResult = createCustomPracticeSchema.safeParse(req.body);

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

    const result = await teamsService.createCustomPracticeForTeam(teamId, userId, validationResult.data);

    res.status(201).json({
      ...result,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * GET /api/v1/teams/:teamId/practices/:practiceId/removal-impact
 * Get removal impact preview for a practice
 * 
 * @param req - Express request with teamId and practiceId params
 * @param res - Express response
 * @param next - Express next function
 */
export const getPracticeRemovalImpact = async (
  req: Request<{ teamId: string; practiceId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const practiceId = parseInt(req.params.practiceId, 10);

    if (!Number.isInteger(teamId) || !Number.isInteger(practiceId)) {
      throw new AppError(
        'validation_error',
        'Request validation failed',
        [{ path: 'params', message: 'Invalid teamId or practiceId', code: 'invalid_type' }],
        400
      );
    }

    const impact = await teamsService.getPracticeRemovalImpact(teamId, practiceId);

    res.json({
      ...impact,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * PATCH /api/v1/teams/:teamId/practices/:practiceId
 * Edit practice details (global or team-specific)
 * 
 * @param req - Express request with teamId, practiceId, and edit payload
 * @param res - Express response
 * @param next - Express next function
 */
export const editPracticeDetails = async (
  req: Request<{ teamId: string; practiceId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10)
    const practiceId = parseInt(req.params.practiceId, 10)
    const userId = req.user!.userId

    if (!Number.isInteger(teamId) || !Number.isInteger(practiceId)) {
      throw new AppError(
        'validation_error',
        'Request validation failed',
        [{ path: 'params', message: 'Invalid teamId or practiceId', code: 'invalid_type' }],
        400
      )
    }

    const validationResult = editPracticeSchema.safeParse(req.body)

    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))

      throw new AppError(
        'validation_error',
        'Request validation failed',
        details,
        400
      )
    }

    const result = await teamsService.editPracticeForTeam(teamId, userId, practiceId, validationResult.data)

    res.json({
      ...result,
      requestId: req.id
    })
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id
    }
    next(error)
  }
};

/**
 * DELETE /api/v1/teams/:teamId/practices/:practiceId
 * Remove a practice from team portfolio
 * 
 * @param req - Express request with teamId and practiceId params
 * @param res - Express response
 * @param next - Express next function
 */
export const removePracticeFromTeam = async (
  req: Request<{ teamId: string; practiceId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const practiceId = parseInt(req.params.practiceId, 10);
    const userId = req.user!.userId;

    if (!Number.isInteger(teamId) || !Number.isInteger(practiceId)) {
      throw new AppError(
        'validation_error',
        'Request validation failed',
        [{ path: 'params', message: 'Invalid teamId or practiceId', code: 'invalid_type' }],
        400
      );
    }

    const result = await teamsService.removePracticeFromTeam(teamId, userId, practiceId);

    res.json({
      ...result,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * GET /api/v1/teams/:teamId/coverage/pillars
 * Get pillar-level coverage for a team
 * 
 * @param req - Express request with teamId param
 * @param res - Express response
 * @param next - Express next function
 */
export const getTeamPillarCoverage = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);

    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw new AppError(
        'invalid_team_id',
        'Valid team ID is required',
        { teamId: req.params.teamId },
        400
      );
    }

    const coverage = await coverageService.getTeamPillarCoverage(teamId);

    res.json({
      ...coverage,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};
