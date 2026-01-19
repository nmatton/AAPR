import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { requireAuth } from '../middleware/requireAuth'

export const authRouter = Router()

/**
 * POST /api/v1/auth/register
 * Register new user with email and password
 * 
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * Response (201 Created):
 * {
 *   "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "createdAt": "2026-01-16..." },
 *   "message": "Registration successful"
 * }
 * 
 * Cookies set:
 * - accessToken (HTTP-only, 1 hour)
 * - refreshToken (HTTP-only, 7 days)
 */
authRouter.post('/register', authController.registerUser)

/**
 * POST /api/v1/auth/login
 * Log in with email and password
 * 
 * Request body:
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * Response (200 OK):
 * {
 *   "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "createdAt": "2026-01-16..." },
 *   "message": "Login successful"
 * }
 * 
 * Cookies set:
 * - accessToken (HTTP-only, 1 hour)
 * - refreshToken (HTTP-only, 7 days)
 */
authRouter.post('/login', authController.loginUser)

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
authRouter.get('/me', requireAuth, authController.getCurrentUser)

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token cookie
 */
authRouter.post('/refresh', authController.refreshTokens)

/**
 * POST /api/v1/auth/logout
 * Logout current session
 */
authRouter.post('/logout', requireAuth, authController.logoutUser)
