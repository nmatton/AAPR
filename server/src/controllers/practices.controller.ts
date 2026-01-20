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
 * Supports search and filter query parameters
 */
export const getPractices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const pillarsParam = req.query.pillars ? String(req.query.pillars) : undefined;

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

    // Parse pillars parameter (comma-separated IDs)
    let pillars: number[] | undefined;
    if (pillarsParam) {
      const pillarIds = pillarsParam.split(',').map(id => Number(id.trim()));
      const invalidPillarIds = pillarIds.filter(id => !Number.isInteger(id) || id < 1);
      
      if (invalidPillarIds.length > 0) {
        throw new AppError(
          'validation_error',
          'Invalid pillar IDs in query',
          { invalidIds: invalidPillarIds },
          400
        );
      }
      
      pillars = pillarIds;
    }

    // Use searchPractices if search or filter params provided
    const practices = (search || pillars)
      ? await practicesService.searchPractices({ search, pillars, page, pageSize })
      : await practicesService.getPractices(page, pageSize);

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