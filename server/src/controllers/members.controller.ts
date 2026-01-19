import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as membersService from '../services/members.service'
import { AppError } from '../services/auth.service'

const teamIdSchema = z.object({
  teamId: z.coerce.number().int().positive()
})

const teamMemberSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive()
})

const toValidationError = (issues: z.ZodIssue[]) => {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }))
}

export const listMembers = async (
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
    const members = await membersService.getTeamMembers(teamId)

    res.setHeader('x-request-id', req.id || 'unknown')
    res.json({
      members,
      requestId: req.id
    })
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id
    }
    next(error)
  }
}

export const getMemberDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paramsResult = teamMemberSchema.safeParse(req.params)

    if (!paramsResult.success) {
      const details = toValidationError(paramsResult.error.issues)
      throw new AppError('validation_error', 'Request validation failed', details, 400)
    }

    const { teamId, userId } = paramsResult.data
    const member = await membersService.getMemberDetail(teamId, userId)

    res.setHeader('x-request-id', req.id || 'unknown')
    res.json({
      member,
      requestId: req.id
    })
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id
    }
    next(error)
  }
}

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paramsResult = teamMemberSchema.safeParse(req.params)

    if (!paramsResult.success) {
      const details = toValidationError(paramsResult.error.issues)
      throw new AppError('validation_error', 'Request validation failed', details, 400)
    }

    const { teamId, userId } = paramsResult.data
    const actorId = req.user!.userId

    await membersService.removeMember(teamId, userId, actorId)

    res.setHeader('x-request-id', req.id || 'unknown')
    res.json({
      removed: true,
      requestId: req.id
    })
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id
    }
    next(error)
  }
}
