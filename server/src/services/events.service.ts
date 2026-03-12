
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from './auth.service';

export type EventType =
    | 'user.registered'
    | 'user.login'
    | 'team.created'
    | 'team.joined'
    | 'issue.created'
    | 'big_five.completed'
    | 'big_five.retaken';

export interface EventPayload {
    [key: string]: any;
}

interface LogEventInput {
    eventType: EventType | string;
    teamId?: number;
    actorId?: number;
    entityType?: string;
    entityId?: number;
    action?: string;
    payload?: EventPayload;
}

const SYSTEM_EVENTS_ALLOWING_NULL_ACTOR = new Set<string>([
    'user.registered',
    'practice.imported',
    'practices.imported',
    'coverage.by_category.calculated',
]);

const EVENTS_ALLOWING_NULL_TEAM = new Set<string>([
    'user.registered',
    'user.login',
    'practice.imported',
    'practices.imported',
    'big_five.completed',
    'big_five.retaken',
]);

const TEAM_SCOPED_EVENT_PREFIXES = [
    'team.',
    'team_member.',
    'invite.',
    'issue.',
    'practice.',
    'coverage.',
    'event.',
];

const requiresTeamContext = (eventType: string): boolean => {
    return TEAM_SCOPED_EVENT_PREFIXES.some((prefix) => eventType.startsWith(prefix));
};

const validateLogEventInput = (data: LogEventInput): void => {
    if (!data.eventType || data.eventType.trim().length === 0) {
        throw new AppError('validation_error', 'eventType is required', { field: 'eventType' }, 400);
    }

    const hasEntityType = typeof data.entityType !== 'undefined';
    const hasEntityId = typeof data.entityId !== 'undefined';
    if (hasEntityType !== hasEntityId) {
        throw new AppError(
            'validation_error',
            'entityType and entityId must be provided together',
            { entityType: data.entityType, entityId: data.entityId },
            400
        );
    }

    if ((data.actorId === null || typeof data.actorId === 'undefined') && !SYSTEM_EVENTS_ALLOWING_NULL_ACTOR.has(data.eventType)) {
        throw new AppError(
            'validation_error',
            'actorId is required for non-system events',
            { eventType: data.eventType },
            400
        );
    }

    if ((data.actorId === null || typeof data.actorId === 'undefined') && SYSTEM_EVENTS_ALLOWING_NULL_ACTOR.has(data.eventType)) {
        const nullActorReason = typeof data.payload?.systemReason === 'string'
            ? data.payload.systemReason.trim()
            : '';

        if (nullActorReason.length === 0) {
            throw new AppError(
                'validation_error',
                'systemReason is required in payload when actorId is null',
                { eventType: data.eventType },
                400
            );
        }
    }

    if (requiresTeamContext(data.eventType) && (data.teamId === null || typeof data.teamId === 'undefined')) {
        throw new AppError(
            'validation_error',
            'teamId is required for team-scoped events',
            { eventType: data.eventType },
            400
        );
    }

    if (!EVENTS_ALLOWING_NULL_TEAM.has(data.eventType) && (data.teamId === null || typeof data.teamId === 'undefined')) {
        throw new AppError(
            'validation_error',
            'teamId is required for this event type',
            { eventType: data.eventType },
            400
        );
    }

    if (data.payload && typeof data.payload === 'object') {
        if (
            typeof data.payload.teamId !== 'undefined' &&
            typeof data.teamId !== 'undefined' &&
            data.payload.teamId !== data.teamId
        ) {
            throw new AppError(
                'validation_error',
                'payload.teamId must match top-level teamId',
                { payloadTeamId: data.payload.teamId, teamId: data.teamId },
                400
            );
        }

        if (
            typeof data.payload.actorId !== 'undefined' &&
            typeof data.actorId !== 'undefined' &&
            data.payload.actorId !== data.actorId
        ) {
            throw new AppError(
                'validation_error',
                'payload.actorId must match top-level actorId',
                { payloadActorId: data.payload.actorId, actorId: data.actorId },
                400
            );
        }
    }
};

export const rejectEventMutationAttempt = (operation: string): never => {
    throw new AppError(
        'forbidden',
        'Event records are immutable; only append operations are allowed',
        { operation },
        403
    );
};

export const logEvent = async (
    data: LogEventInput,
    tx?: Prisma.TransactionClient
) => {
    validateLogEventInput(data);
    const client = tx || prisma;

    return client.event.create({
        data: {
            eventType: data.eventType,
            teamId: data.teamId,
            actorId: data.actorId,
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            payload: data.payload,
        },
    });
};
