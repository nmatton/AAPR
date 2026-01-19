import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { practicesRouter } from '../practices.routes';
import * as practicesService from '../../services/practices.service';
import { requireAuth } from '../../middleware/requireAuth';

jest.mock('../../services/practices.service');
jest.mock('../../middleware/requireAuth');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use((req, _res, next) => {
  req.id = 'test-request-id';
  next();
});

app.use('/api/v1/practices', practicesRouter);

app.use((err: any, req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({
    code: err.code || 'internal_error',
    message: err.message,
    requestId: err.requestId || req.id,
  });
});

describe('GET /api/v1/practices', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (requireAuth as any).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { userId: 1, email: 'test@example.com' };
      next();
    });
  });

  it('returns practices list for authenticated user', async () => {
    const mockPractices = [
      {
        id: 1,
        title: 'Daily Standup',
        goal: 'Synchronize team daily',
        category: 'FEEDBACK & APPRENTISSAGE',
        pillars: [{ id: 1, name: 'Communication' }]
      }
    ];

    (practicesService.getPractices as jest.Mock).mockResolvedValue(mockPractices);

    const response = await request(app).get('/api/v1/practices');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      practices: mockPractices,
      requestId: 'test-request-id'
    });
  });

  it('returns 401 without authentication', async () => {
    (requireAuth as any).mockImplementation((_req: any, _res: any, next: any) => {
      const error: any = new Error('Unauthorized');
      error.statusCode = 401;
      error.code = 'unauthorized';
      next(error);
    });

    const response = await request(app).get('/api/v1/practices');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('unauthorized');
  });
});