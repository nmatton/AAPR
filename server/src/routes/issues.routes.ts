
import { Router } from 'express';
import * as issuesController from '../controllers/issues.controller';


// mergeParams: true is required to access :teamId from parent router
export const issuesRouter = Router({ mergeParams: true });

/**
 * POST /api/v1/teams/:teamId/issues
 * Create a new issue linked to practices
 * Protected by requireAuth + team membership validation
 */
/**
 * GET /api/v1/teams/:teamId/issues
 * Get list of issues with filtering and sorting
 */
issuesRouter.get('/', issuesController.getIssues);

issuesRouter.post('/', issuesController.createIssue);

/**
 * GET /api/v1/teams/:teamId/issues/stats
 * Get issues statistics
 */
issuesRouter.get('/stats', issuesController.getStats);


/**
 * GET /api/v1/teams/:teamId/issues/:issueId
 * Get issue details with history
 */

issuesRouter.get('/:issueId', issuesController.getIssue);

/**
 * PATCH /api/v1/teams/:teamId/issues/:issueId
 * Update issue status or priority
 */
issuesRouter.patch('/:issueId', issuesController.updateIssue);




/**
 * POST /api/v1/teams/:teamId/issues/:issueId/comments
 * Add a comment to an issue
 */
issuesRouter.post('/:issueId/comments', issuesController.createComment);

/**
 * POST /api/v1/teams/:teamId/issues/:issueId/decisions
 * Record an adaptation decision for an issue
 */
issuesRouter.post('/:issueId/decisions', issuesController.recordDecision);


