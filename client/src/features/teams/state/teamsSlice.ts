import { create } from 'zustand';
import { getTeams, createTeam as createTeamApi } from '../api/teamsApi';
import type { Team } from '../types/team.types';

/**
 * Teams state interface
 */
export interface TeamsState {
  teams: Team[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  
  // Actions
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, practiceIds: number[]) => Promise<Team>;
  reset: () => void;
}

/**
 * Zustand store for teams management
 */
export const useTeamsStore = create<TeamsState>((set, get) => ({
  teams: [],
  isLoading: false,
  isCreating: false,
  error: null,
  
  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const teams = await getTeams();
      set({ teams, isLoading: false });
    } catch (error: any) {
      let errorMessage = 'Failed to fetch teams';
      
      if (error.statusCode === 401 || error.code === 'session_expired') {
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
  
  createTeam: async (name: string, practiceIds: number[]) => {
    set({ isCreating: true, error: null });
    try {
      const team = await createTeamApi(name, practiceIds);
      
      // Refresh teams list to include new team
      await get().fetchTeams();
      
      set({ isCreating: false });
      return team;
    } catch (error: any) {
      let errorMessage = 'Failed to create team';
      
      if (error.statusCode === 401 || error.code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.code === 'duplicate_team_name') {
        errorMessage = 'Team name already exists. Try another name.';
      } else if (error.code === 'invalid_practice_ids') {
        errorMessage = 'Some practices are invalid. Please try again.';
      } else if (error.code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, isCreating: false });
      throw error; // Re-throw so component can handle navigation
    }
  },
  
  reset: () => set({ teams: [], isLoading: false, isCreating: false, error: null })
}));
