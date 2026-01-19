import { Router } from 'express';
import * as practicesController from '../controllers/practices.controller';
import { requireAuth } from '../middleware/requireAuth';

export const practicesRouter = Router();

/**
 * GET /api/v1/practices
 * Fetch practice catalog for selection UI
 * Protected by requireAuth middleware
 */
practicesRouter.get('/', requireAuth, practicesController.getPractices);