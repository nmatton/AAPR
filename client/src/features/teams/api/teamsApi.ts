import type { Team } from '../types/team.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': crypto.randomUUID(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('unauthorized', 'Not authenticated', {}, 401);
      }
      
      const error = await response.json().catch(() => ({
        code: 'unknown_error',
        message: 'An unexpected error occurred'
      }));
      
      throw new ApiError(
        error.code || 'unknown_error',
        error.message || 'An unexpected error occurred',
        error.details,
        response.status
      );
    }

    const data = await response.json();
    return data.teams;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError(
        'network_error',
        'Connection failed. Check your internet and retry.'
      );
    }
    
    throw new ApiError(
      'unknown_error',
      'An unexpected error occurred',
      { originalError: error }
    );
  }
};
