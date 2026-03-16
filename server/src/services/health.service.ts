import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../lib/prisma'
import { getReferenceData } from './affinity/affinity-reference-data'

export type ServiceHealth = 'up' | 'degraded' | 'down'
export type OverallHealth = 'ok' | 'degraded' | 'fail'

export interface ServiceCheck {
  status: ServiceHealth
  critical: boolean
  latencyMs: number
  message?: string
  details?: Record<string, unknown>
}

export interface HealthReport {
  status: OverallHealth
  timestamp: string
  version: string
  uptimeSeconds: number
  checks: {
    database: ServiceCheck
    practiceCatalog: ServiceCheck
    runtimeEnv: ServiceCheck
    smtp: ServiceCheck
    affinityReferenceData: ServiceCheck
    exportDirectory: ServiceCheck
    observability: ServiceCheck
  }
}

const getNow = (): number => Date.now()

const withLatency = async <T>(fn: () => Promise<T>) => {
  const startedAt = getNow()
  const value = await fn()
  return {
    value,
    latencyMs: getNow() - startedAt,
  }
}

const getRuntimeEnvStatus = (): ServiceCheck => {
  const startedAt = getNow()
  const isProduction = process.env.NODE_ENV === 'production'

  const requiredInProd = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_API_KEY', 'HONEYBADGER_API_KEY']
  const missing = requiredInProd.filter((key) => !process.env[key]?.trim())

  if (isProduction && missing.length > 0) {
    return {
      status: 'down',
      critical: true,
      latencyMs: getNow() - startedAt,
      message: 'Missing mandatory production environment variables',
      details: { missing },
    }
  }

  return {
    status: 'up',
    critical: true,
    latencyMs: getNow() - startedAt,
    details: {
      nodeEnv: process.env.NODE_ENV || 'development',
      validatedMode: isProduction ? 'production-strict' : 'non-production',
    },
  }
}

const getSmtpStatus = (): ServiceCheck => {
  const startedAt = getNow()

  const host = process.env.SMTP_HOST?.trim()
  const port = process.env.SMTP_PORT?.trim()
  const from = process.env.SMTP_FROM?.trim()

  if (!host || !port || !from) {
    return {
      status: 'degraded',
      critical: false,
      latencyMs: getNow() - startedAt,
      message: 'SMTP configuration is incomplete; invitation emails may fail',
      details: {
        hostConfigured: Boolean(host),
        portConfigured: Boolean(port),
        fromConfigured: Boolean(from),
      },
    }
  }

  const parsedPort = Number(port)
  if (Number.isNaN(parsedPort)) {
    return {
      status: 'degraded',
      critical: false,
      latencyMs: getNow() - startedAt,
      message: 'SMTP_PORT is not a valid number',
      details: { port },
    }
  }

  return {
    status: 'up',
    critical: false,
    latencyMs: getNow() - startedAt,
    details: {
      host,
      port: parsedPort,
      from,
      secure: parsedPort === 465,
    },
  }
}

const getObservabilityStatus = (): ServiceCheck => {
  const startedAt = getNow()
  const isProduction = process.env.NODE_ENV === 'production'
  const apiKeyConfigured = Boolean(process.env.HONEYBADGER_API_KEY?.trim())

  if (isProduction && !apiKeyConfigured) {
    return {
      status: 'down',
      critical: true,
      latencyMs: getNow() - startedAt,
      message: 'Honeybadger API key is missing in production',
      details: { provider: 'honeybadger' },
    }
  }

  if (!isProduction && !apiKeyConfigured) {
    return {
      status: 'up',
      critical: false,
      latencyMs: getNow() - startedAt,
      message: 'Honeybadger is not configured (expected in non-production)',
      details: { provider: 'honeybadger', mode: 'disabled' },
    }
  }

  return {
    status: 'up',
    critical: isProduction,
    latencyMs: getNow() - startedAt,
    details: { provider: 'honeybadger', mode: 'configured' },
  }
}

const getExportDirectoryStatus = async (): Promise<ServiceCheck> => {
  const configuredDir = process.env.EVENT_EXPORT_DIR?.trim() || 'exports'

  return withLatency(async () => {
    const exportDir = path.resolve(process.cwd(), configuredDir)
    await fs.mkdir(exportDir, { recursive: true })
    await fs.access(exportDir)

    return {
      status: 'up' as const,
      critical: false,
      details: { exportDir },
    }
  })
    .then(({ value, latencyMs }) => ({ ...value, latencyMs }))
    .catch((error) => ({
      status: 'degraded' as const,
      critical: false,
      latencyMs: 0,
      message: 'Event export directory is not accessible',
      details: {
        dir: configuredDir,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }))
}

const getDatabaseStatus = async (): Promise<ServiceCheck> => {
  return withLatency(async () => {
    await prisma.$queryRawUnsafe('SELECT 1')
    return {
      status: 'up' as const,
      critical: true,
    }
  })
    .then(({ value, latencyMs }) => ({ ...value, latencyMs }))
    .catch((error) => ({
      status: 'down' as const,
      critical: true,
      latencyMs: 0,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }))
}

const getPracticeCatalogStatus = async (): Promise<ServiceCheck> => {
  return withLatency(async () => {
    const practiceCount = await prisma.practice.count()
    if (practiceCount <= 0) {
      return {
        status: 'down' as const,
        critical: true,
        message: 'Practice catalog is empty',
        details: { practiceCount },
      }
    }

    return {
      status: 'up' as const,
      critical: true,
      details: { practiceCount },
    }
  })
    .then(({ value, latencyMs }) => ({ ...value, latencyMs }))
    .catch((error) => ({
      status: 'down' as const,
      critical: true,
      latencyMs: 0,
      message: 'Practice catalog check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }))
}

const getAffinityStatus = async (): Promise<ServiceCheck> => {
  return withLatency(async () => {
    const data = getReferenceData()
    return {
      status: 'up' as const,
      critical: false,
      details: {
        relationsCount: data.relations.length,
        boundsTraits: Object.keys(data.bounds),
      },
    }
  })
    .then(({ value, latencyMs }) => ({ ...value, latencyMs }))
    .catch((error) => ({
      status: 'degraded' as const,
      critical: false,
      latencyMs: 0,
      message: 'Affinity reference data failed to load',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }))
}

const getOverallStatus = (checks: HealthReport['checks']): OverallHealth => {
  const values = Object.values(checks)
  const hasCriticalDown = values.some((check) => check.critical && check.status === 'down')
  if (hasCriticalDown) {
    return 'fail'
  }

  const hasAnyIssue = values.some((check) => check.status !== 'up')
  if (hasAnyIssue) {
    return 'degraded'
  }

  return 'ok'
}

export const getHealthReport = async (): Promise<HealthReport> => {
  const [database, practiceCatalog, affinityReferenceData, exportDirectory] = await Promise.all([
    getDatabaseStatus(),
    getPracticeCatalogStatus(),
    getAffinityStatus(),
    getExportDirectoryStatus(),
  ])

  const runtimeEnv = getRuntimeEnvStatus()
  const smtp = getSmtpStatus()
  const observability = getObservabilityStatus()

  const checks = {
    database,
    practiceCatalog,
    runtimeEnv,
    smtp,
    affinityReferenceData,
    exportDirectory,
    observability,
  }

  return {
    status: getOverallStatus(checks),
    timestamp: new Date().toISOString(),
    version: process.env.APP_REVISION || '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    checks,
  }
}