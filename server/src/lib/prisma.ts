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

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
