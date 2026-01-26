import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PracticeDetailSidebar } from './PracticeDetailSidebar';
import * as api from '../api/practices.api';

// Mock the API
vi.mock('../api/practices.api', () => ({
    fetchPracticeDetail: vi.fn(),
    logPracticeDetailViewed: vi.fn(),
}));

// Mock the PillarContextPopover to avoid complexity in this test
vi.mock('./PillarContextPopover', () => ({
    PillarContextPopover: ({ pillar, onNavigateToPractice, onClose }: any) => (
        <div data-testid="mock-popover">
            <h2>{pillar.name} Context</h2>
            <button onClick={() => onNavigateToPractice(999)}>Navigate</button>
            <button onClick={onClose}>Close</button>
        </div>
    )
}));

describe('PracticeDetailSidebar', () => {
    const mockPractice = {
        id: 1,
        title: 'Test Practice',
        goal: 'To test things',
        description: 'Detailed description',
        categoryId: 'cat1',
        categoryName: 'Category 1',
        pillars: [{ id: 101, name: 'Pillar 1' }, { id: 102, name: 'Pillar 2' }],
        step: '1. Do this',
        benefits: ['Fast'],
        pitfalls: ['Slow'],
        workProducts: [{ name: 'Backlog', description: 'List of items' }, 'Simple Product'],
        roles: [{ role: 'Scrum Master', responsibility: 'Facilitator' }, 'Developer'],
        practiceVersion: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('opens pillar context popover when clicking a pillar', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        await waitFor(() => expect(screen.getByText('Test Practice')).toBeInTheDocument());

        // Pillars should be buttons now
        const pillarBtn = screen.getByRole('button', { name: 'Pillar 1' });
        fireEvent.click(pillarBtn);

        // Popover should appear
        expect(screen.getByTestId('mock-popover')).toBeInTheDocument();
        expect(screen.getByText('Pillar 1 Context')).toBeInTheDocument();
    });

    it('calls onNavigateToPractice when triggered from popover', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });
        const onNavigate = vi.fn();

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
                onNavigateToPractice={onNavigate}
            />
        );

        await waitFor(() => expect(screen.getByText('Test Practice')).toBeInTheDocument());

        // Open popover
        fireEvent.click(screen.getByRole('button', { name: 'Pillar 1' }));

        // Trigger navigation
        fireEvent.click(screen.getByText('Navigate'));

        expect(onNavigate).toHaveBeenCalledWith(999);
        // Popover should be closed after navigation (removed from DOM)
        expect(screen.queryByTestId('mock-popover')).not.toBeInTheDocument();
    });

    it('fetches practice details when opened', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        expect(screen.getByText(/loading/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(api.fetchPracticeDetail).toHaveBeenCalledWith(1);
        });

        await waitFor(() => {
            expect(screen.getByText('Test Practice')).toBeInTheDocument();
        });
    });

    it('shows Add to Team button when provided and not in team', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });
        const onAdd = vi.fn();

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
                isPracticeInTeam={false}
                onAddToTeam={onAdd}
            />
        );

        await waitFor(() => expect(screen.getByText('Test Practice')).toBeInTheDocument());

        const addButton = screen.getByRole('button', { name: /add to team/i });
        fireEvent.click(addButton);
        expect(onAdd).toHaveBeenCalledWith(1);
    });

    it('shows Remove from Team button when provided and in team', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });
        const onRemove = vi.fn();

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
                isPracticeInTeam={true}
                onRemoveFromTeam={onRemove}
            />
        );

        await waitFor(() => expect(screen.getByText('Test Practice')).toBeInTheDocument());

        const removeButton = screen.getByRole('button', { name: /remove from team/i });
        fireEvent.click(removeButton);
        expect(onRemove).toHaveBeenCalledWith(1);
    });

    it('shows Edit button when onEdit is provided', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });
        const onEdit = vi.fn();

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
                onEdit={onEdit}
            />
        );

        await waitFor(() => expect(screen.getByText('Test Practice')).toBeInTheDocument());

        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);
        expect(onEdit).toHaveBeenCalled();
        expect(onEdit.mock.calls[0][0]).toMatchObject({ id: 1, title: 'Test Practice' });
    });
});
