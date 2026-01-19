import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { TeamMembersPanel } from './TeamMembersPanel'
import * as membersApi from '../api/membersApi'
import * as invitesApi from '../api/invitesApi'

vi.mock('../api/membersApi')
vi.mock('../api/invitesApi')

describe('TeamMembersPanel', () => {
  const teamId = 3

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders member list with status chips', async () => {
    const getMembersMock = vi.mocked(membersApi.getMembers)
    getMembersMock.mockResolvedValue([
      {
        id: 1,
        name: 'Alex Member',
        email: 'alex@example.com',
        joinDate: '2026-01-15T10:00:00.000Z',
        inviteStatus: 'Added',
        bigFiveCompleted: false
      },
      {
        id: 2,
        name: 'pending@example.com',
        email: 'pending@example.com',
        joinDate: '2026-01-16T10:00:00.000Z',
        inviteStatus: 'Pending',
        bigFiveCompleted: false
      },
      {
        id: 3,
        name: 'failed@example.com',
        email: 'failed@example.com',
        joinDate: '2026-01-17T10:00:00.000Z',
        inviteStatus: 'Failed',
        bigFiveCompleted: false
      }
    ])

    render(
      <BrowserRouter>
        <TeamMembersPanel teamId={teamId} />
      </BrowserRouter>
    )

    expect(await screen.findByText('Alex Member')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Added')).toBeInTheDocument()
  })

  it('shows pending tooltip and resend action', async () => {
    const getMembersMock = vi.mocked(membersApi.getMembers)
    const resendInviteMock = vi.mocked(invitesApi.resendInvite)

    getMembersMock.mockResolvedValue([
      {
        id: 2,
        name: 'pending@example.com',
        email: 'pending@example.com',
        joinDate: '2026-01-16T10:00:00.000Z',
        inviteStatus: 'Pending',
        bigFiveCompleted: false
      }
    ])
    resendInviteMock.mockResolvedValue({
      id: 2,
      teamId,
      email: 'pending@example.com',
      status: 'Pending'
    })

    render(
      <BrowserRouter>
        <TeamMembersPanel teamId={teamId} />
      </BrowserRouter>
    )

    const pendingChip = await screen.findByText('Pending')
    fireEvent.mouseEnter(pendingChip)

    expect(await screen.findByText('Awaiting signup')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /resend invite/i }))

    await waitFor(() => {
      expect(resendInviteMock).toHaveBeenCalledWith(teamId, 2)
    })
  })

  it('opens remove confirmation and calls removeMember', async () => {
    const getMembersMock = vi.mocked(membersApi.getMembers)
    const removeMemberMock = vi.mocked(membersApi.removeMember)

    getMembersMock.mockResolvedValue([
      {
        id: 5,
        name: 'Remove Me',
        email: 'remove@example.com',
        joinDate: '2026-01-15T10:00:00.000Z',
        inviteStatus: 'Added',
        bigFiveCompleted: false
      },
      {
        id: 6,
        name: 'Another Member',
        email: 'other@example.com',
        joinDate: '2026-01-15T10:00:00.000Z',
        inviteStatus: 'Added',
        bigFiveCompleted: false
      }
    ])
    removeMemberMock.mockResolvedValue(true)

    render(
      <BrowserRouter>
        <TeamMembersPanel teamId={teamId} />
      </BrowserRouter>
    )

    const removeButtons = await screen.findAllByRole('button', { name: 'Remove' })
    fireEvent.click(removeButtons[0])

    expect(screen.getByText(/Remove Remove Me from the team/i)).toBeInTheDocument()

    const confirmButtons = screen.getAllByRole('button', { name: 'Remove' })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(removeMemberMock).toHaveBeenCalledWith(teamId, 5)
    })
  })
})
