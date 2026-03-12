import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { finished } from 'stream/promises';
import { ZodError } from 'zod';
import { Event, Prisma } from '@prisma/client';
import { z } from 'zod';
import { findByTeamForExportBatch, EventExportCursor } from '../repositories/event.repository';
import { AppError } from './auth.service';
import { logEvent } from './events.service';

export type EventExportFormat = 'csv' | 'json';

export interface EventExportRequestInput {
  teamId: number | string;
  from: Date | string;
  to: Date | string;
  eventTypes?: string[];
  format?: string;
  exportDir?: string;
  batchSize?: number;
}

export interface EventExportRequest {
  teamId: number;
  from: Date;
  to: Date;
  fromLabel: string;
  toLabel: string;
  eventTypes: string[];
  format: EventExportFormat;
  exportDir: string;
  batchSize: number;
}

export interface EventExportResult {
  teamId: number;
  from: string;
  to: string;
  format: EventExportFormat;
  outputPath: string;
  fileName: string;
  rowCount: number;
  eventTypes: string[];
}

interface ParsedDateBoundary {
  date: Date;
  label: string;
}

const DEFAULT_BATCH_SIZE = 500;
const DATE_ONLY_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const FULL_NAME_PATTERN = /\b[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?\b/g;
const THREE_WORD_TITLE_CASE_PATTERN = /\b([A-Z][a-z]+(?:[-'][A-Z][a-z]+)?)\s+([A-Z][a-z]+(?:[-'][A-Z][a-z]+)?)\s+([A-Z][a-z]+(?:[-'][A-Z][a-z]+)?)\b/g;
const NAME_KEY_PATTERN = /(^|_|-)(name|firstname|first_name|lastname|last_name|fullname|full_name|displayname|display_name)$/i;
const EMAIL_KEY_PATTERN = /email/i;
const SENSITIVE_KEY_PATTERN = /(^|_|-)(password|secret|token|address|phone|mobile)$/i;
const PERSON_CONTEXT_KEY_PATTERN = /(^|_|-)(actor|attendee|author|contact|creator|editor|invitee|member|owner|participant|person|profile|researcher|reviewer|user)$/i;
const NON_NAME_LEAD_WORDS = new Set(['Contact', 'Email', 'User', 'Owner', 'Member']);

const requestSchema = z.object({
  teamId: z.coerce.number().int().positive('teamId must be a positive integer'),
  batchSize: z.coerce.number().int().positive().max(5000).default(DEFAULT_BATCH_SIZE),
});

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseDateBoundary = (value: string | Date, boundary: 'start' | 'end'): ParsedDateBoundary => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new AppError('validation_error', 'Invalid date range', { field: boundary }, 400);
    }

    return {
      date: value,
      label: value.toISOString().slice(0, 10),
    };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new AppError('validation_error', 'Invalid date range', { field: boundary }, 400);
  }

  if (DATE_ONLY_INPUT_PATTERN.test(trimmed)) {
    const suffix = boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z';
    return {
      date: new Date(`${trimmed}${suffix}`),
      label: trimmed,
    };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('validation_error', 'Invalid date range', { field: boundary, value: trimmed }, 400);
  }

  return {
    date: parsed,
    label: parsed.toISOString().slice(0, 10),
  };
};

const writeChunk = async (stream: NodeJS.WritableStream, chunk: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    stream.write(chunk, (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const isPersonContextPath = (pathSegments: string[]): boolean => {
  return pathSegments.some((segment) => PERSON_CONTEXT_KEY_PATTERN.test(segment));
};

const redactFullNames = (value: string): string => {
  const trimmed = value.trim();

  const withLeadingContextPreserved = value.replace(
    THREE_WORD_TITLE_CASE_PATTERN,
    (match, first) => {
      if (NON_NAME_LEAD_WORDS.has(first)) {
        return `${first} REDACTED`;
      }

      return match;
    }
  );

  if (FULL_NAME_PATTERN.test(trimmed) && trimmed.match(FULL_NAME_PATTERN)?.[0] === trimmed) {
    FULL_NAME_PATTERN.lastIndex = 0;
    return 'REDACTED';
  }

  FULL_NAME_PATTERN.lastIndex = 0;
  return withLeadingContextPreserved.replace(FULL_NAME_PATTERN, 'REDACTED');
};

const redactScalar = (value: unknown, key?: string, pathSegments: string[] = []): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const redactedEmails = value.replace(EMAIL_PATTERN, 'redacted@example.com');

  if (key && EMAIL_KEY_PATTERN.test(key)) {
    return 'redacted@example.com';
  }

  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return 'REDACTED';
  }

  if (key && NAME_KEY_PATTERN.test(key)) {
    return redactFullNames(redactedEmails);
  }

  if (isPersonContextPath(pathSegments)) {
    return redactFullNames(redactedEmails);
  }

  return redactFullNames(redactedEmails);
};

export const redactEventExportPayload = (
  value: Prisma.JsonValue | null,
  pathSegments: string[] = []
): Prisma.JsonValue | null => {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (Array.isArray(item) || isPlainObject(item) || item === null) {
        return redactEventExportPayload(item as Prisma.JsonValue, pathSegments);
      }

      return redactScalar(item, undefined, pathSegments) as Prisma.JsonValue;
    }) as Prisma.JsonValue;
  }

  if (isPlainObject(value)) {
    const redactedEntries = Object.entries(value).map(([key, item]) => {
      if (Array.isArray(item) || isPlainObject(item) || item === null) {
        return [key, redactEventExportPayload(item as Prisma.JsonValue, [...pathSegments, key])];
      }

      return [key, redactScalar(item, key, [...pathSegments, key])];
    });

    return Object.fromEntries(redactedEntries) as Prisma.JsonValue;
  }

  return redactScalar(value, undefined, pathSegments) as Prisma.JsonValue;
};

const stringifyPayload = (payload: Prisma.JsonValue | null): string => {
  return JSON.stringify(redactEventExportPayload(payload));
};

const normalizeExportFormat = (value?: string): EventExportFormat => {
  const normalized = (value ?? 'csv').trim().toLowerCase();

  if (normalized !== 'csv' && normalized !== 'json') {
    throw new AppError('validation_error', 'Invalid export format', {
      field: 'format',
      allowed: ['csv', 'json'],
    }, 400);
  }

  return normalized;
};

const buildCsvRecord = (event: Event): string[] => {
  return [
    event.actorId === null ? '' : String(event.actorId),
    event.teamId === null ? '' : String(event.teamId),
    event.entityType ?? '',
    event.entityId === null ? '' : String(event.entityId),
    event.action ?? '',
    stringifyPayload(event.payload as Prisma.JsonValue | null),
    event.createdAt.toISOString(),
  ];
};

export const serializeEventRecordAsCsv = (event: Event): string => {
  return buildCsvRecord(event).map(escapeCsvValue).join(',');
};

const serializeEventRecordAsJson = (event: Event) => ({
  actor_id: event.actorId,
  team_id: event.teamId,
  event_type: event.eventType,
  entity_type: event.entityType,
  entity_id: event.entityId,
  action: event.action,
  payload_json: redactEventExportPayload(event.payload as Prisma.JsonValue | null),
  created_at: event.createdAt.toISOString(),
});

const resolveExportDirectory = (providedDir?: string): string => {
  const configuredDir = providedDir?.trim() || process.env.EVENT_EXPORT_DIR?.trim() || 'exports';
  return path.resolve(process.cwd(), configuredDir);
};

const buildOutputFileName = (request: EventExportRequest): string => {
  return `team-events-${request.fromLabel}-to-${request.toLabel}.${request.format}`;
};

const logExportTelemetry = async (
  eventType: 'event.export_started' | 'event.export_completed' | 'event.export_failed',
  request: Partial<EventExportRequest> & { teamId: number },
  payload: Record<string, unknown>
): Promise<void> => {
  try {
    await logEvent({
      eventType,
      teamId: request.teamId,
      entityType: 'event',
      action: eventType.replace('event.', ''),
      payload: {
        teamId: request.teamId,
        from: request.from?.toISOString(),
        to: request.to?.toISOString(),
        format: request.format,
        eventTypes: request.eventTypes ?? [],
        ...payload,
        systemReason: 'CLI export executed by an authorized server operator.',
      },
    });
  } catch (error) {
    console.warn('[WARN] Export telemetry failed:', error);
  }
};

export const normalizeEventExportOptions = (input: EventExportRequestInput): EventExportRequest => {
  let parsed: z.infer<typeof requestSchema>;

  try {
    parsed = requestSchema.parse({
      teamId: input.teamId,
      batchSize: input.batchSize ?? DEFAULT_BATCH_SIZE,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('validation_error', error.issues[0]?.message ?? 'Invalid export request', {
        issues: error.issues,
      }, 400);
    }

    throw error;
  }

  const from = parseDateBoundary(input.from, 'start');
  const to = parseDateBoundary(input.to, 'end');
  const now = new Date();

  if (from.date > to.date || from.date > now || to.date > now) {
    throw new AppError('validation_error', 'Invalid date range', {
      from: from.date.toISOString(),
      to: to.date.toISOString(),
    }, 400);
  }

  const eventTypes = Array.from(new Set((input.eventTypes ?? []).map((eventType) => eventType.trim()).filter(Boolean)));

  return {
    teamId: parsed.teamId,
    from: from.date,
    to: to.date,
    fromLabel: from.label,
    toLabel: to.label,
    eventTypes,
    format: normalizeExportFormat(input.format),
    exportDir: resolveExportDirectory(input.exportDir),
    batchSize: parsed.batchSize,
  };
};

const streamCsvExport = async (request: EventExportRequest, outputPath: string): Promise<number> => {
  const stream = createWriteStream(outputPath, { encoding: 'utf8' });
  let rowCount = 0;
  let cursor: EventExportCursor | undefined;

  try {
    await writeChunk(stream, 'actor_id,team_id,entity_type,entity_id,action,payload_json,created_at\n');

    while (true) {
      const batch = await findByTeamForExportBatch(
        request.teamId,
        {
          from: request.from,
          to: request.to,
          eventTypes: request.eventTypes,
        },
        cursor,
        request.batchSize
      );

      if (batch.length === 0) {
        break;
      }

      for (const event of batch) {
        await writeChunk(stream, `${serializeEventRecordAsCsv(event)}\n`);
        rowCount += 1;
      }

      const lastEvent = batch[batch.length - 1];
      cursor = {
        createdAt: lastEvent.createdAt,
        id: lastEvent.id,
      };
    }

    stream.end();
    await finished(stream);
    return rowCount;
  } catch (error) {
    stream.destroy();
    throw error;
  }
};

const streamJsonExport = async (request: EventExportRequest, outputPath: string): Promise<number> => {
  const stream = createWriteStream(outputPath, { encoding: 'utf8' });
  let rowCount = 0;
  let cursor: EventExportCursor | undefined;
  let firstRecord = true;

  try {
    await writeChunk(stream, '[\n');

    while (true) {
      const batch = await findByTeamForExportBatch(
        request.teamId,
        {
          from: request.from,
          to: request.to,
          eventTypes: request.eventTypes,
        },
        cursor,
        request.batchSize
      );

      if (batch.length === 0) {
        break;
      }

      for (const event of batch) {
        const prefix = firstRecord ? '  ' : ',\n  ';
        await writeChunk(stream, `${prefix}${JSON.stringify(serializeEventRecordAsJson(event))}`);
        firstRecord = false;
        rowCount += 1;
      }

      const lastEvent = batch[batch.length - 1];
      cursor = {
        createdAt: lastEvent.createdAt,
        id: lastEvent.id,
      };
    }

    await writeChunk(stream, firstRecord ? ']\n' : '\n]\n');
    stream.end();
    await finished(stream);
    return rowCount;
  } catch (error) {
    stream.destroy();
    throw error;
  }
};

export const exportEvents = async (input: EventExportRequestInput): Promise<EventExportResult> => {
  const request = normalizeEventExportOptions(input);
  const fileName = buildOutputFileName(request);
  const outputPath = path.join(request.exportDir, fileName);

  await fs.mkdir(request.exportDir, { recursive: true });

  await logExportTelemetry('event.export_started', request, {
    outputPath,
  });

  try {
    const rowCount = request.format === 'csv'
      ? await streamCsvExport(request, outputPath)
      : await streamJsonExport(request, outputPath);

    if (rowCount === 0) {
      await fs.rm(outputPath, { force: true });
      throw new AppError('not_found', 'No events found in date range', {
        teamId: request.teamId,
        from: request.from.toISOString(),
        to: request.to.toISOString(),
      }, 404);
    }

    await logExportTelemetry('event.export_completed', request, {
      outputPath,
      rowCount,
    });

    return {
      teamId: request.teamId,
      from: request.from.toISOString(),
      to: request.to.toISOString(),
      format: request.format,
      outputPath,
      fileName,
      rowCount,
      eventTypes: request.eventTypes,
    };
  } catch (error) {
    await fs.rm(outputPath, { force: true });

    await logExportTelemetry('event.export_failed', request, {
      message: error instanceof Error ? error.message : 'Unknown export failure',
      outputPath,
    });

    throw error;
  }
};