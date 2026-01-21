import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamCoverageCard } from './TeamCoverageCard'
import * as teamPracticesApi from '../api/teamPracticesApi'
import type { TeamPillarCoverage } from '../types/coverage.types'

vi.mock('../api/teamPracticesApi', () => ({
  fetchTeamPractices: vi.fn(),
  fetchAvailablePractices: vi.fn(),
  addPracticeToTeam: vi.fn()
}))

describe('TeamCoverageCard', () => {
  const coverage: TeamPillarCoverage = {
    overallCoveragePct: 73.68,
    coveredCount: 14,
    totalCount: 19,
    coveredPillars: [
      { id: 1, name: 'Communication', category: 'Human Values', description: 'Clear communication' }
    ],
    gapPillars: [
      { id: 2, name: 'Transparency', category: 'Human Values', description: 'Transparency' }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders coverage summary and progress bar', () => {
    render(
      <TeamCoverageCard
        teamId={1}
        coverage={coverage}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
      />
    )

    expect(screen.getByText('Coverage: 14/19 pillars (73.68%)')).toBeInTheDocument()
    const progress = screen.getByTestId('coverage-progress')
    expect(progress).toHaveStyle({ width: '73.68%' })
  })

  it('shows covered and gap pillars lists', () => {
    render(
      <TeamCoverageCard
        teamId={1}
        coverage={coverage}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
      />
    )

    expect(screen.getByText('Covered Pillars')).toBeInTheDocument()
    expect(screen.getByText('Gap Pillars')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Communication' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transparency' })).toBeInTheDocument()
  })

  it('opens detail modal when clicking covered pillar', async () => {
    vi.mocked(teamPracticesApi.fetchTeamPractices).mockResolvedValue({
      items: [
        {
          id: 9,
          title: 'Daily Standup',
          goal: 'Sync daily',
          categoryId: 'scrum',
          categoryName: 'Scrum',
          pillars: [
            { id: 1, name: 'Communication', category: 'Human Values', description: 'Clear communication' }
          ]
        }
      ]
    })

    render(
      <TeamCoverageCard
        teamId={1}
        coverage={coverage}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Communication' }))

    await waitFor(() => {
      expect(screen.getByText('Pillar Details')).toBeInTheDocument()
      expect(screen.getByText('Daily Standup')).toBeInTheDocument()
    })
  })

  it('adds a practice from gap pillar suggestions and refreshes coverage', async () => {
    const onRefresh = vi.fn()

    vi.mocked(teamPracticesApi.fetchAvailablePractices).mockResolvedValue({
      items: [
        {
          id: 3,
          title: 'Sprint Review',
          goal: 'Review sprint outcomes',
          categoryId: 'scrum',
          categoryName: 'Scrum',
          pillars: [
            { id: 2, name: 'Transparency', category: 'Human Values', description: 'Transparency' }
          ]
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    })

    vi.mocked(teamPracticesApi.addPracticeToTeam).mockResolvedValue({
      teamPractice: { id: 11, teamId: 1, practiceId: 3, addedAt: '2026-01-21T10:00:00Z' },
      coverage: 78
    })

    render(
      <TeamCoverageCard
        teamId={1}
        coverage={coverage}
        isLoading={false}
        error={null}
        onRefresh={onRefresh}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Transparency' }))

    const addButton = await screen.findByRole('button', { name: /add sprint review/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(teamPracticesApi.addPracticeToTeam).toHaveBeenCalledWith(1, 3)
      expect(onRefresh).toHaveBeenCalled()
    })
  })
})
