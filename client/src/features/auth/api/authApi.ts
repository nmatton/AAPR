const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Structured API error response
 */
interface ApiErrorResponse {
  code: string
  message: string
  details?: Record<string, unknown>
  requestId?: string
}

/**
 * User data returned from API
 */
export interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

/**
 * Registration response from API
 */
interface RegisterResponse {
  user: User
  message: string
}

/**
 * Register new user with email and password
 * 
 * @param name - User's display name (3-50 characters)
 * @param email - Valid email address
 * @param password - Password (8+ characters)
 * @returns User data (without password)
 * @throws ApiErrorResponse on validation or duplicate email errors
 */
export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<RegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // Include HTTP-only cookies
    body: JSON.stringify({ name, email, password })
  })

  const data = await response.json()

  if (!response.ok) {
    // Structured error format from backend
    throw data as ApiErrorResponse
  }

  return data as RegisterResponse
}
