process.env.JWT_SECRET = 'test_secret_for_event_export_12345678901234567890';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { exportEvents, normalizeEventExportOptions, redactEventExportPayload } from './event-export.service';
import { findByTeamForExportBatch } from '../repositories/event.repository';
import { logEvent } from './events.service';

jest.mock('../repositories/event.repository', () => ({
  findByTeamForExportBatch: jest.fn(),
}));

jest.mock('./events.service', () => ({
  logEvent: jest.fn(),
}));

const makeEvent = (id: bigint, createdAt: string, overrides: Record<string, unknown> = {}) => ({
  id,
  eventType: 'issue.created',
  actorId: 4,
  teamId: 9,
  entityType: 'issue',
  entityId: Number(id),
  action: 'created',
  payload: {
    email: 'jane@example.com',
    name: 'Jane Doe',
    note: 'contains,comma and "quotes"\nnext line',
  },
  schemaVersion: 'v1',
  createdAt: new Date(createdAt),
  ...overrides,
});

describe('event-export.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EVENT_EXPORT_DIR;
    (logEvent as unknown as jest.Mock<any>).mockResolvedValue({ id: 1n });
  });

  it('normalizes date-only inputs to inclusive UTC day boundaries', () => {
    const result = normalizeEventExportOptions({
      teamId: '9',
      from: '2026-01-15',
      to: '2026-01-22',
      format: 'csv',
    });

    expect(result.from.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(result.to.toISOString()).toBe('2026-01-22T23:59:59.999Z');
    expect(result.exportDir).toBe(path.resolve(process.cwd(), 'exports'));
  });

  it('rejects future date ranges', () => {
    const nextYear = new Date();
    nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);

    expect(() => normalizeEventExportOptions({
      teamId: 9,
      from: nextYear.toISOString(),
      to: nextYear.toISOString(),
      format: 'csv',
    })).toThrow('Invalid date range');
  });

  it('rejects unsupported formats with a clear message', () => {
    expect(() => normalizeEventExportOptions({
      teamId: 9,
      from: '2026-01-15',
      to: '2026-01-22',
      format: 'xml',
    })).toThrow('Invalid export format');
  });

  it('redacts emails and names recursively', () => {
    const redacted = redactEventExportPayload({
      email: 'owner@example.com',
      profile: {
        full_name: 'Owner Name',
        nested: ['owner@example.com'],
      },
      attendees: ['Jane Doe', 'John Smith'],
      owner: {
        label: 'Jane Doe',
      },
      note: 'Contact Jane Doe at jane@example.com',
    });

    expect(redacted).toEqual({
      email: 'redacted@example.com',
      profile: {
        full_name: 'REDACTED',
        nested: ['redacted@example.com'],
      },
      attendees: ['REDACTED', 'REDACTED'],
      owner: {
        label: 'REDACTED',
      },
      note: 'Contact REDACTED at redacted@example.com',
    });
  });

  it('writes CSV exports with escaping, file naming, and redaction', async () => {
    const exportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aapr-export-csv-'));
    (findByTeamForExportBatch as unknown as jest.Mock<any>)
      .mockResolvedValueOnce([
        makeEvent(1n, '2026-01-15T12:00:00.000Z'),
      ])
      .mockResolvedValueOnce([]);

    const result = await exportEvents({
      teamId: 9,
      from: '2026-01-15',
      to: '2026-01-22',
      format: 'csv',
      exportDir,
    });

    const content = await fs.readFile(result.outputPath, 'utf8');

    expect(result.fileName).toBe('team-events-2026-01-15-to-2026-01-22.csv');
    expect(content).toContain('actor_id,team_id,entity_type,entity_id,action,payload_json,created_at');
    expect(content).toContain('redacted@example.com');
    expect(content).toContain('REDACTED');
    expect(content).toContain('contains,comma');
    expect(content).toContain('next line');
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'event.export_started' }));
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'event.export_completed' }));
  });

  it('writes JSON exports in multiple deterministic batches for large datasets', async () => {
    const exportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aapr-export-json-'));
    const batchOne = Array.from({ length: 500 }, (_, index) =>
      makeEvent(BigInt(index + 1), `2026-01-15T12:${String(index % 60).padStart(2, '0')}:00.000Z`)
    );
    const batchTwo = Array.from({ length: 500 }, (_, index) =>
      makeEvent(BigInt(index + 501), `2026-01-16T12:${String(index % 60).padStart(2, '0')}:00.000Z`)
    );
    const batchThree = [makeEvent(1001n, '2026-01-17T12:00:00.000Z')];

    (findByTeamForExportBatch as unknown as jest.Mock<any>)
      .mockResolvedValueOnce(batchOne)
      .mockResolvedValueOnce(batchTwo)
      .mockResolvedValueOnce(batchThree)
      .mockResolvedValueOnce([]);

    const result = await exportEvents({
      teamId: 9,
      from: '2026-01-15',
      to: '2026-01-22',
      format: 'json',
      exportDir,
      batchSize: 500,
    });

    const content = JSON.parse(await fs.readFile(result.outputPath, 'utf8')) as Array<Record<string, unknown>>;

    expect(result.rowCount).toBe(1001);
    expect(content).toHaveLength(1001);
    expect(content[0]).toEqual(expect.objectContaining({
      actor_id: 4,
      team_id: 9,
      event_type: 'issue.created',
      payload_json: expect.objectContaining({
        email: 'redacted@example.com',
        name: 'REDACTED',
      }),
    }));
    expect(findByTeamForExportBatch).toHaveBeenCalledTimes(4);
  });

  it('fails with a clear error and removes the export file when no events match', async () => {
    const exportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aapr-export-empty-'));
    (findByTeamForExportBatch as unknown as jest.Mock<any>).mockResolvedValueOnce([]);

    await expect(exportEvents({
      teamId: 9,
      from: '2026-01-15',
      to: '2026-01-22',
      format: 'csv',
      exportDir,
    })).rejects.toThrow('No events found in date range');

    const files = await fs.readdir(exportDir);
    expect(files).toHaveLength(0);
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'event.export_failed' }));
  });
});