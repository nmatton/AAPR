import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentForm } from '../CommentForm';

describe('CommentForm', () => {
    const mockOnSubmit = vi.fn();
    const issueId = 123;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders correctly', () => {
        render(<CommentForm issueId={issueId} onSubmit={mockOnSubmit} isSubmitting={false} />);

        expect(screen.getByLabelText(/add a comment/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/share your perspective/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled(); // Disabled initially because empty
    });

    it('enables button when input is provided', () => {
        render(<CommentForm issueId={issueId} onSubmit={mockOnSubmit} isSubmitting={false} />);

        const textarea = screen.getByLabelText(/add a comment/i);
        fireEvent.change(textarea, { target: { value: 'Something' } });

        expect(screen.getByRole('button', { name: /post comment/i })).toBeEnabled();
    });

    it('loads draft from localStorage', () => {
        localStorage.setItem(`issue_comment_draft_${issueId}`, 'Draft comment');
        render(<CommentForm issueId={issueId} onSubmit={mockOnSubmit} isSubmitting={false} />);

        expect(screen.getByLabelText(/add a comment/i)).toHaveValue('Draft comment');
    });

    it('saves draft to localStorage on change', () => {
        render(<CommentForm issueId={issueId} onSubmit={mockOnSubmit} isSubmitting={false} />);

        const textarea = screen.getByLabelText(/add a comment/i);
        fireEvent.change(textarea, { target: { value: 'New draft' } });

        expect(localStorage.getItem(`issue_comment_draft_${issueId}`)).toBe('New draft');
    });

    it('calls onSubmit and clears localStorage on successful submission', async () => {
        mockOnSubmit.mockResolvedValueOnce(undefined);
        localStorage.setItem(`issue_comment_draft_${issueId}`, 'To submit');

        render(<CommentForm issueId={issueId} onSubmit={mockOnSubmit} isSubmitting={false} />);

        const button = screen.getByRole('button', { name: /post comment/i });
        fireEvent.click(button);

        expect(mockOnSubmit).toHaveBeenCalledWith('To submit');

        await waitFor(() => {
            expect(screen.getByLabelText(/add a comment/i)).toHaveValue('');
        });

        expect(localStorage.getItem(`issue_comment_draft_${issueId}`)).toBeNull();
    });

    it('disables input and button while submitting', () => {
        render(<CommentForm issueId={issueId} onSubmit={mockOnSubmit} isSubmitting={true} />);

        expect(screen.getByLabelText(/add a comment/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: /posting/i })).toBeDisabled();
    });
});
