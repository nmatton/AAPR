

import { searchAndFilter, countFiltered } from './practice.repository';
import { prisma } from '../lib/prisma';

// Mock prisma
jest.mock('../lib/prisma', () => ({
    prisma: {
        practice: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

describe('Practice Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchAndFilter', () => {
        it('should apply category filter', async () => {
            const options = {
                categories: ['cat1', 'cat2'],
                skip: 0,
                take: 10,
            };

            await searchAndFilter(options);

            expect(prisma.practice.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            { isGlobal: true },
                            { categoryId: { in: ['cat1', 'cat2'] } },
                        ]),
                    }),
                })
            );
        });

        it('should apply method filter', async () => {
            const options = {
                methods: ['Scrum'],
                skip: 0,
                take: 10,
            };

            await searchAndFilter(options);

            expect(prisma.practice.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            { isGlobal: true },
                            { method: { in: ['Scrum'] } },
                        ]),
                    }),
                })
            );
        });

        it('should apply tag filter with OR logic', async () => {
            const options = {
                tags: ['tag1', 'tag2'],
                skip: 0,
                take: 10,
            };

            await searchAndFilter(options);

            expect(prisma.practice.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            { isGlobal: true },
                            {
                                OR: [
                                    { tags: { array_contains: 'tag1' } },
                                    { tags: { array_contains: 'tag2' } },
                                ],
                            },
                        ]),
                    }),
                })
            );
        });

        it('should combine multiple filters', async () => {
            const options = {
                categories: ['cat1'],
                methods: ['XP'],
                tags: ['tag1'],
                skip: 0,
                take: 10,
            };

            await searchAndFilter(options);

            expect(prisma.practice.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            { isGlobal: true },
                            { categoryId: { in: ['cat1'] } },
                            { method: { in: ['XP'] } },
                            {
                                OR: [
                                    { tags: { array_contains: 'tag1' } },
                                ],
                            },
                        ]),
                    }),
                })
            );
        });
    });

    describe('countFiltered', () => {
        it('should apply filters to count', async () => {
            const options = {
                categories: ['cat1'],
                methods: ['XP'],
                tags: ['tag1'],
            };

            await countFiltered(options);

            expect(prisma.practice.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            { isGlobal: true },
                            { categoryId: { in: ['cat1'] } },
                            { method: { in: ['XP'] } },
                        ]),
                    }),
                })
            );
        });
    });
});
