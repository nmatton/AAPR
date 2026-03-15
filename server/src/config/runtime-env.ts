type RuntimeEnvSource = {
  NODE_ENV?: string
  DATABASE_URL?: string
  JWT_SECRET?: string
  EVENT_EXPORT_API_KEY?: string
  PORT?: string
  HONEYBADGER_API_KEY?: string
  APP_REVISION?: string
}

export const validateRuntimeEnv = (env: RuntimeEnvSource): void => {
  if (env.NODE_ENV !== 'production') {
    return
  }

  const mandatoryKeys: Array<keyof RuntimeEnvSource> = [
    'DATABASE_URL',
    'JWT_SECRET',
    'EVENT_EXPORT_API_KEY',
    'HONEYBADGER_API_KEY',
  ]
  const missing = mandatoryKeys.filter((key) => !env[key]?.trim())

  if (missing.length > 0) {
    throw new Error(`Missing mandatory production environment variables: ${missing.join(', ')}`)
  }

  if (env.PORT) {
    const parsedPort = Number(env.PORT)
    const isInteger = Number.isInteger(parsedPort)
    const isInRange = parsedPort >= 1 && parsedPort <= 65535

    if (!isInteger || !isInRange) {
      throw new Error('PORT must be an integer between 1 and 65535 when provided')
    }
  }
}
