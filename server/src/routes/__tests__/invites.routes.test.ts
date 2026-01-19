import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import { teamsRouter } from '../teams.routes'
import * as invitesService from '../../services/invites.service'
import { requireAuth } from '../../middleware/requireAuth'
import { validateTeamMembership } from '../../middleware/validateTeamMembership'

jest.mock('../../services/invites.service')
jest.mock('../../middleware/requireAuth')
jest.mock('../../middleware/validateTeamMembership')

const app = express()
app.use(express.json())
app.use(cookieParser())

app.use((req, _res, next) => {
  req.id = 'test-request-id'
  next()
})

app.use('/api/v1/teams', teamsRouter)

app.use((err: any, req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({
    code: err.code || 'internal_error',
    message: err.message,
    requestId: err.requestId || req.id
  })
})

describe('POST /api/v1/teams/:teamId/invites', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { userId: 7, email: 'member@example.com' }
      next()
    })
    ;(validateTeamMembership as any).mockImplementation((_req: any, _res: any, next: any) => {
      next()
    })
  })

  it('returns 201 with invite on success', async () => {
    const mockInvite = {
      id: 1,
      teamId: 10,
      email: 'invitee@example.com',
      status: 'Pending'
    }

    ;(invitesService.createInvite as jest.Mock).mockResolvedValue(mockInvite)

    const response = await request(app)
      .post('/api/v1/teams/10/invites')
      .send({ email: 'invitee@example.com' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      invite: mockInvite,
      requestId: 'test-request-id'
    })
    expect(invitesService.createInvite).toHaveBeenCalledWith(10, 'invitee@example.com', 7)
  })

  it('returns 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/teams/10/invites')
      .send({ email: 'bad-email' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('validation_error')
  })
})

describe('GET /api/v1/teams/:teamId/invites', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { userId: 7, email: 'member@example.com' }
      next()
    })
    ;(validateTeamMembership as any).mockImplementation((_req: any, _res: any, next: any) => {
      next()
    })
  })

  it('returns invite list for team', async () => {
    const invites = [
      { id: 1, teamId: 10, email: 'a@example.com', status: 'Pending' },
      { id: 2, teamId: 10, email: 'b@example.com', status: 'Added' }
    ]

    ;(invitesService.listInvites as jest.Mock).mockResolvedValue(invites)

    const response = await request(app).get('/api/v1/teams/10/invites')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      invites,
      requestId: 'test-request-id'
    })
    expect(invitesService.listInvites).toHaveBeenCalledWith(10)
  })
})

describe('POST /api/v1/teams/:teamId/invites/:inviteId/resend', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { userId: 7, email: 'member@example.com' }
      next()
    })
    ;(validateTeamMembership as any).mockImplementation((_req: any, _res: any, next: any) => {
      next()
    })
  })

  it('returns updated invite on resend', async () => {
    const updatedInvite = { id: 3, teamId: 10, email: 'c@example.com', status: 'Pending' }
    ;(invitesService.resendInvite as jest.Mock).mockResolvedValue(updatedInvite)

    const response = await request(app)
      .post('/api/v1/teams/10/invites/3/resend')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      invite: updatedInvite,
      requestId: 'test-request-id'
    })
    expect(invitesService.resendInvite).toHaveBeenCalledWith(10, 3, 7)
  })

  it('returns 400 for invalid teamId', async () => {
    const response = await request(app)
      .post('/api/v1/teams/invalid/invites/3/resend')

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('validation_error')
  })
})
