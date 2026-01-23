import type { Team } from '../types/team.types';
import { refreshAccessToken } from '../../auth/api/authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const generateRequestId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}`;
};

const parseJsonSafely = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as T;
};

const requestWithRefresh = async <T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': generateRequestId(),
        ...(options.headers || {})
      },
      credentials: 'include'
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError(
        'network_error',
        'Connection failed. Check your internet and retry.'
      );
    }
    throw new ApiError('unknown_error', 'An unexpected error occurred', { originalError: error });
  }

  if (response.status === 401 && retryOnUnauthorized) {
    try {
      await refreshAccessToken();
      return requestWithRefresh<T>(path, options, false);
    } catch (error) {
      throw new ApiError('session_expired', 'Session expired. Please log in again.', {}, 401);
    }
  }

  const data = await parseJsonSafely<T & { code?: string; message?: string; details?: unknown }>(response);

  if (!response.ok) {
    throw new ApiError(
      (data && 'code' in data && data.code) ? String(data.code) : 'unknown_error',
      (data && 'message' in data && data.message) ? String(data.message) : 'An unexpected error occurred',
      data && 'details' in data ? data.details : undefined,
      response.status
    );
  }

  return data as T;
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get all teams for the authenticated user
 * @returns Array of teams
 * @throws ApiError if request fails
 */
export const getTeams = async (): Promise<Team[]> => {
  const data = await requestWithRefresh<{ teams: Team[] }>('/api/v1/teams', {
    method: 'GET'
  });
  return data.teams;
};

/**
 * Create a new team with selected practices
 * @param name - Team name (3-100 chars)
 * @param practiceIds - Array of practice IDs to associate with team
 * @returns Created team
 * @throws ApiError if request fails
 */
export const createTeam = async (
  name: string,
  practiceIds: number[]
): Promise<Team> => {
  const data = await requestWithRefresh<{ team: Team }>('/api/v1/teams', {
    method: 'POST',
    body: JSON.stringify({ name, practiceIds })
  });
  return data.team;
};

/**
 * Update team name response
 */
export interface UpdateTeamNameResponse {
  id: number;
  name: string;
  version: number;
  updatedAt: string;
}

/**
 * Update team name with optimistic locking
 * @param teamId - Team identifier
 * @param newName - New team name (3-50 chars)
 * @param currentVersion - Current version for optimistic locking
 * @returns Updated team data
 * @throws ApiError if validation fails or version conflict
 */
export const updateTeamName = async (
  teamId: number,
  newName: string,
  currentVersion: number
): Promise<UpdateTeamNameResponse> => {
  const data = await requestWithRefresh<{ data: UpdateTeamNameResponse }>(
    `/api/v1/teams/${teamId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name: newName, version: currentVersion })
    }
  );
  return data.data;
};
