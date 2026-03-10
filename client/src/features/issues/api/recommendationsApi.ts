import { apiClient } from '../../../lib/apiClient';

/** Shape of a single recommendation returned by the API */
export interface PracticeRecommendation {
  practiceId: number;
  title: string;
  goal: string;
  categoryId: string;
  tier: number;
  affinityScore: number;
  affinityDelta: number;
  reason: string;
}

/** Response wrapper from the recommendations endpoint */
interface RecommendationsResponse {
  items: PracticeRecommendation[];
  requestId?: string;
}

/**
 * Fetch up to 3 recommended alternative practices for a given practice
 * in a team's portfolio.
 *
 * GET /api/v1/teams/:teamId/practices/:practiceId/recommendations
 */
export const getRecommendations = async (
  teamId: number,
  practiceId: number
): Promise<PracticeRecommendation[]> => {
  const response = await apiClient<RecommendationsResponse>(
    `/api/v1/teams/${teamId}/practices/${practiceId}/recommendations`
  );
  return response.items;
};
