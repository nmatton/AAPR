import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as invitesService from '../services/invites.service'
import { AppError } from '../services/auth.service'

const teamIdSchema = z.object({
  teamId: z.coerce.number().int().positive()
})

const inviteIdSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  inviteId: z.coerce.number().int().positive()
})

const createInviteSchema = z.object({
  email: z.string().email('Invalid email format')
})

const toValidationError = (issues: z.ZodIssue[]) => {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }))
}

export const createInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paramsResult = teamIdSchema.safeParse(req.params)
    const bodyResult = createInviteSchema.safeParse(req.body)

    if (!paramsResult.success || !bodyResult.success) {
      const details = [
        ...(paramsResult.success ? [] : toValidationError(paramsResult.error.issues)),
        ...(bodyResult.success ? [] : toValidationError(bodyResult.error.issues))
      ]

      throw new AppError('validation_error', 'Request validation failed', details, 400)
    }

    const { teamId } = paramsResult.data
    const { email } = bodyResult.data
    const userId = req.user!.userId

    const invite = await invitesService.createInvite(teamId, email, userId)

    res.setHeader('x-request-id', req.id || 'unknown')
    res.status(201).json({
      invite,
      requestId: req.id
    })
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id
    }
    next(error)
  }
}

export const listInvites = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paramsResult = teamIdSchema.safeParse(req.params)

    if (!paramsResult.success) {
      const details = toValidationError(paramsResult.error.issues)
      throw new AppError('validation_error', 'Request validation failed', details, 400)
    }

    const { teamId } = paramsResult.data
    const invites = await invitesService.listInvites(teamId)

    res.setHeader('x-request-id', req.id || 'unknown')
    res.json({
      invites,
      requestId: req.id
    })
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id
    }
    next(error)
  }
}

export const resendInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paramsResult = inviteIdSchema.safeParse(req.params)

    if (!paramsResult.success) {
      const details = toValidationError(paramsResult.error.issues)
      throw new AppError('validation_error', 'Request validation failed', details, 400)
    }

    const { teamId, inviteId } = paramsResult.data
    const userId = req.user!.userId

    const invite = await invitesService.resendInvite(teamId, inviteId, userId)

    res.setHeader('x-request-id', req.id || 'unknown')
    res.json({
      invite,
      requestId: req.id
    })
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id
    }
    next(error)
  }
}
