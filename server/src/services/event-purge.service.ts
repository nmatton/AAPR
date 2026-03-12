import { prisma } from '../lib/prisma';
import { AppError } from './auth.service';

export interface PurgeEventsBatchInput {
  performedBy: number;
  confirmToken: string;
  from?: Date;
  to?: Date;
  teamId?: number;
  reason: string;
}

export interface PurgeEventsBatchResult {
  deletedCount: number;
  scope: {
    from?: string;
    to?: string;
    teamId?: number;
  };
  auditEventId: bigint;
}

const MIN_CONFIRM_TOKEN_LENGTH = 12;

const getRequiredConfirmToken = (): string => {
  const configuredToken = process.env.EVENT_PURGE_CONFIRM_TOKEN;
  if (!configuredToken || configuredToken.trim().length < MIN_CONFIRM_TOKEN_LENGTH) {
    throw new AppError(
      'configuration_error',
      'EVENT_PURGE_CONFIRM_TOKEN is not configured with a safe value',
      { envVar: 'EVENT_PURGE_CONFIRM_TOKEN', minLength: MIN_CONFIRM_TOKEN_LENGTH },
      500
    );
  }

  return configuredToken;
};

export const purgeEventsBatch = async (input: PurgeEventsBatchInput): Promise<PurgeEventsBatchResult> => {
  const requiredConfirmToken = getRequiredConfirmToken();
  if (input.confirmToken !== requiredConfirmToken) {
    throw new AppError('validation_error', 'Invalid purge confirmation token', {}, 400);
  }

  if (!input.reason || input.reason.trim().length < 10) {
    throw new AppError('validation_error', 'Purge reason must be at least 10 characters', { field: 'reason' }, 400);
  }

  if (process.env.ALLOW_EVENT_BATCH_PURGE !== 'true') {
    throw new AppError(
      'forbidden',
      'Batch purge is disabled. Set ALLOW_EVENT_BATCH_PURGE=true for controlled execution.',
      {},
      403
    );
  }

  if (input.from && input.to && input.from > input.to) {
    throw new AppError('validation_error', 'Invalid purge date range: from must be <= to', {}, 400);
  }

  return prisma.$transaction(async (tx) => {
    const whereClause = {
      teamId: input.teamId,
      createdAt: {
        gte: input.from,
        lte: input.to,
      },
      eventType: {
        not: 'event.purged_batch',
      },
    };

    const deleteResult = await tx.event.deleteMany({
      where: whereClause,
    });

    const now = new Date();
    const auditEvent = await tx.event.create({
      data: {
        eventType: 'event.purged_batch',
        actorId: input.performedBy,
        teamId: input.teamId,
        entityType: 'event',
        action: 'purged_batch',
        payload: {
          performedBy: input.performedBy,
          reason: input.reason,
          deletedCount: deleteResult.count,
          scope: {
            teamId: input.teamId,
            from: input.from?.toISOString(),
            to: input.to?.toISOString(),
          },
          executedAt: now.toISOString(),
        },
      },
    });

    return {
      deletedCount: deleteResult.count,
      scope: {
        teamId: input.teamId,
        from: input.from?.toISOString(),
        to: input.to?.toISOString(),
      },
      auditEventId: auditEvent.id,
    };
  });
};
