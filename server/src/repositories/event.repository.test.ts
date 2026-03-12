
import { findByEntity, findByTeamForExport, findByTeamForExportBatch } from './event.repository';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
    prisma: {
        event: {
            findMany: jest.fn(),
        },
    },
}));

describe('Event Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByEntity', () => {
        it('should return events for entity ordered by createdAt asc and id asc', async () => {
            const mockEvents = [
                { id: 1n, eventType: 'issue.created', createdAt: new Date() },
            ];
            (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

            const result = await findByEntity(1, 'issue', 123);

            expect(prisma.event.findMany).toHaveBeenCalledWith({
                where: {
                    teamId: 1,
                    entityType: 'issue',
                    entityId: 123,
                },
                orderBy: [
                    { createdAt: 'asc' },
                    { id: 'asc' },
                ],
            });
            expect(result).toEqual(mockEvents);
        });
    });

    describe('findByTeamForExport', () => {
        it('should return team events ordered by createdAt asc and id asc with filters', async () => {
            const from = new Date('2026-03-01T00:00:00.000Z');
            const to = new Date('2026-03-12T23:59:59.999Z');
            const mockEvents = [
                { id: 1n, eventType: 'issue.created', createdAt: new Date('2026-03-01T10:00:00.000Z') },
            ];
            (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

            const result = await findByTeamForExport(9, {
                from,
                to,
                eventTypes: ['issue.created', 'issue.evaluated'],
            });

            expect(prisma.event.findMany).toHaveBeenCalledWith({
                where: {
                    teamId: 9,
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                    eventType: {
                        in: ['issue.created', 'issue.evaluated'],
                    },
                },
                orderBy: [
                    { createdAt: 'asc' },
                    { id: 'asc' },
                ],
            });
            expect(result).toEqual(mockEvents);
        });

        it('should return export batches using a deterministic cursor', async () => {
            const from = new Date('2026-03-01T00:00:00.000Z');
            const to = new Date('2026-03-12T23:59:59.999Z');
            const cursor = {
                createdAt: new Date('2026-03-04T08:00:00.000Z'),
                id: 88n,
            };
            const mockEvents = [
                { id: 89n, eventType: 'issue.created', createdAt: new Date('2026-03-04T08:00:00.000Z') },
            ];
            (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

            const result = await findByTeamForExportBatch(
                9,
                {
                    from,
                    to,
                    eventTypes: ['issue.created'],
                },
                cursor,
                250
            );

            expect(prisma.event.findMany).toHaveBeenCalledWith({
                where: {
                    teamId: 9,
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                    eventType: {
                        in: ['issue.created'],
                    },
                    OR: [
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
                    ],
                },
                orderBy: [
                    { createdAt: 'asc' },
                    { id: 'asc' },
                ],
                take: 250,
            });
            expect(result).toEqual(mockEvents);
        });
    });
});
