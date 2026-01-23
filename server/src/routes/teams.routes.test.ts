process.env.JWT_SECRET = 'test_secret_for_routes_12345678901234567890'

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import request from 'supertest'
import { app } from '../app'
import * as membersService from '../services/members.service'
import * as teamsService from '../services/teams.service'
import * as authService from '../services/auth.service'
import { AppError } from '../services/auth.service'
import { prisma } from '../lib/prisma'

jest.mock('../services/members.service')
jest.mock('../services/teams.service')
jest.mock('../services/auth.service', () => {
  const actual = jest.requireActual('../services/auth.service') as typeof import('../services/auth.service')
  return {
    ...actual,
    verifyToken: jest.fn()
  }
})

jest.mock('../lib/prisma', () => ({
  prisma: {
    teamMember: {
      findUnique: jest.fn()
    }
  }
}))

describe('teams routes - members', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(authService.verifyToken as jest.MockedFunction<typeof authService.verifyToken>).mockReturnValue({
      userId: 1,
      email: 'test@example.com'
    })
    ;(prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValue({
      id: 1,
      teamId: 1,
      userId: 1,
      role: 'member',
      joinedAt: new Date()
    })
  })

  it('GET /api/v1/teams/:teamId/members returns members list', async () => {
    ;(membersService.getTeamMembers as jest.MockedFunction<typeof membersService.getTeamMembers>).mockResolvedValue([
      {
        id: 1,
        name: 'Alex',
        email: 'alex@example.com',
        joinDate: '2026-01-15T10:00:00.000Z',
        inviteStatus: 'Added',
        bigFiveCompleted: false
      }
    ])

    const response = await request(app)
      .get('/api/v1/teams/1/members')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.members).toHaveLength(1)
    expect(response.body.members[0].email).toBe('alex@example.com')
    expect(response.body.requestId).toBeDefined()
  })

  it('GET /api/v1/teams/:teamId/members/:userId returns member detail', async () => {
    ;(membersService.getMemberDetail as jest.MockedFunction<typeof membersService.getMemberDetail>).mockResolvedValue({
      id: 5,
      name: 'Sam',
      email: 'sam@example.com',
      joinDate: '2026-01-15T10:00:00.000Z',
      bigFiveCompleted: false,
      bigFiveProfile: null,
      issues: []
    })

    const response = await request(app)
      .get('/api/v1/teams/1/members/5')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.member.email).toBe('sam@example.com')
    expect(response.body.requestId).toBeDefined()
  })

  it('DELETE /api/v1/teams/:teamId/members/:userId removes member', async () => {
    ;(membersService.removeMember as jest.MockedFunction<typeof membersService.removeMember>).mockResolvedValue(undefined)

    const response = await request(app)
      .delete('/api/v1/teams/1/members/5')
      .set('Authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body.removed).toBe(true)
    expect(response.body.requestId).toBeDefined()
  })
})

describe('teams routes - update team name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(authService.verifyToken as jest.MockedFunction<typeof authService.verifyToken>).mockReturnValue({
      userId: 1,
      email: 'test@example.com'
    })
    ;(prisma.teamMember.findUnique as jest.MockedFunction<typeof prisma.teamMember.findUnique>).mockResolvedValue({
      id: 1,
      teamId: 1,
      userId: 1,
      role: 'member',
      joinedAt: new Date()
    })
  })

  it('PATCH /api/v1/teams/:teamId updates team name', async () => {
    ;(teamsService.updateTeamName as jest.MockedFunction<typeof teamsService.updateTeamName>).mockResolvedValue({
      id: 1,
      name: 'Updated Team',
      version: 2,
      updatedAt: new Date('2026-01-23T10:00:00Z')
    })

    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Updated Team', version: 1 })

    expect(response.status).toBe(200)
    expect(response.body.data.name).toBe('Updated Team')
    expect(response.body.data.version).toBe(2)
    expect(response.body.requestId).toBeDefined()
  })

  it('PATCH /api/v1/teams/:teamId returns 409 on version mismatch', async () => {
    ;(teamsService.updateTeamName as jest.MockedFunction<typeof teamsService.updateTeamName>).mockRejectedValue(
      new AppError(
        'version_mismatch',
        'Team was modified by another user',
        { currentName: 'Existing Team', currentVersion: 3 },
        409
      )
    )

    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Updated Team', version: 1 })

    expect(response.status).toBe(409)
    expect(response.body.code).toBe('version_mismatch')
  })

  it('PATCH /api/v1/teams/:teamId returns 400 on invalid payload', async () => {
    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Updated Team' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('validation_error')
  })
})
