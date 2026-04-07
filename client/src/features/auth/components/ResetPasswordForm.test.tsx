import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ResetPasswordForm } from './ResetPasswordForm'
import * as authApi from '../api/authApi'

const renderForm = (initialPath: string) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows missing token state when query param is absent', () => {
    renderForm('/reset-password')

    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toBeInTheDocument()
  })

  it('submits new password when token is present', async () => {
    const resetSpy = vi.spyOn(authApi, 'resetPassword').mockResolvedValue({
      message: 'Password has been reset successfully'
    })

    renderForm('/reset-password?token=test-token')

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByText(/password updated successfully/i)).toBeInTheDocument()
    expect(resetSpy).toHaveBeenCalledWith('test-token', 'newpassword123')
  })

  it('shows deterministic message for invalid or expired token', async () => {
    vi.spyOn(authApi, 'resetPassword').mockRejectedValue({
      code: 'invalid_reset_token',
      message: 'Reset token is invalid or expired'
    })

    renderForm('/reset-password?token=expired-token')

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument()
  })
})
