process.env.JWT_SECRET = 'test_secret_for_export_cli_12345678901234567890';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { parseArgs, main } from './export-events';
import { exportEvents, normalizeEventExportOptions } from '../services/event-export.service';
import { prisma } from '../lib/prisma';

jest.mock('../services/event-export.service', () => ({
  exportEvents: jest.fn(),
  normalizeEventExportOptions: jest.fn(),
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    $disconnect: jest.fn(),
  },
}));

describe('export-events CLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (normalizeEventExportOptions as unknown as jest.Mock<any>).mockReturnValue({
      teamId: 9,
      from: new Date('2026-01-15T00:00:00.000Z'),
      to: new Date('2026-01-22T23:59:59.999Z'),
      format: 'csv',
    });
  });

  it('parses repeated event-type arguments', () => {
    const args = parseArgs([
      '--team-id', '9',
      '--from', '2026-01-15',
      '--to', '2026-01-22',
      '--event-type', 'issue.created',
      '--event-type', 'issue.evaluated',
      '--format', 'json',
    ]);

    expect(args).toEqual({
      teamId: '9',
      from: '2026-01-15',
      to: '2026-01-22',
      eventTypes: ['issue.created', 'issue.evaluated'],
      format: 'json',
    });
  });

  it('prints success output and returns zero on successful export', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (exportEvents as unknown as jest.Mock<any>).mockResolvedValue({
      teamId: 9,
      from: '2026-01-15T00:00:00.000Z',
      to: '2026-01-22T23:59:59.999Z',
      format: 'csv',
      outputPath: 'C:\\exports\\team-events-2026-01-15-to-2026-01-22.csv',
      fileName: 'team-events-2026-01-15-to-2026-01-22.csv',
      rowCount: 42,
      eventTypes: [],
    });

    const code = await main([
      '--team-id', '9',
      '--from', '2026-01-15',
      '--to', '2026-01-22',
    ]);

    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith('Exported 42 events');
    expect(prisma.$disconnect).toHaveBeenCalled();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('prints the error message and returns one on failure', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (normalizeEventExportOptions as unknown as jest.Mock<any>).mockImplementation(() => {
      throw new Error('Invalid date range');
    });

    const code = await main([
      '--team-id', '9',
      '--from', '3026-01-15',
      '--to', '3026-01-22',
    ]);

    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith('Invalid date range');
    expect(prisma.$disconnect).toHaveBeenCalled();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('prints a clear invalid format message and returns one', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (normalizeEventExportOptions as unknown as jest.Mock<any>).mockImplementation(() => {
      throw new Error('Invalid export format');
    });

    const code = await main([
      '--team-id', '9',
      '--from', '2026-01-15',
      '--to', '2026-01-22',
      '--format', 'xml',
    ]);

    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith('Invalid export format');
    expect(prisma.$disconnect).toHaveBeenCalled();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});