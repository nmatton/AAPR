/**
 * Team information
 */
export interface Team {
  id: number;
  name: string;
  memberCount: number;
  practiceCount: number;
  coverage: number; // 0-100
  role: 'owner' | 'member';
  createdAt: string; // ISO 8601
}

/**
 * API response for teams list
 */
export interface TeamsResponse {
  teams: Team[];
  requestId: string;
}
