import { Router } from 'express';
import * as teamsController from '../controllers/teams.controller';
import * as invitesController from '../controllers/invites.controller';
import * as membersController from '../controllers/members.controller';
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

/**
 * GET /api/v1/teams/:teamId/members
 * List team members with invite status
 * Protected by requireAuth + team membership validation
 */
teamsRouter.get('/:teamId/members', requireAuth, validateTeamMembership, membersController.listMembers);

/**
 * GET /api/v1/teams/:teamId/members/:userId
 * Get a team member detail
 * Protected by requireAuth + team membership validation
 */
teamsRouter.get('/:teamId/members/:userId', requireAuth, validateTeamMembership, membersController.getMemberDetail);

/**
 * DELETE /api/v1/teams/:teamId/members/:userId
 * Remove a team member
 * Protected by requireAuth + team membership validation
 */
teamsRouter.delete('/:teamId/members/:userId', requireAuth, validateTeamMembership, membersController.removeMember);

/**
 * GET /api/v1/teams/:teamId/practices/available
 * Get practices not yet selected by team (for "Add Practices" view)
 * Protected by requireAuth + team membership validation
 */
teamsRouter.get('/:teamId/practices/available', requireAuth, validateTeamMembership, teamsController.getAvailablePractices);

/**
 * POST /api/v1/teams/:teamId/practices
 * Add a practice to team portfolio
 * Protected by requireAuth + team membership validation
 */
teamsRouter.post('/:teamId/practices', requireAuth, validateTeamMembership, teamsController.addPracticeToTeam);
