import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as eventsController from '../controllers/events.controller';

export const eventsRouter = Router();

/**
 * POST /api/v1/events
 * Ingest frontend telemetry events.
 */
eventsRouter.post('/', requireAuth, eventsController.createEvent);
