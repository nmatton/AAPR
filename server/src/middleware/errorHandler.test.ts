import { Request, Response, NextFunction } from 'express';
import Honeybadger from '@honeybadger-io/js';
import { errorHandler } from './errorHandler';
import { AppError } from '../services/auth.service';

jest.mock('@honeybadger-io/js', () => ({
  notify: jest.fn(),
  configure: jest.fn(),
  requestHandler: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  errorHandler: jest.fn((_err: unknown, _req: unknown, _res: unknown, next: () => void) => next()),
}));

const buildMockReq = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    params: {},
    cookies: {},
    ...overrides,
  } as unknown as Request);

const buildMockRes = (): Response & { _body: unknown; _status: number } => {
  const res: Record<string, unknown> = {
    _body: null,
    _status: 200,
    locals: {},
  };
  const headers: Record<string, string | number | readonly string[]> = {
    'x-request-id': 'test-request-id',
  };
  res.status = jest.fn((code: number) => {
    (res as { _status: number })._status = code;
    return res;
  });
  res.json = jest.fn((body: unknown) => {
    (res as { _body: unknown })._body = body;
    return res;
  });
  res.getHeader = jest.fn((name: string) => headers[name.toLowerCase()]);
  res.setHeader = jest.fn((name: string, value: string | number | readonly string[]) => {
    headers[name.toLowerCase()] = value;
  });
  return res as unknown as Response & { _body: unknown; _status: number };
};

const noop: NextFunction = jest.fn();

const originalEnv = process.env.NODE_ENV;

describe('errorHandler middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe('AppError handling (expected domain errors)', () => {
    it('returns structured JSON with correct status code', () => {
      const error = new AppError('validation_error', 'Invalid input', { field: 'email' }, 400);
      const req = buildMockReq();
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      expect(res._status).toBe(400);
      expect(res._body).toEqual({
        code: 'validation_error',
        message: 'Invalid input',
        details: { field: 'email' },
        requestId: 'test-request-id',
      });
    });

    it('does NOT report AppError to Honeybadger', () => {
      const error = new AppError('not_found', 'Not found', undefined, 404);
      const req = buildMockReq();
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      expect(Honeybadger.notify).not.toHaveBeenCalled();
    });
  });

  describe('unexpected error handling', () => {
    it('returns 500 with generic message', () => {
      const error = new Error('Something broke');
      const req = buildMockReq();
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      expect(res._status).toBe(500);
      expect(res._body).toEqual(
        expect.objectContaining({
          code: 'internal_server_error',
          message: 'An unexpected error occurred',
          requestId: 'test-request-id',
        })
      );
    });

    it('reports unexpected error to Honeybadger in production', () => {
      const error = new Error('Something broke');
      const req = buildMockReq();
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      expect(Honeybadger.notify).toHaveBeenCalledTimes(1);
      expect(Honeybadger.notify).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: expect.objectContaining({ request_id: 'test-request-id' }),
        })
      );
    });

    it('does NOT report to Honeybadger outside production', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('dev error');
      const req = buildMockReq();
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      expect(Honeybadger.notify).not.toHaveBeenCalled();
      expect(res._status).toBe(500);
    });

    it('wraps non-Error throwable in Error before reporting', () => {
      const error = 'string-error';
      const req = buildMockReq();
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      expect(Honeybadger.notify).toHaveBeenCalledTimes(1);
      const notifiedError = (Honeybadger.notify as jest.Mock).mock.calls[0][0];
      expect(notifiedError).toBeInstanceOf(Error);
      expect(notifiedError.message).toBe('string-error');
      expect(res._status).toBe(500);
    });
  });

  describe('context enrichment', () => {
    it('includes user_id when req.user is present', () => {
      const error = new Error('fail');
      const req = buildMockReq();
      (req as Request & { user?: { userId: number } }).user = { userId: 42 };
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      const notifyCall = (Honeybadger.notify as jest.Mock).mock.calls[0];
      expect(notifyCall[1].context).toEqual(
        expect.objectContaining({ request_id: 'test-request-id', user_id: 42 })
      );
    });

    it('includes team_id when res.locals.teamId is present', () => {
      const error = new Error('fail');
      const req = buildMockReq();
      const res = buildMockRes();
      res.locals.teamId = 7;

      errorHandler(error, req, res, noop);

      const notifyCall = (Honeybadger.notify as jest.Mock).mock.calls[0];
      expect(notifyCall[1].context).toEqual(
        expect.objectContaining({ request_id: 'test-request-id', team_id: 7 })
      );
    });
  });

  describe('response contract stability', () => {
    it('always includes requestId in error responses', () => {
      const cases: Array<[unknown, number]> = [
        [new AppError('test', 'test', undefined, 422), 422],
        [new Error('unexpected'), 500],
      ];

      for (const [error, expectedStatus] of cases) {
        const req = buildMockReq();
        const res = buildMockRes();

        errorHandler(error, req, res, noop);

        expect(res._status).toBe(expectedStatus);
        expect((res._body as { requestId?: string }).requestId).toBe('test-request-id');
      }
    });

    it('preserves code/message/details/requestId shape for AppError', () => {
      const error = new AppError('auth_failed', 'Auth failed', { reason: 'expired' }, 401);
      const req = buildMockReq();
      const res = buildMockRes();

      errorHandler(error, req, res, noop);

      const body = res._body as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(['code', 'details', 'message', 'requestId']);
    });
  });
});
