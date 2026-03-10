// Removed unused React import
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DecisionModal } from '../DecisionModal';

describe('DecisionModal', () => {
    it('renders correctly when open', () => {
        render(<DecisionModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByText('Record Adaptation Decision')).toBeInTheDocument();
        expect(screen.getByLabelText(/Decision Details/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<DecisionModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.queryByText('Record Adaptation Decision')).not.toBeInTheDocument();
    });

    it('shows validation error if text is too short', async () => {
        const mockSubmit = vi.fn();
        render(<DecisionModal isOpen={true} onClose={vi.fn()} onSubmit={mockSubmit} />);

        const input = screen.getByLabelText(/Decision Details/i);
        const submitButton = screen.getByRole('button', { name: /Save Decision/i });

        fireEvent.change(input, { target: { value: 'short' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Decision must be at least 10 characters')).toBeInTheDocument();
        });
        expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('submits successfully and closes modal on success', async () => {
        const mockSubmit = vi.fn().mockResolvedValue(true);
        const mockClose = vi.fn();
        render(<DecisionModal isOpen={true} onClose={mockClose} onSubmit={mockSubmit} />);

        const input = screen.getByLabelText(/Decision Details/i);
        const submitButton = screen.getByRole('button', { name: /Save Decision/i });

        fireEvent.change(input, { target: { value: 'This is a valid long enough decision text.' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalledWith('This is a valid long enough decision text.');
        });
        await waitFor(() => {
            expect(mockClose).toHaveBeenCalled();
        });
    });
});
