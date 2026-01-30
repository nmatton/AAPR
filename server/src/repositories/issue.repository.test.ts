
import { findAll } from './issue.repository';
import { prisma } from '../lib/prisma';
import { IssueStatus } from '@prisma/client';

// Mock prisma client
jest.mock('../lib/prisma', () => ({
    prisma: {
        issue: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

describe('Issue Repository', () => {
    describe('findAll', () => {
        const mockTeamId = 1;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should find all issues for a team with default sorting', async () => {
            const mockIssues = [{ id: 1, title: 'Test Issue' }];
            (prisma.issue.findMany as jest.Mock).mockResolvedValue(mockIssues);

            const result = await findAll({ teamId: mockTeamId });

            expect(prisma.issue.findMany).toHaveBeenCalledWith({
                where: { teamId: mockTeamId },
                include: expect.any(Object),
                orderBy: { createdAt: 'desc' }, // Default sort
            });
            expect(result).toEqual(mockIssues);
        });

        it('should filter by status', async () => {
            const status: IssueStatus = 'OPEN';
            await findAll({ teamId: mockTeamId, status });

            expect(prisma.issue.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    teamId: mockTeamId,
                    status: status,
                }),
            }));
        });

        it('should filter by practiceId', async () => {
            const practiceId = 101;
            await findAll({ teamId: mockTeamId, practiceId });

            expect(prisma.issue.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    teamId: mockTeamId,
                    linkedPractices: {
                        some: { practiceId: practiceId }
                    }
                }),
            }));
        });

        it('should filter by authorId', async () => {
            const authorId = 55;
            await findAll({ teamId: mockTeamId, authorId });

            expect(prisma.issue.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    teamId: mockTeamId,
                    createdBy: authorId,
                }),
            }));
        });

        it('should sort by createdAt ASC', async () => {
            await findAll({ teamId: mockTeamId, sortBy: 'createdAt', sortDir: 'asc' });

            expect(prisma.issue.findMany).toHaveBeenCalledWith(expect.objectContaining({
                orderBy: { createdAt: 'asc' },
            }));
        });

        it('should sort by comment count DESC', async () => {
            await findAll({ teamId: mockTeamId, sortBy: 'comments', sortDir: 'desc' });

            expect(prisma.issue.findMany).toHaveBeenCalledWith(expect.objectContaining({
                orderBy: {
                    comments: {
                        _count: 'desc'
                    }
                }
            }));
        });
    });
});
