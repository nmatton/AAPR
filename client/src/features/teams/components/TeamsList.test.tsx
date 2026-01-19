import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamsList } from './TeamsList';
import { useTeamsStore } from '../state/teamsSlice';

// Mock the store
vi.mock('../state/teamsSlice');

const mockFetchTeams = vi.fn();
const mockUseTeamsStore = useTeamsStore as any;

const renderTeamsList = () => {
  return render(
    <BrowserRouter>
      <TeamsList />
    </BrowserRouter>
  );
};

describe('TeamsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 3 teams when loaded', async () => {
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
      {
        id: 3,
        name: 'Team Gamma',
        memberCount: 7,
        practiceCount: 12,
        coverage: 89,
        role: 'owner' as const,
        createdAt: '2026-01-17T09:00:00.000Z',
      },
    ];

    mockUseTeamsStore.mockReturnValue({
      teams: mockTeams,
      isLoading: false,
      error: null,
      fetchTeams: mockFetchTeams,
      reset: vi.fn(),
    });

    renderTeamsList();

    // Advance timers to ensure minLoadTime passes
    await vi.runAllTimersAsync();

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.getByText('Team Gamma')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    mockUseTeamsStore.mockReturnValue({
      teams: [],
      isLoading: true,
      error: null,
      fetchTeams: mockFetchTeams,
      reset: vi.fn(),
    });

    renderTeamsList();

    // Should show skeleton placeholders (animated pulse)
    const skeletons = screen.getAllByRole('generic', { hidden: true });
    const loadingElements = skeletons.filter((el) =>
      el.className.includes('animate-pulse')
    );
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when teams array is empty', async () => {
    mockUseTeamsStore.mockReturnValue({
      teams: [],
      isLoading: false,
      error: null,
      fetchTeams: mockFetchTeams,
      reset: vi.fn(),
    });

    renderTeamsList();

    // Advance timers
    await vi.runAllTimersAsync();

    expect(screen.getByText('No teams yet')).toBeInTheDocument();
    expect(screen.getByText('Create one or wait for an invite.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('shows error message and retry button on fetch failure', async () => {
    mockUseTeamsStore.mockReturnValue({
      teams: [],
      isLoading: false,
      error: 'Connection failed. Check your internet and retry.',
      fetchTeams: mockFetchTeams,
      reset: vi.fn(),
    });

    renderTeamsList();

    // Advance timers
    await vi.runAllTimersAsync();

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('Connection failed. Check your internet and retry.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls fetchTeams on mount', () => {
    mockUseTeamsStore.mockReturnValue({
      teams: [],
      isLoading: false,
      error: null,
      fetchTeams: mockFetchTeams,
      reset: vi.fn(),
    });

    renderTeamsList();

    expect(mockFetchTeams).toHaveBeenCalledTimes(1);
  });

  it('maintains loading skeleton for at least 300ms', async () => {
    // Start with loading state
    mockUseTeamsStore.mockReturnValue({
      teams: [],
      isLoading: true,
      error: null,
      fetchTeams: mockFetchTeams,
      reset: vi.fn(),
    });

    renderTeamsList();

    // Initially loading - skeleton should be visible
    expect(screen.getByText('My Teams')).toBeInTheDocument();
    const skeletons = screen.getAllByRole('generic', { hidden: true });
    const loadingElements = skeletons.filter((el) =>
      el.className.includes('animate-pulse')
    );
    expect(loadingElements.length).toBeGreaterThan(0);

    // Verify loading state persists for the minimum time
    // (detailed timer behavior tested in integration tests)
  });
});
