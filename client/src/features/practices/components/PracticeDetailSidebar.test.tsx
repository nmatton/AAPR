import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PracticeDetailSidebar } from './PracticeDetailSidebar';
import * as api from '../api/practices.api';

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

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
        tags: ['Remote-Friendly'],
        pillars: [{ id: 101, name: 'Pillar 1' }, { id: 102, name: 'Pillar 2' }],
        step: '1. Do this',
        benefits: ['Fast'],
        pitfalls: ['Slow'],
        workProducts: [{ name: 'Backlog', description: 'List of items' }, 'Simple Product'],
        activities: [
            { sequence: 2, name: 'Act B', description: 'desc B' },
            { sequence: 1, name: 'Act A', description: 'desc A' },
        ],
        completionCriteria: 'All tests green',
        metrics: [{ name: 'Velocity', unit: 'points', formula: 'sum(completed)' }],
        guidelines: [{ name: 'Scrum Guide', url: 'https://scrum.org', type: 'web' }],
        associatedPractices: [{ targetPracticeId: 42, associationType: 'Dependency', targetPracticeTitle: 'Daily Standup' }],
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

        await waitFor(() => expect(screen.getAllByText('Test Practice').length).toBeGreaterThan(0));

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

        await waitFor(() => expect(screen.getAllByText('Test Practice').length).toBeGreaterThan(0));

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
            expect(screen.getAllByText('Test Practice').length).toBeGreaterThan(0);
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

        await waitFor(() => expect(screen.getAllByText('Test Practice').length).toBeGreaterThan(0));

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

        await waitFor(() => expect(screen.getAllByText('Test Practice').length).toBeGreaterThan(0));

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

        await waitFor(() => expect(screen.getAllByText('Test Practice').length).toBeGreaterThan(0));

        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);
        expect(onEdit).toHaveBeenCalled();
        expect(onEdit.mock.calls[0][0]).toMatchObject({ id: 1, title: 'Test Practice' });
    });

    it('renders activities in sequence order with name and description', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        await waitFor(() => expect(api.fetchPracticeDetail).toHaveBeenCalledWith(1));

        const activitiesHeader = screen.getByRole('heading', { name: 'Activities' });
        const activitiesSection = activitiesHeader.parentElement as HTMLElement;
        const activityA = within(activitiesSection).getByText((_, element) => {
            return element?.tagName === 'P' && (element.textContent?.includes('Act A') ?? false);
        });
        const activityB = within(activitiesSection).getByText((_, element) => {
            return element?.tagName === 'P' && (element.textContent?.includes('Act B') ?? false);
        });
        expect(activityA.compareDocumentPosition(activityB) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByText('desc A')).toBeInTheDocument();
        expect(screen.getByText('desc B')).toBeInTheDocument();
    });

    it('renders completion criteria text', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        const completionHeader = await screen.findByRole('heading', { name: 'Completion Criteria' });
        const completionSection = completionHeader.parentElement as HTMLElement;
        expect(within(completionSection).getByText('All tests green')).toBeInTheDocument();
    });

    it('renders metrics with name, unit, and formula', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        const metricsHeader = await screen.findByRole('heading', { name: 'Metrics' });
        const metricsSection = metricsHeader.parentElement as HTMLElement;
        const metricText = within(metricsSection).getByText((_, element) => {
            return element?.tagName === 'P' && (element.textContent?.includes('Velocity') ?? false);
        });
        expect(metricText.textContent).toContain('points');
        expect(within(metricsSection).getByText('sum(completed)')).toBeInTheDocument();
    });

    it('renders metrics without unit or formula when only the metric name is provided', async () => {
        const practiceWithSimpleMetric = {
            ...mockPractice,
            metrics: [{ name: 'Coverage' }],
        };
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: practiceWithSimpleMetric });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        const metricsHeader = await screen.findByRole('heading', { name: 'Metrics' });
        const metricsSection = metricsHeader.parentElement as HTMLElement;
        expect(within(metricsSection).getByText('Coverage')).toBeInTheDocument();
        expect(within(metricsSection).queryByText('sum(completed)')).not.toBeInTheDocument();
    });

    it('renders guideline link when url is non-empty', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        await waitFor(() => expect(screen.getByText('Scrum Guide')).toBeInTheDocument());
        const link = screen.getByRole('link', { name: 'Scrum Guide' });
        expect(link).toHaveAttribute('href', 'https://scrum.org');
    });

    it('renders associated practices and navigates to target practice when clicked', async () => {
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

        const associatedHeader = await screen.findByRole('heading', { name: 'Associated Practices' });
        const associatedSection = associatedHeader.parentElement as HTMLElement;
        expect(within(associatedSection).getByText('Daily Standup')).toBeInTheDocument();
        expect(within(associatedSection).getByText('Dependency')).toBeInTheDocument();

        fireEvent.click(within(associatedSection).getByRole('button', { name: /Daily Standup/i }));
        expect(onNavigate).toHaveBeenCalledWith(42);
    });

    it('renders associated practices as non-interactive content when navigation is unavailable', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        const associatedHeader = await screen.findByRole('heading', { name: 'Associated Practices' });
        const associatedSection = associatedHeader.parentElement as HTMLElement;
        expect(within(associatedSection).getByText('Daily Standup')).toBeInTheDocument();
        expect(within(associatedSection).getByText('Dependency')).toBeInTheDocument();
        expect(within(associatedSection).queryByRole('button', { name: /Daily Standup/i })).not.toBeInTheDocument();
    });

    it('renders fallback text for null and empty extended fields without crashing', async () => {
        const emptyFieldsPractice = {
            ...mockPractice,
            activities: null,
            completionCriteria: null,
            metrics: [],
            guidelines: [{ name: 'Internal Ref', url: '' }],
            associatedPractices: null,
        };
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: emptyFieldsPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        await waitFor(() => expect(api.fetchPracticeDetail).toHaveBeenCalledWith(1));
        expect(screen.getByText('Activities')).toBeInTheDocument();
        expect(screen.getByText('Completion Criteria')).toBeInTheDocument();
        expect(screen.getByText('Metrics')).toBeInTheDocument();
        expect(screen.getByText('Associated Practices')).toBeInTheDocument();
        expect(screen.getByText('Internal Ref')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Internal Ref' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Daily Standup/i })).not.toBeInTheDocument();
        expect(screen.getAllByText('Not specified').length).toBeGreaterThan(0);
    });

    it('shows tag tooltip description for a known valid tag', async () => {
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: mockPractice });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        await waitFor(() => expect(screen.getByText('Remote-Friendly')).toBeInTheDocument());

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        fireEvent.mouseEnter(screen.getByText('Remote-Friendly'));
        expect(screen.getByRole('tooltip')).toHaveTextContent('Well suited for remote work');
        fireEvent.mouseLeave(screen.getByText('Remote-Friendly'));
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('does not crash and does not show tooltip text for unknown tag', async () => {
        const practiceWithUnknownTag = {
            ...mockPractice,
            tags: ['unknown-tag-xyz']
        };
        (api.fetchPracticeDetail as any).mockResolvedValue({ practice: practiceWithUnknownTag });

        render(
            <PracticeDetailSidebar
                isOpen={true}
                onClose={() => { }}
                practiceId={1}
            />
        );

        await waitFor(() => expect(screen.getByText('unknown-tag-xyz')).toBeInTheDocument());

        fireEvent.mouseEnter(screen.getByText('unknown-tag-xyz'));
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        expect(screen.queryByText('Well suited for remote work')).not.toBeInTheDocument();
    });
});
