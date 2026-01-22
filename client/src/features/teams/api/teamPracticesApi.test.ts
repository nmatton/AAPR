import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAvailablePractices, addPracticeToTeam, fetchTeamPractices, removePracticeFromTeam, createCustomPractice, editPracticeForTeam } from './teamPracticesApi';
import * as apiClient from '../../../lib/apiClient';

// Mock apiClient
vi.mock('../../../lib/apiClient', () => ({
  apiClient: vi.fn()
}));

describe('teamPracticesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAvailablePractices', () => {
    it('fetches available practices with filters', async () => {
      const mockResponse = {
        items: [{ id: 1, title: 'Test', goal: '', categoryId: '', categoryName: '', pillars: [] }],
        page: 1,
        pageSize: 20,
        total: 1
      };

      vi.mocked(apiClient.apiClient).mockResolvedValue(mockResponse);

      const result = await fetchAvailablePractices({
        teamId: 1,
        page: 1,
        pageSize: 20,
        search: 'sprint',
        pillars: [1, 2]
      });

      expect(apiClient.apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/teams/1/practices/available')
      );
      expect(apiClient.apiClient).toHaveBeenCalledWith(
        expect.stringContaining('search=sprint')
      );
      expect(apiClient.apiClient).toHaveBeenCalledWith(
        expect.stringContaining('pillars=1%2C2')
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles optional parameters correctly', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0
      };

      vi.mocked(apiClient.apiClient).mockResolvedValue(mockResponse);

      await fetchAvailablePractices({ teamId: 1 });

      const callArg = vi.mocked(apiClient.apiClient).mock.calls[0][0];
      expect(callArg).not.toContain('search=');
      expect(callArg).not.toContain('pillars=');
    });
  });

  describe('addPracticeToTeam', () => {
    it('adds practice to team successfully', async () => {
      const mockResponse = {
        teamPractice: {
          id: 1,
          teamId: 1,
          practiceId: 5,
          addedAt: '2026-01-21T10:00:00.000Z'
        },
        coverage: 25
      };

      vi.mocked(apiClient.apiClient).mockResolvedValue(mockResponse);

      const result = await addPracticeToTeam(1, 5);

      expect(apiClient.apiClient).toHaveBeenCalledWith(
        '/api/v1/teams/1/practices',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ practiceId: 5 })
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchTeamPractices', () => {
    it('fetches team practices successfully', async () => {
      const mockResponse = {
        items: [{ id: 1, title: 'Test', goal: '', categoryId: '', categoryName: '', pillars: [] }],
        requestId: 'req_123'
      };

      vi.mocked(apiClient.apiClient).mockResolvedValue(mockResponse);

      const result = await fetchTeamPractices(1);

      expect(apiClient.apiClient).toHaveBeenCalledWith('/api/v1/teams/1/practices');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removePracticeFromTeam', () => {
    it('removes practice from team successfully', async () => {
      const mockResponse = {
        teamPracticeId: 1,
        coverage: 20,
        gapPillarIds: [3],
        gapPillarNames: ['Feedback'],
        requestId: 'req_123'
      };

      vi.mocked(apiClient.apiClient).mockResolvedValue(mockResponse);

      const result = await removePracticeFromTeam(1, 5);

      expect(apiClient.apiClient).toHaveBeenCalledWith(
        '/api/v1/teams/1/practices/5',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createCustomPractice', () => {
    it('creates a custom practice successfully', async () => {
      const mockResponse = {
        practiceId: 77,
        coverage: 45,
        requestId: 'req_abc'
      };

      vi.mocked(apiClient.apiClient).mockResolvedValue(mockResponse);

      const payload = {
        title: 'Custom Practice',
        goal: 'Goal',
        pillarIds: [1, 2],
        categoryId: 'scrum',
        templatePracticeId: 10
      };

      const result = await createCustomPractice(1, payload);

      expect(apiClient.apiClient).toHaveBeenCalledWith(
        '/api/v1/teams/1/practices/custom',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('editPracticeForTeam', () => {
    it('patches practice edits successfully', async () => {
      const mockResponse = {
        practice: { id: 5, title: 'Updated', goal: 'Goal', categoryId: 'feedback', categoryName: 'Feedback', pillars: [] },
        coverageByTeam: [{ teamId: 1, coverage: 50 }],
        usedByTeamsCount: 2
      }

      vi.mocked(apiClient.apiClient).mockResolvedValue(mockResponse)

      const payload = {
        title: 'Updated',
        goal: 'Goal',
        pillarIds: [1],
        categoryId: 'feedback',
        version: 2
      }

      const result = await editPracticeForTeam(1, 5, payload)

      expect(apiClient.apiClient).toHaveBeenCalledWith(
        '/api/v1/teams/1/practices/5',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })
});
