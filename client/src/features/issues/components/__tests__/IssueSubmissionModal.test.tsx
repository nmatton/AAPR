
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueSubmissionModal } from '../IssueSubmissionModal';
import userEvent from '@testing-library/user-event';
import * as tagsApi from '../../api/tagsApi';

vi.mock('@headlessui/react', () => {
    const DialogRoot = ({ open, children, ...props }: any) => (
        open ? <div {...props}>{children}</div> : null
    );
    const DialogPanel = ({ children, ...props }: any) => <div {...props}>{children}</div>;
    const DialogTitle = ({ children, ...props }: any) => <h2 {...props}>{children}</h2>;

    return {
        Dialog: Object.assign(DialogRoot, {
            Panel: DialogPanel,
            Title: DialogTitle,
        }),
    };
});

vi.mock('../../api/tagsApi', () => ({
    getTags: vi.fn(),
}));

const mockCreateIssue = vi.fn();
const mockOnClose = vi.fn();

const mockPractices = [
    { id: 1, title: 'TDD', categoryName: 'Engineering', pillars: [] },
    { id: 2, title: 'Pair Programming', categoryName: 'Engineering', pillars: [] }
];

describe('IssueSubmissionModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        (tagsApi.getTags as any).mockResolvedValue([]);
    });

    it('renders correctly when open', () => {
        render(
            <IssueSubmissionModal
                isOpen={true}
                onClose={mockOnClose}
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
                practiceIds: [1],
                tagIds: [],
                isStandalone: false
            }));
        });
    });

    it('allows checking standalone issue and fetching global tags', async () => {
        (tagsApi.getTags as any).mockResolvedValue([{ id: 99, name: 'Missing Cap' }]);
        const user = userEvent.setup();
        
        render(
            <IssueSubmissionModal
                isOpen={true}
                onClose={mockOnClose}
                practices={mockPractices as any}
                onSubmit={mockCreateIssue}
            />
        );

        await user.type(screen.getByLabelText(/Title/i), 'Standalone Issue Title');
        await user.type(screen.getByLabelText(/Description/i), 'Description Content');

        await user.click(screen.getByLabelText('Practice not listed'));

        await waitFor(() => {
            expect(tagsApi.getTags).toHaveBeenCalled();
            expect(screen.getByLabelText('Missing Cap')).toBeInTheDocument();
        });

        await user.click(screen.getByLabelText('Missing Cap'));
        fireEvent.click(screen.getByText('Submit Issue'));

        await waitFor(() => {
            expect(mockCreateIssue).toHaveBeenCalledWith(expect.objectContaining({
                isStandalone: true,
                practiceIds: [],
                tagIds: [99]
            }));
        });
    });

    it('fetches practice-specific tags when a practice is selected', async () => {
        const practiceTags = [
            { id: 1, name: 'Verbal-Heavy', description: 'Heavy verbal communication', type: 'System', isGlobal: true },
            { id: 2, name: 'Whole Crowd', description: 'Whole team involvement', type: 'System', isGlobal: true },
        ];
        (tagsApi.getTags as any).mockResolvedValue(practiceTags);
        const user = userEvent.setup();

        render(
            <IssueSubmissionModal
                isOpen={true}
                onClose={mockOnClose}
                practices={mockPractices as any}
                onSubmit={mockCreateIssue}
            />
        );

        await user.type(screen.getByLabelText(/Title/i), 'Practice Linked Issue');
        await user.type(screen.getByLabelText(/Description/i), 'Issue details for linked practice mode');
        await user.click(screen.getByLabelText('TDD'));

        await waitFor(() => {
            expect(tagsApi.getTags).toHaveBeenCalledWith(
                expect.objectContaining({ practiceIds: expect.arrayContaining([1]) })
            );
            expect(screen.getByLabelText('Verbal-Heavy')).toBeInTheDocument();
            expect(screen.getByLabelText('Whole Crowd')).toBeInTheDocument();
        });

        await user.click(screen.getByLabelText('Verbal-Heavy'));
        fireEvent.click(screen.getByText('Submit Issue'));

        await waitFor(() => {
            expect(mockCreateIssue).toHaveBeenCalledWith(expect.objectContaining({
                isStandalone: false,
                practiceIds: [1],
                tagIds: [1],
            }));
        });
    });
});
