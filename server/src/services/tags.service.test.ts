import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getTags, getTagsByPracticeIds } from './tags.service';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
    prisma: {
        tag: {
            createMany: jest.fn(),
            findMany: jest.fn(),
        },
        practice: {
            findMany: jest.fn(),
        },
    },
}));

describe('TagsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getTags', () => {
        it('returns all tags when no filters provided', async () => {
            const mockTags = [
                { id: 1, name: 'Verbal-Heavy', description: 'desc', type: 'System', isGlobal: true },
            ];
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.tag.findMany as jest.Mock<any>).mockResolvedValue(mockTags);

            const result = await getTags();

            expect(prisma.tag.createMany).toHaveBeenCalled();
            expect(prisma.tag.findMany).toHaveBeenCalledWith({
                where: {},
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual(mockTags);
        });

        it('filters by isGlobal=true', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.tag.findMany as jest.Mock<any>).mockResolvedValue([]);

            await getTags(true);

            expect(prisma.tag.findMany).toHaveBeenCalledWith({
                where: { isGlobal: true },
                orderBy: { name: 'asc' },
            });
        });

        it('filters by type', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.tag.findMany as jest.Mock<any>).mockResolvedValue([]);

            await getTags(undefined, 'System');

            expect(prisma.tag.findMany).toHaveBeenCalledWith({
                where: { type: 'System' },
                orderBy: { name: 'asc' },
            });
        });
    });

    describe('getTagsByPracticeIds', () => {
        it('returns matching Tag records from the union of practice JSON tags', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.practice.findMany as jest.Mock<any>).mockResolvedValue([
                { id: 1, tags: ['Verbal-Heavy', 'Whole Crowd'] },
                { id: 2, tags: ['Verbal-Heavy', 'Time-Boxed'] },
            ]);
            const mockTags = [
                { id: 1, name: 'Time-Boxed', description: null, type: 'System', isGlobal: true },
                { id: 2, name: 'Verbal-Heavy', description: null, type: 'System', isGlobal: true },
                { id: 3, name: 'Whole Crowd', description: null, type: 'System', isGlobal: true },
            ];
            (prisma.tag.findMany as jest.Mock<any>).mockResolvedValue(mockTags);

            const result = await getTagsByPracticeIds([1, 2]);

            expect(prisma.practice.findMany).toHaveBeenCalledWith({
                where: { id: { in: [1, 2] } },
                select: { id: true, tags: true },
            });
            expect(prisma.tag.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        name: {
                            in: expect.arrayContaining(['Verbal-Heavy', 'Whole Crowd', 'Time-Boxed']),
                        },
                    },
                    orderBy: { name: 'asc' },
                })
            );
            expect(result).toEqual(mockTags);
        });

        it('deduplicates tag names that appear in multiple practices', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.practice.findMany as jest.Mock<any>).mockResolvedValue([
                { id: 1, tags: ['Verbal-Heavy'] },
                { id: 2, tags: ['Verbal-Heavy'] },
            ]);
            (prisma.tag.findMany as jest.Mock<any>).mockResolvedValue([
                { id: 1, name: 'Verbal-Heavy', description: null, type: 'System', isGlobal: true },
            ]);

            await getTagsByPracticeIds([1, 2]);

            const callArgs = (prisma.tag.findMany as jest.Mock<any>).mock.calls[0][0] as any;
            expect(callArgs.where.name.in).toHaveLength(1);
            expect(callArgs.where.name.in).toContain('Verbal-Heavy');
        });

        it('returns empty array when no practices are found', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.practice.findMany as jest.Mock<any>).mockResolvedValue([]);

            const result = await getTagsByPracticeIds([99]);

            expect(prisma.tag.findMany).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('falls back to the global catalog when practices have null tags field', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.practice.findMany as jest.Mock<any>).mockResolvedValue([
                { id: 1, tags: null },
            ]);
            const fallbackTags = [
                { id: 1, name: 'Verbal-Heavy', description: null, type: 'System', isGlobal: true },
            ];
            (prisma.tag.findMany as jest.Mock<any>).mockResolvedValue(fallbackTags);

            const result = await getTagsByPracticeIds([1]);

            expect(prisma.tag.findMany).toHaveBeenCalledWith({
                where: { isGlobal: true },
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual(fallbackTags);
        });

        it('falls back to the global catalog when practices have empty tags array', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.practice.findMany as jest.Mock<any>).mockResolvedValue([
                { id: 1, tags: [] },
            ]);
            const fallbackTags = [
                { id: 1, name: 'Whole Crowd', description: null, type: 'System', isGlobal: true },
            ];
            (prisma.tag.findMany as jest.Mock<any>).mockResolvedValue(fallbackTags);

            const result = await getTagsByPracticeIds([1]);

            expect(prisma.tag.findMany).toHaveBeenCalledWith({
                where: { isGlobal: true },
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual(fallbackTags);
        });

        it('falls back to the global catalog when practice tag names have no matching tag rows', async () => {
            (prisma.tag.createMany as jest.Mock<any>).mockResolvedValue({ count: 20 });
            (prisma.practice.findMany as jest.Mock<any>).mockResolvedValue([
                { id: 1, tags: ['Verbal-Heavy'] },
            ]);
            const fallbackTags = [
                { id: 2, name: 'Time-Boxed', description: null, type: 'System', isGlobal: true },
            ];
            (prisma.tag.findMany as jest.Mock<any>)
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(fallbackTags);

            const result = await getTagsByPracticeIds([1]);

            expect(prisma.tag.findMany).toHaveBeenNthCalledWith(1, {
                where: { name: { in: ['Verbal-Heavy'] } },
                orderBy: { name: 'asc' },
            });
            expect(prisma.tag.findMany).toHaveBeenNthCalledWith(2, {
                where: { isGlobal: true },
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual(fallbackTags);
        });
    });
});
