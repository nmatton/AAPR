import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AffinityBadge, affinityBadgeUtils } from './AffinityBadge'

describe('affinityBadgeUtils', () => {
  it('maps threshold boundaries correctly', () => {
    expect(affinityBadgeUtils.getAffinityState({ score: -0.31, status: 'ok' })).toBe('poor')
    expect(affinityBadgeUtils.getAffinityState({ score: -0.3, status: 'ok' })).toBe('neutral')
    expect(affinityBadgeUtils.getAffinityState({ score: 0, status: 'ok' })).toBe('neutral')
    expect(affinityBadgeUtils.getAffinityState({ score: 0.3, status: 'ok' })).toBe('neutral')
    expect(affinityBadgeUtils.getAffinityState({ score: 0.31, status: 'ok' })).toBe('good')
  })

  it('formats scores and N/A values', () => {
    expect(affinityBadgeUtils.formatScore({ score: 0.3333, status: 'ok' })).toBe('0.33')
    expect(affinityBadgeUtils.formatScore({ score: null, status: 'insufficient_profile_data' })).toBe('N/A')
  })
})

describe('AffinityBadge', () => {
  it('renders score rows and N/A state', () => {
    render(
      <AffinityBadge
        individual={{ score: null, status: 'insufficient_profile_data' }}
        team={{ score: 0.5123, status: 'ok' }}
      />
    )

    expect(screen.getByText('Individual')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
    expect(screen.getByText('0.51')).toBeInTheDocument()
  })

  it('shows tooltip content when legend button is activated', () => {
    render(
      <AffinityBadge
        individual={{ score: 0.1, status: 'ok' }}
        team={{ score: -0.5, status: 'ok' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /affinity score legend/i }))

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText(/personal fit based on Big Five profile and practice tags/i)).toBeInTheDocument()
    expect(screen.getByText(/average fit across team members with completed profiles/i)).toBeInTheDocument()
  })
})
