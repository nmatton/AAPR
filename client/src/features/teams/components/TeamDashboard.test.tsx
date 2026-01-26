import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamDashboard } from './TeamDashboard';
import { updateTeamName } from '../api/teamsApi';

const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ teamId: '1' }),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams]
  };
});

const mockFetchTeams = vi.fn();
const mockFetchCoverage = vi.fn();

const mockTeam = {
  id: 1,
  name: 'Platform Team',
  version: 2,
  memberCount: 5,
  practiceCount: 3,
  coverage: 55,
  role: 'owner' as const,
  createdAt: '2026-01-23T09:00:00.000Z'
};

vi.mock('../state/teamsSlice', () => ({
  useTeamsStore: () => ({
    teams: [mockTeam],
    isLoading: false,
    fetchTeams: mockFetchTeams,
    error: null
  })
}));

vi.mock('../state/coverageSlice', () => ({
  useCoverageStore: () => ({
    fetchCoverage: mockFetchCoverage
  })
}));

vi.mock('../api/teamsApi', () => ({
  updateTeamName: vi.fn()
}));

vi.mock('./TeamPracticesPanel', () => ({
  TeamPracticesPanel: () => <div>Practices Panel</div>
}));

vi.mock('./CoverageSidebar', () => ({
  CoverageSidebar: () => <div>Coverage Sidebar</div>
}));

vi.mock('../../practices/components/PracticeDetailSidebar', () => ({
  PracticeDetailSidebar: () => <div data-testid="practice-sidebar" />
}));

describe('TeamDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders team name and edit button', () => {
    render(<TeamDashboard />);

    expect(screen.getByText('Platform Team')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit team name/i })).toBeInTheDocument();
  });

  it('activates edit mode when pencil icon is clicked', () => {
    render(<TeamDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /edit team name/i }));

    expect(screen.getByRole('textbox', { name: /team name/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Platform Team')).toBeInTheDocument();
  });

  it('saves the team name and shows success toast', async () => {
    vi.mocked(updateTeamName).mockResolvedValue({
      id: 1,
      name: 'New Team Name',
      version: 3,
      updatedAt: '2026-01-23T10:00:00.000Z'
    });

    render(<TeamDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /edit team name/i }));

    const input = screen.getByRole('textbox', { name: /team name/i });
    fireEvent.change(input, { target: { value: 'New Team Name' } });

    fireEvent.click(screen.getByRole('button', { name: /save team name/i }));

    await waitFor(() => {
      expect(updateTeamName).toHaveBeenCalledWith(1, 'New Team Name', 2);
    });

    expect(await screen.findByText('Team name updated')).toBeInTheDocument();
  });
});
