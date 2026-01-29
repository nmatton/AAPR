
import { prisma } from '../lib/prisma';

export const findById = async (id: number, teamId: number) => {
    return prisma.issue.findUnique({
        where: { id, teamId },
        include: {
            createdByUser: {
                select: {
                    id: true,
                    name: true,
                },
            },
            linkedPractices: {
                include: {
                    practice: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            },
        },
    });
};
