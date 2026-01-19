import React, { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../state/authSlice'

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState({ email: false, password: false })

  const { login, isLoading, error: authError, setError } = useAuthStore()

  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Invalid email format'
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Password must be at least 8 characters'
    return undefined
  }

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }))

    const newErrors: FormErrors = {}
    if (field === 'email') newErrors.email = validateEmail(email)
    if (field === 'password') newErrors.password = validatePassword(password)

    setErrors((prev) => ({ ...prev, ...newErrors }))
  }

  const isFormValid = (): boolean => {
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    return !emailError && !passwordError
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setTouched({ email: true, password: true })

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    setErrors({ email: emailError, password: passwordError })
    setError(null)

    if (emailError || passwordError) {
      return
    }

    try {
      await login(email, password)
      navigate('/teams')
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as { code: string; message: string; details?: { errors?: Array<{ path: string; message: string }> } }

        if (apiError.code === 'invalid_credentials') {
          setErrors({ general: 'Invalid email or password' })
        } else if (apiError.code === 'validation_error') {
          if (apiError.details?.errors) {
            const fieldErrors: FormErrors = {}
            apiError.details.errors.forEach((err) => {
              const field = err.path as keyof FormErrors
              if (field === 'email' || field === 'password') {
                fieldErrors[field] = err.message
              }
            })
            setErrors(fieldErrors)
          } else {
            setErrors({ general: 'Please check your input and try again.' })
          }
        } else {
          setErrors({ general: apiError.message || 'Login failed. Please try again.' })
        }
      } else {
        setErrors({ general: 'Connection failed. Please retry.' })
      }
    }
  }

  const generalError = errors.general || authError

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {generalError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{generalError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
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
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  touched.email && errors.email
                    ? 'border-red-300 text-red-900'
                    : 'border-gray-300 text-gray-900'
                } placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                disabled={isLoading}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  touched.password && errors.password
                    ? 'border-red-300 text-red-900'
                    : 'border-gray-300 text-gray-900'
                } placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                disabled={isLoading}
              />
              {touched.password && errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading || !isFormValid()
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
