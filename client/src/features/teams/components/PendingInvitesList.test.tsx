import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PendingInvitesList } from '../components/PendingInvitesList'
import type { TeamInvite } from '../types/invite.types'
import * as invitesApi from '../api/invitesApi'
import { useInvitesStore } from '../state/invitesSlice'

// Mock the API module
vi.mock('../api/invitesApi')

const mockInvites: TeamInvite[] = [
  {
    id: 1,
    teamId: 1,
    email: 'pending@example.com',
    status: 'Pending',
    createdAt: '2025-01-10T00:00:00Z'
  },
  {
    id: 2,
    teamId: 1,
    email: 'failed@example.com',
    status: 'Failed',
    createdAt: '2025-01-09T00:00:00Z',
    errorMessage: 'Email service unavailable'
  }
]

describe('PendingInvitesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useInvitesStore.setState({
      invites: [],
      isLoading: false,
      isCreating: false,
      isResending: false,
      error: null
    })
  })

  it('renders pending invites list', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    expect(screen.getByText('failed@example.com')).toBeInTheDocument()
  })

  it('displays invite status badges', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('shows Pending status as yellow badge', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    const pendingBadge = screen.getByText('Pending')
    expect(pendingBadge).toHaveClass('bg-yellow-50')
  })

  it('shows Failed status as red badge', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    const failedBadge = screen.getByText('Failed')
    expect(failedBadge).toHaveClass('bg-red-50')
  })

  it('displays send dates', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    expect(screen.getByText('Jan 10, 2025')).toBeInTheDocument()
    expect(screen.getByText('Jan 9, 2025')).toBeInTheDocument()
  })

  it('shows empty state when no pending invites', () => {
    render(<PendingInvitesList invites={[]} teamId={1} />)

    expect(screen.getByText('No pending invitations')).toBeInTheDocument()
  })

  it('filters out accepted invites', () => {
    const mixedInvites: TeamInvite[] = [
      ...mockInvites,
      {
        id: 3,
        teamId: 1,
        email: 'accepted@example.com',
        status: 'Added',
        createdAt: '2025-01-08T00:00:00Z'
      }
    ]

    render(<PendingInvitesList invites={mixedInvites} teamId={1} />)

    expect(screen.queryByText('accepted@example.com')).not.toBeInTheDocument()
    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
  })

  it('displays Retry button for failed invites', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    const retryButtons = screen.getAllByLabelText(/Retry sending/i)
    expect(retryButtons.length).toBeGreaterThan(0)
  })

  it('does not display Retry button for pending invites', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    const pendingRow = screen.getByText('pending@example.com').closest('tr')
    const dashInPendingRow = pendingRow?.querySelector('td:last-child')
    expect(dashInPendingRow?.textContent).toContain('-')
  })

  it('calls onInviteRetried callback after retry', async () => {
    const mockCallback = vi.fn()
    const mockUpdatedInvite = { ...mockInvites[1], status: 'Pending' as const }
    
    vi.mocked(invitesApi.resendInvite).mockResolvedValue(mockUpdatedInvite)

    render(<PendingInvitesList invites={mockInvites} teamId={1} onInviteRetried={mockCallback} />)

    const retryButton = screen.getByLabelText(/Retry sending invite to failed@example.com/i)
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled()
    })
  })

  it('shows loading state on retry button', async () => {
    vi.mocked(invitesApi.resendInvite).mockImplementation(
      () => new Promise<typeof mockInvites[0]>(() => {}) // Never resolves
    )

    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    const retryButton = screen.getByLabelText(/Retry sending invite to failed@example.com/i)
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Resending...')).toBeInTheDocument()
    })
  })

  it('displays created date for invites', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    // Check that dates are displayed
    const dateElements = screen.getAllByText(/Jan \d{1,2}, 2025/i)
    expect(dateElements.length).toBeGreaterThanOrEqual(2)
  })

  it('has proper table structure', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()

    const headerCells = screen.getAllByRole('columnheader')
    expect(headerCells.length).toBeGreaterThan(0)
  })

  it('displays invite email in table row', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    mockInvites.forEach((invite) => {
      expect(screen.getByText(invite.email)).toBeInTheDocument()
    })
  })

  it('has proper accessibility labels', () => {
    render(<PendingInvitesList invites={mockInvites} teamId={1} />)

    const retryButtons = screen.getAllByLabelText(/Retry sending/i)
    retryButtons.forEach((button) => {
      expect(button).toHaveAttribute('aria-label')
    })
  })
})
