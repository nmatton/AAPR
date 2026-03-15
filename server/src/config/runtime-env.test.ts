import { validateRuntimeEnv } from './runtime-env'

describe('validateRuntimeEnv', () => {
  it('does not throw when NODE_ENV is not production', () => {
    expect(() =>
      validateRuntimeEnv({
        NODE_ENV: 'development',
      })
    ).not.toThrow()
  })

  it('throws when mandatory production variables are missing', () => {
    expect(() =>
      validateRuntimeEnv({
        NODE_ENV: 'production',
        PORT: '3000',
      })
    ).toThrow('Missing mandatory production environment variables: DATABASE_URL, JWT_SECRET, EVENT_EXPORT_API_KEY, HONEYBADGER_API_KEY')
  })

  it('throws when PORT is not a positive integer', () => {
    expect(() =>
      validateRuntimeEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@db:5432/aapr',
        JWT_SECRET: 'super-secret-value',
        EVENT_EXPORT_API_KEY: 'export-secret-value',
        HONEYBADGER_API_KEY: 'hbp_test_key',
        PORT: 'abc',
      })
    ).toThrow('PORT must be an integer between 1 and 65535 when provided')
  })

  it('throws when PORT is out of range', () => {
    expect(() =>
      validateRuntimeEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@db:5432/aapr',
        JWT_SECRET: 'super-secret-value',
        EVENT_EXPORT_API_KEY: 'export-secret-value',
        HONEYBADGER_API_KEY: 'hbp_test_key',
        PORT: '0',
      })
    ).toThrow('PORT must be an integer between 1 and 65535 when provided')
  })

  it('accepts valid production configuration', () => {
    expect(() =>
      validateRuntimeEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@db:5432/aapr',
        JWT_SECRET: 'super-secret-value',
        EVENT_EXPORT_API_KEY: 'export-secret-value',
        HONEYBADGER_API_KEY: 'hbp_test_key',
        PORT: '3000',
      })
    ).not.toThrow()
  })
})
