process.env.JWT_SECRET = 'test_secret_for_events_export_route_12345678901234567890'
process.env.ADMIN_API_KEY = 'test-export-key'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import request from 'supertest'
import { app } from '../app'
import * as eventExportService from '../services/event-export.service'

jest.mock('../services/event-export.service', () => ({
  exportEvents: jest.fn(),
}))

describe('events export route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/v1/events/export returns CSV content and passes filters to export service', async () => {
    const exportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aapr-route-export-'))
    const outputPath = path.join(exportDir, 'team-events-2026-01-15-to-2026-01-22.csv')
    await fs.writeFile(outputPath, 'actor_id,team_id\n1,1\n', 'utf8')

    ;(eventExportService.exportEvents as jest.MockedFunction<typeof eventExportService.exportEvents>).mockResolvedValue({
      teamId: 1,
      from: '2026-01-15T00:00:00.000Z',
      to: '2026-01-22T23:59:59.999Z',
      format: 'csv',
      outputPath,
      fileName: 'team-events-2026-01-15-to-2026-01-22.csv',
      rowCount: 1,
      eventTypes: ['issue.created', 'issue.evaluated'],
    })

    const response = await request(app)
      .get('/api/v1/events/export')
      .set('X-API-KEY', 'test-export-key')
      .query({
        teamId: '1',
        from: '2026-01-15',
        to: '2026-01-22',
        eventType: ['issue.created', 'issue.evaluated'],
      })

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('attachment; filename="team-events-2026-01-15-to-2026-01-22.csv"')
    expect(response.text).toContain('actor_id,team_id')

    expect(eventExportService.exportEvents).toHaveBeenCalledWith({
      teamId: 1,
      from: '2026-01-15',
      to: '2026-01-22',
      eventTypes: ['issue.created', 'issue.evaluated'],
      format: 'csv',
    })
  })

  it('returns 400 when from/to parameters are missing', async () => {
    const response = await request(app)
      .get('/api/v1/events/export')
      .set('X-API-KEY', 'test-export-key')
      .query({ teamId: '1', to: '2026-01-22' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('validation_error')
  })

  it('returns 401 when X-API-KEY header is missing or invalid', async () => {
    const response = await request(app)
      .get('/api/v1/events/export')
      .query({ to: '2026-01-22' })

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('invalid_api_key')
  })
})
