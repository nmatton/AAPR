import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

/**
 * Custom application error for structured error handling
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: unknown,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * User registration data transfer object
 */
interface RegisterUserDto {
  name: string
  email: string
  password: string
}

/**
 * User data returned after authentication (no password)
 */
interface UserResponse {
  id: number
  name: string
  email: string
  createdAt: Date
}

/**
 * JWT token payload structure
 */
interface TokenPayload {
  userId: number
  email: string
}

/**
 * Token pair returned to client
 */
interface TokenPair {
  accessToken: string
  refreshToken: string
}

// CRITICAL: 10 rounds minimum for bcrypt (NFR1 requirement)
const BCRYPT_ROUNDS = 10

// JWT configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_CHANGE_IN_PRODUCTION'
const ACCESS_TOKEN_EXPIRY = '1h'
const REFRESH_TOKEN_EXPIRY = '7d'

/**
 * Register a new user with bcrypt-hashed password
 * CRITICAL: Uses atomic transaction to ensure user creation + event logging both succeed
 * 
 * @param dto - User registration data (name, email, password)
 * @returns User object WITHOUT password
 * @throws AppError with code 'email_exists' if email already registered
 */
export const registerUser = async (dto: RegisterUserDto): Promise<UserResponse> => {
  const { name, email, password } = dto

  // Check for duplicate email BEFORE attempting creation
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw new AppError(
      'email_exists',
      'Email already registered',
      { field: 'email' },
      409
    )
  }

  // Hash password with bcrypt (10 rounds minimum - security requirement)
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)

  // CRITICAL: Atomic transaction - user creation + event logging must both succeed
  const user = await prisma.$transaction(async (tx) => {
    // Create user with hashed password
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    })

    // Log registration event (research data requirement)
    await tx.event.create({
      data: {
        eventType: 'user.registered',
        actorId: null, // System event (no user context yet)
        teamId: null,  // User-level event (no team context)
        entityType: 'user',
        entityId: newUser.id,
        action: 'created',
        payload: {
          email: newUser.email,
          name: newUser.name,
          registrationMethod: 'email_password'
        },
        schemaVersion: 'v1'
      }
    })

    return newUser
  })

  return user
}

/**
 * Generate JWT access and refresh tokens
 * 
 * @param userId - User identifier
 * @param email - User email
 * @returns Token pair (access: 1h, refresh: 7d)
 */
export const generateTokens = (userId: number, email: string): TokenPair => {
  const payload: TokenPayload = { userId, email }

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256'
  })

  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256'
  })

  return { accessToken, refreshToken }
}

/**
 * Verify JWT token signature and expiration
 * 
 * @param token - JWT token string
 * @returns Decoded token payload
 * @throws AppError if token is invalid or expired
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as TokenPayload

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('token_expired', 'Token has expired', {}, 401)
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('invalid_token', 'Token is invalid', {}, 401)
    }
    throw new AppError('token_verification_failed', 'Token verification failed', {}, 401)
  }
}
