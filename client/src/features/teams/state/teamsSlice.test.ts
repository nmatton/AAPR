import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useTeamsStore } from './teamsSlice';
import * as teamsApi from '../api/teamsApi';

// Mock the API
vi.mock('../api/teamsApi');

describe('teamsSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useTeamsStore.setState({ teams: [], isLoading: false, isCreating: false, error: null });
  });

  describe('fetchTeams', () => {
    it('sets isLoading true then updates teams on success', async () => {
      const mockTeams = [
        {
          id: 1,
          name: 'Team Alpha',
          memberCount: 5,
          practiceCount: 8,
          coverage: 74,
          role: 'owner' as const,
          createdAt: '2026-01-15T10:00:00.000Z',
        },
        {
          id: 2,
          name: 'Team Beta',
          memberCount: 3,
          practiceCount: 4,
          coverage: 42,
          role: 'member' as const,
          createdAt: '2026-01-16T14:00:00.000Z',
        },
      ];

      (teamsApi.getTeams as any).mockResolvedValue(mockTeams);

      const { result } = renderHook(() => useTeamsStore());

      await act(async () => {
        await result.current.fetchTeams();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.teams).toEqual(mockTeams);
      expect(result.current.error).toBeNull();
    });

    it('handles network errors and sets error message', async () => {
      const networkError = {
        name: 'ApiError',
        code: 'network_error',
        message: 'Connection failed',
        details: {},
      };

      (teamsApi.getTeams as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useTeamsStore());

      await act(async () => {
        await result.current.fetchTeams();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Connection failed. Check your internet and retry.');
      expect(result.current.teams).toEqual([]);
    });

    it('handles 401 unauthorized errors', async () => {
      const authError = {
        name: 'ApiError',
        code: 'unauthorized',
        message: 'Not authenticated',
        details: {},
        statusCode: 401,
      };

      (teamsApi.getTeams as any).mockRejectedValue(authError);

      const { result } = renderHook(() => useTeamsStore());

      await act(async () => {
        await result.current.fetchTeams();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Session expired. Please log in again.');
    });

    it('handles generic errors', async () => {
      const genericError = new Error('Something went wrong');

      (teamsApi.getTeams as any).mockRejectedValue(genericError);

      const { result } = renderHook(() => useTeamsStore());

      await act(async () => {
        await result.current.fetchTeams();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Something went wrong');
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      // Set some state
      useTeamsStore.setState({
        teams: [
          {
            id: 1,
            name: 'Team Alpha',
            memberCount: 5,
            practiceCount: 8,
            coverage: 74,
            role: 'owner',
            createdAt: '2026-01-15T10:00:00.000Z',
          },
        ],
        isLoading: false,
        isCreating: true,
        error: 'Some error',
      });

      const { result } = renderHook(() => useTeamsStore());

      act(() => {
        result.current.reset();
      });

      expect(result.current.teams).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('createTeam', () => {
    it('sets isCreating and refreshes teams on success', async () => {
      const createdTeam = {
        id: 3,
        name: 'Team Gamma',
        memberCount: 1,
        practiceCount: 2,
        coverage: 42,
        role: 'owner' as const,
        createdAt: '2026-01-17T14:00:00.000Z'
      };

      (teamsApi.createTeam as any).mockResolvedValue(createdTeam);
      (teamsApi.getTeams as any).mockResolvedValue([createdTeam]);

      const { result } = renderHook(() => useTeamsStore());

      await act(async () => {
        await result.current.createTeam('Team Gamma', [1, 2]);
      });

      expect(result.current.isCreating).toBe(false);
      expect(result.current.teams).toEqual([createdTeam]);
    });

    it('sets error message on failure', async () => {
      const apiError = {
        code: 'duplicate_team_name',
        message: 'Team name already exists',
        statusCode: 409
      };

      (teamsApi.createTeam as any).mockRejectedValue(apiError);

      const { result } = renderHook(() => useTeamsStore());

      await expect(async () => {
        await act(async () => {
          await result.current.createTeam('Team Alpha', [1]);
        });
      }).rejects.toBeTruthy();

      await waitFor(() => {
        expect(useTeamsStore.getState().isCreating).toBe(false);
        expect(useTeamsStore.getState().error).toBe('Team name already exists. Try another name.');
      });
    });
  });
});
