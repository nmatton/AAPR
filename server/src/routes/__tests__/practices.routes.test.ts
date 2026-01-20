import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { practicesRouter } from '../practices.routes';
import * as practicesService from '../../services/practices.service';

jest.mock('../../services/practices.service');

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
  });

  it('returns paginated practices response with defaults', async () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team daily',
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          categoryName: 'FEEDBACK & APPRENTISSAGE',
          pillars: [
            { id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE', description: 'Alignment' }
          ]
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    };

    (practicesService.getPractices as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app).get('/api/v1/practices');

    expect(practicesService.getPractices).toHaveBeenCalledWith(1, 20);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...mockResponse,
      requestId: 'test-request-id'
    });
  });

  it('passes pagination params from query string', async () => {
    (practicesService.getPractices as jest.Mock).mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 50,
      total: 0
    });

    const response = await request(app).get('/api/v1/practices?page=2&pageSize=50');

    expect(practicesService.getPractices).toHaveBeenCalledWith(2, 50);
    expect(response.body.page).toBe(2);
    expect(response.body.pageSize).toBe(50);
  });

  it('returns validation error for invalid pagination params', async () => {
    const response = await request(app).get('/api/v1/practices?page=0&pageSize=200');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
    expect(response.body.requestId).toBe('test-request-id');
  });
});