import dotenv from 'dotenv'
import express, { RequestHandler, ErrorRequestHandler } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import Honeybadger from '@honeybadger-io/js'
import { randomUUID } from 'crypto'
import { authRouter } from './routes/auth.routes'
import { teamsRouter } from './routes/teams.routes'
import { practicesRouter } from './routes/practices.routes'
import { bigFiveRouter } from './routes/big-five.routes'
import { eventsRouter } from './routes/events.routes'
import { adminStatsRouter } from './routes/admin-stats.routes'
import tagsRouter from './routes/tags.routes'
import { getHealthReport } from './services/health.service'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

export const app = express()

if (process.env.NODE_ENV === 'production') {
  app.use(Honeybadger.requestHandler as unknown as RequestHandler)
}

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
)

app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID()
    ; (req as typeof req & { id?: string }).id = requestId
  res.setHeader('x-request-id', requestId)
  next()
})



app.use('/api/v1/auth', authRouter)
app.use('/api/v1/teams', teamsRouter)
app.use('/api/v1/practices', practicesRouter)
app.use('/api/v1/big-five', bigFiveRouter)
app.use('/api/v1/events', eventsRouter)
app.use('/api/v1/admin', adminStatsRouter)
app.use('/api/v1/tags', tagsRouter)

app.get('/api/v1/health', async (req, res) => {
  const report = await getHealthReport()
  const statusCode = report.status === 'fail' ? 503 : 200

  const adminApiKey = process.env.ADMIN_API_KEY?.trim()
  const honeybadgerToken = process.env.HONEYBADGER_AUTH_HEADER?.trim()
  const providedApiKey = req.get('x-api-key')?.trim()
  const providedHoneybadgerToken = req.get('honeybadger-token')?.trim()

  const hasAdminAccess = Boolean(adminApiKey && providedApiKey && providedApiKey === adminApiKey)
  const hasHoneybadgerAccess = Boolean(
    honeybadgerToken && providedHoneybadgerToken && providedHoneybadgerToken === honeybadgerToken
  )

  if (hasAdminAccess || hasHoneybadgerAccess) {
    res.status(statusCode).json(report)
    return
  }

  res.status(statusCode).json({
    status: report.status,
    timestamp: report.timestamp,
    version: report.version,
  })
})

if (process.env.NODE_ENV === 'production') {
  app.use(Honeybadger.errorHandler as unknown as ErrorRequestHandler)
}
app.use(errorHandler)
