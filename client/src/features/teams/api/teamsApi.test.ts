import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTeams, ApiError } from './teamsApi';

// Mock fetch globally
global.fetch = vi.fn();

describe('teamsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-request-id',
    });
  });

  describe('getTeams', () => {
    it('fetches teams successfully', async () => {
      const mockTeams = [
        {
          id: 1,
          name: 'Team Alpha',
          memberCount: 5,
          practiceCount: 8,
          coverage: 74,
          role: 'owner',
          createdAt: '2026-01-15T10:00:00.000Z',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ teams: mockTeams }),
      });

      const result = await getTeams();

      expect(result).toEqual(mockTeams);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/teams',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Request-Id': 'test-request-id',
          }),
        })
      );
    });

    it('throws ApiError with 401 status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ code: 'unauthorized', message: 'Not authenticated' }),
      });

      await expect(getTeams()).rejects.toThrow(ApiError);
      await expect(getTeams()).rejects.toMatchObject({
        code: 'unauthorized',
        statusCode: 401,
      });
    });

    it('throws ApiError on server error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          code: 'internal_error',
          message: 'Database connection failed',
        }),
      });

      await expect(getTeams()).rejects.toThrow(ApiError);
      await expect(getTeams()).rejects.toMatchObject({
        code: 'internal_error',
        message: 'Database connection failed',
        statusCode: 500,
      });
    });

    it('throws ApiError on network error', async () => {
      (global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(getTeams()).rejects.toThrow(ApiError);
      await expect(getTeams()).rejects.toMatchObject({
        code: 'network_error',
        message: 'Connection failed. Check your internet and retry.',
      });
    });

    it('includes request ID in headers', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ teams: [] }),
      });

      await getTeams();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-Id': 'test-request-id',
          }),
        })
      );
    });
  });

  describe('ApiError', () => {
    it('creates error with all properties', () => {
      const error = new ApiError('test_code', 'Test message', { detail: 'info' }, 400);

      expect(error.code).toBe('test_code');
      expect(error.message).toBe('Test message');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ApiError');
    });
  });
});
