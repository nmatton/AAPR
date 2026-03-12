import { create } from 'zustand';
import { fetchAvailablePractices, addPracticeToTeam, fetchAvailablePracticeMethods } from '../api/teamPracticesApi';
import type { Practice } from '../types/practice.types';

export interface AddPracticesState {
  practices: Practice[];
  availableMethods: string[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  searchQuery: string;
  selectedPillars: number[];
  selectedCategories: string[];
  selectedMethods: string[];
  selectedTags: string[];
  
  // Actions
  loadAvailablePractices: (teamId: number, page?: number) => Promise<void>;
  loadAvailableMethods: (teamId: number) => Promise<void>;
  addPractice: (teamId: number, practiceId: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  togglePillar: (pillarId: number) => void;
  toggleCategory: (categoryId: string) => void;
  toggleMethod: (method: string) => void;
  setTags: (tags: string[]) => void;
  clearFilters: () => void;
  reset: () => void;
}

const initialState = {
  practices: [],
  availableMethods: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
  searchQuery: '',
  selectedPillars: [],
  selectedCategories: [],
  selectedMethods: [],
  selectedTags: []
};

export const useAddPracticesStore = create<AddPracticesState>((set, get) => ({
  ...initialState,
  
  loadAvailablePractices: async (teamId: number, page = 1) => {
    const currentPage = page === 1 ? 1 : get().page + 1;
    set({ isLoading: true, error: null, page: currentPage });
    
    try {
      const { searchQuery, selectedPillars, selectedCategories, selectedMethods, selectedTags, pageSize, practices: existingPractices } = get();
      
      const data = await fetchAvailablePractices({
        teamId,
        page: currentPage,
        pageSize,
        search: searchQuery || undefined,
        pillars: selectedPillars.length > 0 ? selectedPillars : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        methods: selectedMethods.length > 0 ? selectedMethods : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined
      });
      
      // If page > 1, append to existing practices (load more)
      // If page = 1, replace practices (new search/filter)
      const practices = currentPage === 1 
        ? data.items 
        : [...existingPractices, ...data.items];
      
      set({
        practices,
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      let errorMessage = 'Failed to load available practices';
      
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

  loadAvailableMethods: async (teamId: number) => {
    try {
      const methods = await fetchAvailablePracticeMethods(teamId);
      set({ availableMethods: methods });
    } catch (error) {
      set({ availableMethods: [] });
    }
  },
  
  addPractice: async (teamId: number, practiceId: number) => {
    set({ isLoading: true, error: null });
    
    try {
      await addPracticeToTeam(teamId, practiceId);
      const methods = await fetchAvailablePracticeMethods(teamId);
      
      // Remove the added practice from the list
      const { practices } = get();
      const updatedPractices = practices.filter(p => p.id !== practiceId);
      
      set({ 
        availableMethods: methods,
        practices: updatedPractices,
        total: get().total - 1,
        isLoading: false 
      });
    } catch (error: any) {
      let errorMessage = 'Failed to add practice';
      
      if (error.statusCode === 401 || error.code === 'session_expired') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.code === 'duplicate_practice') {
        errorMessage = 'Practice already added to team.';
      } else if (error.code === 'invalid_practice_id') {
        errorMessage = 'Invalid practice. Please try again.';
      } else if (error.code === 'network_error') {
        errorMessage = 'Connection failed. Check your internet and retry.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
  
  setSearchQuery: (query: string) => {
    set({ searchQuery: query, page: 1, practices: [] });
  },
  
  togglePillar: (pillarId: number) => {
    const { selectedPillars } = get();
    const newPillars = selectedPillars.includes(pillarId)
      ? selectedPillars.filter(id => id !== pillarId)
      : [...selectedPillars, pillarId];
    set({ selectedPillars: newPillars, page: 1, practices: [] });
  },
  
  toggleCategory: (categoryId: string) => {
    const { selectedCategories } = get();
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    set({ selectedCategories: newCategories, page: 1, practices: [] });
  },

  toggleMethod: (method: string) => {
    const { selectedMethods } = get();
    const newMethods = selectedMethods.includes(method)
      ? selectedMethods.filter(m => m !== method)
      : [...selectedMethods, method];
    set({ selectedMethods: newMethods, page: 1, practices: [] });
  },

  setTags: (tags: string[]) => {
    set({ selectedTags: tags, page: 1, practices: [] });
  },

  clearFilters: () => {
    set({ searchQuery: '', selectedPillars: [], selectedCategories: [], selectedMethods: [], selectedTags: [], page: 1, practices: [] });
  },
  
  reset: () => set(initialState)
}));
