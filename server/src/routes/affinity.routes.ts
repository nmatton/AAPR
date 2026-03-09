import { Router } from 'express'
import * as affinityController from '../controllers/affinity.controller'

// mergeParams: true is required to access :teamId from parent router
export const affinityRouter = Router({ mergeParams: true })

/**
 * GET /api/v1/teams/:teamId/practices/:practiceId/affinity/me
 * Compute individual affinity score for the authenticated user on a practice.
 * Protected by requireAuth + team membership validation (applied by parent router).
 */
affinityRouter.get(
  '/:practiceId/affinity/me',
  affinityController.getMyPracticeAffinity
)
