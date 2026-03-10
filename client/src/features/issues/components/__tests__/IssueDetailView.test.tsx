import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssueDetailView } from '../IssueDetailView';
import * as issuesApi from '../../api/issuesApi';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../api/issuesApi');
vi.mock('../../api/recommendationsApi', () => ({
    getRecommendations: vi.fn().mockResolvedValue([]),
}));

describe('IssueDetailView', () => {
    const mockIssueDetails = {
        issue: {
            id: 100,
            title: 'Test Issue',
            description: '# Marked Description',
            priority: 'HIGH' as const,
            status: 'OPEN',
            createdAt: '2023-01-01',
            author: { id: 1, name: 'Alice' },
            practices: [{ id: 1, title: 'Practice A' }],
        },
        history: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders issue details after loading', async () => {
        vi.mocked(issuesApi.getIssueDetails).mockResolvedValue(mockIssueDetails);

        render(
            <MemoryRouter initialEntries={['/teams/1/issues/100']}>
                <Routes>
                    <Route path="/teams/:teamId/issues/:issueId" element={<IssueDetailView />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Test Issue')).toBeInTheDocument();
            expect(screen.getByText('Open')).toBeInTheDocument();
            expect(screen.getByText('High')).toBeInTheDocument();
        });

        // Check Markdown rendering
        expect(screen.getByRole('heading', { name: 'Marked Description', level: 1 })).toBeInTheDocument();

        // Check linked practice
        expect(screen.getByText('Practice A')).toBeInTheDocument();
    });

    it('shows error if not found', async () => {
        vi.mocked(issuesApi.getIssueDetails).mockRejectedValue({ status: 404 });

        render(
            <MemoryRouter initialEntries={['/teams/1/issues/999']}>
                <Routes>
                    <Route path="/teams/:teamId/issues/:issueId" element={<IssueDetailView />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/not found/i)).toBeInTheDocument();
        });
    });

    it('renders one RecommendationWidget per linked practice', async () => {
        const multiPracticeDetails = {
            ...mockIssueDetails,
            issue: {
                ...mockIssueDetails.issue,
                practices: [
                    { id: 1, title: 'Practice A' },
                    { id: 2, title: 'Practice B' },
                ],
            },
        };
        vi.mocked(issuesApi.getIssueDetails).mockResolvedValue(multiPracticeDetails);

        const recommendationsApi = await import('../../api/recommendationsApi');

        render(
            <MemoryRouter initialEntries={['/teams/1/issues/100']}>
                <Routes>
                    <Route path="/teams/:teamId/issues/:issueId" element={<IssueDetailView />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Issue')).toBeInTheDocument();
        });

        // Should have called recommendations API once per linked practice
        expect(recommendationsApi.getRecommendations).toHaveBeenCalledTimes(2);
        expect(recommendationsApi.getRecommendations).toHaveBeenCalledWith(1, 1);
        expect(recommendationsApi.getRecommendations).toHaveBeenCalledWith(1, 2);

        // Both "For: Practice X" labels should be visible
        expect(screen.getByText('For: Practice A')).toBeInTheDocument();
        expect(screen.getByText('For: Practice B')).toBeInTheDocument();
    });
});
