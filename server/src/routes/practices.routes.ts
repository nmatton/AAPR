import { Router } from 'express';
import * as practicesController from '../controllers/practices.controller';

export const practicesRouter = Router();

/**
 * GET /api/v1/practices
 * Fetch practice catalog for selection UI
 */
practicesRouter.get('/', practicesController.getPractices);