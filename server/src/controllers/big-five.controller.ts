import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as bigFiveService from '../services/big-five.service'
import { AppError } from '../services/auth.service'

// Extend Express Request type for middleware-added properties
declare global {
    namespace Express {
        interface Request {
            user?: { userId: number; email?: string }
            id?: string
        }
    }
}

/**
 * Validation schema for questionnaire submission
 */
const submitQuestionnaireSchema = z.object({
    responses: z.array(
        z.object({
            itemNumber: z.number().int().min(1).max(44),
            response: z.number().int().min(1).max(5)
        })
    ).length(44, 'All 44 items must be answered')
})

/**
 * POST /api/v1/big-five/submit
 * Submit questionnaire responses and calculate scores
 * 
 * @param req - Express request with authenticated user and responses
 * @param res - Express response
 * @param next - Express next function
 */
export const submitQuestionnaire = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId

        // Validate request body
        const validationResult = submitQuestionnaireSchema.safeParse(req.body)

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

        const { responses } = validationResult.data

        // Save responses and calculate scores
        const scores = await bigFiveService.saveResponses(userId, responses)

        res.status(201).json({
            scores,
            requestId: req.id
        })
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'requestId' in error && req.id) {
            (error as any).requestId = req.id
        }
        next(error)
    }
}

/**
 * GET /api/v1/big-five/me
 * Get current user's Big Five scores
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 */
export const getMyScores = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId

        const scores = await bigFiveService.getUserScores(userId)

        if (!scores) {
            res.json({
                completed: false,
                scores: null,
                requestId: req.id
            })
            return
        }

        res.json({
            completed: true,
            scores,
            requestId: req.id
        })
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'requestId' in error && req.id) {
            (error as any).requestId = req.id
        }
        next(error)
    }
}
