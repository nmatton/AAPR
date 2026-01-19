import { refreshAccessToken } from '../../auth/api/authApi'
import type { TeamInvite } from '../types/invite.types'

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
      throw new ApiError('network_error', 'Connection failed. Check your internet and retry.')
    }
    throw new ApiError('unknown_error', 'An unexpected error occurred', { originalError: error })
  }

  if (response.status === 401 && retryOnUnauthorized) {
    try {
      await refreshAccessToken()
      return requestWithRefresh<T>(path, options, false)
    } catch (error) {
      throw new ApiError('session_expired', 'Session expired. Please log in again.', {}, 401)
    }
  }

  const data = await parseJsonSafely<T & { code?: string; message?: string; details?: unknown }>(response)

  if (!response.ok) {
    throw new ApiError(
      data && 'code' in data && data.code ? String(data.code) : 'unknown_error',
      data && 'message' in data && data.message ? String(data.message) : 'An unexpected error occurred',
      data && 'details' in data ? data.details : undefined,
      response.status
    )
  }

  return data as T
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: unknown,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const getInvites = async (teamId: number): Promise<TeamInvite[]> => {
  const data = await requestWithRefresh<{ invites: TeamInvite[] }>(
    `/api/v1/teams/${teamId}/invites`,
    { method: 'GET' }
  )
  return data.invites
}

export const createInvite = async (teamId: number, email: string): Promise<TeamInvite> => {
  const data = await requestWithRefresh<{ invite: TeamInvite }>(
    `/api/v1/teams/${teamId}/invites`,
    { method: 'POST', body: JSON.stringify({ email }) }
  )
  return data.invite
}

export const resendInvite = async (teamId: number, inviteId: number): Promise<TeamInvite> => {
  const data = await requestWithRefresh<{ invite: TeamInvite }>(
    `/api/v1/teams/${teamId}/invites/${inviteId}/resend`,
    { method: 'POST' }
  )
  return data.invite
}
