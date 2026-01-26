import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PillarContextPopover } from './PillarContextPopover'
import * as coverageApi from '../../teams/api/coverageApi'
import * as practicesApi from '../api/practices.api'

vi.mock('../../teams/api/coverageApi', () => ({
    getTeamPillarCoverage: vi.fn()
}))

vi.mock('../api/practices.api', () => ({
    fetchPractices: vi.fn(),
    logPillarDetailViewed: vi.fn()
}))

describe('PillarContextPopover', () => {
    const mockPillar = {
        id: 1,
        name: 'Test Pillar',
        category: 'Test Category',
        description: 'Initial description'
    }

    const defaultProps = {
        pillar: mockPillar,
        currentPracticeId: 10,
        onClose: vi.fn(),
        onNavigateToPractice: vi.fn()
    }

    beforeEach(() => {
        vi.resetAllMocks()
            // Default global stub
            ; (practicesApi.fetchPractices as any).mockResolvedValue({ items: [], total: 0 })
    })

    it('renders pillar details correctly', () => {
        render(<PillarContextPopover {...defaultProps} />)

        expect(screen.getByText('Test Pillar')).toBeInTheDocument()
        expect(screen.getByText('Test Category')).toBeInTheDocument()
        expect(screen.getByText('Initial description')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
        render(<PillarContextPopover {...defaultProps} />)

        fireEvent.click(screen.getByRole('button', { name: /close/i }))
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('displays related team practices and global discovery practices separately', async () => {
        const mockCoverage = {
            overallCoveragePct: 50,
            coveredCount: 1,
            totalCount: 2,
            gapPillars: [],
            coveredPillars: [{
                id: 1,
                name: 'Test Pillar',
                categoryId: 'C1',
                description: 'Updated API description',
                practices: [
                    { id: 10, title: 'Current Practice' },
                    { id: 11, title: 'Team Practice A' }
                ]
            }],
            categoryBreakdown: []
        };

        const mockGlobalResponse = {
            items: [
                { id: 10, title: 'Current Practice' },
                { id: 11, title: 'Team Practice A' },
                { id: 12, title: 'Global Practice B' }
            ],
            total: 3
        };

        (coverageApi.getTeamPillarCoverage as any).mockResolvedValue(mockCoverage);
        (practicesApi.fetchPractices as any).mockResolvedValue(mockGlobalResponse);

        render(<PillarContextPopover {...defaultProps} teamId={99} />);

        await waitFor(() => {
            // Check Section Headers
            expect(screen.getByText('Related Team Practices')).toBeInTheDocument();
            expect(screen.getByText('Discover More')).toBeInTheDocument();

            // Check Team Practice A is in Team section
            expect(screen.getByText('Team Practice A')).toBeInTheDocument();

            // Check Global Practice B is in Discover section
            expect(screen.getByText('Global Practice B')).toBeInTheDocument();

            // Ensure Current Practice (10) is filtered out of both
            expect(screen.queryByText('Current Practice')).not.toBeInTheDocument();
        });
    });

    it('handles global fetching when teamId is missing', async () => {
        const mockGlobalResponse = {
            items: [
                { id: 12, title: 'Global Practice B' }
            ],
            total: 1
        };
        (practicesApi.fetchPractices as any).mockResolvedValue(mockGlobalResponse);

        render(<PillarContextPopover {...defaultProps} teamId={undefined} />);

        await waitFor(() => {
            expect(screen.queryByText('Related Team Practices')).not.toBeInTheDocument();
            expect(screen.getByText('Discover More')).toBeInTheDocument();
            expect(screen.getByText('Global Practice B')).toBeInTheDocument();
        });
    });

    it('calls onNavigateToPractice when a related practice is clicked', async () => {
        const mockGlobalResponse = {
            items: [{ id: 12, title: 'Global Practice B' }],
            total: 1
        };
        (practicesApi.fetchPractices as any).mockResolvedValue(mockGlobalResponse);

        render(<PillarContextPopover {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Global Practice B')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Global Practice B'));

        expect(defaultProps.onNavigateToPractice).toHaveBeenCalledWith(12);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
    it('logs view event on mount', () => {
        render(<PillarContextPopover {...defaultProps} />)
        expect(practicesApi.logPillarDetailViewed).toHaveBeenCalledWith(expect.objectContaining({
            teamId: null, // Implementation converts undefined to null
            practiceId: 10,
            pillarId: 1
        }))
    })

    it('applies correct color class based on category', () => {
        const props = {
            ...defaultProps,
            pillar: { ...mockPillar, category: 'VALEURS_HUMAINES' } // Should correspond to red
        }
        render(<PillarContextPopover {...props} />)
        const categoryBadge = screen.getByText('VALEURS_HUMAINES')
        expect(categoryBadge).toHaveClass('bg-red-100')
    })
})
