import { registerSchema } from './auth.schema'

describe('registerSchema', () => {
  const validPayload = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    privacyCode: 'RESEARCH-001'
  }

  it('accepts a non-empty privacy code', () => {
    const parsed = registerSchema.parse(validPayload)
    expect(parsed.privacyCode).toBe('RESEARCH-001')
  })

  it('rejects missing privacy code', () => {
    expect(() =>
      registerSchema.parse({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })
    ).toThrow()
  })

  it('rejects empty privacy code', () => {
    expect(() =>
      registerSchema.parse({
        ...validPayload,
        privacyCode: '   '
      })
    ).toThrow('Privacy code is required')
  })
})
