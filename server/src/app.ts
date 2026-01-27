import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'crypto'
import { authRouter } from './routes/auth.routes'
import { teamsRouter } from './routes/teams.routes'
import { practicesRouter } from './routes/practices.routes'
import { bigFiveRouter } from './routes/big-five.routes'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

export const app = express()

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

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

app.use(errorHandler)
