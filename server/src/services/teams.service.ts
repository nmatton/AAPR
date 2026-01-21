import * as teamsRepository from '../repositories/teams.repository';
import * as practiceRepository from '../repositories/practice.repository';
import type { TeamWithStats, TeamPracticeWithPillars } from '../repositories/teams.repository';
import { prisma } from '../lib/prisma';
import { AppError } from './auth.service';
import type { PracticeDto } from './practices.service';

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

/**
 * Practices response for available practices query
 */
export interface AvailablePracticesResponse {
  items: PracticeDto[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Query parameters for available practices
 */
export interface AvailablePracticesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  pillars?: number[];
}

/**
 * Get practices not yet selected by team (for Add Practices view)
 * Supports search and pillar filters (reusing practice catalog patterns)
 * 
 * @param teamId - Team identifier
 * @param params - Query parameters (pagination, search, pillars)
 * @returns Paginated list of available practices
 */
export const getAvailablePractices = async (
  teamId: number,
  params: AvailablePracticesParams
): Promise<AvailablePracticesResponse> => {
  const { page = 1, pageSize = 20, search, pillars } = params;
  const skip = (page - 1) * pageSize;

  // Validate team exists
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new AppError(
      'team_not_found',
      'Team not found',
      { teamId },
      404
    );
  }

  // Validate pillar IDs if provided
  if (pillars && pillars.length > 0) {
    const invalidIds = await practiceRepository.validatePillarIds(pillars);
    if (invalidIds.length > 0) {
      throw new AppError(
        'invalid_filter',
        'Invalid pillar IDs provided',
        { invalidIds },
        400
      );
    }
  }

  const [practices, total] = await Promise.all([
    practiceRepository.findAvailableForTeam(teamId, { search, pillars, skip, take: pageSize }),
    practiceRepository.countAvailableForTeam(teamId, { search, pillars })
  ]);

  return {
    items: practices.map((practice) => ({
      id: practice.id,
      title: practice.title,
      goal: practice.goal,
      categoryId: practice.categoryId,
      categoryName: practice.category.name,
      pillars: practice.practicePillars.map((pp) => ({
        id: pp.pillar.id,
        name: pp.pillar.name,
        category: pp.pillar.category?.name ?? pp.pillar.categoryId,
        description: pp.pillar.description ?? undefined
      }))
    })),
    page,
    pageSize,
    total
  };
};

/**
 * Get practices currently selected by a team
 * Used for team practice list and removal flow
 * 
 * @param teamId - Team identifier
 * @returns Array of practices in team portfolio
 */
export const getTeamPractices = async (teamId: number): Promise<PracticeDto[]> => {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw new AppError(
      'invalid_team_id',
      'Valid team ID is required',
      { teamId },
      400
    );
  }

  const teamPractices = await teamsRepository.getTeamPracticesWithPillars(teamId);

  return teamPractices.map((tp) => ({
    id: tp.practice.id,
    title: tp.practice.title,
    goal: tp.practice.goal,
    categoryId: tp.practice.categoryId,
    categoryName: tp.practice.category.name,
    pillars: tp.practice.practicePillars.map((pp) => ({
      id: pp.pillar.id,
      name: pp.pillar.name,
      category: pp.pillar.category?.name ?? pp.pillar.categoryId,
      description: pp.pillar.description ?? undefined
    }))
  }));
};

/**
 * Result of adding a practice to team
 */
export interface AddPracticeResult {
  teamPractice: {
    id: number;
    teamId: number;
    practiceId: number;
    addedAt: string;
  };
  coverage: number;
}

/**
 * Result of removing a practice from team
 */
export interface RemovePracticeResult {
  teamPracticeId: number;
  coverage: number;
}

/**
 * Add a practice to team portfolio
 * Logs event transactionally and recalculates coverage
 * 
 * @param teamId - Team identifier
 * @param userId - User adding the practice (for event logging)
 * @param practiceId - Practice to add
 * @returns Team practice and updated coverage
 * @throws AppError if practice doesn't exist (400) or already selected (409)
 */
export const addPracticeToTeam = async (
  teamId: number,
  userId: number,
  practiceId: number
): Promise<AddPracticeResult> => {
  // Step 1: Validate practice exists
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId }
  });
  
  if (!practice) {
    throw new AppError(
      'invalid_practice_id',
      'Practice does not exist',
      { practiceId },
      400
    );
  }

  // Step 2: Check if already selected
  const existing = await prisma.teamPractice.findUnique({
    where: {
      teamId_practiceId: {
        teamId,
        practiceId
      }
    }
  });

  if (existing) {
    throw new AppError(
      'duplicate_practice',
      'Practice already added to team',
      { practiceId },
      409
    );
  }

  // Step 3: Transaction - Add practice + log event
  const teamPractice = await prisma.$transaction(async (tx) => {
    // 3a. Add practice to team
    const tp = await tx.teamPractice.create({
      data: {
        teamId,
        practiceId
      }
    });

    // 3b. Log event
    await tx.event.create({
      data: {
        eventType: 'practice.added',
        actorId: userId,
        teamId,
        entityType: 'practice',
        entityId: practiceId,
        action: 'added',
        payload: {
          practiceId,
          practiceTitle: practice.title
        },
        createdAt: new Date()
      }
    });

    return tp;
  });

  // Step 4: Recalculate coverage
  const coverage = await calculateTeamCoverage(teamId);

  return {
    teamPractice: {
      id: teamPractice.id,
      teamId: teamPractice.teamId,
      practiceId: teamPractice.practiceId,
      addedAt: teamPractice.addedAt.toISOString()
    },
    coverage
  };
};

/**
 * Remove a practice from team portfolio
 * Logs event transactionally and recalculates coverage
 * 
 * @param teamId - Team identifier
 * @param userId - User removing the practice (for event logging)
 * @param practiceId - Practice to remove
 * @returns Removed team practice ID and updated coverage
 * @throws AppError if not a team member (403) or practice not found (404)
 */
export const removePracticeFromTeam = async (
  teamId: number,
  userId: number,
  practiceId: number
): Promise<RemovePracticeResult> => {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw new AppError(
      'invalid_team_id',
      'Valid team ID is required',
      { teamId },
      400
    );
  }

  // Validate team membership
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    }
  });

  if (!membership) {
    throw new AppError(
      'forbidden',
      'You do not have access to this team',
      { teamId, userId },
      403
    );
  }

  // Validate practice exists
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId }
  });

  if (!practice) {
    throw new AppError(
      'practice_not_found',
      'Practice not found',
      { practiceId },
      404
    );
  }

  // Validate practice is currently selected by team
  const existing = await prisma.teamPractice.findUnique({
    where: {
      teamId_practiceId: {
        teamId,
        practiceId
      }
    }
  });

  if (!existing) {
    throw new AppError(
      'practice_not_found',
      'Practice not found',
      { teamId, practiceId },
      404
    );
  }

  const removed = await prisma.$transaction(async (tx) => {
    const deleted = await teamsRepository.removePracticeFromTeam(teamId, practiceId, tx);

    await tx.event.create({
      data: {
        eventType: 'practice.removed',
        actorId: userId,
        teamId,
        entityType: 'practice',
        entityId: practiceId,
        action: 'removed',
        payload: {
          teamId,
          practiceId,
          practiceTitle: practice.title
        },
        createdAt: new Date()
      }
    });

    return deleted;
  });

  const coverage = await calculateTeamCoverage(teamId);

  return {
    teamPracticeId: removed.id,
    coverage
  };
};

