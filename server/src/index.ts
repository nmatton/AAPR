import { logProjectInitialized } from './logger/projectInit'
import { app } from './app'
import { validateRuntimeEnv } from './config/runtime-env'

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
  PORT: process.env.PORT,
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
  logProjectInitialized().catch((error) => {
    console.error('Failed to log initialization event', error)
  })
})
