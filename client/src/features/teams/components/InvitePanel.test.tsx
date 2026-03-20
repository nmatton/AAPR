import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvitePanel } from '../components/InvitePanel'
import * as invitesApi from '../api/invitesApi'
import { useInvitesStore } from '../state/invitesSlice'

// Mock the API module
vi.mock('../api/invitesApi')

describe('InvitePanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    useInvitesStore.setState({
      invites: [],
      isLoading: false,
      isCreating: false,
      isResending: false,
      error: null,
      createNewInvite: vi.fn().mockResolvedValue({
        id: 1,
        teamId: 1,
        email: 'new@example.com',
        status: 'Pending'
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders invite panel form', () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    expect(screen.getByText('Invite Member')).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send invitation/i })).toBeInTheDocument()
  })

  it('validates empty email', async () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /Send invitation/i })

    // Focus and blur to trigger validation
    fireEvent.focus(emailInput)
    fireEvent.blur(emailInput)

    // Submit button should be disabled
    expect(submitButton).toBeDisabled()
  })

  it('validates invalid email format', async () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
  })

  it('enables submit button with valid email', async () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /Send invitation/i })

    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } })

    expect(submitButton).not.toBeDisabled()
  })

  it('clears validation error when user corrects email', async () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement

    // Type invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } })
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()

    // Clear and type valid email
    fireEvent.change(emailInput, { target: { value: '' } })
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } })

    expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
  })

  it('shows success message after successful invite', async () => {
    const mockCallback = vi.fn()
    const mockInvite = {
      id: 1,
      teamId: 1,
      email: 'new@example.com',
      status: 'Pending' as const
    }

    // Mock the store to return successful creation
    vi.mocked(invitesApi.createInvite).mockResolvedValue(mockInvite)

    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const submitButton = screen.getByRole('button', { name: /Send invitation/i })

    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith('new@example.com')
    })

    expect(screen.getByText('Invite sent to new@example.com')).toBeInTheDocument()

  })

  it('clears email input after successful submission', async () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /Send invitation/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(emailInput.value).toBe('')
    })
  })

  it('prevents multiple submissions', async () => {
    const mockCallback = vi.fn()
    useInvitesStore.setState({
      isCreating: true,
      createNewInvite: vi.fn()
    })
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const submitButton = screen.getByRole('button', { name: /Send invitation/i })

    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Sending...')
  })

  it('displays placeholder text', () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByPlaceholderText('name@example.com')
    expect(emailInput).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    expect(emailInput).toHaveAttribute('aria-label')
  })

  it('marks invalid email with aria-invalid', async () => {
    const mockCallback = vi.fn()
    render(<InvitePanel teamId={1} onInviteSent={mockCallback} />)

    const emailInput = screen.getByLabelText(/Email Address/i)

    fireEvent.change(emailInput, { target: { value: 'invalid' } })

    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
  })
})
