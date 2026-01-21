import { refreshAccessToken } from '../features/auth/api/authApi'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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

class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

const requestWithRefresh = async <T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> => {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': generateRequestId(),
        ...(options.headers || {})
      },
      credentials: 'include'
    })
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiClientError('network_error', 'Connection failed. Check your internet and retry.')
    }
    throw new ApiClientError('unknown_error', 'An unexpected error occurred', { originalError: error })
  }

  if (response.status === 401 && retryOnUnauthorized) {
    try {
      await refreshAccessToken()
      return requestWithRefresh<T>(path, options, false)
    } catch (error) {
      throw new ApiClientError('session_expired', 'Session expired. Please log in again.', {}, 401)
    }
  }

  const data = await parseJsonSafely<T & { code?: string; message?: string; details?: unknown }>(response)

  if (!response.ok) {
    throw new ApiClientError(
      data?.code ?? 'unknown_error',
      data?.message ?? 'An unexpected error occurred',
      data?.details,
      response.status
    )
  }

  return data as T
}

export const apiClient = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => requestWithRefresh<T>(path, options)

export type ApiClientErrorType = ApiClientError
