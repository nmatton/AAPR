import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import * as authApi from '../api/authApi'

const renderForm = () => {
  return render(
    <MemoryRouter>
      <ForgotPasswordForm />
    </MemoryRouter>
  )
}

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks submit and shows error for invalid email format', async () => {
    const forgotSpy = vi.spyOn(authApi, 'forgotPassword').mockResolvedValue({
      message: 'If an account exists for that email, a reset link has been sent.'
    })

    renderForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'invalid-email')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    expect(forgotSpy).not.toHaveBeenCalled()
  })

  it('shows generic success confirmation after submit', async () => {
    vi.spyOn(authApi, 'forgotPassword').mockResolvedValue({
      message: 'If an account exists for that email, a reset link has been sent.'
    })

    renderForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/if an account exists for that email/i)).toBeInTheDocument()
  })

  it('shows API error message when request fails', async () => {
    vi.spyOn(authApi, 'forgotPassword').mockRejectedValue({
      code: 'server_error',
      message: 'Temporary server issue'
    })

    renderForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/temporary server issue/i)).toBeInTheDocument()
  })
})
