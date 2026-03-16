import { Request, Response, NextFunction } from 'express';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { z } from 'zod';
import { AppError } from '../services/auth.service';
import {
  getAdminUsers,
  getGlobalPlatformStats,
  resolveAdminStatsAllTimeFrom,
} from '../services/admin-stats.service';
import { resolveAdminStatsWindow } from '../utils/admin-stats-window';
import { adminStatsResponseSchema } from '../schemas/admin-stats-response.schema';

const querySchema = z.object({
  label: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateAdminStatsResponse = ajv.compile(adminStatsResponseSchema);

/**
 * GET /api/v1/admin/stats
 * Return platform-level usage statistics for admin clients.
 */
export const getGlobalStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsedQuery = querySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      const details = parsedQuery.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      throw new AppError('validation_error', 'Request validation failed', details, 400);
    }

    const allTimeFrom = await resolveAdminStatsAllTimeFrom();
    const window = resolveAdminStatsWindow(parsedQuery.data, allTimeFrom);
    const stats = await getGlobalPlatformStats(window);

    const isValid = validateAdminStatsResponse(stats);
    if (!isValid) {
      throw new AppError(
        'schema_error',
        'Admin stats response failed schema validation',
        validateAdminStatsResponse.errors ?? [],
        500
      );
    }

    res.status(200).json(stats);
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};

/**
 * GET /api/v1/admin/users
 * Return platform users and invited users for admin clients.
 */
export const getAdminUsersList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await getAdminUsers();
    res.status(200).json(users);
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};