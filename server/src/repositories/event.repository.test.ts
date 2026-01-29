
import { findByEntity } from './event.repository';
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
        it('should return events for entity ordered by createdAt desc', async () => {
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
                orderBy: {
                    createdAt: 'desc',
                },
            });
            expect(result).toEqual(mockEvents);
        });
    });
});
