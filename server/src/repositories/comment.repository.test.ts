
import { create, findByIssueId } from './comment.repository';
import { prisma } from '../lib/prisma';

// Mock prisma
jest.mock('../lib/prisma', () => ({
    prisma: {
        comment: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

describe('Comment Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a comment', async () => {
            const mockComment = {
                id: 1,
                content: 'Test comment',
                issueId: 1,
                authorId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const input = {
                content: 'Test comment',
                issueId: 1,
                authorId: 1,
            };

            (prisma.comment.create as jest.Mock).mockResolvedValue(mockComment);

            const result = await create(input);

            expect(prisma.comment.create).toHaveBeenCalledWith({ data: input });
            expect(result).toEqual(mockComment);
        });

        it('should use transaction client if provided', async () => {
            const mockTx = {
                comment: {
                    create: jest.fn().mockResolvedValue({ id: 1 }),
                }
            } as any;

            await create({ content: 'test', issueId: 1, authorId: 1 }, mockTx);

            expect(mockTx.comment.create).toHaveBeenCalled();
            expect(prisma.comment.create).not.toHaveBeenCalled();
        });
    });

    describe('findByIssueId', () => {
        it('should return comments with author', async () => {
            const mockComments = [
                {
                    id: 1,
                    content: 'Comment 1',
                    issueId: 1,
                    authorId: 1,
                    createdAt: new Date(),
                    author: { id: 1, name: 'Alice' }
                }
            ];

            (prisma.comment.findMany as jest.Mock).mockResolvedValue(mockComments);

            const result = await findByIssueId(1);

            expect(prisma.comment.findMany).toHaveBeenCalledWith({
                where: { issueId: 1 },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            expect(result).toEqual(mockComments);
        });
    });
});
