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
    const categoriesParam = req.query.categories ? String(req.query.categories) : undefined;
    const methodsParam = req.query.methods ? String(req.query.methods) : undefined;
    const tagsParam = req.query.tags ? String(req.query.tags) : undefined;

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

    // Parse categories, methods, tags (comma-separated strings)
    const categories = categoriesParam ? categoriesParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const methods = methodsParam ? methodsParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    // Tags might contain commas? Assuming simple tags for now. If tags contain commas, this splitting is problematic, but standard URL usage often uses repeating params or comma-separated. AC says "comma-separated text input" for UI, probably same for API.
    const tags = tagsParam ? tagsParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    // Use searchPractices if search or filter params provided
    const practices = (search || pillars || categories || methods || tags)
      ? await practicesService.searchPractices({ search, pillars, categories, methods, tags, page, pageSize })
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

/**
 * GET /api/v1/practices/:id
 * Fetch full practice detail by ID
 */
export const getPracticeDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError('validation_error', 'Invalid practice ID', { id }, 400);
    }

    const detail = await practicesService.getPracticeDetail(id);
    res.json({ practice: detail, requestId: req.id });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};