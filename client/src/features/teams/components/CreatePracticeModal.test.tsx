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
      description: 'Share daily progress and blockers.',
      categoryId: 'scrum',
      categoryName: 'Scrum',
      method: 'Scrum',
      tags: ['sync', 'daily'],
      benefits: ['Team alignment', 'Fast issue discovery'],
      pitfalls: ['Too long updates'],
      workProducts: ['Daily action list'],
      pillars: [
        { id: 10, name: 'Communication', category: 'Human Values', description: null }
      ]
    },
    {
      id: 2,
      title: 'Kanban Review',
      goal: 'Review workflow',
      description: null,
      categoryId: 'kanban',
      categoryName: 'Kanban',
      method: 'Kanban',
      tags: [],
      benefits: [],
      pitfalls: [],
      workProducts: [],
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
      expect(screen.getByLabelText('Detailed Description')).toHaveValue('Share daily progress and blockers.');
      expect(screen.getByLabelText('Method / Framework')).toHaveValue('Scrum');
      expect(screen.getByLabelText('Tags')).toHaveValue('sync, daily');
      expect(screen.getByLabelText('Benefits')).toHaveValue('Team alignment, Fast issue discovery');
      expect(screen.getByLabelText('Pitfalls')).toHaveValue('Too long updates');
      expect(screen.getByLabelText('Work Products')).toHaveValue('Daily action list');
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

  it('submits optional fields as normalized arrays', async () => {
    const createPractice = vi.fn().mockResolvedValue({ practiceId: 100, coverage: 25 });

    (useManagePracticesStore as any).mockReturnValue({
      createPractice,
      isCreating: false,
      error: null
    });

    render(
      <CreatePracticeModal
        teamId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Create from Scratch'));

    await screen.findByText('Communication');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Remote Retrospective' } });
    fireEvent.change(screen.getByLabelText('Goal / Objective'), { target: { value: 'Improve remote retros' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'scrum' } });
    fireEvent.click(screen.getByText('Communication'));

    fireEvent.change(screen.getByLabelText('Detailed Description'), { target: { value: 'Async-friendly format.' } });
    fireEvent.change(screen.getByLabelText('Method / Framework'), { target: { value: 'Custom' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'async, remote,  , team' } });
    fireEvent.change(screen.getByLabelText('Benefits'), { target: { value: 'Better focus\nReduced fatigue' } });
    fireEvent.change(screen.getByLabelText('Pitfalls'), { target: { value: 'Low participation' } });
    fireEvent.change(screen.getByLabelText('Work Products'), { target: { value: 'Action list, Decision log' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Practice' }));

    await waitFor(() => {
      expect(createPractice).toHaveBeenCalledWith(1, {
        title: 'Remote Retrospective',
        goal: 'Improve remote retros',
        categoryId: 'scrum',
        pillarIds: [10],
        description: 'Async-friendly format.',
        method: 'Custom',
        tags: ['async', 'remote', 'team'],
        benefits: ['Better focus', 'Reduced fatigue'],
        pitfalls: ['Low participation'],
        workProducts: ['Action list', 'Decision log']
      });
    });
  });

  describe('Template Duplication', () => {
    it('generates unique copy title when conflicts exist', async () => {
      // Add practice with title "Daily Standup (Copy)" to simulate conflict
      const practicesWithConflict: Practice[] = [
        ...mockPractices,
        {
          id: 3,
          title: 'Daily Standup (Copy)',
          goal: 'Sync team',
          description: null,
          categoryId: 'scrum',
          categoryName: 'Scrum',
          method: 'Scrum',
          tags: [],
          benefits: [],
          pitfalls: [],
          workProducts: [],
          pillars: [{ id: 10, name: 'Communication', category: 'Human Values', description: null }]
        }
      ];

      vi.mocked(teamPracticesApi.fetchTeamPractices).mockResolvedValue({
        items: practicesWithConflict,
        requestId: 'req_1'
      });

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
        expect(screen.getByLabelText('Title')).toHaveValue('Daily Standup - Copy 1');
      });
    });

    it('generates incrementing copy numbers for multiple conflicts', async () => {
      const practicesWithMultipleConflicts: Practice[] = [
        ...mockPractices,
        {
          id: 3,
          title: 'Daily Standup (Copy)',
          goal: 'Sync team',
          description: null,
          categoryId: 'scrum',
          categoryName: 'Scrum',
          method: 'Scrum',
          tags: [],
          benefits: [],
          pitfalls: [],
          workProducts: [],
          pillars: [{ id: 10, name: 'Communication', category: 'Human Values', description: null }]
        },
        {
          id: 4,
          title: 'Daily Standup - Copy 1',
          goal: 'Sync team',
          description: null,
          categoryId: 'scrum',
          categoryName: 'Scrum',
          method: 'Scrum',
          tags: [],
          benefits: [],
          pitfalls: [],
          workProducts: [],
          pillars: [{ id: 10, name: 'Communication', category: 'Human Values', description: null }]
        }
      ];

      vi.mocked(teamPracticesApi.fetchTeamPractices).mockResolvedValue({
        items: practicesWithMultipleConflicts,
        requestId: 'req_1'
      });

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
        expect(screen.getByLabelText('Title')).toHaveValue('Daily Standup - Copy 2');
      });
    });

    it('includes templatePracticeId when submitting duplicated practice', async () => {
      const createPractice = vi.fn().mockResolvedValue({ practiceId: 100, coverage: 25 });

      (useManagePracticesStore as any).mockReturnValue({
        createPractice,
        isCreating: false,
        error: null
      });

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
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Practice' }));

      await waitFor(() => {
        expect(createPractice).toHaveBeenCalledWith(1, expect.objectContaining({
          title: 'Daily Standup (Copy)',
          goal: 'Sync the team daily',
          templatePracticeId: 1
        }));
      });
    });

    it('allows editing all fields after template pre-fill', async () => {
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
      });

      // Edit all fields
      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Custom Standup' } });
      fireEvent.change(screen.getByLabelText('Goal / Objective'), { target: { value: 'Custom goal' } });
      fireEvent.change(screen.getByLabelText('Detailed Description'), { target: { value: 'Custom description' } });

      expect(screen.getByLabelText('Title')).toHaveValue('Custom Standup');
      expect(screen.getByLabelText('Goal / Objective')).toHaveValue('Custom goal');
      expect(screen.getByLabelText('Detailed Description')).toHaveValue('Custom description');
    });
  });
});
