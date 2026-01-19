import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'crypto'
import { logProjectInitialized } from './logger/projectInit'
import { authRouter } from './routes/auth.routes'
import { teamsRouter } from './routes/teams.routes'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app = express()

// CORS configuration for frontend-backend communication
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
)

app.use(express.json())
app.use(cookieParser())

// Request ID middleware
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID()
  res.setHeader('x-request-id', requestId)
  next()
})

// API routes
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/teams', teamsRouter)

// Health check endpoint with proper API versioning and headers
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// Error handling middleware (must be registered after all routes)
app.use(errorHandler)

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
  logProjectInitialized().catch((error) => {
    console.error('Failed to log initialization event', error)
  })
})
