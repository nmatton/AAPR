import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RemovePracticeModal } from './RemovePracticeModal';
import type { Practice } from '../types/practice.types';
import * as teamPracticesApi from '../api/teamPracticesApi';

vi.mock('../api/teamPracticesApi', () => ({
  fetchPracticeRemovalImpact: vi.fn()
}));

describe('RemovePracticeModal', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders gap pillar list when removal creates gaps', async () => {
    vi.mocked(teamPracticesApi.fetchPracticeRemovalImpact).mockResolvedValue({
      pillarIds: [1],
      pillarNames: ['Communication'],
      gapPillarIds: [1],
      gapPillarNames: ['Communication'],
      willCreateGaps: true
    });

    render(
      <RemovePracticeModal
        practice={mockPractice}
        teamId={1}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isRemoving={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Coverage gaps will be created')).toBeInTheDocument();
      expect(screen.getByText('Communication')).toBeInTheDocument();
    });
  });

  it('renders safe message when removal creates no gaps', async () => {
    vi.mocked(teamPracticesApi.fetchPracticeRemovalImpact).mockResolvedValue({
      pillarIds: [1],
      pillarNames: ['Communication'],
      gapPillarIds: [],
      gapPillarNames: [],
      willCreateGaps: false
    });

    render(
      <RemovePracticeModal
        practice={mockPractice}
        teamId={1}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isRemoving={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No coverage gaps will be created.')).toBeInTheDocument();
    });
  });

  it('calls onConfirm when Remove Practice clicked', async () => {
    const onConfirm = vi.fn();

    vi.mocked(teamPracticesApi.fetchPracticeRemovalImpact).mockResolvedValue({
      pillarIds: [1],
      pillarNames: ['Communication'],
      gapPillarIds: [],
      gapPillarNames: [],
      willCreateGaps: false
    });

    render(
      <RemovePracticeModal
        practice={mockPractice}
        teamId={1}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        isRemoving={false}
      />
    );

    const removeButton = await screen.findByRole('button', { name: /remove practice/i });
    fireEvent.click(removeButton);

    expect(onConfirm).toHaveBeenCalled();
  });
});
