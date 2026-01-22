import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryCoverageBreakdown } from './CategoryCoverageBreakdown'
import type { CategoryCoverage } from '../types/coverage.types'

describe('CategoryCoverageBreakdown', () => {
  const mockCategoryBreakdown: CategoryCoverage[] = [
    {
      categoryId: 'values',
      categoryName: 'VALEURS HUMAINES',
      coveredCount: 3,
      totalCount: 4,
      coveragePct: 75,
      coveredPillars: [
        { id: 1, name: 'Communication', categoryId: 'values', description: null },
        { id: 2, name: 'Transparency', categoryId: 'values', description: null },
        { id: 3, name: 'Courage', categoryId: 'values', description: null }
      ],
      gapPillars: [
        { id: 4, name: 'Respect', categoryId: 'values', description: null }
      ]
    },
    {
      categoryId: 'feedback',
      categoryName: 'FEEDBACK & APPRENTISSAGE',
      coveredCount: 2,
      totalCount: 4,
      coveragePct: 50,
      coveredPillars: [
        { id: 5, name: 'Retrospectives', categoryId: 'feedback', description: null },
        { id: 6, name: 'Experiments', categoryId: 'feedback', description: null }
      ],
      gapPillars: [
        { id: 7, name: 'Metrics', categoryId: 'feedback', description: null },
        { id: 8, name: 'Learning', categoryId: 'feedback', description: null }
      ]
    },
    {
      categoryId: 'excellence',
      categoryName: 'EXCELLENCE TECHNIQUE',
      coveredCount: 1,
      totalCount: 4,
      coveragePct: 25,
      coveredPillars: [
        { id: 9, name: 'TDD', categoryId: 'excellence', description: null }
      ],
      gapPillars: [
        { id: 10, name: 'CI/CD', categoryId: 'excellence', description: null },
        { id: 11, name: 'Code Review', categoryId: 'excellence', description: null },
        { id: 12, name: 'Refactoring', categoryId: 'excellence', description: null }
      ]
    },
    {
      categoryId: 'iteration',
      categoryName: 'ITÉRATION & FLUX',
      coveredCount: 3,
      totalCount: 4,
      coveragePct: 75,
      coveredPillars: [
        { id: 13, name: 'Sprint Planning', categoryId: 'iteration', description: null },
        { id: 14, name: 'Daily Standup', categoryId: 'iteration', description: null },
        { id: 15, name: 'Sprint Review', categoryId: 'iteration', description: null }
      ],
      gapPillars: [
        { id: 16, name: 'Backlog Refinement', categoryId: 'iteration', description: null }
      ]
    },
    {
      categoryId: 'collaboration',
      categoryName: 'COLLABORATION & AUTONOMIE',
      coveredCount: 2,
      totalCount: 3,
      coveragePct: 67,
      coveredPillars: [
        { id: 17, name: 'Cross-functional Teams', categoryId: 'collaboration', description: null },
        { id: 18, name: 'Self-organization', categoryId: 'collaboration', description: null }
      ],
      gapPillars: [
        { id: 19, name: 'Team Empowerment', categoryId: 'collaboration', description: null }
      ]
    }
  ]

  it('renders all 5 categories with percentages', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    expect(screen.getByText('VALEURS HUMAINES')).toBeInTheDocument()
    expect(screen.getAllByText('(3/4 pillars)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0)

    expect(screen.getByText('FEEDBACK & APPRENTISSAGE')).toBeInTheDocument()
    expect(screen.getByText('(2/4 pillars)')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()

    expect(screen.getByText('EXCELLENCE TECHNIQUE')).toBeInTheDocument()
    expect(screen.getByText('(1/4 pillars)')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()

    expect(screen.getByText('ITÉRATION & FLUX')).toBeInTheDocument()
    expect(screen.getByText('COLLABORATION & AUTONOMIE')).toBeInTheDocument()
  })

  it('renders grid layout with all 5 categories', () => {
    const { container } = render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)
    
    // Check that grid container exists with correct classes
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
    
    // Check that all 5 category cards are rendered
    const categoryCards = screen.getAllByRole('button')
    expect(categoryCards).toHaveLength(5)
  })

  it('applies green color coding for 75%+ coverage', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesPercentage = screen.getAllByText('75%')[0]
    expect(valuesPercentage).toHaveClass('text-green-700')
  })

  it('applies yellow color coding for 50-74% coverage', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const feedbackPercentage = screen.getByText('50%')
    expect(feedbackPercentage).toHaveClass('text-yellow-700')
  })

  it('applies red color coding for <50% coverage', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const excellencePercentage = screen.getByText('25%')
    expect(excellencePercentage).toHaveClass('text-red-700')
  })

  it('displays warning icon for categories with <50% coverage', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const excellenceCard = screen.getByRole('button', { name: /EXCELLENCE TECHNIQUE.*25%/i })
    expect(excellenceCard).toBeInTheDocument()
    
    // Excellence has 25% coverage, should have warning icon
    expect(excellenceCard.textContent).toContain('⚠️')
  })

  it('expands category to show detail view when clicked', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    expect(screen.queryByText('Communication')).not.toBeInTheDocument()

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES.*75%/i })
    fireEvent.click(valuesButton)

    expect(screen.getByText('Communication')).toBeInTheDocument()
    expect(screen.getByText('Transparency')).toBeInTheDocument()
    expect(screen.getByText('Courage')).toBeInTheDocument()
    expect(screen.getByText('Respect')).toBeInTheDocument()
  })

  it('supports keyboard activation (Enter and Space keys)', async () => {
    const user = userEvent.setup()
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES.*75%/i })
    
    // Test Enter key
    valuesButton.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Communication')).toBeInTheDocument()
    
    // Collapse again
    await user.keyboard('{Enter}')
    expect(screen.queryByText('Communication')).not.toBeInTheDocument()
    
    // Test Space key
    await user.keyboard('{Space}')
    expect(screen.getByText('Communication')).toBeInTheDocument()
  })

  it('shows covered and gap pillars separately', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES/i })
    fireEvent.click(valuesButton)

    expect(screen.getByText(/Covered Pillars \(3\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Gap Pillars \(1\)/i)).toBeInTheDocument()
  })

  it('displays warning badge for categories < 50%', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const excellenceButton = screen.getByRole('button', { name: /EXCELLENCE TECHNIQUE.*25%/i })
    fireEvent.click(excellenceButton)

    expect(screen.getByText(/Warning: Low coverage in this category/i)).toBeInTheDocument()
    expect(screen.getByText(/Consider adding practices from this category/i)).toBeInTheDocument()
  })

  it('displays tiny pillar indicators for covered and gap pillars', () => {
    const { container } = render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    // Check for covered pillar indicators (green dots)
    const greenDots = container.querySelectorAll('.bg-green-500.w-2.h-2.rounded-full')
    expect(greenDots.length).toBeGreaterThan(0)

    // Check for gap pillar indicators (gray dots)
    const grayDots = container.querySelectorAll('.bg-gray-300.w-2.h-2.rounded-full')
    expect(grayDots.length).toBeGreaterThan(0)
  })

  it('renders compact progress bar with correct width', () => {
    const { container } = render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    // Find progress bars with the colored inner divs (h-2 class for compact bars)
    const progressBarContainers = container.querySelectorAll('.bg-gray-200.rounded-full.h-2')
    expect(progressBarContainers.length).toBe(5) // One for each category

    // Check first progress bar inner div (75% coverage)
    const firstProgressBarInner = progressBarContainers[0].querySelector('.h-2.rounded-full')
    expect(firstProgressBarInner).toBeInTheDocument()
    expect((firstProgressBarInner as HTMLElement).style.width).toBe('75%')
  })

  it('calls onViewPractices when View Available Practices button clicked', () => {
    const mockViewPractices = vi.fn()
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} onViewPractices={mockViewPractices} />)

    const excellenceButton = screen.getByRole('button', { name: /EXCELLENCE TECHNIQUE.*25%/i })
    fireEvent.click(excellenceButton)

    const viewPracticesButton = screen.getByRole('button', { name: /View available practices in EXCELLENCE TECHNIQUE/i })
    fireEvent.click(viewPracticesButton)

    expect(mockViewPractices).toHaveBeenCalledWith('excellence')
  })

  it('only shows View Available Practices button for categories with <50% coverage', () => {
    const mockViewPractices = vi.fn()
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} onViewPractices={mockViewPractices} />)

    // Expand Values (75% coverage) - should NOT have View Practices button
    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES.*75%/i })
    fireEvent.click(valuesButton)
    expect(screen.queryByText(/View Available Practices/i)).not.toBeInTheDocument()

    // Collapse Values and expand Excellence (25% coverage) - should have button
    fireEvent.click(valuesButton)
    const excellenceButton = screen.getByRole('button', { name: /EXCELLENCE TECHNIQUE.*25%/i })
    fireEvent.click(excellenceButton)
    expect(screen.getByRole('button', { name: /View available practices in EXCELLENCE TECHNIQUE/i })).toBeInTheDocument()
  })

  it('collapses category when clicked again', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES.*75%/i })
    fireEvent.click(valuesButton)

    expect(screen.getByText('Communication')).toBeInTheDocument()

    fireEvent.click(valuesButton)

    expect(screen.queryByText('Communication')).not.toBeInTheDocument()
  })

  it('only shows one category expanded at a time', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES.*75%/i })
    const feedbackButton = screen.getByRole('button', { name: /FEEDBACK & APPRENTISSAGE.*50%/i })

    fireEvent.click(valuesButton)
    expect(screen.getByText('Communication')).toBeInTheDocument()

    fireEvent.click(feedbackButton)
    expect(screen.queryByText('Communication')).not.toBeInTheDocument()
    expect(screen.getByText('Retrospectives')).toBeInTheDocument()
  })

  it('includes aria-labels for accessibility', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES.*75%.*coverage/i })
    expect(valuesButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(valuesButton)
    expect(valuesButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('includes progress bar with aria attributes', () => {
    const { container } = render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const progressBars = container.querySelectorAll('[role="progressbar"]')
    expect(progressBars.length).toBe(5) // One for each category

    const firstProgressBar = progressBars[0]
    expect(firstProgressBar).toHaveAttribute('aria-valuenow', '75')
    expect(firstProgressBar).toHaveAttribute('aria-valuemin', '0')
    expect(firstProgressBar).toHaveAttribute('aria-valuemax', '100')
  })
})
