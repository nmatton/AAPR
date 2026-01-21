import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { TeamPracticesPanel } from './TeamPracticesPanel'
import * as teamPracticesApi from '../api/teamPracticesApi'

vi.mock('../api/teamPracticesApi')

describe('TeamPracticesPanel', () => {
  const teamId = 4

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows impacted pillars in confirmation dialog', async () => {
    const fetchMock = vi.mocked(teamPracticesApi.fetchTeamPractices)

    fetchMock.mockResolvedValue({
      items: [
        {
          id: 1,
          title: 'Practice A',
          goal: 'Goal A',
          categoryId: 'scrum',
          categoryName: 'Scrum',
          pillars: [
            { id: 10, name: 'Pillar One', category: 'Values' },
            { id: 11, name: 'Pillar Two', category: 'Flow' }
          ]
        },
        {
          id: 2,
          title: 'Practice B',
          goal: 'Goal B',
          categoryId: 'kanban',
          categoryName: 'Kanban',
          pillars: [{ id: 11, name: 'Pillar Two', category: 'Flow' }]
        }
      ]
    })

    render(<TeamPracticesPanel teamId={teamId} />)

    expect(await screen.findByText('Practice A')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Pillars losing coverage')).toBeInTheDocument()
    expect(within(dialog).getByText('Pillar One')).toBeInTheDocument()
  })

  it('removes practice on confirm and updates list', async () => {
    const fetchMock = vi.mocked(teamPracticesApi.fetchTeamPractices)
    const removeMock = vi.mocked(teamPracticesApi.removePracticeFromTeam)

    fetchMock.mockResolvedValue({
      items: [
        {
          id: 5,
          title: 'Practice C',
          goal: 'Goal C',
          categoryId: 'scrum',
          categoryName: 'Scrum',
          pillars: [{ id: 12, name: 'Pillar Three', category: 'Flow' }]
        }
      ]
    })
    removeMock.mockResolvedValue({ teamPracticeId: 5, coverage: 58 })

    render(<TeamPracticesPanel teamId={teamId} />)

    expect(await screen.findByText('Practice C')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Remove' }))

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith(teamId, 5)
    })

    await waitFor(() => {
      expect(screen.queryByText('Practice C')).not.toBeInTheDocument()
    })
  })

  it('shows error and keeps item on failure', async () => {
    const fetchMock = vi.mocked(teamPracticesApi.fetchTeamPractices)
    const removeMock = vi.mocked(teamPracticesApi.removePracticeFromTeam)

    fetchMock.mockResolvedValue({
      items: [
        {
          id: 9,
          title: 'Practice D',
          goal: 'Goal D',
          categoryId: 'xp',
          categoryName: 'XP',
          pillars: [{ id: 13, name: 'Pillar Four', category: 'Value' }]
        }
      ]
    })
    removeMock.mockRejectedValue(new Error('Server error'))

    render(<TeamPracticesPanel teamId={teamId} />)

    expect(await screen.findByText('Practice D')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Remove' }))

    expect(await screen.findByText('Unable to remove practice. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('Practice D')).toBeInTheDocument()
  })

  it('calls onPracticeRemoved after successful removal', async () => {
    const fetchMock = vi.mocked(teamPracticesApi.fetchTeamPractices)
    const removeMock = vi.mocked(teamPracticesApi.removePracticeFromTeam)
    const onPracticeRemoved = vi.fn()

    fetchMock.mockResolvedValue({
      items: [
        {
          id: 12,
          title: 'Practice E',
          goal: 'Goal E',
          categoryId: 'kanban',
          categoryName: 'Kanban',
          pillars: [{ id: 14, name: 'Pillar Five', category: 'Flow' }]
        }
      ]
    })
    removeMock.mockResolvedValue({ teamPracticeId: 12, coverage: 52 })

    render(<TeamPracticesPanel teamId={teamId} onPracticeRemoved={onPracticeRemoved} />)

    expect(await screen.findByText('Practice E')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Remove' }))

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith(teamId, 12)
      expect(onPracticeRemoved).toHaveBeenCalled()
    })
  })
})
