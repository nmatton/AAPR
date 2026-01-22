import * as teamsRepository from '../repositories/teams.repository';
import * as practiceRepository from '../repositories/practice.repository';
import * as coverageService from './coverage.service';
import type { TeamWithStats, TeamPracticeWithPillars } from '../repositories/teams.repository';
import { prisma } from '../lib/prisma';
import { AppError } from './auth.service';
import type { PracticeDto } from './practices.service';
import { Prisma } from '@prisma/client';

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
      isGlobal: practice.isGlobal,
      practiceVersion: practice.practiceVersion,
      usedByTeamsCount: practice._count?.teamPractices ?? 0,
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
    isGlobal: tp.practice.isGlobal,
    practiceVersion: tp.practice.practiceVersion,
    usedByTeamsCount: tp.practice._count?.teamPractices ?? 0,
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
  gapPillarIds: number[];
  gapPillarNames: string[];
}

export interface CreateCustomPracticePayload {
  title: string;
  goal: string;
  pillarIds: number[];
  categoryId: string;
  templatePracticeId?: number;
}

export interface CreateCustomPracticeResult {
  practiceId: number;
  coverage: number;
}

export interface EditPracticePayload {
  title: string;
  goal: string;
  pillarIds: number[];
  categoryId: string;
  saveAsCopy?: boolean;
  version: number;
}

export interface EditPracticeResult {
  practice?: PracticeDto;
  practiceId?: number;
  coverageByTeam: Array<{ teamId: number; coverage: number }>;
  usedByTeamsCount: number;
}

/**
 * Impact preview for removing a practice
 */
export interface PracticeRemovalImpact {
  pillarIds: number[];
  pillarNames: string[];
  gapPillarIds: number[];
  gapPillarNames: string[];
  willCreateGaps: boolean;
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
 * Get removal impact preview for a practice
 * Shows which pillars would be affected and if gaps would be created
 * 
 * @param teamId - Team identifier
 * @param practiceId - Practice to remove
 * @returns Impact preview with pillar information
 * @throws AppError if practice not found in team (404) or invalid IDs (400)
 */
export const getPracticeRemovalImpact = async (
  teamId: number,
  practiceId: number
): Promise<PracticeRemovalImpact> => {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw new AppError(
      'invalid_team_id',
      'Valid team ID is required',
      { teamId },
      400
    );
  }

  if (!Number.isInteger(practiceId) || practiceId <= 0) {
    throw new AppError(
      'invalid_practice_id',
      'Valid practice ID is required',
      { practiceId },
      400
    );
  }

  // Step 1: Validate practice exists in team portfolio
  const teamPractice = await prisma.teamPractice.findUnique({
    where: {
      teamId_practiceId: {
        teamId,
        practiceId
      }
    },
    include: {
      practice: {
        include: {
          practicePillars: {
            include: {
              pillar: true
            }
          }
        }
      }
    }
  });

  if (!teamPractice) {
    throw new AppError(
      'practice_not_found',
      'Practice not found in team portfolio',
      { teamId, practiceId },
      404
    );
  }

  // Step 2: Get pillars covered by this practice
  const practicePillarIds = teamPractice.practice.practicePillars.map(pp => pp.pillar.id);
  const practicePillarNames = teamPractice.practice.practicePillars.map(pp => pp.pillar.name);

  // Step 3: Get all other team practices
  const otherTeamPractices = await teamsRepository.getTeamPracticesWithPillars(teamId);
  const otherPractices = otherTeamPractices.filter(tp => tp.practice.id !== practiceId);

  // Step 4: Find pillars that would become gaps
  const otherPillarIds = new Set<number>();
  otherPractices.forEach(tp => {
    tp.practice.practicePillars.forEach(pp => {
      otherPillarIds.add(pp.pillar.id);
    });
  });

  // Pillars that are covered by this practice but NOT by any other practice
  const gapPillarIds = practicePillarIds.filter(id => !otherPillarIds.has(id));
  const gapPillarNames = teamPractice.practice.practicePillars
    .filter(pp => gapPillarIds.includes(pp.pillar.id))
    .map(pp => pp.pillar.name);
  const willCreateGaps = gapPillarIds.length > 0;

  return {
    pillarIds: practicePillarIds,
    pillarNames: practicePillarNames,
    gapPillarIds,
    gapPillarNames,
    willCreateGaps
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

  // Validate practice exists in team portfolio and load pillar data
  const teamPractice = await prisma.teamPractice.findUnique({
    where: {
      teamId_practiceId: {
        teamId,
        practiceId
      }
    },
    include: {
      practice: {
        include: {
          practicePillars: {
            include: {
              pillar: true
            }
          }
        }
      }
    }
  });

  if (!teamPractice) {
    throw new AppError(
      'practice_not_found',
      'Practice not found',
      { teamId, practiceId },
      404
    );
  }

  const practicePillarIds = teamPractice.practice.practicePillars.map(pp => pp.pillar.id);

  const otherTeamPractices = await teamsRepository.getTeamPracticesWithPillars(teamId);
  const otherPractices = otherTeamPractices.filter(tp => tp.practice.id !== practiceId);

  const otherPillarIds = new Set<number>();
  otherPractices.forEach(tp => {
    tp.practice.practicePillars.forEach(pp => {
      otherPillarIds.add(pp.pillar.id);
    });
  });

  const gapPillarIds = practicePillarIds.filter(id => !otherPillarIds.has(id));
  const gapPillarNames = teamPractice.practice.practicePillars
    .filter(pp => gapPillarIds.includes(pp.pillar.id))
    .map(pp => pp.pillar.name);

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
          pillarIds: practicePillarIds,
          gapPillarsCreated: gapPillarIds,
          practiceTitle: teamPractice.practice.title
        },
        createdAt: new Date()
      }
    });

    return deleted;
  });

  const coverage = await calculateTeamCoverage(teamId);

  return {
    teamPracticeId: removed.id,
    coverage,
    gapPillarIds,
    gapPillarNames
  };
};

/**
 * Create a custom practice for a team (scratch or template)
 * Logs event transactionally and recalculates coverage
 * 
 * @param teamId - Team identifier
 * @param userId - User creating the practice
 * @param payload - Practice data
 * @returns Created practice ID and updated coverage
 */
export const createCustomPracticeForTeam = async (
  teamId: number,
  userId: number,
  payload: CreateCustomPracticePayload
): Promise<CreateCustomPracticeResult> => {
  const { title, goal, pillarIds, categoryId, templatePracticeId } = payload;

  // Validate pillar IDs exist
  const invalidPillars = await practiceRepository.validatePillarIds(pillarIds);
  if (invalidPillars.length > 0) {
    throw new AppError(
      'invalid_pillar_ids',
      'Some pillar IDs do not exist',
      { invalid: invalidPillars },
      400
    );
  }

  // Validate category exists
  const categoryExists = await practiceRepository.validateCategoryId(categoryId);
  if (!categoryExists) {
    throw new AppError(
      'invalid_category_id',
      'Category not found',
      { categoryId },
      400
    );
  }

  // Validate template practice if provided
  if (templatePracticeId) {
    const template = await practiceRepository.findPracticeById(templatePracticeId);
    if (!template) {
      throw new AppError(
        'template_not_found',
        'Template practice not found',
        { templatePracticeId },
        404
      );
    }
  }

  try {
    const createdPractice = await prisma.$transaction(async (tx) => {
      const practice = await practiceRepository.createPractice(
        {
          title,
          goal,
          isGlobal: false,
          category: {
            connect: { id: categoryId }
          }
        },
        tx
      );

      await practiceRepository.createPracticePillars(practice.id, pillarIds, tx);
      await practiceRepository.linkPracticeToTeam(teamId, practice.id, tx);

      await tx.event.create({
        data: {
          eventType: 'practice.created',
          actorId: userId,
          teamId,
          entityType: 'practice',
          entityId: practice.id,
          action: 'created',
          payload: {
            teamId,
            practiceId: practice.id,
            isCustom: true,
            ...(templatePracticeId ? { createdFrom: templatePracticeId } : {})
          },
          createdAt: new Date()
        }
      });

      return practice;
    });

    const coverage = await calculateTeamCoverage(teamId);

    return {
      practiceId: createdPractice.id,
      coverage
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Verify it's the title+category unique constraint
      const target = error.meta?.target as string[] | undefined;
      if (target && (target.includes('title') || target.includes('categoryId'))) {
        throw new AppError(
          'duplicate_practice_title',
          'Practice title already exists in this category',
          { title, categoryId },
          409
        );
      }
      // Re-throw if it's a different unique constraint
      throw error;
    }
    throw error;
  }
};

const buildPracticeChangeSet = (current: {
  title: string;
  goal: string;
  categoryId: string;
  pillarIds: number[];
}, next: {
  title: string;
  goal: string;
  categoryId: string;
  pillarIds: number[];
}): Record<string, { from: Prisma.InputJsonValue; to: Prisma.InputJsonValue }> => {
  const changes: Record<string, { from: Prisma.InputJsonValue; to: Prisma.InputJsonValue }> = {}

  if (current.title !== next.title) {
    changes.title = { from: current.title, to: next.title }
  }

  if (current.goal !== next.goal) {
    changes.goal = { from: current.goal, to: next.goal }
  }

  if (current.categoryId !== next.categoryId) {
    changes.categoryId = { from: current.categoryId, to: next.categoryId }
  }

  const currentPillars = [...current.pillarIds].sort((a, b) => a - b)
  const nextPillars = [...next.pillarIds].sort((a, b) => a - b)
  if (currentPillars.join(',') !== nextPillars.join(',')) {
    changes.pillarIds = { from: currentPillars, to: nextPillars }
  }

  return changes
}

export const editPracticeForTeam = async (
  teamId: number,
  userId: number,
  practiceId: number,
  payload: EditPracticePayload
): Promise<EditPracticeResult> => {
  const { title, goal, pillarIds, categoryId, saveAsCopy = false, version } = payload

  const existingPractice = await practiceRepository.findById(practiceId)
  if (!existingPractice) {
    throw new AppError(
      'practice_not_found',
      'Practice not found',
      { practiceId },
      404
    )
  }

  if (!existingPractice.isGlobal) {
    const teamPractice = await prisma.teamPractice.findUnique({
      where: {
        teamId_practiceId: {
          teamId,
          practiceId
        }
      }
    })
    if (!teamPractice) {
      throw new AppError(
        'practice_not_found',
        'Practice not found in team portfolio',
        { teamId, practiceId },
        404
      )
    }
  }

  const invalidPillars = await practiceRepository.validatePillarIds(pillarIds)
  if (invalidPillars.length > 0) {
    throw new AppError(
      'invalid_pillar_ids',
      'Some pillar IDs do not exist',
      { invalid: invalidPillars },
      400
    )
  }

  const categoryExists = await practiceRepository.validateCategoryId(categoryId)
  if (!categoryExists) {
    throw new AppError(
      'invalid_category_id',
      'Category not found',
      { categoryId },
      400
    )
  }

  const currentPillarIds = existingPractice.practicePillars.map((pp) => pp.pillar.id)
  const changes = buildPracticeChangeSet(
    {
      title: existingPractice.title,
      goal: existingPractice.goal,
      categoryId: existingPractice.categoryId,
      pillarIds: currentPillarIds
    },
    {
      title,
      goal,
      categoryId,
      pillarIds
    }
  )

  if (saveAsCopy) {
    const createdPractice = await prisma.$transaction(async (tx) => {
      const newPractice = await practiceRepository.createPractice(
        {
          title,
          goal,
          description: existingPractice.description ?? undefined,
          category: { connect: { id: categoryId } },
          method: existingPractice.method ?? undefined,
          tags: existingPractice.tags ?? undefined,
          activities: existingPractice.activities ?? undefined,
          roles: existingPractice.roles ?? undefined,
          workProducts: existingPractice.workProducts ?? undefined,
          completionCriteria: existingPractice.completionCriteria ?? undefined,
          metrics: existingPractice.metrics ?? undefined,
          guidelines: existingPractice.guidelines ?? undefined,
          pitfalls: existingPractice.pitfalls ?? undefined,
          benefits: existingPractice.benefits ?? undefined,
          associatedPractices: existingPractice.associatedPractices ?? undefined,
          importedAt: existingPractice.importedAt ?? undefined,
          sourceFile: existingPractice.sourceFile ?? undefined,
          jsonChecksum: existingPractice.jsonChecksum ?? undefined,
          importedBy: existingPractice.importedBy ?? undefined,
          sourceGitSha: existingPractice.sourceGitSha ?? undefined,
          rawJson: existingPractice.rawJson ?? undefined,
          isGlobal: false
        },
        tx
      )

      await practiceRepository.createPracticePillars(newPractice.id, pillarIds, tx)
      await tx.teamPractice.upsert({
        where: {
          teamId_practiceId: {
            teamId,
            practiceId: newPractice.id
          }
        },
        update: {},
        create: {
          teamId,
          practiceId: newPractice.id
        }
      })

      const eventPayload: Prisma.InputJsonObject = {
        teamId,
        practiceId: newPractice.id,
        editedBy: userId,
        copiedFrom: existingPractice.id,
        changes,
        timestamp: new Date().toISOString()
      }

      await tx.event.create({
        data: {
          eventType: 'practice.edited',
          actorId: userId,
          teamId,
          entityType: 'practice',
          entityId: newPractice.id,
          action: 'edited',
          payload: eventPayload,
          createdAt: new Date()
        }
      })

      return newPractice
    })

    const coverage = await coverageService.getTeamPillarCoverage(teamId)
    const usedByTeamsCount = await practiceRepository.countTeamsUsingPractice(createdPractice.id)

    // Fetch full practice details to return consistent response structure
    const fullPractice = await practiceRepository.findById(createdPractice.id)
    if (!fullPractice) {
      throw new AppError(
        'practice_not_found',
        'Practice not found after creation',
        { practiceId: createdPractice.id },
        404
      )
    }

    return {
      practiceId: createdPractice.id,
      practice: {
        id: fullPractice.id,
        title: fullPractice.title,
        goal: fullPractice.goal,
        categoryId: fullPractice.categoryId,
        categoryName: fullPractice.category.name,
        isGlobal: fullPractice.isGlobal,
        practiceVersion: fullPractice.practiceVersion,
        usedByTeamsCount,
        pillars: fullPractice.practicePillars.map((pp) => ({
          id: pp.pillar.id,
          name: pp.pillar.name,
          category: pp.pillar.category?.name ?? pp.pillar.categoryId,
          description: pp.pillar.description ?? undefined
        }))
      },
      coverageByTeam: [{ teamId, coverage: coverage.overallCoveragePct }],
      usedByTeamsCount
    }
  }

  await prisma.$transaction(async (tx) => {
    const updatedCount = await practiceRepository.updatePracticeWithVersion(
      practiceId,
      version,
      { title, goal, categoryId },
      tx
    )

    if (updatedCount === 0) {
      throw new AppError(
        'practice_version_conflict',
        'Practice update conflict',
        { practiceId, expectedVersion: version, currentVersion: existingPractice.practiceVersion },
        409
      )
    }

    await practiceRepository.replacePracticePillars(practiceId, pillarIds, tx)

    const eventPayload: Prisma.InputJsonObject = {
      teamId,
      practiceId,
      editedBy: userId,
      changes,
      timestamp: new Date().toISOString()
    }

    await tx.event.create({
      data: {
        eventType: 'practice.edited',
        actorId: userId,
        teamId,
        entityType: 'practice',
        entityId: practiceId,
        action: 'edited',
        payload: eventPayload,
        createdAt: new Date()
      }
    })
  })

  const updatedPractice = await practiceRepository.findById(practiceId)
  if (!updatedPractice) {
    throw new AppError(
      'practice_not_found',
      'Practice not found after update',
      { practiceId },
      404
    )
  }

  const affectedTeamIds = await practiceRepository.findTeamIdsUsingPractice(practiceId)
  const coverageByTeam = await Promise.all(
    affectedTeamIds.map(async (affectedTeamId) => {
      try {
        const coverage = await coverageService.getTeamPillarCoverage(affectedTeamId)
        return { teamId: affectedTeamId, coverage: coverage.overallCoveragePct }
      } catch (error) {
        // Log error but don't fail the entire operation
        console.error(`Failed to calculate coverage for team ${affectedTeamId}:`, error)
        return { teamId: affectedTeamId, coverage: 0 }
      }
    })
  )

  const usedByTeamsCount = await practiceRepository.countTeamsUsingPractice(practiceId)

  return {
    practice: {
      id: updatedPractice.id,
      title: updatedPractice.title,
      goal: updatedPractice.goal,
      categoryId: updatedPractice.categoryId,
      categoryName: updatedPractice.category.name,
      isGlobal: updatedPractice.isGlobal,
      practiceVersion: updatedPractice.practiceVersion,
      usedByTeamsCount,
      pillars: updatedPractice.practicePillars.map((pp) => ({
        id: pp.pillar.id,
        name: pp.pillar.name,
        category: pp.pillar.category?.name ?? pp.pillar.categoryId,
        description: pp.pillar.description ?? undefined
      }))
    },
    coverageByTeam,
    usedByTeamsCount
  }
}

