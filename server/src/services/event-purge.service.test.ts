process.env.JWT_SECRET = 'test_secret_for_event_purge_12345678901234567890';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { purgeEventsBatch } from './event-purge.service';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    event: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('event-purge.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_EVENT_BATCH_PURGE = 'true';
    process.env.EVENT_PURGE_CONFIRM_TOKEN = 'purge-confirm-token-123';

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      const tx = {
        event: {
          deleteMany: (jest.fn() as jest.Mock<any>).mockResolvedValue({ count: 12 }),
          create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 77n }),
        },
      };
      return callback(tx);
    });
  });

  it('should execute batch delete and create purge audit event', async () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-31T23:59:59.999Z');

    const result = await purgeEventsBatch({
      performedBy: 5,
      confirmToken: 'purge-confirm-token-123',
      teamId: 2,
      from,
      to,
      reason: 'Protocol-approved retention window cleanup.',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.deletedCount).toBe(12);
    expect(result.auditEventId).toBe(77n);
    expect(result.scope.teamId).toBe(2);
    expect(result.scope.from).toBe(from.toISOString());
    expect(result.scope.to).toBe(to.toISOString());
  });

  it('should reject purge when confirmation token is invalid', async () => {
    await expect(
      purgeEventsBatch({
        performedBy: 5,
        confirmToken: 'WRONG',
        reason: 'Protocol-approved retention window cleanup.',
      })
    ).rejects.toThrow('Invalid purge confirmation token');
  });

  it('should reject purge when ALLOW_EVENT_BATCH_PURGE is disabled', async () => {
    process.env.ALLOW_EVENT_BATCH_PURGE = 'false';

    await expect(
      purgeEventsBatch({
        performedBy: 5,
        confirmToken: 'purge-confirm-token-123',
        reason: 'Protocol-approved retention window cleanup.',
      })
    ).rejects.toThrow('Batch purge is disabled');
  });

  it('should reject purge when EVENT_PURGE_CONFIRM_TOKEN is not configured', async () => {
    delete process.env.EVENT_PURGE_CONFIRM_TOKEN;

    await expect(
      purgeEventsBatch({
        performedBy: 5,
        confirmToken: 'anything',
        reason: 'Protocol-approved retention window cleanup.',
      })
    ).rejects.toThrow('EVENT_PURGE_CONFIRM_TOKEN is not configured with a safe value');
  });
});
