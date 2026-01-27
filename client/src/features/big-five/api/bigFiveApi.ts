const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const DEFAULT_HEADERS = {
    'Content-Type': 'application/json'
}

/**
 * Structured API error response
 */
export interface ApiErrorResponse {
    code: string
    message: string
    details?: Record<string, unknown>
    requestId?: string
}

/**
 * Big Five trait scores
 */
export interface BigFiveScores {
    id: number
    userId: number
    extraversion: number
    agreeableness: number
    conscientiousness: number
    neuroticism: number
    openness: number
    createdAt: string
    updatedAt: string
}

/**
 * Questionnaire response item
 */
export interface QuestionnaireResponseItem {
    itemNumber: number
    response: number
}

/**
 * Submit questionnaire response
 */
interface SubmitQuestionnaireResponse {
    scores: BigFiveScores
    requestId?: string
}

/**
 * Get scores response
 */
interface GetScoresResponse {
    completed: boolean
    scores: BigFiveScores | null
    requestId?: string
}

const generateRequestId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `req-${Date.now()}`
}

const buildHeaders = (headers?: HeadersInit): Headers => {
    const merged = new Headers(DEFAULT_HEADERS)
    if (headers) {
        if (headers instanceof Headers) {
            headers.forEach((value, key) => {
                merged.set(key, value)
            })
        } else if (Array.isArray(headers)) {
            headers.forEach(([key, value]) => {
                merged.set(key, value)
            })
        } else {
            Object.entries(headers).forEach(([key, value]) => {
                if (value !== undefined) {
                    merged.set(key, String(value))
                }
            })
        }
    }
    merged.set('X-Request-Id', generateRequestId())
    return merged
}

const parseJsonSafely = async <T>(response: Response): Promise<T | null> => {
    const text = await response.text()
    if (!text) return null
    return JSON.parse(text) as T
}

const apiRequest = async <T>(
    path: string,
    options: RequestInit = {}
): Promise<T> => {
    let response: Response
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: buildHeaders(options.headers),
            credentials: 'include'
        })
    } catch (error) {
        if (error instanceof TypeError) {
            throw { code: 'network_error', message: 'Cannot connect to server. Check your internet connection.' } as ApiErrorResponse
        }
        throw { code: 'network_error', message: 'Connection failed. Please retry.' } as ApiErrorResponse
    }

    const data = await parseJsonSafely<T>(response)

    if (!response.ok) {
        throw (data || { code: 'server_error', message: 'Something went wrong. Please try again.' })
    }

    return data as T
}

/**
 * Submit Big Five questionnaire responses
 * 
 * @param responses - Array of 44 item responses (1-5 scale)
 * @returns Calculated scores
 * @throws ApiErrorResponse on validation errors
 */
export const submitQuestionnaire = async (
    responses: QuestionnaireResponseItem[]
): Promise<SubmitQuestionnaireResponse> => {
    return apiRequest<SubmitQuestionnaireResponse>(
        '/api/v1/big-five/submit',
        {
            method: 'POST',
            body: JSON.stringify({ responses })
        }
    )
}

/**
 * Get current user's Big Five scores
 * 
 * @returns User's scores or null if not completed
 */
export const getMyScores = async (): Promise<GetScoresResponse> => {
    return apiRequest<GetScoresResponse>('/api/v1/big-five/me')
}
