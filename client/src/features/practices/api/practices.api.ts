import type { PracticesResponse, Practice } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
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

export const fetchPractices = async (
  page = 1,
  pageSize = 20,
  search?: string,
  pillars?: number[]
): Promise<PracticesResponse> => {
  let response: Response
  try {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    if (search && search.trim()) {
      params.append('search', search.trim())
    }
    if (pillars && pillars.length > 0) {
      params.append('pillars', pillars.join(','))
    }

    response = await fetch(`${API_BASE_URL}/api/v1/practices?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': generateRequestId()
      },
      credentials: 'include'
    })
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('network_error', 'Unable to reach server. Check your connection.')
    }
    throw new ApiError('unknown_error', 'Unexpected error while fetching practices', { originalError: error })
  }

  const data = await parseJsonSafely<PracticesResponse & { code?: string; message?: string; details?: unknown }>(response)

  if (!response.ok || !data) {
    throw new ApiError(
      data?.code ?? 'unknown_error',
      data?.message ?? 'Unable to load practices',
      data?.details,
      response.status
    )
  }

  return {
    items: data.items,
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    requestId: data.requestId ?? 'unknown'
  }
}

export type PracticeDetailResponse = {
  practice: Practice & {
    description?: string | null
    method?: string | null
    tags?: unknown | null
    activities?: unknown | null
    roles?: unknown | null
    workProducts?: unknown | null
    completionCriteria?: string | null
    metrics?: unknown | null
    guidelines?: unknown | null
    pitfalls?: unknown | null
    benefits?: unknown | null
    associatedPractices?: unknown | null
    importedBy?: string | null
    updatedAt: string
  }
}

export const fetchPracticeDetail = async (id: number): Promise<PracticeDetailResponse> => {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/practices/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': generateRequestId()
      },
      credentials: 'include'
    })
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('network_error', 'Unable to reach server. Check your connection.')
    }
    throw new ApiError('unknown_error', 'Unexpected error while fetching practice detail', { originalError: error })
  }

  const data = await parseJsonSafely<PracticeDetailResponse & { code?: string; message?: string; details?: unknown }>(response)

  if (!response.ok || !data) {
    throw new ApiError(
      data?.code ?? 'unknown_error',
      data?.message ?? 'Unable to load practice detail',
      data?.details,
      response.status
    )
  }

  return { practice: data.practice }
}

export const logCatalogViewed = async (teamId: number | null, practiceCount: number): Promise<void> => {
  // Best-effort client-side event logging; ignore failures so UX is not blocked
  try {
    await fetch(`${API_BASE_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': generateRequestId()
      },
      credentials: 'include',
      body: JSON.stringify({ action: 'catalog.viewed', teamId, practiceCount, timestamp: new Date().toISOString() })
    })
  } catch (error) {
    console.warn('catalog.viewed event logging failed', error)
  }
}

export const logCatalogSearched = async (params: {
  teamId: number | null
  query: string
  pillarsSelected: number[]
  timestamp: string
}): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': generateRequestId()
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'catalog.searched',
        teamId: params.teamId,
        query: params.query,
        pillarsSelected: params.pillarsSelected,
        timestamp: params.timestamp
      })
    })
  } catch (error) {
    console.warn('catalog.searched event logging failed', error)
  }
}
