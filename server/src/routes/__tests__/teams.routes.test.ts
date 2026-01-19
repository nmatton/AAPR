import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { teamsRouter } from '../teams.routes';
import * as teamsService from '../../services/teams.service';
import { requireAuth } from '../../middleware/requireAuth';

// Mock the service and middleware
jest.mock('../../services/teams.service');
jest.mock('../../middleware/requireAuth');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Add request ID middleware
app.use((req, _res, next) => {
  req.id = 'test-request-id';
  next();
});

app.use('/api/v1/teams', teamsRouter);

// Error handler
app.use((err: any, req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({
    code: err.code || 'internal_error',
    message: err.message,
    requestId: err.requestId || req.id,
  });
});

describe('GET /api/v1/teams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock requireAuth to add user to request
    (requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 1, email: 'test@example.com' };
      next();
    });
  });

  it('returns 200 with teams array for authenticated user', async () => {
    const mockTeams = [
      {
        id: 1,
        name: 'Team Alpha',
        memberCount: 5,
        practiceCount: 8,
        coverage: 74,
        role: 'owner',
        createdAt: '2026-01-15T10:00:00.000Z',
      },
      {
        id: 2,
        name: 'Team Beta',
        memberCount: 3,
        practiceCount: 4,
        coverage: 42,
        role: 'member',
        createdAt: '2026-01-16T14:00:00.000Z',
      },
    ];

    (teamsService.getUserTeams as jest.Mock).mockResolvedValue(mockTeams);

    const response = await request(app).get('/api/v1/teams');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      teams: mockTeams,
      requestId: 'test-request-id',
    });
    expect(teamsService.getUserTeams).toHaveBeenCalledWith(1);
  });

  it('returns empty array if user has no teams', async () => {
    (teamsService.getUserTeams as jest.Mock).mockResolvedValue([]);

    const response = await request(app).get('/api/v1/teams');

    expect(response.status).toBe(200);
    expect(response.body.teams).toEqual([]);
  });

  it('returns 401 without authentication', async () => {
    // Mock requireAuth to reject
    (requireAuth as any).mockImplementation((_req: any, _res: any, next: any) => {
      const error: any = new Error('Unauthorized');
      error.statusCode = 401;
      error.code = 'unauthorized';
      next(error);
    });

    const response = await request(app).get('/api/v1/teams');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('unauthorized');
  });

  it('returns 500 on service error', async () => {
    const serviceError: any = new Error('Database connection failed');
    serviceError.code = 'database_error';
    serviceError.statusCode = 500;

    (teamsService.getUserTeams as jest.Mock).mockRejectedValue(serviceError);

    const response = await request(app).get('/api/v1/teams');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Database connection failed');
    expect(response.body.requestId).toBe('test-request-id');
  });

  it('includes requestId in response', async () => {
    (teamsService.getUserTeams as jest.Mock).mockResolvedValue([]);

    const response = await request(app).get('/api/v1/teams');

    expect(response.body.requestId).toBe('test-request-id');
  });

  it('calls service with correct user ID from JWT', async () => {
    // Mock different user
    (requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 42, email: 'user42@example.com' };
      next();
    });

    (teamsService.getUserTeams as jest.Mock).mockResolvedValue([]);

    await request(app).get('/api/v1/teams');

    expect(teamsService.getUserTeams).toHaveBeenCalledWith(42);
  });
});

describe('Team Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('user A cannot see user B teams', async () => {
    // User A (id: 1) with teams [1, 2]
    (requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 1, email: 'userA@example.com' };
      next();
    });

    const userATeams = [
      { id: 1, name: 'Team 1', memberCount: 5, practiceCount: 8, coverage: 74, role: 'owner', createdAt: '2026-01-15T10:00:00.000Z' },
      { id: 2, name: 'Team 2', memberCount: 3, practiceCount: 4, coverage: 42, role: 'member', createdAt: '2026-01-16T14:00:00.000Z' },
    ];

    (teamsService.getUserTeams as jest.Mock).mockResolvedValue(userATeams);

    const responseA = await request(app).get('/api/v1/teams');

    expect(responseA.status).toBe(200);
    expect(responseA.body.teams).toHaveLength(2);
    expect(responseA.body.teams.map((t: any) => t.id)).toEqual([1, 2]);

    // User B (id: 2) with teams [2, 3]
    (requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 2, email: 'userB@example.com' };
      next();
    });

    const userBTeams = [
      { id: 2, name: 'Team 2', memberCount: 3, practiceCount: 4, coverage: 42, role: 'member', createdAt: '2026-01-16T14:00:00.000Z' },
      { id: 3, name: 'Team 3', memberCount: 7, practiceCount: 12, coverage: 89, role: 'owner', createdAt: '2026-01-17T09:00:00.000Z' },
    ];

    (teamsService.getUserTeams as jest.Mock).mockResolvedValue(userBTeams);

    const responseB = await request(app).get('/api/v1/teams');

    expect(responseB.status).toBe(200);
    expect(responseB.body.teams).toHaveLength(2);
    expect(responseB.body.teams.map((t: any) => t.id)).toEqual([2, 3]);

    // Verify User A never saw Team 3
    expect(userATeams.find((t: any) => t.id === 3)).toBeUndefined();
  });
});
