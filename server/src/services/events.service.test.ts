process.env.JWT_SECRET = 'test_secret_for_events_12345678901234567890';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { logEvent, rejectEventMutationAttempt } from './events.service';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    event: {
      create: jest.fn(),
    },
  },
}));

describe('events.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.event.create as unknown as jest.Mock<any>).mockResolvedValue({ id: 1n });
  });

  it('should persist a valid team-scoped event', async () => {
    await logEvent({
      eventType: 'issue.created',
      teamId: 7,
      actorId: 3,
      entityType: 'issue',
      entityId: 42,
      action: 'created',
      payload: {
        teamId: 7,
        actorId: 3,
        issueId: 42,
      },
    });

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: {
        eventType: 'issue.created',
        teamId: 7,
        actorId: 3,
        entityType: 'issue',
        entityId: 42,
        action: 'created',
        payload: {
          teamId: 7,
          actorId: 3,
          issueId: 42,
        },
      },
    });
  });

  it('should reject non-system events without actorId', async () => {
    await expect(
      logEvent({
        eventType: 'issue.created',
        teamId: 7,
        entityType: 'issue',
        entityId: 42,
      })
    ).rejects.toThrow('actorId is required for non-system events');
  });

  it('should reject team-scoped events without teamId', async () => {
    await expect(
      logEvent({
        eventType: 'issue.comment_added',
        actorId: 3,
        entityType: 'issue',
        entityId: 42,
      })
    ).rejects.toThrow('teamId is required for team-scoped events');
  });

  it('should reject mismatched payload metadata', async () => {
    await expect(
      logEvent({
        eventType: 'issue.created',
        teamId: 7,
        actorId: 3,
        entityType: 'issue',
        entityId: 42,
        payload: {
          teamId: 99,
        },
      })
    ).rejects.toThrow('payload.teamId must match top-level teamId');
  });

  it('should reject entity metadata when only one entity field is provided', async () => {
    await expect(
      logEvent({
        eventType: 'issue.created',
        teamId: 7,
        actorId: 3,
        entityType: 'issue',
      })
    ).rejects.toThrow('entityType and entityId must be provided together');
  });

  it('should reject system events with null actorId when systemReason is missing', async () => {
    await expect(
      logEvent({
        eventType: 'practices.imported',
        actorId: undefined,
      })
    ).rejects.toThrow('systemReason is required in payload when actorId is null');
  });

  it('should accept system events with null actorId when systemReason is present', async () => {
    await expect(
      logEvent({
        eventType: 'practices.imported',
        payload: {
          systemReason: 'Seed import executed by scheduler',
        },
      })
    ).resolves.toBeDefined();
  });

  it('should accept export telemetry events with null actorId when systemReason is present', async () => {
    await expect(
      logEvent({
        eventType: 'event.export_started',
        teamId: 7,
        payload: {
          teamId: 7,
          systemReason: 'CLI export executed by an authorized server operator.',
        },
      })
    ).resolves.toBeDefined();
  });

  it('should reject non-auth events without teamId', async () => {
    await expect(
      logEvent({
        eventType: 'team.created',
        actorId: 3,
      })
    ).rejects.toThrow('teamId is required for team-scoped events');
  });

  it('should expose explicit mutation guard helper', () => {
    expect(() => rejectEventMutationAttempt('update')).toThrow('Event records are immutable; only append operations are allowed');
  });
});
