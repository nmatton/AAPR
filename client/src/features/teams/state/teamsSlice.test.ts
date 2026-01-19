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
    useTeamsStore.setState({ teams: [], isLoading: false, error: null });
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
        error: 'Some error',
      });

      const { result } = renderHook(() => useTeamsStore());

      act(() => {
        result.current.reset();
      });

      expect(result.current.teams).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
