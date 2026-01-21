import { create } from 'zustand';
import { fetchTeamPractices, removePracticeFromTeam } from '../api/teamPracticesApi';
import type { Practice } from '../types/practice.types';

export interface ManagePracticesState {
  teamPractices: Practice[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadTeamPractices: (teamId: number) => Promise<void>;
  removePractice: (teamId: number, practiceId: number) => Promise<{ coverage: number; gapPillarNames: string[] }>;
  reset: () => void;
}

const initialState = {
  teamPractices: [],
  isLoading: false,
  error: null
};

export const useManagePracticesStore = create<ManagePracticesState>((set, get) => ({
  ...initialState,
  
  loadTeamPractices: async (teamId: number) => {
    set({ isLoading: true, error: null });
    
    try {
      const data = await fetchTeamPractices(teamId);
      
      set({
        teamPractices: data.items,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      let errorMessage = 'Failed to load team practices';
      
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
  
  removePractice: async (teamId: number, practiceId: number) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await removePracticeFromTeam(teamId, practiceId);
      
      // Remove the practice from the list
      const { teamPractices } = get();
      const updatedPractices = teamPractices.filter(p => p.id !== practiceId);
      
      set({ 
        teamPractices: updatedPractices,
        isLoading: false 
      });
      
      return { coverage: result.coverage, gapPillarNames: result.gapPillarNames };
    } catch (error: any) {
      let errorMessage = 'Unable to remove practice. Please try again.';
      
      if (error.statusCode === 401 || error.code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.code === 'practice_not_found') {
        errorMessage = 'Practice not found in team portfolio.';
      } else if (error.code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
  
  reset: () => set(initialState)
}));
