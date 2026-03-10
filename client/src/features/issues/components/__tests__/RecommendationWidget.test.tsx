import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendationWidget } from '../RecommendationWidget';
import * as recommendationsApi from '../../api/recommendationsApi';

vi.mock('../../api/recommendationsApi');

describe('RecommendationWidget', () => {
    const mockRecommendations = [
        {
            practiceId: 10,
            title: 'Daily Stand-up',
            goal: 'Quick team sync',
            categoryId: 'ceremonies',
            tier: 1,
            affinityScore: 0.85,
            affinityDelta: 0.13,
            reason: 'Equivalent practice with higher team affinity',
        },
        {
            practiceId: 20,
            title: 'Kanban Board',
            goal: 'Visual workflow',
            categoryId: 'tools',
            tier: 2,
            affinityScore: 0.72,
            affinityDelta: 0.10,
            reason: 'Same category, covers required pillars, higher team affinity',
        },
        {
            practiceId: 30,
            title: 'Sprint Review',
            goal: 'Stakeholder feedback',
            categoryId: 'ceremonies',
            tier: 3,
            affinityScore: 0.55,
            affinityDelta: 0.03,
            reason: 'Covers required pillars with higher team affinity',
        },
    ];

    const defaultProps = {
        teamId: 1,
        practiceId: 5,
        onPracticeClick: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays loading skeleton initially', () => {
        vi.mocked(recommendationsApi.getRecommendations).mockReturnValue(
            new Promise(() => {}) // Never resolves → stays in loading
        );

        render(<RecommendationWidget {...defaultProps} />);

        expect(screen.getByTestId('recommendations-loading')).toBeInTheDocument();
        expect(screen.getByText('Alternative Practices')).toBeInTheDocument();
    });

    it('renders recommendation cards after loading', async () => {
        vi.mocked(recommendationsApi.getRecommendations).mockResolvedValue(mockRecommendations);

        render(<RecommendationWidget {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('recommendations-widget')).toBeInTheDocument();
        });

        // All 3 practice names should be visible
        expect(screen.getByText('Daily Stand-up')).toBeInTheDocument();
        expect(screen.getByText('Kanban Board')).toBeInTheDocument();
        expect(screen.getByText('Sprint Review')).toBeInTheDocument();

        // Affinity deltas should be rendered as percentage differences
        expect(screen.getByText('+13%')).toBeInTheDocument();
        expect(screen.getByText('+10%')).toBeInTheDocument();
        expect(screen.getByText('+3%')).toBeInTheDocument();

        // Rationale text should be visible
        expect(screen.getByText('Equivalent practice with higher team affinity')).toBeInTheDocument();
    });

    it('displays at most 3 recommendations even if more are returned', async () => {
        const fiveRecommendations = [
            ...mockRecommendations,
            {
                practiceId: 40,
                title: 'Pair Programming',
                goal: 'Collaborative coding',
                categoryId: 'engineering',
                tier: 3,
                affinityScore: 0.60,
                affinityDelta: 0.05,
                reason: 'Covers required pillars',
            },
            {
                practiceId: 50,
                title: 'Mob Programming',
                goal: 'Whole team coding',
                categoryId: 'engineering',
                tier: 3,
                affinityScore: 0.58,
                affinityDelta: 0.02,
                reason: 'Covers required pillars',
            },
        ];
        vi.mocked(recommendationsApi.getRecommendations).mockResolvedValue(fiveRecommendations);

        render(<RecommendationWidget {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('recommendations-widget')).toBeInTheDocument();
        });

        const cards = screen.getAllByTestId(/^recommendation-card-/);
        expect(cards).toHaveLength(3);

        // Items 4 and 5 should NOT be rendered
        expect(screen.queryByText('Pair Programming')).not.toBeInTheDocument();
        expect(screen.queryByText('Mob Programming')).not.toBeInTheDocument();
    });

    it('shows empty state when no recommendations', async () => {
        vi.mocked(recommendationsApi.getRecommendations).mockResolvedValue([]);

        render(<RecommendationWidget {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('recommendations-empty')).toBeInTheDocument();
        });

        expect(screen.getByText(/no alternative practices/i)).toBeInTheDocument();
    });

    it('shows error state when API fails', async () => {
        vi.mocked(recommendationsApi.getRecommendations).mockRejectedValue(
            new Error('Network error')
        );

        render(<RecommendationWidget {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('recommendations-error')).toBeInTheDocument();
        });

        expect(screen.getByText(/unable to load recommendations/i)).toBeInTheDocument();
    });

    it('calls onPracticeClick when a recommendation card is clicked', async () => {
        vi.mocked(recommendationsApi.getRecommendations).mockResolvedValue(mockRecommendations);
        const clickHandler = vi.fn();

        render(<RecommendationWidget {...defaultProps} onPracticeClick={clickHandler} />);

        await waitFor(() => {
            expect(screen.getByTestId('recommendations-widget')).toBeInTheDocument();
        });

        const card = screen.getByTestId('recommendation-card-10');
        await userEvent.click(card);

        expect(clickHandler).toHaveBeenCalledTimes(1);
        expect(clickHandler).toHaveBeenCalledWith(10);
    });

    it('fetches recommendations with correct teamId and practiceId', async () => {
        vi.mocked(recommendationsApi.getRecommendations).mockResolvedValue([]);

        render(<RecommendationWidget teamId={42} practiceId={7} onPracticeClick={vi.fn()} />);

        await waitFor(() => {
            expect(recommendationsApi.getRecommendations).toHaveBeenCalledWith(42, 7);
        });
    });
});
