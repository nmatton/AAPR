import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import Honeybadger from '@honeybadger-io/js';
import { AppError } from '../services/auth.service';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

const hasRequestId = (value: unknown): value is { requestId: string } =>
  typeof value === 'object' && value !== null && 'requestId' in value && typeof (value as { requestId: unknown }).requestId === 'string';

/**
 * Build Honeybadger context from request-scoped identifiers.
 * Only includes keys that are present; never leaks raw PII into context.
 */
const buildNoticeContext = (req: Request, res: Response): Record<string, unknown> => {
  const context: Record<string, unknown> = {};

  const requestId = res.getHeader('x-request-id');
  if (requestId) context.request_id = requestId;

  const user = (req as Request & { user?: { userId?: number; email?: string } }).user;
  if (user?.userId) context.user_id = user.userId;

  const teamId = res.locals.teamId;
  if (teamId) context.team_id = teamId;

  return context;
};

/**
 * Report an error to Honeybadger in production only.
 */
const reportToHoneybadger = (error: unknown, req: Request, res: Response): void => {
  if (!isProduction()) return;

  const context = buildNoticeContext(req, res);
  Honeybadger.notify(error instanceof Error ? error : new Error(String(error)), {
    context,
  });
};

/**
 * Global error handling middleware
 * Must be registered after all routes and after Honeybadger.errorHandler
 */
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = hasRequestId(error) ? error.requestId : res.getHeader('x-request-id');

  // Handle known AppError instances — expected domain errors, do NOT report to Honeybadger
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
      requestId
    });
    return;
  }

  // F5: Prisma P1000 IS reported — this is an operational incident
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1000') {
    reportToHoneybadger(error, req, res);
    res.status(503).json({
      code: 'database_authentication_failed',
      message: 'Database authentication failed',
      details: {
        providerCode: error.code,
        hint: 'Check POSTGRES_USER/POSTGRES_PASSWORD and recreate DB volume if credentials changed.'
      },
      requestId
    });
    return;
  }

  // Unexpected errors — report to Honeybadger with enriched context (production only)
  console.error('Unexpected error:', error);
  reportToHoneybadger(error, req, res);

  res.status(500).json({
    code: 'internal_server_error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? { stack: (error as Error).stack } : undefined,
    requestId
  });
};
