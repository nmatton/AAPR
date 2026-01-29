process.env.JWT_SECRET = 'test_secret_for_issues_12345678901234567890';

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createIssue, IssueInput } from './issue.service';
import { prisma } from '../lib/prisma';
import * as eventService from './events.service';
import * as issueRepository from '../repositories/issue.repository';
import * as eventRepository from '../repositories/event.repository';

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

jest.mock('../repositories/issue.repository', () => ({
    findById: jest.fn(),
}));

jest.mock('../repositories/event.repository', () => ({
    findByEntity: jest.fn(),
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



    describe('getIssueDetails', () => {
        const teamId = 1;
        const issueId = 100;

        it('should return issue details and history', async () => {
            const mockIssue = {
                id: issueId,
                title: 'Test Issue',
                priority: 'HIGH',
                status: 'OPEN',
                teamId: teamId,
                createdByUser: { id: 1, name: 'Alice' },
                linkedPractices: [
                    { practice: { id: 10, title: 'Practice A' } }
                ],
            };
            const mockEvents = [
                { id: 1, eventType: 'issue.created', actorId: 1, createdAt: new Date() }
            ];
            const mockUsers = [
                { id: 1, name: 'Alice' }
            ];

            (issueRepository.findById as jest.Mock<any>).mockResolvedValue(mockIssue);
            (eventRepository.findByEntity as jest.Mock<any>).mockResolvedValue(mockEvents);

            // Mock prisma.user.findMany
            (prisma as any).user = { findMany: jest.fn() };
            ((prisma as any).user.findMany as jest.Mock<any>).mockResolvedValue(mockUsers);

            const result = await import('./issue.service').then(m => m.getIssueDetails(teamId, issueId));

            expect(issueRepository.findById).toHaveBeenCalledWith(issueId, teamId);
            expect(eventRepository.findByEntity).toHaveBeenCalledWith(teamId, 'issue', issueId);
            expect(result.issue).toEqual(expect.objectContaining({
                id: issueId,
                author: { id: 1, name: 'Alice' },
                practices: [{ id: 10, title: 'Practice A' }]
            }));
            expect(result.history).toHaveLength(1);
            expect(result.history[0].actor).toEqual({ id: 1, name: 'Alice' });
        });

        it('should throw 404 if issue not found', async () => {
            (issueRepository.findById as jest.Mock<any>).mockResolvedValue(null);

            await expect(import('./issue.service').then(m => m.getIssueDetails(teamId, 999)))
                .rejects.toThrow('Issue not found');
        });
    });
});
