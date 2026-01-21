import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    }
  ]

  it('renders all 5 categories with percentages', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    expect(screen.getByText('VALEURS HUMAINES')).toBeInTheDocument()
    expect(screen.getByText('3/4 pillars (75%)')).toBeInTheDocument()

    expect(screen.getByText('FEEDBACK & APPRENTISSAGE')).toBeInTheDocument()
    expect(screen.getByText('2/4 pillars (50%)')).toBeInTheDocument()

    expect(screen.getByText('EXCELLENCE TECHNIQUE')).toBeInTheDocument()
    expect(screen.getByText('1/4 pillars (25%)')).toBeInTheDocument()
  })

  it('applies green color coding for 75%+ coverage', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesCategory = screen.getByText('3/4 pillars (75%)')
    expect(valuesCategory).toHaveClass('text-green-700')
  })

  it('applies yellow color coding for 50-74% coverage', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const feedbackCategory = screen.getByText('2/4 pillars (50%)')
    expect(feedbackCategory).toHaveClass('text-yellow-700')
  })

  it('applies red color coding for <50% coverage', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const excellenceCategory = screen.getByText('1/4 pillars (25%)')
    expect(excellenceCategory).toHaveClass('text-red-700')
  })

  it('expands category to show detail view when clicked', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    expect(screen.queryByText('Communication')).not.toBeInTheDocument()

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES/i })
    fireEvent.click(valuesButton)

    expect(screen.getByText('Communication')).toBeInTheDocument()
    expect(screen.getByText('Transparency')).toBeInTheDocument()
    expect(screen.getByText('Courage')).toBeInTheDocument()
    expect(screen.getByText('Respect')).toBeInTheDocument()
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

    const excellenceButton = screen.getByRole('button', { name: /EXCELLENCE TECHNIQUE/i })
    fireEvent.click(excellenceButton)

    expect(screen.getByText(/Warning: Low coverage in this category/i)).toBeInTheDocument()
    expect(screen.getByText(/Consider adding practices from this category/i)).toBeInTheDocument()
  })

  it('calls onViewPractices when View Available Practices button clicked', () => {
    const mockViewPractices = vi.fn()
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} onViewPractices={mockViewPractices} />)

    const excellenceButton = screen.getByRole('button', { name: /EXCELLENCE TECHNIQUE/i })
    fireEvent.click(excellenceButton)

    const viewPracticesButton = screen.getByRole('button', { name: /View Available Practices in EXCELLENCE TECHNIQUE/i })
    fireEvent.click(viewPracticesButton)

    expect(mockViewPractices).toHaveBeenCalledWith('excellence')
  })

  it('collapses category when clicked again', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES/i })
    fireEvent.click(valuesButton)

    expect(screen.getByText('Communication')).toBeInTheDocument()

    fireEvent.click(valuesButton)

    expect(screen.queryByText('Communication')).not.toBeInTheDocument()
  })

  it('only shows one category expanded at a time', () => {
    render(<CategoryCoverageBreakdown categoryBreakdown={mockCategoryBreakdown} />)

    const valuesButton = screen.getByRole('button', { name: /VALEURS HUMAINES/i })
    const feedbackButton = screen.getByRole('button', { name: /FEEDBACK & APPRENTISSAGE/i })

    fireEvent.click(valuesButton)
    expect(screen.getByText('Communication')).toBeInTheDocument()

    fireEvent.click(feedbackButton)
    expect(screen.queryByText('Communication')).not.toBeInTheDocument()
    expect(screen.getByText('Retrospectives')).toBeInTheDocument()
  })
})
