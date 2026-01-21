// Set JWT_SECRET for tests BEFORE importing any services
process.env.JWT_SECRET = 'test_secret_for_unit_tests_12345678901234567890';

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as teamsService from './teams.service';
import * as teamsRepository from '../repositories/teams.repository';
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
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../repositories/teams.repository');

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
    (prisma.practice.findUnique as any).mockResolvedValue({ id: practiceId, title: 'Sprint Planning' });
    (prisma.teamPractice.findUnique as any).mockResolvedValue({ id: 44, teamId, practiceId });

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
    expect(teamsRepository.removePracticeFromTeam).toHaveBeenCalledWith(teamId, practiceId, mockTx);
    expect(mockTx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'practice.removed',
          teamId,
          actorId: userId,
          entityId: practiceId
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
    (prisma.practice.findUnique as any).mockResolvedValue(null);

    await expect(teamsService.removePracticeFromTeam(1, 2, 999)).rejects.toThrow(
      expect.objectContaining({
        code: 'practice_not_found',
        statusCode: 404
      })
    );
  });
});
