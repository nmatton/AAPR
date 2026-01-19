import * as teamsRepository from '../repositories/teams.repository';
import type { TeamWithStats, TeamPracticeWithPillars } from '../repositories/teams.repository';

/**
 * Team information returned to client
 */
export interface TeamDto {
  id: number;
  name: string;
  memberCount: number;
  practiceCount: number;
  coverage: number;
  role: 'owner' | 'member';
  createdAt: string;
}

/**
 * Total number of agile pillars in the framework
 */
const TOTAL_PILLARS = 19;

/**
 * Calculate team's practice coverage percentage
 * Coverage = (unique pillars covered / 19 total pillars) * 100
 * 
 * @param teamId - Team identifier
 * @returns Coverage percentage (0-100)
 */
export const calculateTeamCoverage = async (teamId: number): Promise<number> => {
  const teamPractices = await teamsRepository.getTeamPracticesWithPillars(teamId);

  const uniquePillarIds = new Set<number>();
  teamPractices.forEach((tp: TeamPracticeWithPillars) => {
    tp.practice.practicePillars.forEach((pp) => {
      uniquePillarIds.add(pp.pillar.id);
    });
  });
  
  const coverage = Math.round((uniquePillarIds.size / TOTAL_PILLARS) * 100);
  return coverage;
};

/**
 * Get all teams for a user with stats and coverage
 * Teams are filtered by user membership only
 * 
 * @param userId - User identifier from JWT
 * @returns Array of teams with stats
 */
export const getUserTeams = async (userId: number): Promise<TeamDto[]> => {
  const teams = await teamsRepository.findTeamsByUserId(userId);
  
  // Calculate coverage for each team
  const teamsWithCoverage = teams.map((team: TeamWithStats) => {
    const uniquePillarIds = new Set<number>();
    team.teamPractices.forEach((tp) => {
      tp.practice.practicePillars.forEach((pp) => {
        uniquePillarIds.add(pp.pillar.id);
      });
    });

    const coverage = Math.round((uniquePillarIds.size / TOTAL_PILLARS) * 100);

    return {
      id: team.id,
      name: team.name,
      memberCount: team._count.teamMembers,
      practiceCount: team._count.teamPractices,
      coverage,
      role: team.teamMembers[0].role as 'owner' | 'member',
      createdAt: team.createdAt.toISOString(),
    };
  });
  
  return teamsWithCoverage;
};
