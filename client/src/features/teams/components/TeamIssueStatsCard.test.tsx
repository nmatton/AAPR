import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TeamIssueStatsCard } from './TeamIssueStatsCard';
import { getIssueStats } from '../../issues/api/issuesApi';
import { MemoryRouter } from 'react-router-dom';

// Mock the API calls
vi.mock('../../issues/api/issuesApi', () => ({
    getIssueStats: vi.fn(),
}));


const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('TeamIssueStatsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders loading state initially', () => {
        (getIssueStats as any).mockImplementation(() => new Promise(() => { })); // Never resolves
        render(
            <MemoryRouter>
                <TeamIssueStatsCard teamId={1} />
            </MemoryRouter>
        );
        // Depending on implementation, might show nothing or a skeleton
        // The current implementation shows a pulse animation which might be hard to test by class without unique IDs
        // But we can check for "Total Issues" NOT being present yet
        expect(screen.queryByText('Total Issues')).not.toBeInTheDocument();
    });

    test('renders stats correctly after loading', async () => {
        (getIssueStats as any).mockResolvedValue({
            total: 12,
            byStatus: {
                open: 5,
                in_progress: 3,
                adaptation_in_progress: 1,
                evaluated: 1,
                done: 2,
            },
        });

        render(
            <MemoryRouter>
                <TeamIssueStatsCard teamId={1} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Total Issues')).toBeInTheDocument();
        });

        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Open (5)')).toBeInTheDocument();
        expect(screen.getByText('In Progress (3)')).toBeInTheDocument();
        expect(screen.getByText('Adaptation in progress (1)')).toBeInTheDocument();
        expect(screen.getByText('Evaluated (1)')).toBeInTheDocument();
        expect(screen.getByText('Done (2)')).toBeInTheDocument();
    });

    test('handles error state', async () => {
        (getIssueStats as any).mockRejectedValue(new Error('Failed to fetch'));

        render(
            <MemoryRouter>
                <TeamIssueStatsCard teamId={1} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Failed to load issue stats')).toBeInTheDocument();
        });
    });

    test('navigates on button click', async () => {
        (getIssueStats as any).mockResolvedValue({
            total: 10,
            byStatus: {
                open: 5,
                in_progress: 2,
                adaptation_in_progress: 1,
                evaluated: 1,
                done: 1,
            },
        });

        render(
            <MemoryRouter>
                <TeamIssueStatsCard teamId={1} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('View All Issues')).toBeInTheDocument();
        });

        screen.getByText('View All Issues').click();
        expect(mockNavigate).toHaveBeenCalledWith('/teams/1/issues');
    });

    test('shows legend labels for adaptation in progress and evaluated', async () => {
        (getIssueStats as any).mockResolvedValue({
            total: 7,
            byStatus: {
                open: 1,
                in_progress: 1,
                adaptation_in_progress: 2,
                evaluated: 2,
                done: 1,
            },
        });

        render(
            <MemoryRouter>
                <TeamIssueStatsCard teamId={1} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Total Issues')).toBeInTheDocument();
        });

        expect(screen.getByText('Adaptation in progress (2)')).toBeInTheDocument();
        expect(screen.getByText('Evaluated (2)')).toBeInTheDocument();
    });

    test('uses rendered status bucket totals to size bar segments', async () => {
        (getIssueStats as any).mockResolvedValue({
            total: 10,
            byStatus: {
                open: 2,
                in_progress: 1,
                adaptation_in_progress: 1,
                evaluated: 0,
                done: 0,
            },
        });

        render(
            <MemoryRouter>
                <TeamIssueStatsCard teamId={1} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Total Issues')).toBeInTheDocument();
        });

        expect(screen.getByTestId('issue-status-segment-open')).toHaveStyle({ width: '50%' });
        expect(screen.getByTestId('issue-status-segment-in_progress')).toHaveStyle({ width: '25%' });
        expect(screen.getByTestId('issue-status-segment-adaptation_in_progress')).toHaveStyle({ width: '25%' });
        expect(screen.getByTestId('issue-status-segment-evaluated')).toHaveStyle({ width: '0%' });
        expect(screen.getByTestId('issue-status-segment-done')).toHaveStyle({ width: '0%' });
    });
});
