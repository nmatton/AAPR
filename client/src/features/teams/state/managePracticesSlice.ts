import { create } from 'zustand';
import { fetchTeamPractices, removePracticeFromTeam, createCustomPractice, type CreateCustomPracticePayload } from '../api/teamPracticesApi';
import type { Practice } from '../types/practice.types';

export interface ManagePracticesState {
  teamPractices: Practice[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  
  // Actions
  loadTeamPractices: (teamId: number) => Promise<void>;
  createPractice: (teamId: number, payload: CreateCustomPracticePayload) => Promise<{ practiceId: number; coverage: number }>;
  removePractice: (teamId: number, practiceId: number) => Promise<{ coverage: number; gapPillarNames: string[] }>;
  reset: () => void;
}

const initialState = {
  teamPractices: [],
  isLoading: false,
  isCreating: false,
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

  createPractice: async (teamId: number, payload: CreateCustomPracticePayload) => {
    set({ isCreating: true, error: null });

    try {
      const result = await createCustomPractice(teamId, payload);

      // Reload team practices to include the newly created practice
      await get().loadTeamPractices(teamId);

      set({ isCreating: false });

      return { practiceId: result.practiceId, coverage: result.coverage };
    } catch (error: any) {
      let errorMessage = 'Unable to create practice. Please try again.';

      if (error.statusCode === 401 || error.code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.code === 'duplicate_practice_title') {
        errorMessage = 'A practice with this title already exists in the selected category.';
      } else if (error.code === 'invalid_pillar_ids') {
        errorMessage = 'One or more selected pillars are invalid.';
      } else if (error.code === 'invalid_category_id') {
        errorMessage = 'Selected category is invalid.';
      } else if (error.code === 'template_not_found') {
        errorMessage = 'Selected template practice was not found.';
      } else if (error.code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      set({ error: errorMessage, isCreating: false });
      throw error;
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
