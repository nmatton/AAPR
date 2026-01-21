import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ManagePracticesView } from './ManagePracticesView';
import { useTeamsStore } from '../state/teamsSlice';
import { useAddPracticesStore } from '../state/addPracticesSlice';
import { useManagePracticesStore } from '../state/managePracticesSlice';
import type { Practice } from '../types/practice.types';
import * as teamPracticesApi from '../api/teamPracticesApi';

vi.mock('../state/teamsSlice');
vi.mock('../state/addPracticesSlice');
vi.mock('../state/managePracticesSlice');
vi.mock('../api/teamPracticesApi', () => ({
  fetchPracticeRemovalImpact: vi.fn()
}));

describe('ManagePracticesView', () => {
  const mockPractice: Practice = {
    id: 5,
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

    vi.mocked(teamPracticesApi.fetchPracticeRemovalImpact).mockResolvedValue({
      pillarIds: [1],
      pillarNames: ['Communication'],
      gapPillarIds: [1],
      gapPillarNames: ['Communication'],
      willCreateGaps: true
    });

    (useTeamsStore as any).mockReturnValue({
      teams: mockTeams,
      fetchTeams: vi.fn()
    });

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

    (useManagePracticesStore as any).mockReturnValue({
      teamPractices: [mockPractice],
      isLoading: false,
      error: null,
      loadTeamPractices: vi.fn(),
      removePractice: vi.fn().mockResolvedValue({ coverage: 60, gapPillarNames: ['Communication'] })
    });
  });

  it('opens removal modal and shows impact preview', async () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/practices/manage']}>
        <Routes>
          <Route path="/teams/:teamId/practices/manage" element={<ManagePracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /selected practices/i }));

    const removeButton = await screen.findByRole('button', { name: /remove from team/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText('Coverage gaps will be created')).toBeInTheDocument();
      const gapList = screen.getByText('Removing this practice will leave gaps in:').nextElementSibling as HTMLElement;
      expect(gapList).toBeTruthy();
      expect(gapList).toHaveTextContent('Communication');
    });
  });

  it('confirms removal and shows gap suggestions', async () => {
    const mockRemovePractice = vi.fn().mockResolvedValue({
      coverage: 60,
      gapPillarNames: ['Communication']
    });

    (useManagePracticesStore as any).mockReturnValue({
      teamPractices: [mockPractice],
      isLoading: false,
      error: null,
      loadTeamPractices: vi.fn(),
      removePractice: mockRemovePractice
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/practices/manage']}>
        <Routes>
          <Route path="/teams/:teamId/practices/manage" element={<ManagePracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /selected practices/i }));

    const removeButton = await screen.findByRole('button', { name: /remove from team/i });
    fireEvent.click(removeButton);

    const confirmButton = await screen.findByRole('button', { name: /remove practice/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockRemovePractice).toHaveBeenCalledWith(1, 5);
      expect(screen.getByText('Consider adding a practice that covers:')).toBeInTheDocument();
      expect(screen.getByText('Communication')).toBeInTheDocument();
    });
  });

  it('shows non-blocking error while keeping practice list visible', () => {
    (useManagePracticesStore as any).mockReturnValue({
      teamPractices: [mockPractice],
      isLoading: false,
      error: 'Unable to remove practice. Please try again.',
      loadTeamPractices: vi.fn(),
      removePractice: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/practices/manage']}>
        <Routes>
          <Route path="/teams/:teamId/practices/manage" element={<ManagePracticesView />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /selected practices/i }));

    expect(screen.getByText('Unable to remove practice. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
  });
});
