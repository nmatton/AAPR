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

  describe('DELETE /api/v1/teams/:teamId/practices/:practiceId', () => {
    it('should remove practice from team', async () => {
      const mockResult = {
        teamPracticeId: 12,
        coverage: 58
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

    it('should return 403 for non-member', async () => {
      (prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/v1/teams/1/practices/5')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
    });
  });
});
