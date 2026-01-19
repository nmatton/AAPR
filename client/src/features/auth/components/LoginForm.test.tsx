import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginForm } from './LoginForm'
import { useAuthStore } from '../state/authSlice'

const renderLoginForm = () => {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.setState({
      ...useAuthStore.getState(),
      login: vi.fn(),
      setError: vi.fn(),
      isLoading: false,
      error: null
    })
  })

  it('disables submit until valid email and password are provided', async () => {
    renderLoginForm()

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    expect(submitButton).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')

    expect(submitButton).not.toBeDisabled()
  })

  it('shows error on invalid email format', async () => {
    renderLoginForm()

    const emailInput = screen.getByLabelText(/email address/i)
    await userEvent.type(emailInput, 'invalid-email')
    await userEvent.tab()

    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
  })

  it('shows error on password shorter than 8 characters', async () => {
    renderLoginForm()

    const passwordInput = screen.getByLabelText(/password/i)
    await userEvent.type(passwordInput, 'short')
    await userEvent.tab()

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('shows generic error on invalid credentials and keeps form values', async () => {
    const loginMock = vi.fn().mockRejectedValue({
      code: 'invalid_credentials',
      message: 'Invalid email or password'
    })

    useAuthStore.setState({
      ...useAuthStore.getState(),
      login: loginMock
    })

    renderLoginForm()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await userEvent.type(emailInput, 'user@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
    expect(emailInput).toHaveValue('user@example.com')
    expect(passwordInput).toHaveValue('password123')
    expect(loginMock).toHaveBeenCalledWith('user@example.com', 'password123')
  })
})
