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
 * User data returned from API
 */
export interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

/**
 * Registration response from API
 */
interface RegisterResponse {
  user: User
  message: string
}

interface LoginResponse {
  user: User
  message: string
  requestId?: string
}

interface CurrentUserResponse extends User {
  requestId?: string
}

let refreshPromise: Promise<void> | null = null

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

const refreshAccessTokenInternal = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include'
  })

  const data = await parseJsonSafely<ApiErrorResponse>(response)

  if (!response.ok) {
    throw (data || { code: 'refresh_failed', message: 'Session expired' })
  }
}

const ensureRefreshed = async (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenInternal()
  }

  try {
    await refreshPromise
  } finally {
    refreshPromise = null
  }
}

const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> => {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: buildHeaders(options.headers),
      credentials: 'include'
    })
  } catch (error) {
    // Better error message based on error type
    if (error instanceof TypeError) {
      throw { code: 'network_error', message: 'Cannot connect to server. Check your internet connection.' } as ApiErrorResponse
    }
    throw { code: 'network_error', message: 'Connection failed. Please retry.' } as ApiErrorResponse
  }

  if (response.status === 401 && retryOnUnauthorized) {
    try {
      await ensureRefreshed()
      return apiRequest<T>(path, options, false)
    } catch (error) {
      // Throw session expired error instead of forcing page reload
      // This allows React Router to handle navigation smoothly
      throw { code: 'session_expired', message: 'Session expired. Please log in again.' } as ApiErrorResponse
    }
  }

  const data = await parseJsonSafely<T>(response)

  if (!response.ok) {
    throw (data || { code: 'server_error', message: 'Something went wrong. Please try again.' })
  }

  return data as T
}

/**
 * Register new user with email and password
 * 
 * @param name - User's display name (3-50 characters)
 * @param email - Valid email address
 * @param password - Password (8+ characters)
 * @returns User data (without password)
 * @throws ApiErrorResponse on validation or duplicate email errors
 */
export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<RegisterResponse> => {
  return apiRequest<RegisterResponse>(
    '/api/v1/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    },
    false
  )
}

/**
 * Login user with email and password
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  return apiRequest<LoginResponse>(
    '/api/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password })
    },
    false
  )
}

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  return apiRequest<CurrentUserResponse>('/api/v1/auth/me')
}

/**
 * Refresh access token
 */
export const refreshAccessToken = async (): Promise<void> => {
  await ensureRefreshed()
}

/**
 * Logout current user
 */
export const logoutUser = async (): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>(
    '/api/v1/auth/logout',
    {
      method: 'POST'
    },
    false
  )
}

// Export for testing
export const __test__ = {
  refreshPromise: () => refreshPromise,
  resetRefreshPromise: () => { refreshPromise = null }
}
