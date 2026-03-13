import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg

// Singleton pattern for Prisma client
// Prevents multiple instances in development with hot-reload
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient
  pool: pg.Pool
}

// Create connection pool for PostgreSQL adapter (Prisma 7.x requirement)
if (!globalForPrisma.pool) {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  globalForPrisma.pool = new Pool({
    connectionString
  })
}

const adapter = new PrismaPg(globalForPrisma.pool)

const EVENT_TYPES_ALLOWING_NULL_ACTOR = new Set<string>([
  'user.registered',
  'practice.imported',
  'practices.imported',
  'coverage.by_category.calculated',
  'event.export_started',
  'event.export_completed',
  'event.export_failed',
])

const EVENT_TYPES_ALLOWING_NULL_TEAM = new Set<string>([
  'user.registered',
  'user.login',
  'practice.imported',
  'practices.imported',
  'big_five.completed',
  'big_five.retaken',
])

const assertEventCreateMetadata = (args: any): void => {
  const data = args?.data
  if (!data) {
    throw new Error('Event create payload is required')
  }

  const eventType = data.eventType as string | undefined
  if (!eventType || eventType.trim().length === 0) {
    throw new Error('Event create requires eventType')
  }

  const actorId = data.actorId as number | null | undefined
  if ((actorId === null || typeof actorId === 'undefined') && !EVENT_TYPES_ALLOWING_NULL_ACTOR.has(eventType)) {
    throw new Error(`Event create requires actorId for eventType "${eventType}"`)
  }

  if (actorId === null || typeof actorId === 'undefined') {
    const systemReason = data?.payload?.systemReason
    if (typeof systemReason !== 'string' || systemReason.trim().length === 0) {
      throw new Error(`Event create with null actorId requires payload.systemReason for eventType "${eventType}"`)
    }
  }

  const teamId = data.teamId as number | null | undefined
  if ((teamId === null || typeof teamId === 'undefined') && !EVENT_TYPES_ALLOWING_NULL_TEAM.has(eventType)) {
    throw new Error(`Event create requires teamId for eventType "${eventType}"`)
  }
}

const assertEventMutationAllowed = (operation: string): void => {
  const batchPurgeEnabled = process.env.ALLOW_EVENT_BATCH_PURGE === 'true'
  if (operation === 'deleteMany' && batchPurgeEnabled) {
    return
  }

  throw new Error(
    `Event table is immutable. Operation "${operation}" is blocked. ` +
      'Only controlled batch purge may use deleteMany with ALLOW_EVENT_BATCH_PURGE=true.'
  )
}

const createPrismaClient = () => {
  const baseClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  return baseClient.$extends({
    query: {
      event: {
        async create({ args, query }) {
          assertEventCreateMetadata(args)
          return query(args)
        },
        async update() {
          assertEventMutationAllowed('update')
          return null as never
        },
        async updateMany() {
          assertEventMutationAllowed('updateMany')
          return null as never
        },
        async delete() {
          assertEventMutationAllowed('delete')
          return null as never
        },
        async deleteMany({ args, query }) {
          assertEventMutationAllowed('deleteMany')
          return query(args)
        }
      }
    }
  })
}

export const prisma =
  globalForPrisma.prisma ||
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
