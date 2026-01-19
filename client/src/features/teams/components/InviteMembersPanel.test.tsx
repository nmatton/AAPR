import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InviteMembersPanel } from './InviteMembersPanel'
import * as invitesApi from '../api/invitesApi'

vi.mock('../api/invitesApi')

describe('InviteMembersPanel', () => {
  const teamId = 10
  const teamName = 'Team Alpha'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows validation error for invalid email', async () => {
    ;(invitesApi.getInvites as unknown as vi.Mock).mockResolvedValue([])

    render(<InviteMembersPanel teamId={teamId} teamName={teamName} />)

    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }))

    expect(await screen.findByText('Invalid email format')).toBeInTheDocument()
  })

  it('renders invite list with status chips', async () => {
    ;(invitesApi.getInvites as unknown as vi.Mock).mockResolvedValue([
      { id: 1, teamId, email: 'a@example.com', status: 'Pending' },
      { id: 2, teamId, email: 'b@example.com', status: 'Added' },
      { id: 3, teamId, email: 'c@example.com', status: 'Failed' }
    ])

    render(<InviteMembersPanel teamId={teamId} teamName={teamName} />)

    expect(await screen.findByText('a@example.com')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('resend button calls resendInvite', async () => {
    ;(invitesApi.getInvites as unknown as vi.Mock).mockResolvedValue([
      { id: 5, teamId, email: 'retry@example.com', status: 'Failed' }
    ])
    ;(invitesApi.resendInvite as unknown as vi.Mock).mockResolvedValue({
      id: 5,
      teamId,
      email: 'retry@example.com',
      status: 'Pending'
    })

    render(<InviteMembersPanel teamId={teamId} teamName={teamName} />)

    const resendButton = await screen.findByRole('button', { name: /resend email/i })
    fireEvent.click(resendButton)

    await waitFor(() => {
      expect(invitesApi.resendInvite).toHaveBeenCalledWith(teamId, 5)
    })
  })
})
