import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireExportApiKey } from '../middleware/requireExportApiKey';
import * as eventsController from '../controllers/events.controller';

export const eventsRouter = Router();

/**
 * POST /api/v1/events
 * Ingest frontend telemetry events.
 */
eventsRouter.post('/', requireAuth, eventsController.createEvent);

/**
 * GET /api/v1/events/export
 * Operator-only export endpoint secured via X-API-KEY header.
 * Query params: teamId, from, to, eventType (repeatable)
 */
eventsRouter.get('/export', requireExportApiKey, eventsController.exportTeamEventsCsv);
