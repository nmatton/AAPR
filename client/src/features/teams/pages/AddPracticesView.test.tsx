import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AddPracticesView } from './AddPracticesView';
import { useTeamsStore } from '../state/teamsSlice';
import { useAddPracticesStore } from '../state/addPracticesSlice';
import type { Practice } from '../types/practice.types';

// Mock stores
vi.mock('../state/teamsSlice');
vi.mock('../state/addPracticesSlice');

describe('AddPracticesView', () => {
  const mockPractice: Practice = {
    id: 1,
    title: 'Sprint Planning',
    goal: 'Plan sprints effectively',
    categoryId: 'scrum',
    categoryName: 'Scrum',
    pillars: [
      { id: 1, name: 'Communication', category: 'Human Values', description: null }
    ]
  };

  const mockTeams = [
    {
      id: 1,
      name: 'Test Team',
      memberCount: 3,
      practiceCount: 5,
      coverage: 50,
      role: 'owner' as const,
      createdAt: '2026-01-20T10:00:00.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useTeamsStore as any).mockReturnValue({
      teams: mockTeams,
      fetchTeams: vi.fn()
    });

    (useAddPracticesStore as any).mockReturnValue({
      practices: [mockPractice],
      isLoading: false,
      error: null,
      total: 1,
      page: 1,
      pageSize: 20,
      searchQuery: '',
      selectedPillars: [],
      loadAvailablePractices: vi.fn(),
      addPractice: vi.fn(),
      setSearchQuery: vi.fn(),
      togglePillar: vi.fn(),
      clearFilters: vi.fn()
    });
  });

  it('renders Add Practices view with practice list', async () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/practices/add']}>
        <Routes>
          <Route path="/teams/:teamId/practices/add" element={<AddPracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Add Practices to Test Team')).toBeInTheDocument();
      expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
      expect(screen.getByText('Plan sprints effectively')).toBeInTheDocument();
    });
  });

  it('calls addPractice and shows success message when Add to team clicked', async () => {
    const mockAddPractice = vi.fn().mockResolvedValue(undefined);
    const mockFetchTeams = vi.fn().mockResolvedValue(undefined);
    
    (useAddPracticesStore as any).mockReturnValue({
      practices: [mockPractice],
      isLoading: false,
      error: null,
      total: 1,
      page: 1,
      pageSize: 20,
      searchQuery: '',
      selectedPillars: [],
      loadAvailablePractices: vi.fn(),
      addPractice: mockAddPractice,
      setSearchQuery: vi.fn(),
      togglePillar: vi.fn(),
      clearFilters: vi.fn()
    });

    (useTeamsStore as any).mockReturnValue({
      teams: mockTeams,
      fetchTeams: mockFetchTeams
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/practices/add']}>
        <Routes>
          <Route path="/teams/:teamId/practices/add" element={<AddPracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    const addButtons = screen.getAllByRole('button', { name: /add to team/i });
    const addButton = addButtons.find((button) => button.tagName === 'BUTTON');
    expect(addButton).toBeDefined();
    fireEvent.click(addButton!);

    await waitFor(() => {
      expect(mockAddPractice).toHaveBeenCalledWith(1, 1);
      expect(mockFetchTeams).toHaveBeenCalled();
    });
  });

  it('displays error message when add fails', async () => {
    const mockAddPractice = vi.fn().mockRejectedValue(new Error('Network error'));
    
    (useAddPracticesStore as any).mockReturnValue({
      practices: [mockPractice],
      isLoading: false,
      error: 'Failed to add practice',
      total: 1,
      page: 1,
      pageSize: 20,
      searchQuery: '',
      selectedPillars: [],
      loadAvailablePractices: vi.fn(),
      addPractice: mockAddPractice,
      setSearchQuery: vi.fn(),
      togglePillar: vi.fn(),
      clearFilters: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/practices/add']}>
        <Routes>
          <Route path="/teams/:teamId/practices/add" element={<AddPracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to add practice')).toBeInTheDocument();
    });
  });

  it('shows empty state when all practices selected', () => {
    (useAddPracticesStore as any).mockReturnValue({
      practices: [],
      isLoading: false,
      error: null,
      total: 0,
      page: 1,
      pageSize: 20,
      searchQuery: '',
      selectedPillars: [],
      loadAvailablePractices: vi.fn(),
      addPractice: vi.fn(),
      setSearchQuery: vi.fn(),
      togglePillar: vi.fn(),
      clearFilters: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/practices/add']}>
        <Routes>
          <Route path="/teams/:teamId/practices/add" element={<AddPracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('All practices already selected')).toBeInTheDocument();
    expect(screen.getByText('Your team has already added all available practices')).toBeInTheDocument();
  });

  it('shows loading state while fetching practices', () => {
    (useAddPracticesStore as any).mockReturnValue({
      practices: [],
      isLoading: true,
      error: null,
      total: 0,
      page: 1,
      pageSize: 20,
      searchQuery: '',
      selectedPillars: [],
      loadAvailablePractices: vi.fn(),
      addPractice: vi.fn(),
      setSearchQuery: vi.fn(),
      togglePillar: vi.fn(),
      clearFilters: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/practices/add']}>
        <Routes>
          <Route path="/teams/:teamId/practices/add" element={<AddPracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading available practices...')).toBeInTheDocument();
  });

  it('updates search query when typing in search input', async () => {
    const mockSetSearchQuery = vi.fn();
    
    (useAddPracticesStore as any).mockReturnValue({
      practices: [mockPractice],
      isLoading: false,
      error: null,
      total: 1,
      page: 1,
      pageSize: 20,
      searchQuery: '',
      selectedPillars: [],
      loadAvailablePractices: vi.fn(),
      addPractice: vi.fn(),
      setSearchQuery: mockSetSearchQuery,
      togglePillar: vi.fn(),
      clearFilters: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/practices/add']}>
        <Routes>
          <Route path="/teams/:teamId/practices/add" element={<AddPracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search practices...');
    fireEvent.change(searchInput, { target: { value: 'sprint' } });

    await waitFor(() => {
      expect(mockSetSearchQuery).toHaveBeenCalledWith('sprint');
    });
  });
});
