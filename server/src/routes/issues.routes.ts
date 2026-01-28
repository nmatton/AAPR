
import { Router } from 'express';
import * as issuesController from '../controllers/issues.controller';


// mergeParams: true is required to access :teamId from parent router
export const issuesRouter = Router({ mergeParams: true });

/**
 * POST /api/v1/teams/:teamId/issues
 * Create a new issue linked to practices
 * Protected by requireAuth + team membership validation
 */
issuesRouter.post('/', issuesController.createIssue);
