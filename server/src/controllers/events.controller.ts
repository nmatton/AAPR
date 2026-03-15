import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { logEvent } from '../services/events.service';
import { exportEvents } from '../services/event-export.service';
import { AppError } from '../services/auth.service';

const createEventSchema = z
  .object({
    action: z.string().trim().min(1, 'action is required'),
    eventType: z.string().trim().min(1).optional(),
    teamId: z.number().int().positive().nullable().optional(),
    entityType: z.string().trim().min(1).optional(),
    entityId: z.number().int().positive().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const parseEventTypeQuery = (value: unknown): string[] => {
  if (value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length === 0 ? [] : [normalized];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  throw new AppError('validation_error', 'Request validation failed', [
    {
      path: 'eventType',
      message: 'eventType must be a string or repeated query parameter',
      code: 'invalid_type',
    },
  ], 400);
};

const exportQuerySchema = z.object({
  teamId: z.coerce.number().int().positive('teamId must be a positive integer'),
  from: z.string().trim().min(1, 'from is required'),
  to: z.string().trim().min(1, 'to is required'),
});

/**
 * POST /api/v1/events
 * Best-effort telemetry ingestion endpoint used by the frontend.
 */
export const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actorId = req.user?.userId;
    if (!actorId) {
      throw new AppError('missing_token', 'Authentication required', { field: 'authorization' }, 401);
    }

    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      throw new AppError('validation_error', 'Request validation failed', details, 400);
    }

    const { action, eventType, teamId, entityType, entityId, payload, ...extraPayload } = parsed.data;

    try {
      const created = await logEvent({
        eventType: eventType ?? action,
        action,
        teamId: teamId ?? undefined,
        actorId,
        entityType,
        entityId,
        payload: {
          ...extraPayload,
          ...(payload ?? {}),
        },
      });

      res.status(202).json({
        accepted: true,
        // Prisma returns BigInt for Event.id; convert for JSON transport.
        eventId: created.id.toString(),
        requestId: req.id,
      });
      return;
    } catch (error) {
      // Client telemetry should be best-effort and must not break user flows.
      if (error instanceof AppError && error.code === 'validation_error') {
        res.status(202).json({
          accepted: false,
          requestId: req.id,
        });
        return;
      }
      throw error;
    }
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * GET /api/v1/events/export
 * Trigger export and return CSV payload for the requested filters.
 */
export const exportTeamEventsCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      throw new AppError('validation_error', 'Request validation failed', details, 400);
    }

    const eventTypes = parseEventTypeQuery(req.query.eventType);

    const result = await exportEvents({
      teamId: parsed.data.teamId,
      from: parsed.data.from,
      to: parsed.data.to,
      eventTypes,
      format: 'csv',
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);

    res.sendFile(result.outputPath, async (error) => {
      try {
        await fs.rm(result.outputPath, { force: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup exported CSV file:', cleanupError);
      }

      if (error) {
        next(error);
      }
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};
