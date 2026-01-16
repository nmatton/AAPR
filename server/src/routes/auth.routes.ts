import { Router } from 'express'
import * as authController from '../controllers/auth.controller'

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
