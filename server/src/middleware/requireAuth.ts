import { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number
    email?: string
  }
}

/**
 * Require valid JWT for protected routes
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const authHeader = req.headers.authorization
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const cookieToken = req.cookies?.accessToken as string | undefined
  const token = bearerToken || cookieToken

  if (!token) {
    return res.status(401).json({
      code: 'missing_token',
      message: 'Authentication required',
      details: { field: 'authorization' },
      requestId: res.getHeader('x-request-id')
    })
  }

  try {
    const decoded = authService.verifyToken(token)
    ;(req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email
    }
    return next()
  } catch (error) {
    if (error instanceof authService.AppError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: res.getHeader('x-request-id')
      })
    }

    return next(error)
  }
}
