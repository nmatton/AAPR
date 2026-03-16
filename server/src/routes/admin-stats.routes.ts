import { Router } from 'express';
import { requireExportApiKey } from '../middleware/requireExportApiKey';
import * as adminStatsController from '../controllers/admin-stats.controller';

export const adminStatsRouter = Router();

/**
 * GET /api/v1/admin/stats
 * Admin-only global usage statistics secured via X-API-KEY.
 */
adminStatsRouter.get('/stats', requireExportApiKey, adminStatsController.getGlobalStats);