import { Router } from 'express'
import * as recommendationController from '../controllers/recommendation.controller'

// mergeParams: true is required to access :teamId from parent router
export const recommendationRouter = Router({ mergeParams: true })

/**
 * GET /api/v1/teams/:teamId/practices/:practiceId/recommendations
 * Get up to 3 recommended alternative practices for a team practice.
 * Protected by requireAuth + team membership validation (applied by parent router).
 */
recommendationRouter.get(
  '/:practiceId/recommendations',
  recommendationController.getRecommendations
)
