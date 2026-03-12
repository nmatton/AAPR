import { apiClient } from '../../../lib/apiClient'
import type { Practice } from '../../practices/types'
import type {
  ActivityInput,
  RoleInput,
  MetricInput,
  GuidelineInput,
  AssociatedPracticeInput
} from '../types/practice.types'

export interface AvailablePracticesParams {
  teamId: number;
  page?: number;
  pageSize?: number;
  search?: string;
  pillars?: number[];
  categories?: string[];
  methods?: string[];
  tags?: string[];
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
  gapPillarIds: number[];
  gapPillarNames: string[];
  requestId?: string;
}

export interface PracticeRemovalImpact {
  pillarIds: number[];
  pillarNames: string[];
  gapPillarIds: number[];
  gapPillarNames: string[];
  willCreateGaps: boolean;
  requestId?: string;
}

export interface CreateCustomPracticePayload {
  title: string;
  goal: string;
  pillarIds: number[];
  categoryId: string;
  description?: string;
  method?: string;
  tags?: string[];
  benefits?: string[];
  pitfalls?: string[];
  workProducts?: string[];
  activities?: ActivityInput[];
  roles?: RoleInput[];
  completionCriteria?: string;
  metrics?: MetricInput[];
  guidelines?: GuidelineInput[];
  associatedPractices?: AssociatedPracticeInput[];
  templatePracticeId?: number;
}

export interface CreateCustomPracticeResponse {
  practiceId: number;
  coverage: number;
  requestId?: string;
}

export interface EditPracticePayload {
  title: string;
  goal: string;
  pillarIds: number[];
  categoryId: string;
  method?: string | null;
  tags?: string[];
  benefits?: string[];
  pitfalls?: string[];
  workProducts?: string[];
  activities?: ActivityInput[];
  roles?: RoleInput[];
  completionCriteria?: string | null;
  metrics?: MetricInput[];
  guidelines?: GuidelineInput[];
  associatedPractices?: AssociatedPracticeInput[];
  saveAsCopy?: boolean;
  version: number;
}

export interface EditPracticeResponse {
  practice?: Practice;
  practiceId?: number;
  coverageByTeam: Array<{ teamId: number; coverage: number }>;
  usedByTeamsCount: number;
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
  const { teamId, page = 1, pageSize = 20, search, pillars, categories, methods, tags } = params;

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

  if (categories && categories.length > 0) {
    queryParams.append('categories', categories.join(','));
  }

  if (methods && methods.length > 0) {
    queryParams.append('methods', methods.join(','));
  }

  if (tags && tags.length > 0) {
    queryParams.append('tags', tags.join(','));
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
 * Fetch all distinct method values for practices available to a team
 * @param teamId - Team identifier
 * @returns Sorted array of unique method strings
 */
export const fetchAvailablePracticeMethods = async (teamId: number): Promise<string[]> => {
  const response = await apiClient<{ methods: string[] }>(
    `/api/v1/teams/${teamId}/practices/available/methods`
  );
  return response.methods;
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

/**
 * Get removal impact preview for a practice
 * Shows which pillars would be affected by removing this practice
 * @param teamId - Team identifier
 * @param practiceId - Practice identifier
 * @returns Impact preview with pillar information
 */
export const fetchPracticeRemovalImpact = async (
  teamId: number,
  practiceId: number
): Promise<PracticeRemovalImpact> => {
  return apiClient<PracticeRemovalImpact>(
    `/api/v1/teams/${teamId}/practices/${practiceId}/removal-impact`
  );
};

/**
 * Create a custom practice for a team
 * @param teamId - Team identifier
 * @param payload - Practice data
 * @returns Created practice ID and updated coverage
 */
export const createCustomPractice = async (
  teamId: number,
  payload: CreateCustomPracticePayload
): Promise<CreateCustomPracticeResponse> => {
  return apiClient<CreateCustomPracticeResponse>(
    `/api/v1/teams/${teamId}/practices/custom`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
};

/**
 * Edit a practice (global or team-specific)
 * @param teamId - Team identifier
 * @param practiceId - Practice identifier
 * @param payload - Edit payload
 */
export const editPracticeForTeam = async (
  teamId: number,
  practiceId: number,
  payload: EditPracticePayload
): Promise<EditPracticeResponse> => {
  return apiClient<EditPracticeResponse>(
    `/api/v1/teams/${teamId}/practices/${practiceId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  )
}
