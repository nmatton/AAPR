process.env.JWT_SECRET = 'test_secret_for_health_endpoint_12345678901234567890'
process.env.ADMIN_API_KEY = 'test-admin-key'

import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import { app } from './app'
import { prisma } from './lib/prisma'
import { getReferenceData } from './services/affinity/affinity-reference-data'

jest.mock('./lib/prisma', () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
    practice: {
      count: jest.fn(),
    },
  },
}))

jest.mock('./services/affinity/affinity-reference-data', () => ({
  getReferenceData: jest.fn(),
}))

describe('health endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.EVENT_EXPORT_DIR = 'exports-test-health'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_FROM = 'noreply@example.com'
    delete process.env.HONEYBADGER_AUTH_HEADER

    ;(prisma.$queryRawUnsafe as jest.MockedFunction<typeof prisma.$queryRawUnsafe>).mockResolvedValue([{ '?column?': 1 }])
    ;(prisma.practice.count as jest.MockedFunction<typeof prisma.practice.count>).mockResolvedValue(42)
    ;(getReferenceData as jest.MockedFunction<typeof getReferenceData>).mockReturnValue({
      bounds: {
        E: { lowBound: 1, highBound: 2 },
        A: { lowBound: 1, highBound: 2 },
        C: { lowBound: 1, highBound: 2 },
        N: { lowBound: 1, highBound: 2 },
        O: { lowBound: 1, highBound: 2 },
      },
      relations: [],
    })
  })

  it('returns minimal healthy report by default with 200', async () => {
    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.timestamp).toBeDefined()
    expect(response.body.version).toBeDefined()
    expect(response.body.checks).toBeUndefined()
    expect(Object.keys(response.body).sort()).toEqual(['status', 'timestamp', 'version'])
  })

  it('returns detailed report when X-API-KEY matches ADMIN_API_KEY', async () => {
    const response = await request(app).get('/api/v1/health').set('X-API-KEY', 'test-admin-key')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.checks.database.status).toBe('up')
    expect(response.body.checks.practiceCatalog.status).toBe('up')
    expect(response.body.checks.runtimeEnv.status).toBe('up')
    expect(response.body.checks.smtp.status).toBe('up')
    expect(response.body.checks.affinityReferenceData.status).toBe('up')
    expect(response.body.checks.exportDirectory.status).toBe('up')
  })

  it('returns detailed report when Honeybadger-Token matches configured value', async () => {
    process.env.HONEYBADGER_AUTH_HEADER = 'test-honeybadger-token'

    const response = await request(app)
      .get('/api/v1/health')
      .set('Honeybadger-Token', 'test-honeybadger-token')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.checks.database.status).toBe('up')
  })

  it('returns 503 fail when critical dependency is down', async () => {
    ;(prisma.$queryRawUnsafe as jest.MockedFunction<typeof prisma.$queryRawUnsafe>).mockRejectedValue(
      new Error('database unavailable')
    )

    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(503)
    expect(response.body.status).toBe('fail')
    expect(response.body.version).toBeDefined()
    expect(response.body.checks).toBeUndefined()
  })

  it('returns 200 degraded when only non-critical checks are degraded', async () => {
    delete process.env.SMTP_HOST
    ;(getReferenceData as jest.MockedFunction<typeof getReferenceData>).mockImplementation(() => {
      throw new Error('missing reference file')
    })

    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('degraded')
    expect(response.body.version).toBeDefined()
    expect(response.body.checks).toBeUndefined()
  })
})