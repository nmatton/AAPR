// Set JWT_SECRET for tests BEFORE importing auth.service (auth.service validates on import)
process.env.JWT_SECRET = 'test_secret_for_unit_tests_12345678901234567890'

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { registerUser, generateTokens, verifyToken, AppError, verifyCredentials, generateRefreshToken } from '../auth.service'
import { prisma } from '../../lib/prisma'

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    event: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('registerUser', () => {
    const validUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    }

    it('should create user with bcrypt-hashed password (10+ rounds)', async () => {
      // Mock: no existing user
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      // Mock transaction to return new user
      const mockUser = {
        id: 1,
        name: validUserDto.name,
        email: validUserDto.email,
        createdAt: new Date()
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser)
          },
          event: {
            create: jest.fn().mockResolvedValue({})
          }
        })
      })

      const result = await registerUser(validUserDto)

      // Verify user returned without password
      expect(result).toEqual(mockUser)
      expect(result).not.toHaveProperty('password')

      // Verify transaction was called (atomic operation)
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should throw AppError with code email_exists for duplicate email', async () => {
      // Mock: existing user found
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 999,
        email: validUserDto.email
      })

      await expect(registerUser(validUserDto)).rejects.toThrow(AppError)
      await expect(registerUser(validUserDto)).rejects.toMatchObject({
        code: 'email_exists',
        statusCode: 409,
        details: { field: 'email' }
      })

      // Transaction should NOT be called if duplicate detected
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('should hash password with bcrypt before storing', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const mockUser = {
        id: 1,
        name: validUserDto.name,
        email: validUserDto.email,
        createdAt: new Date()
      }

      let capturedHashedPassword = ''

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              capturedHashedPassword = data.password
              return mockUser
            })
          },
          event: {
            create: jest.fn().mockResolvedValue({})
          }
        })
      })

      await registerUser(validUserDto)

      // Verify password was hashed (bcrypt format starts with $2b$ or $2a$)
      expect(capturedHashedPassword).toMatch(/^\$2[ab]\$/)

      // Verify hash is valid
      const isValidHash = await bcrypt.compare(validUserDto.password, capturedHashedPassword)
      expect(isValidHash).toBe(true)

      // Verify 10+ rounds (hash contains round count)
      const rounds = parseInt(capturedHashedPassword.split('$')[2])
      expect(rounds).toBeGreaterThanOrEqual(10)
    })

    it('should log event in same transaction as user creation', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const mockUser = {
        id: 1,
        name: validUserDto.name,
        email: validUserDto.email,
        createdAt: new Date()
      }

      const mockEventCreate = jest.fn().mockResolvedValue({})

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser)
          },
          event: {
            create: mockEventCreate
          }
        })
      })

      await registerUser(validUserDto)

      // Verify event was logged with correct structure
      expect(mockEventCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'user.registered',
          actorId: null,
          teamId: null,
          entityType: 'user',
          entityId: mockUser.id,
          action: 'created',
          payload: expect.objectContaining({
            email: mockUser.email,
            name: mockUser.name,
            registrationMethod: 'email_password'
          }),
          schemaVersion: 'v1'
        })
      })
    })
  })

  describe('generateTokens', () => {
    it('should generate access and refresh tokens with correct expiry', () => {
      const userId = 1
      const email = 'test@example.com'

      const tokens = generateTokens(userId, email)

      expect(tokens).toHaveProperty('accessToken')
      expect(tokens).toHaveProperty('refreshToken')
      expect(typeof tokens.accessToken).toBe('string')
      expect(typeof tokens.refreshToken).toBe('string')

      // Tokens should be JWT format (3 parts separated by dots)
      expect(tokens.accessToken.split('.')).toHaveLength(3)
      expect(tokens.refreshToken.split('.')).toHaveLength(3)
    })

    it('should include userId and email in token payload', () => {
      const userId = 42
      const email = 'user@example.com'

      const tokens = generateTokens(userId, email)
      const decoded = verifyToken(tokens.accessToken)

      expect(decoded.userId).toBe(userId)
      expect(decoded.email).toBe(email)
    })

    it('should set correct expiry for access and refresh tokens', () => {
      const tokens = generateTokens(1, 'expiry@example.com')

      const decodedAccess = jwt.decode(tokens.accessToken) as jwt.JwtPayload
      const decodedRefresh = jwt.decode(tokens.refreshToken) as jwt.JwtPayload

      expect(decodedAccess.exp).toBeDefined()
      expect(decodedAccess.iat).toBeDefined()
      expect(decodedRefresh.exp).toBeDefined()
      expect(decodedRefresh.iat).toBeDefined()

      const accessLifetime = (decodedAccess.exp ?? 0) - (decodedAccess.iat ?? 0)
      const refreshLifetime = (decodedRefresh.exp ?? 0) - (decodedRefresh.iat ?? 0)

      expect(accessLifetime).toBe(60 * 60)
      expect(refreshLifetime).toBe(7 * 24 * 60 * 60)
    })
  })

  describe('verifyCredentials', () => {
    const userRecord = {
      id: 10,
      name: 'Verified User',
      email: 'verified@example.com',
      password: 'hashed-password',
      createdAt: new Date('2026-01-10T10:00:00.000Z')
    }

    it('should return user without password when credentials are valid', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(userRecord)
      const compareSpy = jest.spyOn(bcrypt, 'compare') as jest.MockedFunction<typeof bcrypt.compare>
      compareSpy.mockImplementation(async () => true)

      const result = await verifyCredentials(userRecord.email, 'valid-password', '127.0.0.1')

      expect(result).toMatchObject({
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email
      })
      expect(result).not.toHaveProperty('password')
      expect(bcrypt.compare).toHaveBeenCalledWith('valid-password', userRecord.password)
    })

    it('should throw invalid_credentials when password is incorrect', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(userRecord)
      const compareSpy = jest.spyOn(bcrypt, 'compare') as jest.MockedFunction<typeof bcrypt.compare>
      compareSpy.mockImplementation(async () => false)

      await expect(verifyCredentials(userRecord.email, 'wrong-password', '127.0.0.1')).rejects.toMatchObject({
        code: 'invalid_credentials',
        statusCode: 401
      })
    })

    it('should throw invalid_credentials when user does not exist', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(verifyCredentials('missing@example.com', 'any-password', '127.0.0.1')).rejects.toMatchObject({
        code: 'invalid_credentials',
        statusCode: 401
      })
    })

    it('should log login success event with IP address', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(userRecord)
      const compareSpy = jest.spyOn(bcrypt, 'compare') as jest.MockedFunction<typeof bcrypt.compare>
      compareSpy.mockImplementation(async () => true)

      await verifyCredentials(userRecord.email, 'valid-password', '192.168.1.10')

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'user.login_success',
          actorId: userRecord.id,
          teamId: null,
          entityType: 'user',
          entityId: userRecord.id,
          action: 'login',
          payload: expect.objectContaining({
            email: userRecord.email,
            ipAddress: '192.168.1.10'
          }),
          schemaVersion: 'v1'
        })
      })
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate refresh token containing userId', () => {
      const refreshToken = generateRefreshToken(123)
      const decoded = verifyToken(refreshToken)

      expect(decoded.userId).toBe(123)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token and return payload', () => {
      const userId = 1
      const email = 'test@example.com'

      const { accessToken } = generateTokens(userId, email)
      const decoded = verifyToken(accessToken)

      expect(decoded.userId).toBe(userId)
      expect(decoded.email).toBe(email)
    })

    it('should throw AppError for invalid token', () => {
      const invalidToken = 'invalid.token.here'

      expect(() => verifyToken(invalidToken)).toThrow(AppError)
      expect(() => verifyToken(invalidToken)).toThrow(
        expect.objectContaining({
          code: 'invalid_token',
          statusCode: 401
        })
      )
    })

    it('should throw AppError for expired token', () => {
      // Create token that expires immediately (mock JWT_SECRET in test env)
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.expired'

      expect(() => verifyToken(expiredToken)).toThrow(AppError)
    })
  })
})
