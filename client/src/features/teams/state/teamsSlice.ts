import { create } from 'zustand';
import { getTeams } from '../api/teamsApi';
import type { Team } from '../types/team.types';

/**
 * Teams state interface
 */
export interface TeamsState {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTeams: () => Promise<void>;
  reset: () => void;
}

/**
 * Zustand store for teams management
 */
export const useTeamsStore = create<TeamsState>((set) => ({
  teams: [],
  isLoading: false,
  error: null,
  
  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const teams = await getTeams();
      set({ teams, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch teams', 
        isLoading: false 
      });
    }
  },
  
  reset: () => set({ teams: [], isLoading: false, error: null })
}));
