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
            total: 10,
            byStatus: {
                open: 5,
                in_progress: 3,
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

        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText(/Op \(5\)/)).toBeInTheDocument();
        expect(screen.getByText(/WIP \(3\)/)).toBeInTheDocument();
        expect(screen.getByText(/Dn \(2\)/)).toBeInTheDocument();
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
            byStatus: { open: 5, in_progress: 3, done: 2 },
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
});
