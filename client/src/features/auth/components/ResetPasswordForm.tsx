import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/authApi'

interface FormErrors {
  newPassword?: string
  confirmPassword?: string
  general?: string
}

export const ResetPasswordForm: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false })
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Password must be at least 8 characters'
    return undefined
  }

  const validateConfirmPassword = (value: string): string | undefined => {
    if (!value) return 'Password confirmation is required'
    if (value !== newPassword) return 'Passwords do not match'
    return undefined
  }

  const isFormValid = (): boolean => {
    if (!token) return false
    return !validatePassword(newPassword) && !validateConfirmPassword(confirmPassword)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!token) {
      setErrors({ general: 'This reset link is invalid. Please request a new one.' })
      return
    }

    setTouched({ newPassword: true, confirmPassword: true })
    const newPasswordError = validatePassword(newPassword)
    const confirmPasswordError = validateConfirmPassword(confirmPassword)

    setErrors({ newPassword: newPasswordError, confirmPassword: confirmPasswordError })

    if (newPasswordError || confirmPasswordError) {
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword(token, newPassword)
      setIsSuccess(true)
      redirectTimerRef.current = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as { code: string; message: string }
        if (apiError.code === 'invalid_reset_token') {
          setErrors({ general: 'This reset link is invalid or has expired. Please request a new one.' })
        } else {
          setErrors({ general: apiError.message || 'Unable to reset your password right now.' })
        }
      } else {
        setErrors({ general: 'Connection failed. Please retry.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Invalid reset link</h2>
          <p className="text-sm text-gray-600">This reset link is missing a token.</p>
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
        </div>

        {isSuccess ? (
          <div className="rounded-md bg-green-50 p-4 border border-green-200">
            <p className="text-sm font-medium text-green-800">
              Password updated successfully. Redirecting to login...
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{errors.general}</p>
              </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="newPassword" className="sr-only">
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    touched.newPassword && errors.newPassword ? 'border-red-300 text-red-900' : 'border-gray-300 text-gray-900'
                  } placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="New password (8+ characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, newPassword: true }))
                    setErrors((prev) => ({ ...prev, newPassword: validatePassword(newPassword) }))
                  }}
                  disabled={isSubmitting}
                />
                {touched.newPassword && errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    touched.confirmPassword && errors.confirmPassword ? 'border-red-300 text-red-900' : 'border-gray-300 text-gray-900'
                  } placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, confirmPassword: true }))
                    setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword) }))
                  }}
                  disabled={isSubmitting}
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  isSubmitting || !isFormValid()
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isSubmitting ? 'Updating password...' : 'Reset password'}
              </button>
            </div>

            <div className="text-sm text-center">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
