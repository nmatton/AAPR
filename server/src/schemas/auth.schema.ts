import { z } from 'zod'

/**
 * Registration validation schema
 * CRITICAL: Enforces security requirements from PRD
 * - Name: 3-50 characters (prevents abuse, SQL injection via length limit)
 * - Email: Valid format (RFC 5322 compliant)
 * - Password: 8+ characters (NFR1 requirement)
 */
export const registerSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must not exceed 50 characters')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-']+$/, 'Name contains invalid characters'),
  
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
})

/**
 * Login validation schema
 * - Email: Valid format
 * - Password: 8+ characters
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
})

export type RegisterDto = z.infer<typeof registerSchema>
export type LoginDto = z.infer<typeof loginSchema>
