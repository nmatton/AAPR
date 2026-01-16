import React, { useState, FormEvent } from 'react'
import { registerUser } from '../api/authApi'
import { useAuthStore } from '../state/authSlice'

/**
 * Signup form validation errors
 */
interface FormErrors {
  name?: string
  email?: string
  password?: string
  general?: string
}

/**
 * Signup form component with real-time validation
 * Implements AC1-AC4: validation, error handling, duplicate email detection
 */
export const SignupForm: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false
  })

  const { setUser, setLoading, setError, isLoading } = useAuthStore()

  /**
   * Validate name field (3-50 characters)
   */
  const validateName = (value: string): string | undefined => {
    if (!value) return 'Name is required'
    if (value.length < 3) return 'Name must be at least 3 characters'
    if (value.length > 50) return 'Name must not exceed 50 characters'
    return undefined
  }

  /**
   * Validate email format (basic RFC 5322 check)
   */
  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Invalid email format'
    return undefined
  }

  /**
   * Validate password length (8+ characters)
   */
  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Password must be at least 8 characters'
    return undefined
  }

  /**
   * Handle field blur (trigger validation)
   */
  const handleBlur = (field: 'name' | 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }))

    // Run validation for the field
    const newErrors: FormErrors = {}
    if (field === 'name') newErrors.name = validateName(name)
    if (field === 'email') newErrors.email = validateEmail(email)
    if (field === 'password') newErrors.password = validatePassword(password)

    setErrors((prev) => ({ ...prev, ...newErrors }))
  }

  /**
   * Check if form is valid (all fields pass validation)
   */
  const isFormValid = (): boolean => {
    const nameError = validateName(name)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    return !nameError && !emailError && !passwordError
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({ name: true, email: true, password: true })

    // Validate all fields
    const nameError = validateName(name)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    setErrors({
      name: nameError,
      email: emailError,
      password: passwordError
    })

    // Stop if validation fails
    if (nameError || emailError || passwordError) {
      return
    }

    // Submit registration
    setLoading(true)
    setErrors({})

    try {
      const response = await registerUser(name, email, password)
      setUser(response.user)

      // Redirect to /teams (will be handled by router in Task 7)
      window.location.href = '/teams'
    } catch (error: unknown) {
      setLoading(false)

      // Handle structured API errors
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as { code: string; message: string }

        if (apiError.code === 'email_exists') {
          setErrors({
            email: apiError.message,
            general: 'Email already registered. Please log in instead.'
          })
        } else if (apiError.code === 'validation_error') {
          setErrors({ general: 'Please check your input and try again.' })
        } else {
          setErrors({ general: 'Registration failed. Please try again.' })
        }
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' })
      }

      setError('Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errors.general}</p>
                  {errors.general.includes('already registered') && (
                    <a
                      href="/login"
                      className="text-sm underline text-red-800 hover:text-red-900"
                    >
                      Go to Login
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            {/* Name field */}
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  touched.name && errors.name
                    ? 'border-red-300 text-red-900'
                    : 'border-gray-300 text-gray-900'
                } placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                disabled={isLoading}
              />
              {touched.name && errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email field */}
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
                } placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
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

            {/* Password field */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  touched.password && errors.password
                    ? 'border-red-300 text-red-900'
                    : 'border-gray-300 text-gray-900'
                } placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password (8+ characters)"
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
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
