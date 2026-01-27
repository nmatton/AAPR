process.env.JWT_SECRET = 'test_secret_for_unit_tests_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import * as bigFiveService from './big-five.service'
import { prisma } from '../lib/prisma'

// Create a mock object that satisfies the structure we need
const mockPrismaClient = {
    bigFiveResponse: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn()
    },
    bigFiveScore: {
        upsert: jest.fn(),
        findUnique: jest.fn()
    },
    $transaction: jest.fn()
}

    // Implement $transaction to call the callback with the mock client
    ; (mockPrismaClient.$transaction as jest.Mock).mockImplementation((callback: any) => {
        return callback(mockPrismaClient)
    })

jest.mock('../lib/prisma', () => ({
    prisma: mockPrismaClient
}))

// Use this for type-safe(ish) access in tests
const prismaMock = prisma as any

describe('bigFiveService.calculateScores', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('calculates correct scores with reverse-coded items', () => {
        // Test data: All items answered with 3 (neutral)
        const responses = Array.from({ length: 44 }, (_, i) => ({
            itemNumber: i + 1,
            response: 3
        }))

        const scores = bigFiveService.calculateScores(responses)

        // With all 3s, reverse coding doesn't change the sum
        // Extraversion: 8 items * 3 = 24
        // Agreeableness: 9 items * 3 = 27
        // Conscientiousness: 9 items * 3 = 27
        // Neuroticism: 8 items * 3 = 24
        // Openness: 10 items * 3 = 30
        expect(scores.extraversion).toBe(24)
        expect(scores.agreeableness).toBe(27)
        expect(scores.conscientiousness).toBe(27)
        expect(scores.neuroticism).toBe(24)
        expect(scores.openness).toBe(30)
    })

    it('correctly reverse-codes items', () => {
        // Test with extreme values to verify reverse coding
        const responses = [
            // Extraversion: items 1, 6R, 11, 16, 21R, 26, 31R, 36
            { itemNumber: 1, response: 5 },   // 5
            { itemNumber: 6, response: 5 },   // 1 (reversed)
            { itemNumber: 11, response: 5 },  // 5
            { itemNumber: 16, response: 5 },  // 5
            { itemNumber: 21, response: 5 },  // 1 (reversed)
            { itemNumber: 26, response: 5 },  // 5
            { itemNumber: 31, response: 5 },  // 1 (reversed)
            { itemNumber: 36, response: 5 },  // 5
            // Fill remaining items with 3 (neutral)
            ...Array.from({ length: 36 }, (_, i) => ({
                itemNumber: i + 9,
                response: 3
            })).filter(r => ![11, 16, 21, 26, 31, 36].includes(r.itemNumber))
        ]

        // Ensure we have exactly 44 responses
        const allResponses = Array.from({ length: 44 }, (_, i) => {
            const existing = responses.find(r => r.itemNumber === i + 1)
            return existing || { itemNumber: i + 1, response: 3 }
        })

        const scores = bigFiveService.calculateScores(allResponses)

        // Extraversion: 5 + 1 + 5 + 5 + 1 + 5 + 1 + 5 = 28
        expect(scores.extraversion).toBe(28)
    })

    it('handles minimum scores (all 1s)', () => {
        const responses = Array.from({ length: 44 }, (_, i) => ({
            itemNumber: i + 1,
            response: 1
        }))

        const scores = bigFiveService.calculateScores(responses)

        // With reverse coding, some 1s become 5s
        expect(scores.extraversion).toBe(20)
        expect(scores.agreeableness).toBe(25)
        expect(scores.conscientiousness).toBe(25)
        expect(scores.neuroticism).toBe(20)
        expect(scores.openness).toBe(18)
    })

    it('handles maximum scores (all 5s)', () => {
        const responses = Array.from({ length: 44 }, (_, i) => ({
            itemNumber: i + 1,
            response: 5
        }))

        const scores = bigFiveService.calculateScores(responses)

        // With reverse coding, some 5s become 1s
        expect(scores.extraversion).toBe(28)
        expect(scores.agreeableness).toBe(29)
        expect(scores.conscientiousness).toBe(29)
        expect(scores.neuroticism).toBe(28)
        expect(scores.openness).toBe(42)
    })

    it('throws error for incomplete responses', () => {
        const responses = Array.from({ length: 43 }, (_, i) => ({
            itemNumber: i + 1,
            response: 3
        }))

        expect(() => bigFiveService.calculateScores(responses)).toThrow('All 44 items must be answered')
    })

    it('throws error for invalid response values', () => {
        const responses = Array.from({ length: 44 }, (_, i) => ({
            itemNumber: i + 1,
            response: i === 0 ? 6 : 3
        }))

        expect(() => bigFiveService.calculateScores(responses)).toThrow('Response values must be between 1 and 5')
    })
})

describe('bigFiveService.saveResponses', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('saves responses and calculates scores in a transaction', async () => {
        const userId = 1
        const responses = Array.from({ length: 44 }, (_, i) => ({
            itemNumber: i + 1,
            response: 3
        }))

        prismaMock.bigFiveResponse.deleteMany.mockResolvedValue({ count: 0 })
        prismaMock.bigFiveResponse.createMany.mockResolvedValue({ count: 44 })
        prismaMock.bigFiveScore.upsert.mockResolvedValue({
            id: 1,
            userId,
            extraversion: 24,
            agreeableness: 27,
            conscientiousness: 27,
            neuroticism: 24,
            openness: 30,
            createdAt: new Date(),
            updatedAt: new Date()
        })

        const result = await bigFiveService.saveResponses(userId, responses)

        expect(prismaMock.$transaction).toHaveBeenCalled()
        expect(prismaMock.bigFiveResponse.deleteMany).toHaveBeenCalledWith({
            where: { userId }
        })
        expect(prismaMock.bigFiveResponse.createMany).toHaveBeenCalled()
        expect(prismaMock.bigFiveScore.upsert).toHaveBeenCalledWith({
            where: { userId },
            create: expect.objectContaining({ userId }),
            update: expect.objectContaining({ extraversion: 24 })
        })
        expect(result.extraversion).toBe(24)
    })

    it('throws error for invalid userId', async () => {
        const responses = Array.from({ length: 44 }, (_, i) => ({
            itemNumber: i + 1,
            response: 3
        }))

        await expect(bigFiveService.saveResponses(0, responses)).rejects.toThrow()
    })
})

describe('bigFiveService.getUserScores', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns user scores if they exist', async () => {
        const mockScore = {
            id: 1,
            userId: 1,
            extraversion: 30,
            agreeableness: 35,
            conscientiousness: 32,
            neuroticism: 20,
            openness: 40,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        prismaMock.bigFiveScore.findUnique.mockResolvedValue(mockScore)

        const result = await bigFiveService.getUserScores(1)

        expect(result).toEqual(mockScore)
        expect(prismaMock.bigFiveScore.findUnique).toHaveBeenCalledWith({
            where: { userId: 1 }
        })
    })

    it('returns null if user has not completed questionnaire', async () => {
        prismaMock.bigFiveScore.findUnique.mockResolvedValue(null)
        const result = await bigFiveService.getUserScores(1)
        expect(result).toBeNull()
    })

    it('throws error for invalid userId', async () => {
        await expect(bigFiveService.getUserScores(0)).rejects.toThrow()
    })
})
