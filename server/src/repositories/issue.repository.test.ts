
import { findById } from './issue.repository';
import { prisma } from '../lib/prisma';
import { Priority, IssueStatus } from '@prisma/client';

// Mock prisma
jest.mock('../lib/prisma', () => ({
    prisma: {
        issue: {
            findUnique: jest.fn(),
        },
    },
}));

describe('Issue Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findById', () => {
        const mockIssue = {
            id: 1,
            title: 'Test Issue',
            description: 'Description',
            priority: Priority.HIGH,
            status: IssueStatus.OPEN,
            teamId: 1,
            createdBy: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
            createdByUser: {
                id: 1,
                name: 'Alice',
                email: 'alice@example.com',
            },
            linkedPractices: [
                {
                    practice: {
                        id: 10,
                        title: 'Test Practice',
                    },
                },
            ],
        };

        it('should return issue with linked practices if found in team', async () => {
            (prisma.issue.findUnique as jest.Mock).mockResolvedValue(mockIssue);

            const result = await findById(1, 1);

            expect(prisma.issue.findUnique).toHaveBeenCalledWith({
                where: { id: 1, teamId: 1 },
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
            expect(result).toEqual(mockIssue);
        });

        it('should return null if issue does not exist', async () => {
            (prisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await findById(999, 1);

            expect(prisma.issue.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 999, teamId: 1 },
            }));
            expect(result).toBeNull();
        });

        it('should return null if issue exists but belongs to another team', async () => {
            (prisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await findById(1, 2);

            expect(prisma.issue.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1, teamId: 2 },
            }));
            expect(result).toBeNull();
        });
    });
});
