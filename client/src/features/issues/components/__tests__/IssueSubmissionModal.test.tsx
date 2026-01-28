
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IssueSubmissionModal } from '../IssueSubmissionModal';
import userEvent from '@testing-library/user-event';

const mockCreateIssue = vi.fn();
const mockOnClose = vi.fn();

const mockPractices = [
    { id: 1, title: 'TDD', categoryName: 'Engineering', pillars: [] },
    { id: 2, title: 'Pair Programming', categoryName: 'Engineering', pillars: [] }
];

describe('IssueSubmissionModal', () => {
    it('renders correctly when open', () => {
        render(
            <IssueSubmissionModal
                isOpen={true}
                onClose={mockOnClose}
                teamId={1}
                practices={mockPractices as any}
                onSubmit={mockCreateIssue}
            />
        );
        expect(screen.getByText('Submit New Issue')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
        render(
            <IssueSubmissionModal
                isOpen={true}
                onClose={mockOnClose}
                teamId={1}
                practices={mockPractices as any}
                onSubmit={mockCreateIssue}
            />
        );

        fireEvent.click(screen.getByText('Submit Issue'));

        await waitFor(() => {
            expect(screen.getByText('Title must be at least 5 characters')).toBeInTheDocument();
            expect(screen.getByText('Description must be at least 10 characters')).toBeInTheDocument();
        });
    });

    it('submits form with valid data', async () => {
        const user = userEvent.setup();
        render(
            <IssueSubmissionModal
                isOpen={true}
                onClose={mockOnClose}
                teamId={1}
                practices={mockPractices as any}
                onSubmit={mockCreateIssue}
            />
        );

        await user.type(screen.getByLabelText(/Title/i), 'Test Issue Title');
        await user.type(screen.getByLabelText(/Description/i), 'Test Issue Description Content');
        await user.selectOptions(screen.getByLabelText(/Priority/i), 'MEDIUM');

        // Select a practice (assuming multi-select or checkbox)
        // For simplicity in test, assume select for now, or we'll adjust based on implementation.
        // Let's assume a multiple select or checkboxes.
        // Screen could find "TDD" text.
        // Select a practice
        await user.click(screen.getByLabelText('TDD'));

        fireEvent.click(screen.getByText('Submit Issue'));

        await waitFor(() => {
            expect(mockCreateIssue).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Test Issue Title',
                description: 'Test Issue Description Content',
                priority: 'MEDIUM',
                priority: 'MEDIUM',
                practiceIds: [1]
            }));
        });
    });
});
