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
          categoryId: 'PROCESS_EXECUTION',
          categoryName: 'Process & Execution',
          pillars: [
            { id: 1, name: 'Work Transparency & Synchronization', category: 'Process & Execution', description: 'Alignment' }
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

  it('rejects non-integer pagination params', async () => {
    const response = await request(app).get('/api/v1/practices?page=abc&pageSize=2.5');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
  });

  it('rejects negative pagination params', async () => {
    const response = await request(app).get('/api/v1/practices?page=-1&pageSize=-5');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
  });

  it('searches practices by keyword', async () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team daily',
          categoryId: 'PROCESS_EXECUTION',
          categoryName: 'Process & Execution',
          pillars: []
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    };

    (practicesService.searchPractices as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app).get('/api/v1/practices?search=standup');

    expect(practicesService.searchPractices).toHaveBeenCalledWith({
      search: 'standup',
      pillars: undefined,
      page: 1,
      pageSize: 20
    });
    expect(response.status).toBe(200);
    expect(response.body.items[0].title).toBe('Daily Standup');
  });

  it('filters practices by single pillar', async () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team daily',
          categoryId: 'PROCESS_EXECUTION',
          categoryName: 'Process & Execution',
          pillars: [{ id: 5, name: 'Work Transparency & Synchronization', category: 'Process & Execution' }]
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    };

    (practicesService.searchPractices as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app).get('/api/v1/practices?pillars=5');

    expect(practicesService.searchPractices).toHaveBeenCalledWith({
      search: undefined,
      pillars: [5],
      page: 1,
      pageSize: 20
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
  });

  it('filters practices by multiple pillars', async () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team daily',
          categoryId: 'PROCESS_EXECUTION',
          categoryName: 'Process & Execution',
          pillars: [{ id: 5, name: 'Work Transparency & Synchronization', category: 'Process & Execution' }]
        },
        {
          id: 2,
          title: 'Retrospective',
          goal: 'Reflect and improve',
          categoryId: 'PROCESS_EXECUTION',
          categoryName: 'Process & Execution',
          pillars: [{ id: 8, name: 'Inspection & Adaptation', category: 'Process & Execution' }]
        }
      ],
      page: 1,
      pageSize: 20,
      total: 2
    };

    (practicesService.searchPractices as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app).get('/api/v1/practices?pillars=5,8');

    expect(practicesService.searchPractices).toHaveBeenCalledWith({
      search: undefined,
      pillars: [5, 8],
      page: 1,
      pageSize: 20
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
  });

  it('combines search and filter', async () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team daily',
          categoryId: 'PROCESS_EXECUTION',
          categoryName: 'Process & Execution',
          pillars: [{ id: 5, name: 'Work Transparency & Synchronization', category: 'Process & Execution' }]
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    };

    (practicesService.searchPractices as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app).get('/api/v1/practices?search=standup&pillars=5');

    expect(practicesService.searchPractices).toHaveBeenCalledWith({
      search: 'standup',
      pillars: [5],
      page: 1,
      pageSize: 20
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
  });

  it('returns validation error for invalid pillar IDs format', async () => {
    const response = await request(app).get('/api/v1/practices?pillars=abc,xyz');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
    expect(response.body.message).toContain('Invalid pillar IDs');
  });

  it('returns validation error for negative pillar IDs', async () => {
    const response = await request(app).get('/api/v1/practices?pillars=5,-1');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
    expect(response.body.message).toContain('Invalid pillar IDs');
  });

  it('returns empty results when no practices match search', async () => {
    const mockResponse = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0
    };

    (practicesService.searchPractices as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app).get('/api/v1/practices?search=nonexistent');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
    expect(response.body.total).toBe(0);
  });
});

describe('GET /api/v1/practices/methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sorted distinct methods with requestId', async () => {
    (practicesService.getAllDistinctMethods as jest.Mock).mockResolvedValue(['Kanban', 'Scrum']);

    const response = await request(app).get('/api/v1/practices/methods');

    expect(response.status).toBe(200);
    expect(practicesService.getAllDistinctMethods).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      methods: ['Kanban', 'Scrum'],
      requestId: 'test-request-id'
    });
  });

  it('passes service errors through structured error handling', async () => {
    const error: any = new Error('Database unavailable');
    error.code = 'database_error';
    error.statusCode = 503;
    (practicesService.getAllDistinctMethods as jest.Mock).mockRejectedValue(error);

    const response = await request(app).get('/api/v1/practices/methods');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'database_error',
      message: 'Database unavailable',
      requestId: 'test-request-id'
    });
  });
});