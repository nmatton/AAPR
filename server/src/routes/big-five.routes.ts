import { Router } from 'express'
import * as bigFiveController from '../controllers/big-five.controller'
import { requireAuth } from '../middleware/requireAuth'

export const bigFiveRouter = Router()

/**
 * POST /api/v1/big-five/submit
 * Submit Big Five questionnaire responses
 * Protected by requireAuth middleware
 */
bigFiveRouter.post('/submit', requireAuth, bigFiveController.submitQuestionnaire)

/**
 * GET /api/v1/big-five/me
 * Get current user's Big Five scores
 * Protected by requireAuth middleware
 */
bigFiveRouter.get('/me', requireAuth, bigFiveController.getMyScores)
