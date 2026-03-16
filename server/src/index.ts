import Honeybadger from '@honeybadger-io/js'
import { logProjectInitialized } from './logger/projectInit'
import { app } from './app'
import { validateRuntimeEnv } from './config/runtime-env'
import { HONEYBADGER_REDACTED_KEYS } from './config/honeybadger'

const resolvePort = (rawPort?: string): number => {
  if (!rawPort?.trim()) {
    return 3000
  }

  const parsedPort = Number(rawPort)
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535 when provided')
  }

  return parsedPort
}

const port = resolvePort(process.env.PORT)

validateRuntimeEnv({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  PORT: process.env.PORT,
  HONEYBADGER_API_KEY: process.env.HONEYBADGER_API_KEY,
})

if (process.env.NODE_ENV === 'production') {
  Honeybadger.configure({
    apiKey: process.env.HONEYBADGER_API_KEY!,
    environment: 'production',
    revision: process.env.APP_REVISION,
    filters: HONEYBADGER_REDACTED_KEYS,
  })
}

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
  logProjectInitialized().catch((error) => {
    console.error('Failed to log initialization event', error)
  })
})
