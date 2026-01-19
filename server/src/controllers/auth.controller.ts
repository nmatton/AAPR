import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { registerSchema, loginSchema } from '../schemas/auth.schema'
import * as authService from '../services/auth.service'

/**
 * Extract client IP address from request
 * Handles X-Forwarded-For header (for proxies) and IPv6 localhost normalization
 */
const getClientIpAddress = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2...)
    // First IP is the original client
    const clientIp = forwardedFor.split(',')[0].trim()
    return clientIp
  }
  
  // Normalize IPv6 localhost to 127.0.0.1 for consistency
  const remoteAddress = req.socket.remoteAddress || 'unknown'
  if (remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1') {
    return '127.0.0.1'
  }
  
  return remoteAddress
}

/**
 * Register new user endpoint
 * POST /api/v1/auth/register
 * 
 * @param req - Express request with { name, email, password } in body
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Validate request body with Zod schema
    const validatedData = registerSchema.parse(req.body)

    // Register user (service handles password hashing, duplicate check, event logging)
    const user = await authService.registerUser(validatedData)

    // Generate JWT tokens
    const tokens = authService.generateTokens(user.id, user.email)

    // Set HTTP-only secure cookies for token storage (XSS prevention)
    const isProduction = process.env.NODE_ENV === 'production'
    
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: 'lax', // Changed from 'strict' to support cross-origin navigation
      maxAge: 60 * 60 * 1000 // 1 hour
    })

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // Changed from 'strict' to support cross-origin navigation
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    // Success response (NO password included)
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      message: 'Registration successful'
    })
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as z.ZodError
      return res.status(400).json({
        code: 'validation_error',
        message: 'Invalid input',
        details: {
          errors: zodError.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        },
        requestId: res.getHeader('x-request-id')
      })
    }

    // Handle AppError (duplicate email, etc.)
    if (error instanceof authService.AppError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: res.getHeader('x-request-id')
      })
    }

    // Pass unknown errors to error middleware
    next(error)
  }
}

/**
 * Login endpoint
 * POST /api/v1/auth/login
 * 
 * @param req - Express request with { email, password } in body
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const validatedData = loginSchema.parse(req.body)

    const user = await authService.verifyCredentials(
      validatedData.email,
      validatedData.password,
      getClientIpAddress(req)
    )

    const tokens = authService.generateTokens(user.id, user.email)

    const isProduction = process.env.NODE_ENV === 'production'

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000
    })

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      message: 'Login successful'
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as z.ZodError
      return res.status(400).json({
        code: 'validation_error',
        message: 'Invalid input',
        details: {
          errors: zodError.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        },
        requestId: res.getHeader('x-request-id')
      })
    }

    if (error instanceof authService.AppError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: res.getHeader('x-request-id')
      })
    }

    next(error)
  }
}

/**
 * Current session endpoint
 * GET /api/v1/auth/me
 * 
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { userId } = (req as { user?: { userId: number } }).user || {}

    if (!userId) {
      return res.status(401).json({
        code: 'missing_token',
        message: 'Authentication required',
        details: { field: 'authorization' },
        requestId: res.getHeader('x-request-id')
      })
    }

    const user = await authService.getUserById(userId)

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      requestId: res.getHeader('x-request-id')
    })
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

/**
 * Refresh access token using refresh token cookie
 * POST /api/v1/auth/refresh
 * 
 * @param req - Express request with refreshToken cookie
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export const refreshTokens = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined

    if (!refreshToken) {
      return res.status(401).json({
        code: 'missing_token',
        message: 'Refresh token required',
        details: { field: 'refreshToken' },
        requestId: res.getHeader('x-request-id')
      })
    }

    const decoded = authService.verifyToken(refreshToken)

    let email = decoded.email
    if (!email) {
      const user = await authService.getUserById(decoded.userId)
      email = user.email
    }

    const tokens = authService.generateTokens(decoded.userId, email)
    const isProduction = process.env.NODE_ENV === 'production'

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000
    })

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(200).json({
      message: 'Token refreshed'
    })
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

/**
 * Logout endpoint
 * POST /api/v1/auth/logout
 * 
 * @param _req - Express request
 * @param res - Express response
 */
export const logoutUser = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  const isProduction = process.env.NODE_ENV === 'production'

  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 0
  })

  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 0
  })

  return res.status(200).json({
    message: 'Logout successful'
  })
}
