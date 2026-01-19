import { Request, Response, NextFunction } from 'express';
import * as practicesService from '../services/practices.service';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * GET /api/v1/practices
 * Fetch practice catalog with pillar mappings
 */
export const getPractices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const practices = await practicesService.getPractices();

    res.json({
      practices,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};