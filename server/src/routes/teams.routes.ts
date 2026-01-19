import { Router } from 'express';
import * as teamsController from '../controllers/teams.controller';
import { requireAuth } from '../middleware/requireAuth';

export const teamsRouter = Router();

/**
 * GET /api/v1/teams
 * Get all teams for authenticated user
 * Protected by requireAuth middleware
 */
teamsRouter.get('/', requireAuth, teamsController.getTeams);
