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
      let errorMessage = 'Failed to fetch teams';
      
      if (error.statusCode === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
    }
  },
  
  reset: () => set({ teams: [], isLoading: false, error: null })
}));
