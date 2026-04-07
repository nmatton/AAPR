import React, { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/authApi'

interface FormErrors {
  email?: string
  general?: string
}

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState({ email: false })

  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Invalid email format'
    return undefined
  }

  const isFormValid = (): boolean => !validateEmail(email)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setTouched({ email: true })
    const emailError = validateEmail(email)
    setErrors({ email: emailError })

    if (emailError) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await forgotPassword(email)
      setIsSubmitted(true)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as {
          code: string
          message: string
          details?: { errors?: Array<{ path: string; message: string }> }
        }

        if (apiError.code === 'validation_error' && apiError.details?.errors) {
          const fieldError = apiError.details.errors.find((item) => item.path === 'email')
          setErrors({ email: fieldError?.message || 'Invalid email format' })
        } else {
          setErrors({ general: apiError.message || 'Unable to process your request right now.' })
        }
      } else {
        setErrors({ general: 'Connection failed. Please retry.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we will send you a reset link.
          </p>
        </div>

        {isSubmitted ? (
          <div className="rounded-md bg-green-50 p-4 border border-green-200">
            <p className="text-sm font-medium text-green-800">
              If an account exists for that email, a reset link has been sent.
            </p>
            <p className="mt-2 text-sm">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Back to login
              </Link>
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{errors.general}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  touched.email && errors.email ? 'border-red-300 text-red-900' : 'border-gray-300 text-gray-900'
                } placeholder-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  setTouched({ email: true })
                  setErrors((prev) => ({ ...prev, email: validateEmail(email) }))
                }}
                disabled={isSubmitting}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
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
                {isSubmitting ? 'Sending link...' : 'Send reset link'}
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
