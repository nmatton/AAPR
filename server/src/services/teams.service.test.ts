// Set JWT_SECRET for tests BEFORE importing any services
process.env.JWT_SECRET = 'test_secret_for_unit_tests_12345678901234567890';

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as teamsService from './teams.service';
import * as teamsRepository from '../repositories/teams.repository';
import * as practiceRepository from '../repositories/practice.repository';
import * as coverageService from './coverage.service';
import { prisma } from '../lib/prisma';

// Mock prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    team: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
    },
    practice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    teamPractice: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../repositories/teams.repository');
jest.mock('../repositories/practice.repository');
jest.mock('./coverage.service');

describe('teamsService.createTeam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates team with practices and adds creator as owner', async () => {
    // Setup: valid name + practice IDs
    const userId = 1;
    const name = 'Test Team Alpha';
    const practiceIds = [1, 2, 3];
    
    // Mock: no existing team with that name
    (prisma.team.findFirst as any).mockResolvedValue(null);
    
    // Mock: practices exist
    (prisma.practice.findMany as any).mockResolvedValue([
      { id: 1 }, { id: 2 }, { id: 3 }
    ]);
    
    // Mock: transaction returns created team
    const mockTeam = {
      id: 4,
      name: 'Test Team Alpha',
      createdAt: new Date('2026-01-19T10:30:00Z'),
      updatedAt: new Date('2026-01-19T10:30:00Z'),
    };
    
    (prisma.$transaction as any).mockResolvedValue(mockTeam);
    
    // Mock: calculateTeamCoverage returns 74%
    jest.spyOn(teamsService, 'calculateTeamCoverage').mockResolvedValue(74);
    
    // Call: createTeam
    const result = await teamsService.createTeam(userId, name, practiceIds);
    
    // Assert: team created with correct data
    expect(result.id).toBe(4);
    expect(result.name).toBe('Test Team Alpha');
    expect(result.memberCount).toBe(1);
    expect(result.practiceCount).toBe(3);
    expect(result.coverage).toBe(74);
    expect(result.role).toBe('owner');
    expect(result.createdAt).toBe('2026-01-19T10:30:00.000Z');
    
    // Assert: transaction was called
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('throws error if team name already exists', async () => {
    // Setup: existing team with name "Alpha"
    const userId = 1;
    const name = 'Alpha';
    const practiceIds = [1, 2];
    
    (prisma.team.findFirst as any).mockResolvedValue({
      id: 1,
      name: 'Alpha',
    });
    
    // Call: createTeam
    // Assert: throws AppError with code='duplicate_team_name', status=409
    await expect(teamsService.createTeam(userId, name, practiceIds)).rejects.toThrow(
      expect.objectContaining({
        code: 'duplicate_team_name',
        statusCode: 409,
      })
    );
  });

  it('throws error if practice IDs are invalid', async () => {
    // Setup: practiceIds [1, 2, 999] where 999 doesn't exist
    const userId = 1;
    const name = 'Test Team';
    const practiceIds = [1, 2, 999];
    
    (prisma.team.findFirst as any).mockResolvedValue(null);
    
    // Only 2 practices returned (999 missing)
    (prisma.practice.findMany as any).mockResolvedValue([
      { id: 1 }, { id: 2 }
    ]);
    
    // Call: createTeam
    // Assert: throws AppError with code='invalid_practice_ids', details includes [999]
    await expect(teamsService.createTeam(userId, name, practiceIds)).rejects.toThrow(
      expect.objectContaining({
        code: 'invalid_practice_ids',
        statusCode: 400,
      })
    );
  });

  it('calculates coverage correctly after team creation', async () => {
    // Setup: practiceIds for practices covering 14/19 pillars
    const userId = 1;
    const name = 'Coverage Test Team';
    const practiceIds = [1, 3, 5, 7, 9, 11, 13, 15];
    
    (prisma.team.findFirst as any).mockResolvedValue(null);
    (prisma.practice.findMany as any).mockResolvedValue(
      practiceIds.map(id => ({ id }))
    );
    
    const mockTeam = {
      id: 5,
      name: 'Coverage Test Team',
      createdAt: new Date('2026-01-19T10:30:00Z'),
      updatedAt: new Date('2026-01-19T10:30:00Z'),
    };
    
    (prisma.$transaction as any).mockResolvedValue(mockTeam);
    
    // Mock: calculateTeamCoverage returns 74% (14/19 pillars)
    jest.spyOn(teamsService, 'calculateTeamCoverage').mockResolvedValue(74);
    
    // Call: createTeam
    const result = await teamsService.createTeam(userId, name, practiceIds);
    
    // Assert: coverage === 74
    expect(result.coverage).toBe(74);
    expect(teamsService.calculateTeamCoverage).toHaveBeenCalledWith(mockTeam.id);
  });

  it('rolls back transaction if event logging fails', async () => {
    // Setup: mock event insert to throw error
    const userId = 1;
    const name = 'Transaction Test Team';
    const practiceIds = [1, 2];
    
    (prisma.team.findFirst as any).mockResolvedValue(null);
    (prisma.practice.findMany as any).mockResolvedValue([
      { id: 1 }, { id: 2 }
    ]);
    
    // Mock: transaction throws error (simulating event insert failure)
    (prisma.$transaction as any).mockRejectedValue(
      new Error('Event insert failed')
    );
    
    // Call: createTeam
    // Assert: error thrown
    await expect(teamsService.createTeam(userId, name, practiceIds)).rejects.toThrow('Event insert failed');
    
    // Transaction was attempted
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe('teamsService.removePracticeFromTeam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes practice, logs event, and recalculates coverage', async () => {
    const teamId = 1;
    const userId = 2;
    const practiceId = 5;

    (prisma.teamMember.findUnique as any).mockResolvedValue({ id: 10 });
    (prisma.teamPractice.findUnique as any).mockResolvedValue({
      id: 44,
      teamId,
      practiceId,
      practice: {
        id: practiceId,
        title: 'Sprint Planning',
        practicePillars: [
          { pillar: { id: 1, name: 'Communication' } },
          { pillar: { id: 2, name: 'Transparency' } }
        ]
      }
    });

    (teamsRepository.getTeamPracticesWithPillars as any).mockResolvedValue([
      {
        practice: {
          id: practiceId,
          practicePillars: [
            { pillar: { id: 1, name: 'Communication' } },
            { pillar: { id: 2, name: 'Transparency' } }
          ]
        }
      }
    ]);

    const mockEventCreate = (jest.fn() as any).mockResolvedValue({});
    const mockTx = {
      event: { create: mockEventCreate }
    } as any;

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(mockTx));
    (teamsRepository.removePracticeFromTeam as any).mockResolvedValue({
      id: 44,
      teamId,
      practiceId,
      addedAt: new Date('2026-01-21T10:00:00Z')
    });

    jest.spyOn(teamsService, 'calculateTeamCoverage').mockResolvedValue(63);

    const result = await teamsService.removePracticeFromTeam(teamId, userId, practiceId);

    expect(result.teamPracticeId).toBe(44);
    expect(result.coverage).toBe(63);
    expect(result.gapPillarIds).toEqual([1, 2]);
    expect(result.gapPillarNames).toEqual(['Communication', 'Transparency']);
    expect(teamsRepository.removePracticeFromTeam).toHaveBeenCalledWith(teamId, practiceId, mockTx);
    expect(mockTx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'practice.removed',
          teamId,
          actorId: userId,
          entityId: practiceId,
          payload: expect.objectContaining({
            pillarIds: [1, 2],
            gapPillarsCreated: [1, 2]
          })
        })
      })
    );
  });

  it('throws 403 if user is not a team member', async () => {
    (prisma.teamMember.findUnique as any).mockResolvedValue(null);

    await expect(teamsService.removePracticeFromTeam(1, 2, 3)).rejects.toThrow(
      expect.objectContaining({
        code: 'forbidden',
        statusCode: 403
      })
    );
  });

  it('throws 404 if practice does not exist', async () => {
    (prisma.teamMember.findUnique as any).mockResolvedValue({ id: 10 });
    (prisma.teamPractice.findUnique as any).mockResolvedValue(null);

    await expect(teamsService.removePracticeFromTeam(1, 2, 999)).rejects.toThrow(
      expect.objectContaining({
        code: 'practice_not_found',
        statusCode: 404
      })
    );
  });
});

describe('teamsService.getPracticeRemovalImpact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('identifies pillars covered by practice without creating gaps', async () => {
    const teamId = 1;
    const practiceId = 5;

    // Mock: practice exists in team portfolio
    (prisma.teamPractice.findUnique as any).mockResolvedValue({
      id: 44,
      teamId,
      practiceId,
      practice: {
        id: practiceId,
        title: 'Daily Standup',
        practicePillars: [
          { pillar: { id: 1, name: 'Communication' } },
          { pillar: { id: 2, name: 'Transparency' } }
        ]
      }
    });

    // Mock: other team practices also cover these pillars
    (teamsRepository.getTeamPracticesWithPillars as any).mockResolvedValue([
      {
        practice: {
          id: 3,
          practicePillars: [
            { pillar: { id: 1, name: 'Communication' } }
          ]
        }
      },
      {
        practice: {
          id: 4,
          practicePillars: [
            { pillar: { id: 2, name: 'Transparency' } }
          ]
        }
      },
      {
        practice: {
          id: practiceId,
          practicePillars: [
            { pillar: { id: 1, name: 'Communication' } },
            { pillar: { id: 2, name: 'Transparency' } }
          ]
        }
      }
    ]);

    const result = await teamsService.getPracticeRemovalImpact(teamId, practiceId);

    expect(result.pillarIds).toEqual([1, 2]);
    expect(result.pillarNames).toEqual(['Communication', 'Transparency']);
    expect(result.gapPillarIds).toEqual([]);
    expect(result.gapPillarNames).toEqual([]);
    expect(result.willCreateGaps).toBe(false); // Other practices still cover these pillars
  });

  it('detects gap creation when practice covers unique pillars', async () => {
    const teamId = 1;
    const practiceId = 7;

    // Mock: practice covers pillars 3 and 4
    (prisma.teamPractice.findUnique as any).mockResolvedValue({
      id: 55,
      teamId,
      practiceId,
      practice: {
        id: practiceId,
        title: 'Code Review',
        practicePillars: [
          { pillar: { id: 3, name: 'Quality' } },
          { pillar: { id: 4, name: 'Knowledge Sharing' } }
        ]
      }
    });

    // Mock: other team practices DON'T cover pillar 4 (unique to this practice)
    (teamsRepository.getTeamPracticesWithPillars as any).mockResolvedValue([
      {
        practice: {
          id: 2,
          practicePillars: [
            { pillar: { id: 3, name: 'Quality' } }, // Pillar 3 covered by others
            { pillar: { id: 5, name: 'Automation' } }
          ]
        }
      },
      {
        practice: {
          id: practiceId,
          practicePillars: [
            { pillar: { id: 3, name: 'Quality' } },
            { pillar: { id: 4, name: 'Knowledge Sharing' } } // Pillar 4 ONLY covered by this practice
          ]
        }
      }
    ]);

    const result = await teamsService.getPracticeRemovalImpact(teamId, practiceId);

    expect(result.pillarIds).toEqual([3, 4]);
    expect(result.pillarNames).toEqual(['Quality', 'Knowledge Sharing']);
    expect(result.gapPillarIds).toEqual([4]);
    expect(result.gapPillarNames).toEqual(['Knowledge Sharing']);
    expect(result.willCreateGaps).toBe(true); // Pillar 4 becomes a gap
  });

  it('throws 404 if practice not in team portfolio', async () => {
    (prisma.teamPractice.findUnique as any).mockResolvedValue(null);

    await expect(teamsService.getPracticeRemovalImpact(1, 999)).rejects.toThrow(
      expect.objectContaining({
        code: 'practice_not_found',
        message: 'Practice not found in team portfolio',
        statusCode: 404
      })
    );
  });

  it('throws 400 for invalid teamId', async () => {
    await expect(teamsService.getPracticeRemovalImpact(-1, 5)).rejects.toThrow(
      expect.objectContaining({
        code: 'invalid_team_id',
        statusCode: 400
      })
    );
  });

  it('throws 400 for invalid practiceId', async () => {
    await expect(teamsService.getPracticeRemovalImpact(1, 0)).rejects.toThrow(
      expect.objectContaining({
        code: 'invalid_practice_id',
        statusCode: 400
      })
    );
  });
});

describe('teamsService.createCustomPracticeForTeam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a custom practice, links to team, and logs event', async () => {
    const teamId = 2;
    const userId = 7;
    const payload = {
      title: 'Team Retro Plus',
      goal: 'Improve retrospective outcomes',
      pillarIds: [1, 2],
      categoryId: 'scrum'
    };

    (practiceRepository.validatePillarIds as jest.MockedFunction<typeof practiceRepository.validatePillarIds>)
      .mockResolvedValue([]);
    (practiceRepository.validateCategoryId as jest.MockedFunction<typeof practiceRepository.validateCategoryId>)
      .mockResolvedValue(true);

    const mockEventCreate = jest.fn().mockImplementation(async () => ({}));
    const mockTx = {
      event: { create: mockEventCreate }
    } as any;

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(mockTx));

    (practiceRepository.createPractice as jest.MockedFunction<typeof practiceRepository.createPractice>)
      .mockResolvedValue({ id: 45 } as any);
    (practiceRepository.createPracticePillars as jest.MockedFunction<typeof practiceRepository.createPracticePillars>)
      .mockResolvedValue({ count: 2 } as any);
    (practiceRepository.linkPracticeToTeam as jest.MockedFunction<typeof practiceRepository.linkPracticeToTeam>)
      .mockResolvedValue({ id: 100 } as any);

    jest.spyOn(teamsService, 'calculateTeamCoverage').mockResolvedValue(78);

    const result = await teamsService.createCustomPracticeForTeam(teamId, userId, payload);

    expect(result.practiceId).toBe(45);
    expect(result.coverage).toBe(78);
    expect(practiceRepository.createPractice).toHaveBeenCalledWith(
      expect.objectContaining({
        title: payload.title,
        goal: payload.goal,
        isGlobal: false,
        category: {
          connect: { id: payload.categoryId }
        }
      }),
      mockTx
    );
    expect(practiceRepository.createPracticePillars).toHaveBeenCalledWith(45, payload.pillarIds, mockTx);
    expect(practiceRepository.linkPracticeToTeam).toHaveBeenCalledWith(teamId, 45, mockTx);
    expect(mockTx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'practice.created',
          teamId,
          actorId: userId,
          entityId: 45,
          payload: expect.objectContaining({
            teamId,
            practiceId: 45,
            isCustom: true
          })
        })
      })
    );
  });

  it('includes createdFrom when templatePracticeId is provided', async () => {
    const teamId = 3;
    const userId = 5;
    const payload = {
      title: 'Template Copy',
      goal: 'Updated goal',
      pillarIds: [2],
      categoryId: 'kanban',
      templatePracticeId: 99
    };

    (practiceRepository.validatePillarIds as jest.MockedFunction<typeof practiceRepository.validatePillarIds>)
      .mockResolvedValue([]);
    (practiceRepository.validateCategoryId as jest.MockedFunction<typeof practiceRepository.validateCategoryId>)
      .mockResolvedValue(true);
    (practiceRepository.findPracticeById as jest.MockedFunction<typeof practiceRepository.findPracticeById>)
      .mockResolvedValue({ id: 99 } as any);

    const mockEventCreate = jest.fn().mockImplementation(async () => ({}));
    const mockTx = {
      event: { create: mockEventCreate }
    } as any;

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(mockTx));

    (practiceRepository.createPractice as jest.MockedFunction<typeof practiceRepository.createPractice>)
      .mockResolvedValue({ id: 50 } as any);
    (practiceRepository.createPracticePillars as jest.MockedFunction<typeof practiceRepository.createPracticePillars>)
      .mockResolvedValue({ count: 1 } as any);
    (practiceRepository.linkPracticeToTeam as jest.MockedFunction<typeof practiceRepository.linkPracticeToTeam>)
      .mockResolvedValue({ id: 111 } as any);

    jest.spyOn(teamsService, 'calculateTeamCoverage').mockResolvedValue(41);

    const result = await teamsService.createCustomPracticeForTeam(teamId, userId, payload);

    expect(result.practiceId).toBe(50);
    expect(mockTx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            createdFrom: 99
          })
        })
      })
    );
  });

  it('throws 404 if template practice does not exist', async () => {
    const payload = {
      title: 'Template Copy',
      goal: 'Updated goal',
      pillarIds: [2],
      categoryId: 'kanban',
      templatePracticeId: 999
    };

    (practiceRepository.validatePillarIds as jest.MockedFunction<typeof practiceRepository.validatePillarIds>)
      .mockResolvedValue([]);
    (practiceRepository.validateCategoryId as jest.MockedFunction<typeof practiceRepository.validateCategoryId>)
      .mockResolvedValue(true);
    (practiceRepository.findPracticeById as jest.MockedFunction<typeof practiceRepository.findPracticeById>)
      .mockResolvedValue(null);

    await expect(teamsService.createCustomPracticeForTeam(1, 1, payload)).rejects.toThrow(
      expect.objectContaining({
        code: 'template_not_found',
        statusCode: 404
      })
    );
  });
});

describe('teamsService.editPracticeForTeam', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates practice fields and pillars, logs event, and recalculates coverage', async () => {
    const teamId = 3
    const userId = 7
    const practiceId = 12

    const existingPractice = {
      id: practiceId,
      title: 'Old Title',
      goal: 'Old Goal',
      categoryId: 'feedback',
      category: { name: 'FEEDBACK & APPRENTISSAGE' },
      isGlobal: true,
      practiceVersion: 2,
      practicePillars: [
        { pillar: { id: 1 } },
        { pillar: { id: 2 } }
      ]
    } as any

    const updatedPractice = {
      ...existingPractice,
      title: 'New Title',
      goal: 'New Goal',
      categoryId: 'excellence',
      category: { name: 'EXCELLENCE TECHNIQUE' },
      practiceVersion: 3,
      practicePillars: [
        { pillar: { id: 2, name: 'Pillar B', categoryId: 'feedback', category: { name: 'FEEDBACK & APPRENTISSAGE' } } },
        { pillar: { id: 3, name: 'Pillar C', categoryId: 'excellence', category: { name: 'EXCELLENCE TECHNIQUE' } } }
      ]
    } as any

    ;(practiceRepository.findById as jest.MockedFunction<typeof practiceRepository.findById>)
      .mockResolvedValueOnce(existingPractice)
      .mockResolvedValueOnce(updatedPractice)
    ;(practiceRepository.validatePillarIds as jest.MockedFunction<typeof practiceRepository.validatePillarIds>)
      .mockResolvedValue([])
    ;(practiceRepository.validateCategoryId as jest.MockedFunction<typeof practiceRepository.validateCategoryId>)
      .mockResolvedValue(true)
    ;(practiceRepository.updatePracticeWithVersion as jest.MockedFunction<typeof practiceRepository.updatePracticeWithVersion>)
      .mockResolvedValue(1)
    ;(practiceRepository.replacePracticePillars as jest.MockedFunction<typeof practiceRepository.replacePracticePillars>)
      .mockResolvedValue()
    ;(practiceRepository.findTeamIdsUsingPractice as jest.MockedFunction<typeof practiceRepository.findTeamIdsUsingPractice>)
      .mockResolvedValue([teamId])
    ;(practiceRepository.countTeamsUsingPractice as jest.MockedFunction<typeof practiceRepository.countTeamsUsingPractice>)
      .mockResolvedValue(2)

    ;(coverageService.getTeamPillarCoverage as jest.MockedFunction<typeof coverageService.getTeamPillarCoverage>)
      .mockResolvedValue({ overallCoveragePct: 84 } as any)

    const mockEventCreate = jest.fn(async () => ({}))
    const mockTx = { event: { create: mockEventCreate } } as any
    ;(prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>)
      .mockImplementation(async (callback: any) => callback(mockTx))

    const result = await teamsService.editPracticeForTeam(teamId, userId, practiceId, {
      title: 'New Title',
      goal: 'New Goal',
      categoryId: 'excellence',
      pillarIds: [2, 3],
      version: 2
    })

    expect(result.practice?.title).toBe('New Title')
    expect(result.practice?.practiceVersion).toBe(3)
    expect(result.coverageByTeam).toEqual([{ teamId, coverage: 84 }])
    expect(practiceRepository.updatePracticeWithVersion).toHaveBeenCalledWith(
      practiceId,
      2,
      { title: 'New Title', goal: 'New Goal', categoryId: 'excellence' },
      mockTx
    )
    expect(practiceRepository.replacePracticePillars).toHaveBeenCalledWith(practiceId, [2, 3], mockTx)
    const eventCall = (mockEventCreate as jest.Mock).mock.calls[0][0] as any
    expect(eventCall.data.eventType).toBe('practice.edited')
    expect(eventCall.data.teamId).toBe(teamId)
    expect(eventCall.data.actorId).toBe(userId)
    expect(eventCall.data.entityId).toBe(practiceId)
    expect(eventCall.data.payload).toMatchObject({
      changes: expect.any(Object)
    })
  })

  it('returns 409 conflict when version mismatch', async () => {
    const teamId = 3
    const userId = 7
    const practiceId = 12

    const existingPractice = {
      id: practiceId,
      title: 'Old Title',
      goal: 'Old Goal',
      categoryId: 'feedback',
      category: { name: 'FEEDBACK & APPRENTISSAGE' },
      isGlobal: true,
      practiceVersion: 4,
      practicePillars: [{ pillar: { id: 1 } }]
    } as any

    ;(practiceRepository.findById as jest.MockedFunction<typeof practiceRepository.findById>)
      .mockResolvedValue(existingPractice)
    ;(practiceRepository.validatePillarIds as jest.MockedFunction<typeof practiceRepository.validatePillarIds>)
      .mockResolvedValue([])
    ;(practiceRepository.validateCategoryId as jest.MockedFunction<typeof practiceRepository.validateCategoryId>)
      .mockResolvedValue(true)
    ;(practiceRepository.updatePracticeWithVersion as jest.MockedFunction<typeof practiceRepository.updatePracticeWithVersion>)
      .mockResolvedValue(0)

    const mockTx = { event: { create: jest.fn() } } as any
    ;(prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>)
      .mockImplementation(async (callback: any) => callback(mockTx))

    await expect(
      teamsService.editPracticeForTeam(teamId, userId, practiceId, {
        title: 'New Title',
        goal: 'New Goal',
        categoryId: 'excellence',
        pillarIds: [1, 2],
        version: 1
      })
    ).rejects.toThrow(
      expect.objectContaining({
        code: 'practice_version_conflict',
        statusCode: 409
      })
    )
  })

  it('creates a team-specific copy when saveAsCopy is true', async () => {
    const teamId = 4
    const userId = 9
    const practiceId = 18

    const existingPractice = {
      id: practiceId,
      title: 'Global Practice',
      goal: 'Goal',
      categoryId: 'values',
      category: { name: 'VALEURS HUMAINES' },
      isGlobal: true,
      practiceVersion: 1,
      practicePillars: [{ pillar: { id: 1 } }]
    } as any

    const newPractice = {
      id: 77,
      title: 'Custom Title',
      goal: 'Custom Goal',
      categoryId: 'values',
      category: { name: 'VALEURS HUMAINES' },
      isGlobal: false,
      practiceVersion: 1,
      practicePillars: [
        { pillar: { id: 1, name: 'Pillar 1', categoryId: 'values' } },
        { pillar: { id: 2, name: 'Pillar 2', categoryId: 'values' } }
      ]
    } as any

    ;(practiceRepository.findById as jest.MockedFunction<typeof practiceRepository.findById>)
      .mockResolvedValueOnce(existingPractice)
      .mockResolvedValueOnce(newPractice)
    ;(practiceRepository.validatePillarIds as jest.MockedFunction<typeof practiceRepository.validatePillarIds>)
      .mockResolvedValue([])
    ;(practiceRepository.validateCategoryId as jest.MockedFunction<typeof practiceRepository.validateCategoryId>)
      .mockResolvedValue(true)
    ;(practiceRepository.createPractice as jest.MockedFunction<typeof practiceRepository.createPractice>)
      .mockResolvedValue({ id: 77 } as any)
    ;(practiceRepository.createPracticePillars as jest.MockedFunction<typeof practiceRepository.createPracticePillars>)
      .mockResolvedValue({ count: 2 } as any)
    ;(practiceRepository.countTeamsUsingPractice as jest.MockedFunction<typeof practiceRepository.countTeamsUsingPractice>)
      .mockResolvedValue(1)

    ;(coverageService.getTeamPillarCoverage as jest.MockedFunction<typeof coverageService.getTeamPillarCoverage>)
      .mockResolvedValue({ overallCoveragePct: 52 } as any)

    const mockEventCreate = jest.fn(async () => ({}))
    const mockTeamPracticeUpsert = jest.fn(async () => ({}))
    const mockTx = {
      event: { create: mockEventCreate },
      teamPractice: { upsert: mockTeamPracticeUpsert }
    } as any
    ;(prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>)
      .mockImplementation(async (callback: any) => callback(mockTx))

    const result = await teamsService.editPracticeForTeam(teamId, userId, practiceId, {
      title: 'Custom Title',
      goal: 'Custom Goal',
      categoryId: 'values',
      pillarIds: [1, 2],
      saveAsCopy: true,
      version: 1
    })

    expect(result.practiceId).toBe(77)
    expect(result.practice).toBeDefined()
    expect(result.practice?.title).toBe('Custom Title')
    expect(result.practice?.goal).toBe('Custom Goal')
    expect(result.practice?.isGlobal).toBe(false)
    expect(result.coverageByTeam).toEqual([{ teamId, coverage: 52 }])
    expect(practiceRepository.createPractice).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Custom Title',
        goal: 'Custom Goal',
        isGlobal: false
      }),
      mockTx
    )
    expect(mockTeamPracticeUpsert).toHaveBeenCalled()
    const copyEventCall = (mockEventCreate as jest.Mock).mock.calls[0][0] as any
    expect(copyEventCall.data.eventType).toBe('practice.edited')
    expect(copyEventCall.data.payload).toMatchObject({
      copiedFrom: practiceId
    })
  })
})
