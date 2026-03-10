import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PracticeCard } from './PracticeCard'

const practice = {
  id: 1,
  title: 'Daily Standup',
  goal: 'Sync',
  categoryId: 'FEEDBACK_APPRENTISSAGE',
  categoryName: 'FEEDBACK & APPRENTISSAGE',
  pillars: [
    { id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' },
    { id: 2, name: 'Transparency', category: 'VALEURS HUMAINES' }
  ]
}

describe('PracticeCard', () => {
  it('renders practice content and handles select', () => {
    const onSelect = vi.fn()
    render(
      <PracticeCard
        practice={practice as any}
        onSelect={onSelect}
        affinity={{
          individual: { score: 0.55, status: 'ok' },
          team: { score: null, status: 'insufficient_profile_data' }
        }}
      />
    )

    expect(screen.getByText(/Daily Standup/)).toBeInTheDocument()
    expect(screen.getByText(/FEEDBACK & APPRENTISSAGE/)).toBeInTheDocument()
    expect(screen.getByText(/Communication/)).toBeInTheDocument()
    expect(screen.getByText(/0.55/)).toBeInTheDocument()
    expect(screen.getByText(/N\/A/)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Daily Standup/))
    expect(onSelect).toHaveBeenCalledWith(practice)
  })
})
