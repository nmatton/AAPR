import { useState, useCallback } from 'react'
import { useInvitesStore } from '../state/invitesSlice'

interface InvitePanelProps {
  teamId: number
  onInviteSent?: (email: string) => void
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * InvitePanel - Email invite form for sending invitations to new team members
 * Includes email validation and error handling
 */
export const InvitePanel = ({ teamId, onInviteSent }: InvitePanelProps) => {
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [toastMessage, setToastMessage] = useState('')

  const { isCreating, error: storeError, createNewInvite } = useInvitesStore()

  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setValidationError('Email is required')
      return false
    }
    if (!isValidEmail(value)) {
      setValidationError('Please enter a valid email address')
      return false
    }
    setValidationError(null)
    return true
  }, [])

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setEmail(value)
      if (value.trim()) {
        validateEmail(value)
      } else {
        setValidationError(null)
      }
    },
    [validateEmail]
  )

  const showToastMessage = useCallback(
    (message: string, type: 'success' | 'error') => {
      setToastMessage(message)
      setToastType(type)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    },
    []
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateEmail(email)) {
        return
      }

      try {
        await createNewInvite(teamId, email)
        showToastMessage(`Invite sent to ${email}`, 'success')
        setEmail('')
        onInviteSent?.(email)
      } catch (error) {
        // Error handling: use store error or generic message
        const errorMessage = storeError || 'Failed to send invite'
        showToastMessage(errorMessage, 'error')
      }
    },
    [email, teamId, createNewInvite, validateEmail, showToastMessage, storeError, onInviteSent]
  )

  const isSubmitDisabled = !email.trim() || validationError !== null || isCreating

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Invite Member</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={handleEmailChange}
            disabled={isCreating}
            className={`mt-2 block w-full rounded-lg border px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 ${
              validationError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Email address to invite"
            aria-invalid={validationError ? 'true' : 'false'}
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          aria-label="Send invitation"
        >
          {isCreating ? 'Sending...' : 'Send Invite'}
        </button>
      </form>

      {/* Toast Notification */}
      {showToast && (
        <div
          className={`mt-4 flex items-center rounded-lg p-3 text-sm ${
            toastType === 'success'
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
          role="status"
          aria-live="polite"
        >
          {toastType === 'success' ? (
            <svg className="mr-2 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="mr-2 h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {toastMessage}
        </div>
      )}
    </div>
  )
}
