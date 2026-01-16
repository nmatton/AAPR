import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { registerSchema } from '../schemas/auth.schema'
import * as authService from '../services/auth.service'

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
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    })

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
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
