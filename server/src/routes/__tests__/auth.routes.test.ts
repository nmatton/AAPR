import 'dotenv/config'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import { authRouter } from '../auth.routes'
import { AppError } from '../../services/auth.service'

// Mock auth service
jest.mock('../../services/auth.service', () => {
  const actual = jest.requireActual('../../services/auth.service')
  return {
    ...actual,
    registerUser: jest.fn(),
    generateTokens: jest.fn(),
    verifyCredentials: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyToken: jest.fn(),
    getUserById: jest.fn()
  }
})

import * as authService from '../../services/auth.service'

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/v1/auth', authRouter)

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const validRegistration = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  }

  it('should return 201 Created with user data on successful registration', async () => {
    const mockUser = {
      id: 1,
      name: validRegistration.name,
      email: validRegistration.email,
      createdAt: new Date('2026-01-16T10:00:00.000Z')
    }

    const mockTokens = {
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token'
    }

    ;(authService.registerUser as jest.Mock).mockResolvedValue(mockUser)
    ;(authService.generateTokens as jest.Mock).mockReturnValue(mockTokens)

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(validRegistration)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email
      },
      message: 'Registration successful'
    })

    // Verify password is NOT included in response
    expect(response.body.user).not.toHaveProperty('password')

    // Verify HTTP-only cookies are set
    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()
    if (Array.isArray(cookies)) {
      expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(true)
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true)
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true)
    }
  })

  it('should return 409 Conflict for duplicate email', async () => {
    ;(authService.registerUser as jest.Mock).mockRejectedValue(
      new AppError('email_exists', 'Email already registered', { field: 'email' }, 409)
    )

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(validRegistration)

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({
      code: 'email_exists',
      message: 'Email already registered',
      details: { field: 'email' }
    })
  })

  it('should return 400 Bad Request for invalid email format', async () => {
    const invalidRequest = {
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123'
    }

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(invalidRequest)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      code: 'validation_error',
      message: 'Invalid input',
      details: {
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            message: expect.stringContaining('Invalid email')
          })
        ])
      }
    })
  })

  it('should return 400 Bad Request for password < 8 characters', async () => {
    const invalidRequest = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'short'
    }

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(invalidRequest)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      code: 'validation_error',
      message: 'Invalid input',
      details: {
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            message: expect.stringContaining('at least 8 characters')
          })
        ])
      }
    })
  })

  it('should return 400 Bad Request for name < 3 characters', async () => {
    const invalidRequest = {
      name: 'AB',
      email: 'test@example.com',
      password: 'password123'
    }

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(invalidRequest)

    expect(response.status).toBe(400)
    expect(response.body.details.errors).toContainEqual(
      expect.objectContaining({
        path: 'name',
        message: expect.stringContaining('at least 3 characters')
      })
    )
  })

  it('should return 400 Bad Request for multiple validation errors', async () => {
    const invalidRequest = {
      name: 'AB',
      email: 'invalid',
      password: 'short'
    }

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(invalidRequest)

    expect(response.status).toBe(400)
    expect(response.body.details.errors).toHaveLength(3)
  })
})

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const validLogin = {
    email: 'test@example.com',
    password: 'password123'
  }

  it('should return 200 OK with user data and set cookies on successful login', async () => {
    const mockUser = {
      id: 5,
      name: 'Login User',
      email: validLogin.email,
      createdAt: new Date('2026-01-18T10:00:00.000Z')
    }

    const mockTokens = {
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token'
    }

    ;(authService.verifyCredentials as jest.Mock).mockResolvedValue(mockUser)
    ;(authService.generateTokens as jest.Mock).mockReturnValue(mockTokens)

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(validLogin)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email
      }
    })
    expect(response.body.user).not.toHaveProperty('password')

    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()
    if (Array.isArray(cookies)) {
      expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(true)
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true)
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true)
    }
  })

  it('should return 401 Unauthorized for invalid credentials', async () => {
    ;(authService.verifyCredentials as jest.Mock).mockRejectedValue(
      new AppError('invalid_credentials', 'Invalid email or password', { field: 'credentials' }, 401)
    )

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(validLogin)

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      code: 'invalid_credentials',
      message: 'Invalid email or password',
      details: { field: 'credentials' }
    })
  })

  it('should capture client IP from X-Forwarded-For header', async () => {
    const mockUser = {
      id: 6,
      name: 'IP Test User',
      email: 'iptest@example.com',
      createdAt: new Date('2026-01-19T10:00:00.000Z')
    }

    const mockTokens = {
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token'
    }

    ;(authService.verifyCredentials as jest.Mock).mockResolvedValue(mockUser)
    ;(authService.generateTokens as jest.Mock).mockReturnValue(mockTokens)

    await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '192.168.1.100, 10.0.0.1')
      .send({ email: 'iptest@example.com', password: 'password123' })

    // Verify verifyCredentials was called with the correct IP (first from X-Forwarded-For)
    expect(authService.verifyCredentials).toHaveBeenCalledWith(
      'iptest@example.com',
      'password123',
      '192.168.1.100'
    )
  })

  it('should return 400 Bad Request for invalid email format', async () => {
    const invalidRequest = { email: 'invalid', password: 'password123' }

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(invalidRequest)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      code: 'validation_error',
      message: 'Invalid input'
    })
  })
})

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 OK with current user data when authenticated', async () => {
    const mockUser = {
      id: 7,
      name: 'Current User',
      email: 'current@example.com',
      createdAt: new Date('2026-01-18T10:00:00.000Z')
    }

    ;(authService.verifyToken as jest.Mock).mockReturnValue({ userId: 7 })
    ;(authService.getUserById as jest.Mock).mockResolvedValue(mockUser)

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer mock.token.value')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email
    })
    expect(response.body).not.toHaveProperty('password')
  })

  it('should return 401 Unauthorized when no token is provided', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      code: 'missing_token',
      message: 'Authentication required'
    })
  })

  it('should return 401 Unauthorized when token is invalid', async () => {
    ;(authService.verifyToken as jest.Mock).mockImplementation(() => {
      throw new AppError('invalid_token', 'Token is invalid', {}, 401)
    })

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token')

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      code: 'invalid_token',
      message: 'Token is invalid'
    })
  })
})

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 OK and set new cookies when refresh token is valid', async () => {
    const mockTokens = {
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token'
    }

    ;(authService.verifyToken as jest.Mock).mockReturnValue({
      userId: 12,
      email: 'refresh@example.com'
    })
    ;(authService.generateTokens as jest.Mock).mockReturnValue(mockTokens)

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=mock.refresh.token'])

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      message: 'Token refreshed'
    })

    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()
    if (Array.isArray(cookies)) {
      expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(true)
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true)
    }
  })

  it('should return 401 Unauthorized when refresh token is missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      code: 'missing_token',
      message: 'Refresh token required'
    })
  })

  it('should return 401 Unauthorized when refresh token is invalid', async () => {
    ;(authService.verifyToken as jest.Mock).mockImplementation(() => {
      throw new AppError('invalid_token', 'Token is invalid', {}, 401)
    })

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=invalid.token'])

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      code: 'invalid_token',
      message: 'Token is invalid'
    })
  })
})

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should clear cookies and return 200 OK when authenticated', async () => {
    ;(authService.verifyToken as jest.Mock).mockReturnValue({ userId: 1 })

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer mock.token.value')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      message: 'Logout successful'
    })

    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()
    if (Array.isArray(cookies)) {
      expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(true)
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true)
    }
  })

  it('should return 401 Unauthorized when not authenticated', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      code: 'missing_token',
      message: 'Authentication required'
    })
  })
})
