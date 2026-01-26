import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PracticeDetailSidebar } from './PracticeDetailSidebar';
import * as api from '../api/practices.api';

// Mock the API
vi.mock('../api/practices.api', () => ({
    fetchPracticeDetail: vi.fn(),
    logPracticeDetailViewed: vi.fn(),
}));

describe('PracticeDetailSidebar', () => {
    const mockPractice = {
        id: 1,
        title: 'Test Practice',
        goal: 'To test things',
        description: 'Detailed description',
        categoryId: 'cat1',
        categoryName: 'Category 1',
        pillars: [{ id: 1, name: 'Pillar 1' }],
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
            // Verify complex object rendering
            expect(screen.getByText('Scrum Master:')).toBeInTheDocument();
            expect(screen.getByText(/Facilitator/)).toBeInTheDocument();
            expect(screen.getByText('Developer')).toBeInTheDocument();

            expect(screen.getByText('Backlog:')).toBeInTheDocument();
            expect(screen.getByText(/List of items/)).toBeInTheDocument();
            expect(screen.getByText('Simple Product')).toBeInTheDocument();
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
        // Check argument is the practice object
        expect(onEdit.mock.calls[0][0]).toMatchObject({ id: 1, title: 'Test Practice' });
    });
});
