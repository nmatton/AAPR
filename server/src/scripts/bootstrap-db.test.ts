import { bootstrapDb } from './bootstrap-db'
import { prisma } from '../lib/prisma'
import { seedAll } from './seed-all'
import { seedTagReferenceData } from './seed-tag-reference-data'

jest.mock('../lib/prisma', () => ({
  prisma: {
    practice: { count: jest.fn() },
    $disconnect: jest.fn(),
  },
}))

jest.mock('./seed-all', () => ({
  seedAll: jest.fn(),
}))

jest.mock('./seed-tag-reference-data', () => ({
  seedTagReferenceData: jest.fn(),
}))

describe('bootstrapDb', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('seeds only tag reference data when practices already exist', async () => {
    ;(prisma.practice.count as jest.Mock).mockResolvedValue(42)
    ;(seedTagReferenceData as jest.Mock).mockResolvedValue(undefined)

    const result = await bootstrapDb()

    expect(result).toBe(0)
    expect(seedTagReferenceData).toHaveBeenCalledWith(prisma)
    expect(seedAll).not.toHaveBeenCalled()
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1)
  })

  it('runs full seed when no practices exist', async () => {
    ;(prisma.practice.count as jest.Mock).mockResolvedValue(0)
    ;(seedAll as jest.Mock).mockResolvedValue(0)

    const result = await bootstrapDb()

    expect(result).toBe(0)
    expect(seedAll).toHaveBeenCalledTimes(1)
    expect(seedTagReferenceData).not.toHaveBeenCalled()
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1)
  })

  it('returns 1 when bootstrap throws', async () => {
    ;(prisma.practice.count as jest.Mock).mockRejectedValue(new Error('boom'))

    const result = await bootstrapDb()

    expect(result).toBe(1)
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1)
  })
})
