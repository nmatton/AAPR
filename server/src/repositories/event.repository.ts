
import { prisma } from '../lib/prisma';

export const findByEntity = async (teamId: number, entityType: string, entityId: number) => {
    return prisma.event.findMany({
        where: {
            teamId,
            entityType,
            entityId,
        },
        orderBy: [
            { createdAt: 'asc' },
            { id: 'asc' },
        ],
    });
};

export const findByTeamForExport = async (
    teamId: number,
    options?: {
        from?: Date;
        to?: Date;
        eventTypes?: string[];
    }
) => {
    return prisma.event.findMany({
        where: {
            teamId,
            createdAt: {
                gte: options?.from,
                lte: options?.to,
            },
            eventType: options?.eventTypes?.length
                ? { in: options.eventTypes }
                : undefined,
        },
        orderBy: [
            { createdAt: 'asc' },
            { id: 'asc' },
        ],
    });
};
