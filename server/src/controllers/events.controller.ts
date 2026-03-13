import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logEvent } from '../services/events.service';
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
