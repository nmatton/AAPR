import { Request, Response, NextFunction } from 'express';
import { getGlobalPlatformStats } from '../services/admin-stats.service';

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
    const stats = await getGlobalPlatformStats();
    res.status(200).json(stats);
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};