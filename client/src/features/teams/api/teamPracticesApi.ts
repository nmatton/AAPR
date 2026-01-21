import { apiClient } from '../../../lib/apiClient'
import type { Practice } from '../../practices/types'

export interface AvailablePracticesParams {
  teamId: number;
  page?: number;
  pageSize?: number;
  search?: string;
  pillars?: number[];
}

export interface AvailablePracticesResponse {
  items: Practice[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AddPracticeResponse {
  teamPractice: {
    id: number;
    teamId: number;
    practiceId: number;
    addedAt: string;
  };
  coverage: number;
}

export interface TeamPracticesResponse {
  items: Practice[];
  requestId?: string;
}

export interface RemovePracticeResponse {
  teamPracticeId: number;
  coverage: number;
  requestId?: string;
}

/**
 * Fetch practices not yet selected by team
 * @param params - Query parameters including teamId, filters
 * @returns Paginated list of available practices
 */
export const fetchAvailablePractices = async (
  params: AvailablePracticesParams
): Promise<AvailablePracticesResponse> => {
  const { teamId, page = 1, pageSize = 20, search, pillars } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  if (pillars && pillars.length > 0) {
    queryParams.append('pillars', pillars.join(','));
  }
  
  return apiClient<AvailablePracticesResponse>(
    `/api/v1/teams/${teamId}/practices/available?${queryParams.toString()}`
  );
};

/**
 * Add a practice to team portfolio
 * @param teamId - Team identifier
 * @param practiceId - Practice to add
 * @returns Updated team practice and coverage
 */
export const addPracticeToTeam = async (
  teamId: number,
  practiceId: number
): Promise<AddPracticeResponse> => {
  return apiClient<AddPracticeResponse>(
    `/api/v1/teams/${teamId}/practices`,
    {
      method: 'POST',
      body: JSON.stringify({ practiceId }),
    }
  );
};

/**
 * Fetch practices currently selected by team
 * @param teamId - Team identifier
 * @returns Team practices list
 */
export const fetchTeamPractices = async (teamId: number): Promise<TeamPracticesResponse> => {
  return apiClient<TeamPracticesResponse>(
    `/api/v1/teams/${teamId}/practices`
  );
};

/**
 * Remove a practice from team portfolio
 * @param teamId - Team identifier
 * @param practiceId - Practice identifier
 * @returns Updated coverage and removed teamPracticeId
 */
export const removePracticeFromTeam = async (
  teamId: number,
  practiceId: number
): Promise<RemovePracticeResponse> => {
  return apiClient<RemovePracticeResponse>(
    `/api/v1/teams/${teamId}/practices/${practiceId}`,
    {
      method: 'DELETE'
    }
  );
};
