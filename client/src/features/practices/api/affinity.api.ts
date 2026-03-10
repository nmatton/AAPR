import { ApiError } from './practices.api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type AffinityStatus = 'ok' | 'insufficient_profile_data' | 'no_tag_mapping'

export interface AffinityErrorResponse {
  code?: string
  message?: string
  details?: unknown
}

export interface MyPracticeAffinityResponse {
  status: AffinityStatus
  teamId: number
  practiceId: number
  score: number | null
  requestId?: string
}

export interface TeamPracticeAffinityResponse {
  status: AffinityStatus
  teamId: number
  practiceId: number
  score: number | null
  aggregation?: {
    includedMembers: number
    excludedMembers: number
  }
  requestId?: string
}

const generateRequestId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `req-${Date.now()}`
}

const parseJsonSafely = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text) as T
}

const mapApiError = async (response: Response): Promise<never> => {
  const data = await parseJsonSafely<AffinityErrorResponse>(response)
  throw new ApiError(
    data?.code ?? 'unknown_error',
    data?.message ?? 'Unable to load affinity data',
    data?.details,
    response.status
  )
}

export const fetchMyPracticeAffinity = async (
  teamId: number,
  practiceId: number,
  requestId?: string
): Promise<MyPracticeAffinityResponse> => {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/teams/${teamId}/practices/${practiceId}/affinity/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId ?? generateRequestId()
      },
      credentials: 'include'
    })
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('network_error', 'Unable to reach server. Check your connection.')
    }
    throw new ApiError('unknown_error', 'Unexpected error while fetching individual affinity', { originalError: error })
  }

  if (!response.ok) {
    return mapApiError(response)
  }

  const data = await parseJsonSafely<MyPracticeAffinityResponse>(response)
  if (!data) {
    throw new ApiError('unknown_error', 'Empty response received for individual affinity')
  }
  return data
}

export const fetchTeamPracticeAffinity = async (
  teamId: number,
  practiceId: number,
  requestId?: string
): Promise<TeamPracticeAffinityResponse> => {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/teams/${teamId}/practices/${practiceId}/affinity/team`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId ?? generateRequestId()
      },
      credentials: 'include'
    })
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('network_error', 'Unable to reach server. Check your connection.')
    }
    throw new ApiError('unknown_error', 'Unexpected error while fetching team affinity', { originalError: error })
  }

  if (!response.ok) {
    return mapApiError(response)
  }

  const data = await parseJsonSafely<TeamPracticeAffinityResponse>(response)
  if (!data) {
    throw new ApiError('unknown_error', 'Empty response received for team affinity')
  }
  return data
}
