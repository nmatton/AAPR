import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PracticeSelectionStep } from './PracticeSelectionStep'
import * as practicesApi from '../api/practicesApi'

vi.mock('../api/practicesApi', () => ({
  getPractices: vi.fn()
}))

describe('PracticeSelectionStep', () => {
  const mockOnBack = vi.fn()
  const mockOnSubmit = vi.fn()
  const mockOnCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(practicesApi.getPractices).mockResolvedValue([
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Synchronize work',
        categoryId: 'PROCESS_EXECUTION',
        categoryName: 'Process & Execution',
        method: ' Scrum ',
        tags: ['Written / Async-Ready'],
        pillars: [{ id: 1, name: 'Communication', category: 'Process' }]
      },
      {
        id: 2,
        title: 'User Interview',
        goal: 'Understand customer needs',
        categoryId: 'PRODUCT_VALUE',
        categoryName: 'Product Value & Customer Alignment',
        method: 'Lean UX',
        tags: ['User-Feedback Oriented'],
        pillars: [{ id: 2, name: 'Discovery', category: 'Product' }]
      }
    ])
  })

  it('renders advanced filters and deduplicates trimmed method options', async () => {
    render(
      <PracticeSelectionStep
        onBack={mockOnBack}
        onSubmit={mockOnSubmit}
        onCreate={mockOnCreate}
        isCreating={false}
        selectedPracticeIds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Daily Standup')).toBeInTheDocument()
    })

    expect(screen.getByText('Categories')).toBeInTheDocument()
    expect(screen.getByText('Method / Framework')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getAllByText('Scrum')).toHaveLength(1)
  })

  it('filters practices by category and method together', async () => {
    render(
      <PracticeSelectionStep
        onBack={mockOnBack}
        onSubmit={mockOnSubmit}
        onCreate={mockOnCreate}
        isCreating={false}
        selectedPracticeIds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Daily Standup')).toBeInTheDocument()
      expect(screen.getByText('User Interview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Process & Execution'))
    fireEvent.click(screen.getByLabelText('Scrum'))

    expect(screen.getByText('Daily Standup')).toBeInTheDocument()
    expect(screen.queryByText('User Interview')).not.toBeInTheDocument()
    expect(screen.getByText('Active filters:')).toBeInTheDocument()
  })
})