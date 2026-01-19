import * as teamsRepository from '../repositories/teams.repository';
import type { TeamWithStats, TeamPracticeWithPillars } from '../repositories/teams.repository';
import { prisma } from '../lib/prisma';
import { AppError } from './auth.service';

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

/**
 * Create a new team with selected practices
 * Creator is automatically added as team owner
 * All operations are wrapped in a transaction for atomicity
 * 
 * @param userId - Creator's user ID from JWT
 * @param name - Team name (3-100 chars, alphanumeric + spaces/hyphens)
 * @param practiceIds - Array of practice IDs to associate with team
 * @returns Team DTO with stats and coverage
 * @throws AppError if name already exists (409) or practice IDs invalid (400)
 */
export const createTeam = async (
  userId: number,
  name: string,
  practiceIds: number[]
): Promise<TeamDto> => {
  // Step 1: Validate team name uniqueness
  const existingTeam = await prisma.team.findFirst({ where: { name } });
  if (existingTeam) {
    throw new AppError(
      'duplicate_team_name',
      'Team name already exists',
      { name },
      409
    );
  }

  // Step 2: Validate practice IDs exist
  const practices = await prisma.practice.findMany({
    where: { id: { in: practiceIds } }
  });
  if (practices.length !== practiceIds.length) {
    const validIds = practices.map(p => p.id);
    const invalidIds = practiceIds.filter(id => !validIds.includes(id));
    throw new AppError(
      'invalid_practice_ids',
      'Some practice IDs do not exist',
      { invalid: invalidIds },
      400
    );
  }

  // Step 3: Transaction - Create team + add creator as owner + add practices + log event
  const team = await prisma.$transaction(async (tx) => {
    // 3a. Create team
    const newTeam = await tx.team.create({
      data: { name }
    });

    // 3b. Add creator as team owner
    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
        role: 'owner'
      }
    });

    // 3c. Add selected practices to team
    await tx.teamPractice.createMany({
      data: practiceIds.map(practiceId => ({
        teamId: newTeam.id,
        practiceId
      }))
    });

    // 3d. Log team creation event
    await tx.event.create({
      data: {
        eventType: 'team.created',
        actorId: userId,
        teamId: newTeam.id,
        entityType: 'team',
        entityId: newTeam.id,
        action: 'created',
        payload: {
          teamName: name,
          practiceCount: practiceIds.length,
          creatorId: userId
        },
        createdAt: new Date()
      }
    });

    return newTeam;
  });

  // Step 4: Calculate initial coverage
  const coverage = await calculateTeamCoverage(team.id);

  // Step 5: Return team with stats
  return {
    id: team.id,
    name: team.name,
    memberCount: 1, // Creator is first member
    practiceCount: practiceIds.length,
    coverage,
    role: 'owner',
    createdAt: team.createdAt.toISOString()
  };
};

