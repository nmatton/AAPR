
import { prisma } from '../lib/prisma';

export const findByEntity = async (teamId: number, entityType: string, entityId: number) => {
    return prisma.event.findMany({
        where: {
            teamId,
            entityType,
            entityId,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};
