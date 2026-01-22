process.env.JWT_SECRET = 'test_secret_for_routes_12345678901234567890';

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../app';
import * as teamsService from '../services/teams.service';
import * as authService from '../services/auth.service';
import { AppError } from '../services/auth.service';
import { prisma } from '../lib/prisma';

jest.mock('../services/teams.service');
jest.mock('../services/auth.service', () => {
  const actual = jest.requireActual('../services/auth.service') as typeof import('../services/auth.service');
  return {
    ...actual,
    verifyToken: jest.fn()
  };
});

jest.mock('../lib/prisma', () => ({
  prisma: {
    teamMember: {
      findUnique: jest.fn()
    }
  }
}));

describe('teams routes - practices management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.verifyToken as jest.MockedFunction<typeof authService.verifyToken>).mockReturnValue({
      userId: 1,
      email: 'test@example.com'
    });
    (prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValue({
      id: 1,
      teamId: 1,
      userId: 1,
      role: 'member',
      joinedAt: new Date()
    });
  });

  describe('GET /api/v1/teams/:teamId/practices/available', () => {
    it('should return available practices for team', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            title: 'Sprint Planning',
            goal: 'Plan sprints effectively',
            categoryId: 'scrum',
            categoryName: 'Scrum',
            isGlobal: true,
            practiceVersion: 1,
            usedByTeamsCount: 2,
            pillars: []
          }
        ],
        page: 1,
        pageSize: 20,
        total: 1
      };

      (teamsService.getAvailablePractices as jest.MockedFunction<typeof teamsService.getAvailablePractices>)
        .mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/v1/teams/1/practices/available')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.requestId).toBeDefined();
    });

    it('should support search parameter', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0
      };

      (teamsService.getAvailablePractices as jest.MockedFunction<typeof teamsService.getAvailablePractices>)
        .mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/v1/teams/1/practices/available?search=sprint')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(teamsService.getAvailablePractices).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ search: 'sprint' })
      );
    });

    it('should support pillars filter', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0
      };

      (teamsService.getAvailablePractices as jest.MockedFunction<typeof teamsService.getAvailablePractices>)
        .mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/v1/teams/1/practices/available?pillars=1,2')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(teamsService.getAvailablePractices).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ pillars: [1, 2] })
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/teams/1/practices/available');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/teams/:teamId/practices', () => {
    it('should add practice to team', async () => {
      const mockResult = {
        teamPractice: {
          id: 1,
          teamId: 1,
          practiceId: 5,
          addedAt: '2026-01-20T10:00:00.000Z'
        },
        coverage: 25
      };

      (teamsService.addPracticeToTeam as jest.MockedFunction<typeof teamsService.addPracticeToTeam>)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/teams/1/practices')
        .set('Authorization', 'Bearer test-token')
        .send({ practiceId: 5 });

      expect(response.status).toBe(201);
      expect(response.body.teamPractice).toBeDefined();
      expect(response.body.teamPractice.teamId).toBe(1);
      expect(response.body.teamPractice.practiceId).toBe(5);
      expect(response.body.coverage).toBe(25);
      expect(response.body.requestId).toBeDefined();
      
      // Verify service was called with correct params for event logging
      expect(teamsService.addPracticeToTeam).toHaveBeenCalledWith(1, 1, 5);
    });

    it('should return 400 for missing practiceId', async () => {
      const response = await request(app)
        .post('/api/v1/teams/1/practices')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid practiceId type', async () => {
      const response = await request(app)
        .post('/api/v1/teams/1/practices')
        .set('Authorization', 'Bearer test-token')
        .send({ practiceId: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/teams/1/practices')
        .send({ practiceId: 5 });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/teams/:teamId/practices/custom', () => {
    it('should create a custom practice and return coverage', async () => {
      const mockResult = {
        practiceId: 42,
        coverage: 67
      };

      (teamsService.createCustomPracticeForTeam as jest.MockedFunction<typeof teamsService.createCustomPracticeForTeam>)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/teams/1/practices/custom')
        .set('Authorization', 'Bearer test-token')
        .send({
          title: 'Team Retro Plus',
          goal: 'Improve retrospective outcomes',
          pillarIds: [1, 2],
          categoryId: 'scrum'
        });

      expect(response.status).toBe(201);
      expect(response.body.practiceId).toBe(42);
      expect(response.body.coverage).toBe(67);
      expect(response.body.requestId).toBeDefined();
      expect(teamsService.createCustomPracticeForTeam).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          title: 'Team Retro Plus',
          goal: 'Improve retrospective outcomes',
          pillarIds: [1, 2],
          categoryId: 'scrum'
        })
      );
    });

    it('should return 400 for invalid pillarId', async () => {
      (teamsService.createCustomPracticeForTeam as jest.MockedFunction<typeof teamsService.createCustomPracticeForTeam>)
        .mockRejectedValue(new AppError(
          'invalid_pillar_ids',
          'Some pillar IDs do not exist',
          { invalid: [999] },
          400
        ));

      const response = await request(app)
        .post('/api/v1/teams/1/practices/custom')
        .set('Authorization', 'Bearer test-token')
        .send({
          title: 'Custom Practice',
          goal: 'Goal',
          pillarIds: [999],
          categoryId: 'scrum'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('invalid_pillar_ids');
    });

    it('should return 409 for duplicate title and category', async () => {
      (teamsService.createCustomPracticeForTeam as jest.MockedFunction<typeof teamsService.createCustomPracticeForTeam>)
        .mockRejectedValue(new AppError(
          'duplicate_practice_title',
          'Practice title already exists in this category',
          { title: 'Custom Practice', categoryId: 'scrum' },
          409
        ));

      const response = await request(app)
        .post('/api/v1/teams/1/practices/custom')
        .set('Authorization', 'Bearer test-token')
        .send({
          title: 'Custom Practice',
          goal: 'Goal',
          pillarIds: [1],
          categoryId: 'scrum'
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('duplicate_practice_title');
    });

    it('should return 404 for missing template practice', async () => {
      (teamsService.createCustomPracticeForTeam as jest.MockedFunction<typeof teamsService.createCustomPracticeForTeam>)
        .mockRejectedValue(new AppError(
          'template_not_found',
          'Template practice not found',
          { templatePracticeId: 999 },
          404
        ));

      const response = await request(app)
        .post('/api/v1/teams/1/practices/custom')
        .set('Authorization', 'Bearer test-token')
        .send({
          title: 'Custom Practice',
          goal: 'Goal',
          pillarIds: [1],
          categoryId: 'scrum',
          templatePracticeId: 999
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('template_not_found');
    });
  });

  describe('DELETE /api/v1/teams/:teamId/practices/:practiceId', () => {
    it('should remove practice from team', async () => {
      const mockResult = {
        teamPracticeId: 12,
        coverage: 58,
        gapPillarIds: [4],
        gapPillarNames: ['Knowledge Sharing']
      };

      (teamsService.removePracticeFromTeam as jest.MockedFunction<typeof teamsService.removePracticeFromTeam>)
        .mockResolvedValue(mockResult);

      const response = await request(app)
        .delete('/api/v1/teams/1/practices/5')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.teamPracticeId).toBe(12);
      expect(response.body.coverage).toBe(58);
      expect(response.body.requestId).toBeDefined();
    });

    it('should return 404 for missing practice', async () => {
      (teamsService.removePracticeFromTeam as jest.MockedFunction<typeof teamsService.removePracticeFromTeam>)
        .mockRejectedValue(new AppError('practice_not_found', 'Practice not found', { practiceId: 999 }, 404));

      const response = await request(app)
        .delete('/api/v1/teams/1/practices/999')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('practice_not_found');
    });

    it('should return 400 for invalid practiceId', async () => {
      const response = await request(app)
        .delete('/api/v1/teams/1/practices/invalid')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('validation_error');
    });

    it('should return 403 for non-member', async () => {
      (prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/v1/teams/1/practices/5')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/teams/:teamId/practices/:practiceId/removal-impact', () => {
    it('should return removal impact preview', async () => {
      const mockImpact = {
        pillarIds: [1, 2, 3],
        pillarNames: ['Continuous Integration', 'Code Review', 'Test Automation'],
        gapPillarIds: [2],
        gapPillarNames: ['Code Review'],
        willCreateGaps: false
      };

      (teamsService.getPracticeRemovalImpact as jest.MockedFunction<typeof teamsService.getPracticeRemovalImpact>)
        .mockResolvedValue(mockImpact);

      const response = await request(app)
        .get('/api/v1/teams/1/practices/5/removal-impact')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.pillarIds).toEqual([1, 2, 3]);
      expect(response.body.pillarNames).toHaveLength(3);
      expect(response.body.gapPillarIds).toEqual([2]);
      expect(response.body.gapPillarNames).toEqual(['Code Review']);
      expect(response.body.willCreateGaps).toBe(false);
      expect(response.body.requestId).toBeDefined();
    });

    it('should indicate gap creation when removing unique practice', async () => {
      const mockImpact = {
        pillarIds: [1],
        pillarNames: ['Continuous Integration'],
        gapPillarIds: [1],
        gapPillarNames: ['Continuous Integration'],
        willCreateGaps: true
      };

      (teamsService.getPracticeRemovalImpact as jest.MockedFunction<typeof teamsService.getPracticeRemovalImpact>)
        .mockResolvedValue(mockImpact);

      const response = await request(app)
        .get('/api/v1/teams/1/practices/5/removal-impact')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.willCreateGaps).toBe(true);
      expect(response.body.gapPillarIds).toEqual([1]);
      expect(response.body.gapPillarNames).toEqual(['Continuous Integration']);
    });

    it('should return 404 for practice not in team', async () => {
      (teamsService.getPracticeRemovalImpact as jest.MockedFunction<typeof teamsService.getPracticeRemovalImpact>)
        .mockRejectedValue(new AppError(
          'practice_not_found',
          'Practice not found in team portfolio',
          { teamId: 1, practiceId: 999 },
          404
        ));

      const response = await request(app)
        .get('/api/v1/teams/1/practices/999/removal-impact')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('practice_not_found');
    });

    it('should return 400 for invalid practiceId', async () => {
      (teamsService.getPracticeRemovalImpact as jest.MockedFunction<typeof teamsService.getPracticeRemovalImpact>)
        .mockRejectedValue(new AppError(
          'invalid_practice_id',
          'Valid practice ID is required',
          { practiceId: -1 },
          400
        ));

      const response = await request(app)
        .get('/api/v1/teams/1/practices/-1/removal-impact')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/teams/1/practices/5/removal-impact');

      expect(response.status).toBe(401);
    });
  });
});
