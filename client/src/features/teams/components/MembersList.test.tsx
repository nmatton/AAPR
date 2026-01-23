import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MembersList } from '../components/MembersList'
import type { TeamMemberSummary } from '../types/member.types'

const mockMembers: TeamMemberSummary[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    joinDate: '2025-01-01T00:00:00Z',
    inviteStatus: 'Added',
    bigFiveCompleted: true
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    joinDate: '2025-01-05T00:00:00Z',
    inviteStatus: 'Added',
    bigFiveCompleted: false
  }
]

describe('MembersList', () => {
  it('renders list of members', () => {
    const mockHandler = vi.fn()
    render(<MembersList members={mockMembers} onMemberRemoved={mockHandler} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('displays join dates', () => {
    const mockHandler = vi.fn()
    render(<MembersList members={mockMembers} onMemberRemoved={mockHandler} />)

    expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument()
    expect(screen.getByText('Jan 5, 2025')).toBeInTheDocument()
  })

  it('shows empty state when no members', () => {
    const mockHandler = vi.fn()
    render(<MembersList members={[]} onMemberRemoved={mockHandler} />)

    expect(screen.getByText('No team members yet')).toBeInTheDocument()
    expect(screen.getByText(/Invite members using the form/i)).toBeInTheDocument()
  })

  it('opens confirmation dialog when remove button clicked', async () => {
    const mockHandler = vi.fn()
    render(<MembersList members={mockMembers} onMemberRemoved={mockHandler} />)

    const removeButtons = screen.getAllByLabelText(/Remove/i)
    fireEvent.click(removeButtons[0])

    expect(await screen.findByRole('heading', { name: /Remove Member\?/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirm remove John Doe/i)).toBeInTheDocument()
  })

  it('closes confirmation dialog on cancel', async () => {
    const mockHandler = vi.fn()
    render(<MembersList members={mockMembers} onMemberRemoved={mockHandler} />)

    const removeButtons = screen.getAllByLabelText(/Remove/i)
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
    })

    const cancelButton = screen.getByLabelText('Cancel remove')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText(/Are you sure/i)).not.toBeInTheDocument()
    })
  })

  it('calls onMemberRemoved when confirmed', async () => {
    const mockHandler = vi.fn<[number, string], Promise<void>>().mockResolvedValue(undefined)
    render(<MembersList members={mockMembers} onMemberRemoved={mockHandler} />)

    const removeButtons = screen.getAllByLabelText(/Remove/i)
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
    })

    const confirmButton = screen.getByLabelText(/Confirm remove John Doe/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledWith(1, 'John Doe')
    })
  })

  it('shows removing state on confirm button', async () => {
    const mockHandler = vi.fn<[number, string], Promise<void>>(() => new Promise(() => {})) // Never resolves
    render(<MembersList members={mockMembers} onMemberRemoved={mockHandler} />)

    const removeButtons = screen.getAllByLabelText(/Remove/i)
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
    })

    const confirmButton = screen.getByLabelText(/Confirm remove John Doe/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText('Removing...')).toBeInTheDocument()
    })
  })

  it('displays remove button for each member', () => {
    const mockHandler = vi.fn()
    render(<MembersList members={mockMembers} onMemberRemoved={mockHandler} />)

    const removeButtons = screen.getAllByLabelText(/Remove/i)
    expect(removeButtons).toHaveLength(2)
  })
})
