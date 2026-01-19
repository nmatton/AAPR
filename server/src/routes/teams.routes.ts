import { Router } from 'express';
import * as teamsController from '../controllers/teams.controller';
import * as invitesController from '../controllers/invites.controller';
import { requireAuth } from '../middleware/requireAuth';
import { validateTeamMembership } from '../middleware/validateTeamMembership';

export const teamsRouter = Router();

/**
 * GET /api/v1/teams
 * Get all teams for authenticated user
 * Protected by requireAuth middleware
 */
teamsRouter.get('/', requireAuth, teamsController.getTeams);

/**
 * POST /api/v1/teams
 * Create a new team with selected practices
 * Protected by requireAuth middleware
 * No team isolation middleware (creating new team, not accessing existing)
 */
teamsRouter.post('/', requireAuth, teamsController.createTeam);

/**
 * POST /api/v1/teams/:teamId/invites
 * Create a team invite (new or existing user)
 * Protected by requireAuth + team membership validation
 */
teamsRouter.post('/:teamId/invites', requireAuth, validateTeamMembership, invitesController.createInvite);

/**
 * GET /api/v1/teams/:teamId/invites
 * List team invites
 * Protected by requireAuth + team membership validation
 */
teamsRouter.get('/:teamId/invites', requireAuth, validateTeamMembership, invitesController.listInvites);

/**
 * POST /api/v1/teams/:teamId/invites/:inviteId/resend
 * Resend invite email
 * Protected by requireAuth + team membership validation
 */
teamsRouter.post('/:teamId/invites/:inviteId/resend', requireAuth, validateTeamMembership, invitesController.resendInvite);
