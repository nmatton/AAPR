process.env.JWT_SECRET = 'test_secret_for_issues_12345678901234567890';

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createIssue, IssueInput } from './issue.service';
import { prisma } from '../lib/prisma';
import * as eventService from './events.service';

// Mock prisma
jest.mock('../lib/prisma', () => ({
    prisma: {
        $transaction: jest.fn((callback: any) => callback(prisma)),
        issue: {
            create: jest.fn(),
        },
        issuePractice: {
            create: jest.fn(),
        },
        team: {
            findUnique: jest.fn(),
        },
        teamPractice: {
            findFirst: jest.fn(),
        }
    },
}));

// Mock eventService
jest.mock('./events.service', () => ({
    logEvent: jest.fn(),
}));

describe('IssueService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createIssue', () => {
        const validInput: IssueInput = {
            title: 'Test Issue Title',
            description: 'Test Issue Description',
            priority: 'MEDIUM',
            teamId: 1,
            createdBy: 1,
            practiceIds: [100],
        };

        it('should create an issue, link practices, and log event in a transaction', async () => {
            // Setup mocks
            (prisma.team.findUnique as jest.Mock<any>).mockResolvedValue({ id: 1 });
            (prisma.teamPractice.findFirst as jest.Mock<any>).mockResolvedValue({ id: 1 }); // Practice linked to team
            (prisma.issue.create as jest.Mock<any>).mockResolvedValue({
                id: 1,
                ...validInput,
                status: 'OPEN',
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
            });

            const result = await createIssue(validInput);

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(prisma.issue.create).toHaveBeenCalledWith({
                data: {
                    title: validInput.title,
                    description: validInput.description,
                    priority: validInput.priority,
                    teamId: validInput.teamId,
                    createdBy: validInput.createdBy,
                    status: 'OPEN',
                    linkedPractices: {
                        create: validInput.practiceIds!.map(pid => ({ practiceId: pid }))
                    }
                },
                include: {
                    linkedPractices: {
                        include: { practice: true }
                    }
                }
            });

            expect(eventService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'issue.created',
                    teamId: validInput.teamId,
                    payload: expect.objectContaining({
                        title: validInput.title,
                        linkedPracticeIds: validInput.practiceIds,
                    }),
                }),
                expect.anything() // Transaction client
            );

            expect(result).toBeDefined();
        });

        it('should throw error if title is too short', async () => {
            const invalidInput = { ...validInput, title: 'No' };
            await expect(createIssue(invalidInput)).rejects.toThrow('Validation failed');
        });

        it('should throw error if practice is not enabled for the team', async () => {
            (prisma.teamPractice.findFirst as jest.Mock<any>).mockResolvedValue(null); // Practice NOT linked to team

            await expect(createIssue(validInput)).rejects.toThrow('One or more practices are not valid for this team');
        });
    });
});
