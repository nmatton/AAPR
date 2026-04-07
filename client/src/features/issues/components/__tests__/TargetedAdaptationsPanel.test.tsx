import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TargetedAdaptationsPanel } from '../TargetedAdaptationsPanel';
import * as issuesApi from '../../api/issuesApi';

vi.mock('../../api/issuesApi');

describe('TargetedAdaptationsPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows a loading state before recommendations resolve', () => {
        vi.mocked(issuesApi.getDirectedTagRecommendations).mockReturnValue(new Promise(() => {}));

        render(<TargetedAdaptationsPanel teamId={1} issueId={10} />);

        expect(screen.getByTestId('targeted-adaptations-loading')).toBeInTheDocument();
    });

    it('renders recommendation cards with details', async () => {
        vi.mocked(issuesApi.getDirectedTagRecommendations).mockResolvedValue([
            {
                candidateTagId: 1,
                candidateTagName: 'Decision ownership',
                recommendationText: 'Delegate local decisions to the team.',
                implementationOptions: ['Rotate ownership', 'Document boundaries'],
                sourceProblematicTagId: 10,
                sourceProblematicTagName: 'Low autonomy',
                absoluteAffinity: 1,
                deltaScore: 1,
                reason: 'Transition -→+: Low autonomy → Decision ownership',
            },
            {
                candidateTagId: 2,
                candidateTagName: 'Facilitated retrospectives',
                recommendationText: 'Use guided retrospectives to surface blockers.',
                implementationOptions: ['Use prompts'],
                sourceProblematicTagId: 11,
                sourceProblematicTagName: 'Low reflection',
                absoluteAffinity: 0.5,
                deltaScore: 0.5,
                reason: 'Transition 0→+: Low reflection → Facilitated retrospectives',
            },
            {
                candidateTagId: 3,
                candidateTagName: 'Timeboxed syncs',
                recommendationText: 'Add shorter alignment checkpoints.',
                implementationOptions: [],
                sourceProblematicTagId: 12,
                sourceProblematicTagName: 'Drift',
                absoluteAffinity: 0.5,
                deltaScore: 0,
                reason: 'Transition 0→0: Drift → Timeboxed syncs',
            },
        ]);

        render(<TargetedAdaptationsPanel teamId={1} issueId={10} />);

        await waitFor(() => {
            expect(screen.getByTestId('targeted-adaptations-panel')).toBeInTheDocument();
        });

        expect(screen.getAllByTestId(/^targeted-adaptation-card-/)).toHaveLength(3);
        expect(screen.getByText('Decision ownership')).toBeInTheDocument();
        expect(screen.getByText('Resolves: Low autonomy')).toBeInTheDocument();
        expect(screen.getByText('Delegate local decisions to the team.')).toBeInTheDocument();
        expect(screen.getByText('Rotate ownership')).toBeInTheDocument();
    });

    it('shows an error state when recommendations fail to load', async () => {
        vi.mocked(issuesApi.getDirectedTagRecommendations).mockRejectedValue(new Error('boom'));

        render(<TargetedAdaptationsPanel teamId={1} issueId={10} />);

        await waitFor(() => {
            expect(screen.getByTestId('targeted-adaptations-error')).toBeInTheDocument();
        });

        expect(screen.getByText('Unable to load targeted adaptations')).toBeInTheDocument();
    });

    it('hides the panel when no recommendations are returned', async () => {
        vi.mocked(issuesApi.getDirectedTagRecommendations).mockResolvedValue([]);

        const { container } = render(<TargetedAdaptationsPanel teamId={1} issueId={10} />);

        await waitFor(() => {
            expect(issuesApi.getDirectedTagRecommendations).toHaveBeenCalledWith(1, 10);
        });

        expect(screen.queryByTestId('targeted-adaptations-panel')).not.toBeInTheDocument();
        expect(container).toBeEmptyDOMElement();
    });
});