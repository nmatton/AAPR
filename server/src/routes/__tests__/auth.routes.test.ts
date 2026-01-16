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
    generateTokens: jest.fn()
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
