import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreatePracticeModal } from './CreatePracticeModal';
import { useManagePracticesStore } from '../state/managePracticesSlice';
import * as teamPracticesApi from '../api/teamPracticesApi';
import type { Practice } from '../types/practice.types';

vi.mock('../state/managePracticesSlice');
vi.mock('../api/teamPracticesApi', () => ({
  fetchAvailablePractices: vi.fn(),
  fetchTeamPractices: vi.fn()
}));

describe('CreatePracticeModal', () => {
  const mockPractices: Practice[] = [
    {
      id: 1,
      title: 'Daily Standup',
      goal: 'Sync the team daily',
      categoryId: 'scrum',
      categoryName: 'Scrum',
      pillars: [
        { id: 10, name: 'Communication', category: 'Human Values', description: null }
      ]
    },
    {
      id: 2,
      title: 'Kanban Review',
      goal: 'Review workflow',
      categoryId: 'kanban',
      categoryName: 'Kanban',
      pillars: [
        { id: 11, name: 'Flow', category: 'Process', description: null }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(teamPracticesApi.fetchTeamPractices).mockResolvedValue({
      items: [mockPractices[0]],
      requestId: 'req_1'
    });

    vi.mocked(teamPracticesApi.fetchAvailablePractices).mockResolvedValue({
      items: [mockPractices[1]],
      page: 1,
      pageSize: 50,
      total: 1
    });

    (useManagePracticesStore as any).mockReturnValue({
      createPractice: vi.fn(),
      isCreating: false,
      error: null
    });
  });

  it('shows two creation options', () => {
    render(
      <CreatePracticeModal
        teamId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.getByText('Create from Scratch')).toBeInTheDocument();
    expect(screen.getByText('Use Existing as Template')).toBeInTheDocument();
  });

  it('prefills fields and appends (Copy) for template flow', async () => {
    render(
      <CreatePracticeModal
        teamId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Use Existing as Template'));

    const templateOption = await screen.findByText('Daily Standup');
    fireEvent.click(templateOption);

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('Daily Standup (Copy)');
      expect(screen.getByLabelText('Goal / Objective')).toHaveValue('Sync the team daily');
      expect(screen.getByLabelText('Category')).toHaveValue('scrum');
    });
  });

  it('shows validation errors and blocks submit when required fields are missing', async () => {
    render(
      <CreatePracticeModal
        teamId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Create from Scratch'));

    fireEvent.click(screen.getByRole('button', { name: 'Create Practice' }));

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Goal is required')).toBeInTheDocument();
      expect(screen.getByText('Select at least one pillar')).toBeInTheDocument();
    });
  });
});
