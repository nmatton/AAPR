
import { prisma } from '../lib/prisma';

export interface EventExportFilters {
    from?: Date;
    to?: Date;
    eventTypes?: string[];
}

export interface EventExportCursor {
    createdAt: Date;
    id: bigint;
}

const buildExportWhereClause = (
    teamId: number,
    options?: EventExportFilters,
    cursor?: EventExportCursor
) => ({
    teamId,
    createdAt: {
        gte: options?.from,
        lte: options?.to,
    },
    eventType: options?.eventTypes?.length
        ? { in: options.eventTypes }
        : undefined,
    OR: cursor
        ? [
            {
                createdAt: {
                    gt: cursor.createdAt,
                },
            },
            {
                createdAt: cursor.createdAt,
                id: {
                    gt: cursor.id,
                },
            },
        ]
        : undefined,
});

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
    options?: EventExportFilters
) => {
    return prisma.event.findMany({
        where: buildExportWhereClause(teamId, options),
        orderBy: [
            { createdAt: 'asc' },
            { id: 'asc' },
        ],
    });
};

export const findByTeamForExportBatch = async (
    teamId: number,
    options: EventExportFilters,
    cursor?: EventExportCursor,
    take: number = 500
) => {
    return prisma.event.findMany({
        where: buildExportWhereClause(teamId, options, cursor),
        orderBy: [
            { createdAt: 'asc' },
            { id: 'asc' },
        ],
        take,
    });
};
