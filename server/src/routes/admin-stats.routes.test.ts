process.env.JWT_SECRET = 'test_secret_for_admin_stats_route_12345678901234567890';
process.env.ADMIN_API_KEY = 'test-admin-key';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../app';
import * as adminStatsService from '../services/admin-stats.service';
import type { AdminStatsResponse } from '../types/admin-stats.types';

const buildStatsResponse = (window: { label: string; from: string; to: string }): AdminStatsResponse => ({
  meta: {
    generatedAt: '2026-03-16T10:00:00.000Z',
    window: {
      from: window.from,
      to: window.to,
      label: window.label as AdminStatsResponse['meta']['window']['label'],
    },
    aggregationLevel: 'platform',
    privacy: {
      containsPII: false,
      granularity: 'aggregated_only',
    },
    version: '1.0.0',
  },
  platform: {
    overview: {
      registeredUsers: 3,
      activeUsers: 2,
      teamsTotal: 2,
      activeTeams: 1,
      issuesTotal: 4,
      teamPracticesTotal: 5,
      commentsTotal: 6,
      eventsTotal: 7,
    },
    issues: {
      createdInWindow: 2,
      byStatus: {
        open: 1,
        in_progress: 1,
        adaptation_in_progress: 1,
        evaluated: 1,
        done: 0,
      },
      flow: {
        open_to_in_progress_rate: 1,
        in_progress_to_adaptation_in_progress_rate: 1,
        adaptation_in_progress_to_evaluated_rate: 1,
        evaluated_to_done_rate: 0,
      },
      durationsHours: {
        meanTimeToFirstComment: 6,
        meanTimeToDecision: 0,
        meanTimeToEvaluation: 0,
      },
      backlogHealth: {
        openOlderThan14d: 0,
        inProgressOlderThan30d: 0,
      },
    },
    practices: {
      avgPracticesPerTeam: 2.5,
      medianPracticesPerTeam: 2.5,
      customPractice: 1,
      practiceEdited: 1,
      topAdoptedPractices: [],
      methodDistribution: {
        Scrum: 0,
        Kanban: 0,
        XP: 0,
        Lean: 0,
        'Scaled Agile': 0,
        'Product Management': 0,
        'Design Thinking & UX': 0,
        'Project Management': 0,
        Agile: 0,
        'Facilitation & Workshops': 0,
      },
    },
    teamLandscape: {
      sizeDistribution: {
        solo: 0,
        small_2_5: 2,
        medium_6_10: 0,
        large_11_plus: 0,
      },
      dormancy: {
        inactive14d: 0,
        inactive30d: 0,
        inactive60d: 0,
      },
    },
    research: {
      workflowCompletionRatio: 0,
      practiceIssueLinkDensity: 0,
      adaptationMaturityIndex: 0,
      teamExperimentationIndexAvg: 0,
    },
  },
  teams: [],
  quality: {
    metricFreshnessMinutes: 0,
    warnings: [],
    dataCompleteness: {
      issuesWithoutLinkedPracticesPct: 0,
      teamsWithMissingActivityTimestampPct: 0,
    },
  },
});

jest.mock('../services/admin-stats.service', () => ({
  getGlobalPlatformStats: jest.fn(),
  getAdminUsers: jest.fn(),
  resolveAdminStatsAllTimeFrom: jest.fn(),
}));

describe('admin stats route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = 'test-admin-key';

    (adminStatsService.resolveAdminStatsAllTimeFrom as jest.MockedFunction<typeof adminStatsService.resolveAdminStatsAllTimeFrom>)
      .mockResolvedValue(new Date('2026-01-01T00:00:00.000Z'));

    (adminStatsService.getGlobalPlatformStats as jest.MockedFunction<typeof adminStatsService.getGlobalPlatformStats>)
      .mockImplementation(async (window) =>
        buildStatsResponse({
          label: window.label,
          from: window.from.toISOString(),
          to: window.to.toISOString(),
        })
      );
  });

  it('GET /api/v1/admin/stats returns JSON payload when API key is valid', async () => {
    const response = await request(app).get('/api/v1/admin/stats').set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(200);
    expect(response.body.meta.window.label).toBe('all_time');
    expect(adminStatsService.getGlobalPlatformStats).toHaveBeenCalledTimes(1);
  });

  it('supports relative window label query parameter', async () => {
    const response = await request(app)
      .get('/api/v1/admin/stats?label=last_30_days')
      .set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(200);
    expect(response.body.meta.window.label).toBe('last_30_days');
  });

  it('supports custom from/to window query parameters', async () => {
    const response = await request(app)
      .get('/api/v1/admin/stats?from=2026-01-01T00:00:00.000Z&to=2026-02-01T00:00:00.000Z')
      .set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(200);
    expect(response.body.meta.window.label).toBe('custom');
    expect(response.body.meta.window.from).toBe('2026-01-01T00:00:00.000Z');
    expect(response.body.meta.window.to).toBe('2026-02-01T00:00:00.000Z');
  });

  it('returns 400 when label is unsupported', async () => {
    const response = await request(app)
      .get('/api/v1/admin/stats?label=yesterday')
      .set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'label' })])
    );
  });

  it('returns 400 when from is not a strict ISO date-time', async () => {
    const response = await request(app)
      .get('/api/v1/admin/stats?from=2026-01-01&to=2026-02-01T00:00:00.000Z')
      .set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'from' })])
    );
  });

  it('returns 400 when label is combined with from/to', async () => {
    const response = await request(app)
      .get('/api/v1/admin/stats?label=last_30_days&from=2026-01-01T00:00:00.000Z&to=2026-02-01T00:00:00.000Z')
      .set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'label' })])
    );
  });

  it('returns 500 schema_error when response fails contract validation', async () => {
    (adminStatsService.getGlobalPlatformStats as jest.MockedFunction<typeof adminStatsService.getGlobalPlatformStats>)
      .mockResolvedValueOnce({
        meta: buildStatsResponse({
          label: 'all_time',
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-03-16T10:00:00.000Z',
        }).meta,
        platform: buildStatsResponse({
          label: 'all_time',
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-03-16T10:00:00.000Z',
        }).platform,
        teams: [],
      } as unknown as AdminStatsResponse);

    const response = await request(app).get('/api/v1/admin/stats').set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('schema_error');
  });

  it('returns 401 when X-API-KEY header is missing', async () => {
    const response = await request(app).get('/api/v1/admin/stats');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('invalid_api_key');
  });

  it('returns 401 when X-API-KEY is invalid', async () => {
    const response = await request(app).get('/api/v1/admin/stats').set('X-API-KEY', 'wrong-key');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('invalid_api_key');
  });

  it('returns 500 when ADMIN_API_KEY is not configured', async () => {
    delete process.env.ADMIN_API_KEY;

    const response = await request(app).get('/api/v1/admin/stats').set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('server_misconfigured');
    expect(response.body.details).toEqual({ field: 'ADMIN_API_KEY' });
  });

  it('GET /api/v1/admin/users returns JSON payload when API key is valid', async () => {
    (adminStatsService.getAdminUsers as jest.MockedFunction<typeof adminStatsService.getAdminUsers>).mockResolvedValue({
      users: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          teams: ['Team Atlas'],
          status: 'account_created',
          BFIcompleted: true,
        },
      ],
    });

    const response = await request(app).get('/api/v1/admin/users').set('X-API-KEY', 'test-admin-key');

    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(1);
    expect(response.body.users[0].email).toBe('alice@example.com');
    expect(response.body.users[0].BFIcompleted).toBe(true);
    expect(adminStatsService.getAdminUsers).toHaveBeenCalledTimes(1);
  });

  it('GET /api/v1/admin/users returns 401 when X-API-KEY header is missing', async () => {
    const response = await request(app).get('/api/v1/admin/users');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('invalid_api_key');
  });
});
