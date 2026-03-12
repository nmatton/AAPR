import { Router } from 'express';
import * as practicesController from '../controllers/practices.controller';

export const practicesRouter = Router();

/**
 * GET /api/v1/practices
 * Fetch practice catalog for selection UI
 */
practicesRouter.get('/', practicesController.getPractices);

/**
 * GET /api/v1/practices/methods
 * Fetch all distinct method values from global catalog
 */
practicesRouter.get('/methods', practicesController.getPracticeMethods);

/**
 * GET /api/v1/practices/:id
 * Fetch full practice detail by ID
 */
practicesRouter.get('/:id', practicesController.getPracticeDetail);