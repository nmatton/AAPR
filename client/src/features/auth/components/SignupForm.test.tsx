import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SignupForm } from './SignupForm'
import { useAuthStore } from '../state/authSlice'

const renderSignupForm = () => {
  return render(
    <BrowserRouter>
      <SignupForm />
    </BrowserRouter>
  )
}

describe('SignupForm', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().reset()
  })

  it('prefills email field from query parameter', () => {
    window.history.pushState({}, '', '/signup?email=invited.user%2Bteam%40example.com')

    renderSignupForm()

    const emailInput = screen.getByLabelText(/email address/i)
    expect(emailInput).toHaveValue('invited.user+team@example.com')
  })
})
