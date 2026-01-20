import { Request, Response, NextFunction } from 'express';
import * as practicesService from '../services/practices.service';
import { AppError } from '../services/auth.service';

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
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;

    const invalidPage = !Number.isInteger(page) || page < 1;
    const invalidPageSize = !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100;

    if (invalidPage || invalidPageSize) {
      throw new AppError(
        'validation_error',
        'Invalid pagination parameters',
        { page, pageSize },
        400
      );
    }

    const practices = await practicesService.getPractices(page, pageSize);

    res.json({
      ...practices,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};