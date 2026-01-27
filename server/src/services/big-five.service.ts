import { prisma } from '../lib/prisma'
import { AppError } from './auth.service'

/**
 * Big Five trait scoring configuration
 * Based on 44-item IPIP-NEO questionnaire
 * R suffix indicates reverse-scored items
 */
const TRAIT_ITEMS = {
    extraversion: [1, 6, 11, 16, 21, 26, 31, 36],
    agreeableness: [2, 7, 12, 17, 22, 27, 32, 37, 42],
    conscientiousness: [3, 8, 13, 18, 23, 28, 33, 38, 43],
    neuroticism: [4, 9, 14, 19, 24, 29, 34, 39],
    openness: [5, 10, 15, 20, 25, 30, 35, 40, 41, 44]
}

const REVERSE_ITEMS = [
    // Extraversion reverse items
    6, 21, 31,
    // Agreeableness reverse items
    2, 12, 27, 37,
    // Conscientiousness reverse items
    8, 18, 23, 43,
    // Neuroticism reverse items
    9, 24, 34,
    // Openness reverse items
    35, 41
]

interface QuestionnaireResponse {
    itemNumber: number
    response: number
}

interface BigFiveScores {
    extraversion: number
    agreeableness: number
    conscientiousness: number
    neuroticism: number
    openness: number
}

/**
 * Reverse-code a response value
 * 1 → 5, 2 → 4, 3 → 3, 4 → 2, 5 → 1
 */
function reverseCode(value: number): number {
    return 6 - value
}

/**
 * Calculate Big Five trait scores from questionnaire responses
 * Applies reverse coding to specified items before aggregation
 * 
 * @param responses - Array of 44 item responses (1-5 scale)
 * @returns Calculated trait scores
 * @throws Error if responses are incomplete or invalid
 */
export function calculateScores(responses: QuestionnaireResponse[]): BigFiveScores {
    // Validation
    if (responses.length !== 44) {
        throw new Error('All 44 items must be answered')
    }

    // Validate response values
    for (const r of responses) {
        if (r.response < 1 || r.response > 5) {
            throw new Error('Response values must be between 1 and 5')
        }
    }

    // Create lookup map for responses
    const responseMap = new Map<number, number>()
    responses.forEach(r => {
        responseMap.set(r.itemNumber, r.response)
    })

    // Calculate each trait score
    const scores: BigFiveScores = {
        extraversion: 0,
        agreeableness: 0,
        conscientiousness: 0,
        neuroticism: 0,
        openness: 0
    }

    for (const [trait, items] of Object.entries(TRAIT_ITEMS)) {
        let sum = 0
        for (const itemNumber of items) {
            const rawValue = responseMap.get(itemNumber)
            if (rawValue === undefined) {
                throw new Error(`Missing response for item ${itemNumber}`)
            }

            // Apply reverse coding if needed
            const value = REVERSE_ITEMS.includes(itemNumber)
                ? reverseCode(rawValue)
                : rawValue

            sum += value
        }
        scores[trait as keyof BigFiveScores] = sum
    }

    return scores
}

/**
 * Save user's questionnaire responses and calculate scores
 * Uses transaction to ensure data integrity
 * 
 * @param userId - User identifier
 * @param responses - Array of 44 item responses
 * @returns Calculated and saved scores
 */
export async function saveResponses(
    userId: number,
    responses: QuestionnaireResponse[]
) {
    if (!userId || userId <= 0) {
        throw new AppError('invalid_user_id', 'User ID is required', {}, 400)
    }

    // Calculate scores (validates responses)
    const scores = calculateScores(responses)

    // Save responses and scores in transaction
    const result = await prisma.$transaction(async (tx) => {
        // Delete existing responses (allows retaking questionnaire)
        await tx.bigFiveResponse.deleteMany({
            where: { userId }
        })

        // Save new responses
        await tx.bigFiveResponse.createMany({
            data: responses.map(r => ({
                userId,
                itemNumber: r.itemNumber,
                response: r.response
            }))
        })

        // Upsert scores
        const savedScores = await tx.bigFiveScore.upsert({
            where: { userId },
            create: {
                userId,
                ...scores
            },
            update: {
                ...scores
            }
        })

        return savedScores
    })

    return result
}

/**
 * Get user's Big Five scores
 * 
 * @param userId - User identifier
 * @returns User's scores or null if not completed
 */
export async function getUserScores(userId: number) {
    if (!userId || userId <= 0) {
        throw new AppError('invalid_user_id', 'User ID is required', {}, 400)
    }

    const scores = await prisma.bigFiveScore.findUnique({
        where: { userId }
    })

    return scores
}
