import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAddPracticesStore } from './addPracticesSlice';
import * as teamPracticesApi from '../api/teamPracticesApi';

// Mock API
vi.mock('../api/teamPracticesApi');

describe('addPracticesSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAddPracticesStore.getState().reset();
  });

  it('loads available practices successfully', async () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          title: 'Sprint Planning',
          goal: 'Plan sprints',
          categoryId: 'scrum',
          categoryName: 'Scrum',
          pillars: []
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    };

    vi.mocked(teamPracticesApi.fetchAvailablePractices).mockResolvedValue(mockResponse);

    const { loadAvailablePractices } = useAddPracticesStore.getState();
    await loadAvailablePractices(1);

    const state = useAddPracticesStore.getState();
    expect(state.practices).toHaveLength(1);
    expect(state.practices[0].title).toBe('Sprint Planning');
    expect(state.total).toBe(1);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('handles error when loading practices fails', async () => {
    vi.mocked(teamPracticesApi.fetchAvailablePractices).mockRejectedValue({
      message: 'Network error',
      code: 'network_error'
    });

    const { loadAvailablePractices } = useAddPracticesStore.getState();
    await loadAvailablePractices(1);

    const state = useAddPracticesStore.getState();
    expect(state.error).toBe('Connection failed. Check your internet and retry.');
    expect(state.isLoading).toBe(false);
  });

  it('removes practice from list after successful add', async () => {
    // Setup initial state with practices
    useAddPracticesStore.setState({
      practices: [
        {
          id: 1,
          title: 'Sprint Planning',
          goal: 'Plan sprints',
          categoryId: 'scrum',
          categoryName: 'Scrum',
          pillars: []
        },
        {
          id: 2,
          title: 'Daily Standup',
          goal: 'Daily sync',
          categoryId: 'scrum',
          categoryName: 'Scrum',
          pillars: []
        }
      ],
      total: 2
    });

    vi.mocked(teamPracticesApi.addPracticeToTeam).mockResolvedValue({
      teamPractice: {
        id: 1,
        teamId: 1,
        practiceId: 1,
        addedAt: '2026-01-21T10:00:00.000Z'
      },
      coverage: 25
    });

    const { addPractice } = useAddPracticesStore.getState();
    await addPractice(1, 1);

    const state = useAddPracticesStore.getState();
    expect(state.practices).toHaveLength(1);
    expect(state.practices[0].id).toBe(2);
    expect(state.total).toBe(1);
  });

  it('handles duplicate practice error', async () => {
    vi.mocked(teamPracticesApi.addPracticeToTeam).mockRejectedValue({
      code: 'duplicate_practice',
      message: 'Practice already added'
    });

    const { addPractice } = useAddPracticesStore.getState();
    
    await expect(addPractice(1, 1)).rejects.toThrow();
    
    const state = useAddPracticesStore.getState();
    expect(state.error).toBe('Practice already added to team.');
  });

  it('resets search query and page when setSearchQuery called', () => {
    useAddPracticesStore.setState({
      practices: [{ id: 1, title: 'Test', goal: '', categoryId: '', categoryName: '', pillars: [] }],
      page: 3,
      searchQuery: 'old'
    });

    const { setSearchQuery } = useAddPracticesStore.getState();
    setSearchQuery('new query');

    const state = useAddPracticesStore.getState();
    expect(state.searchQuery).toBe('new query');
    expect(state.page).toBe(1);
    expect(state.practices).toHaveLength(0);
  });

  it('toggles pillar selection correctly', () => {
    const { togglePillar } = useAddPracticesStore.getState();
    
    // Add pillar
    togglePillar(5);
    expect(useAddPracticesStore.getState().selectedPillars).toContain(5);
    
    // Remove pillar
    togglePillar(5);
    expect(useAddPracticesStore.getState().selectedPillars).not.toContain(5);
  });

  it('clears all filters', () => {
    useAddPracticesStore.setState({
      searchQuery: 'test',
      selectedPillars: [1, 2],
      page: 3,
      practices: [{ id: 1, title: 'Test', goal: '', categoryId: '', categoryName: '', pillars: [] }]
    });

    const { clearFilters } = useAddPracticesStore.getState();
    clearFilters();

    const state = useAddPracticesStore.getState();
    expect(state.searchQuery).toBe('');
    expect(state.selectedPillars).toHaveLength(0);
    expect(state.page).toBe(1);
    expect(state.practices).toHaveLength(0);
  });
});
