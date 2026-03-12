
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

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

export const logEvent = async (
    data: {
        eventType: EventType | string;
        teamId?: number;
        actorId?: number;
        entityType?: string;
        entityId?: number;
        action?: string;
        payload?: EventPayload;
    },
    tx?: Prisma.TransactionClient
) => {
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
