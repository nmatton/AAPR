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
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        issuePractice: {
            create: jest.fn(),
        },
        team: {
            findUnique: jest.fn(),
        },
        teamPractice: {
            findFirst: jest.fn(),
        },
        teamMember: {
            findUnique: jest.fn(),
        }
    },
}));

// Mock eventService
jest.mock('./events.service', () => ({
    logEvent: jest.fn(),
}));

jest.mock('../repositories/issue.repository', () => ({
    findById: jest.fn(),
    findAll: jest.fn(),
    countByStatus: jest.fn(),
}));

jest.mock('../repositories/event.repository', () => ({
    findByEntity: jest.fn(),
}));

jest.mock('../repositories/comment.repository', () => ({
    create: jest.fn(),
    findByIssueId: jest.fn(),
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

    describe('addComment', () => {
        const mockIssue = { id: 100, teamId: 1 };

        it('should create comment and log event if user is member', async () => {
            // Setup
            (prisma.issue.findUnique as jest.Mock<any>).mockResolvedValue(mockIssue);
            (prisma.teamMember.findUnique as jest.Mock<any>).mockResolvedValue({ id: 1 }); // Is member

            const commentRepository = require('../repositories/comment.repository');
            commentRepository.create.mockResolvedValue({ id: 999, content: 'Test comment' });

            await import('./issue.service').then(m => m.addComment(100, 5, 'My comment'));

            expect(prisma.issue.findUnique).toHaveBeenCalledWith({ where: { id: 100 } });
            expect(prisma.teamMember.findUnique).toHaveBeenCalled();
            expect(commentRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ content: 'My comment', issueId: 100, authorId: 5 }),
                expect.anything()
            );
            expect(eventService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({ eventType: 'issue.comment_added' }),
                expect.anything()
            );
        });

        it('should throw forbidden if user is not team member', async () => {
            (prisma.issue.findUnique as jest.Mock<any>).mockResolvedValue(mockIssue);
            (prisma.teamMember.findUnique as jest.Mock<any>).mockResolvedValue(null); // Not member

            await expect(import('./issue.service').then(m => m.addComment(100, 5, 'Failed')))
                .rejects.toThrow('You do not have permission');
        });
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

        const commentRepository = require('../repositories/comment.repository');
        commentRepository.findByIssueId.mockResolvedValue([
            { id: 50, content: 'Hello', createdAt: new Date(), authorId: 1, author: { name: 'Alice' } }
        ]);

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
        expect(result.comments).toHaveLength(1);
        expect(result.comments[0].content).toBe('Hello');
    });

    it('should throw 404 if issue not found', async () => {
        (issueRepository.findById as jest.Mock<any>).mockResolvedValue(null);

        await expect(import('./issue.service').then(m => m.getIssueDetails(teamId, 999)))
            .rejects.toThrow('Issue not found');
    });
});

describe('getIssues', () => {
    const teamId = 1;

    it('should return mapped issues list', async () => {
        const mockRepoIssues = [
            {
                id: 1,
                title: 'Issue 1',
                description: 'Desc 1',
                status: 'OPEN',
                priority: 'HIGH',
                createdAt: new Date(),
                createdByUser: { id: 10, name: 'Bob' },
                linkedPractices: [
                    { practice: { id: 5, title: 'Prac 5' } }
                ],
                _count: { comments: 3 }
            }
        ];

        (issueRepository.findAll as jest.Mock<any>).mockResolvedValue(mockRepoIssues);

        const result = await import('./issue.service').then(m => m.getIssues(teamId, {}));

        expect(issueRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ teamId }));
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.objectContaining({
            id: 1,
            title: 'Issue 1',
            status: 'OPEN',
            author: { id: 10, name: 'Bob' },
            practices: [{ id: 5, title: 'Prac 5' }],
            _count: { comments: 3 }
        }));
    });
});

describe('getIssueStats', () => {
    const teamId = 1;

    it('should return issue stats by status', async () => {
        const mockCounts = [
            { status: 'OPEN', _count: { _all: 5 } },
            { status: 'IN_DISCUSSION', _count: { _all: 3 } },
            { status: 'ADAPTATION_IN_PROGRESS', _count: { _all: 2 } },
            { status: 'EVALUATED', _count: { _all: 1 } },
            { status: 'RESOLVED', _count: { _all: 10 } }
        ];

        const issueRepo = require('../repositories/issue.repository');
        issueRepo.countByStatus.mockResolvedValue(mockCounts);

        const service = await import('./issue.service') as any;
        const result = await service.getIssueStats(teamId);

        expect(issueRepo.countByStatus).toHaveBeenCalledWith(teamId);
        expect(result).toEqual({
            total: 21,
            byStatus: {
                open: 5,
                in_progress: 3,
                adaptation_in_progress: 2,
                evaluated: 1,
                done: 10
            }
        });
    });
});

describe('recordDecision', () => {
    const teamId = 1;
    const issueId = 100;
    const userId = 5;
    const decisionText = 'Switching to async standups';
    const currentVersion = 2;

    it('should record decision atomically, update status, increment version and log event', async () => {
        const mockIssue = { id: issueId, teamId, version: currentVersion };
        const mockUpdatedIssue = {
            ...mockIssue,
            decisionText,
            status: 'ADAPTATION_IN_PROGRESS',
            version: currentVersion + 1,
            decisionRecordedBy: userId,
            decisionRecordedAt: expect.any(Date),
            createdByUser: { id: 1, name: 'Alice' },
            decisionRecorder: { id: userId, name: 'Bob' },
            linkedPractices: []
        };

        const issueRepo = require('../repositories/issue.repository');
        issueRepo.findById.mockResolvedValue(mockIssue);

        // Mock updateMany returning count: 1 (success)
        (prisma.issue as any).updateMany = jest.fn<any>().mockResolvedValue({ count: 1 });
        // Mock findUniqueOrThrow returning the updated issue
        (prisma.issue as any).findUniqueOrThrow = jest.fn<any>().mockResolvedValue(mockUpdatedIssue);

        const service = await import('./issue.service');
        const result = await service.recordDecision(teamId, issueId, userId, decisionText, currentVersion);

        expect(issueRepo.findById).toHaveBeenCalledWith(issueId, teamId);
        expect(prisma.$transaction).toHaveBeenCalled();
        expect((prisma.issue as any).updateMany).toHaveBeenCalledWith({
            where: { id: issueId, teamId, version: currentVersion },
            data: expect.objectContaining({
                decisionText,
                status: 'ADAPTATION_IN_PROGRESS',
                version: { increment: 1 },
                decisionRecordedBy: userId,
            })
        });
        expect(eventService.logEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'issue.decision_recorded',
                teamId,
                actorId: userId,
                action: 'issue.decision_recorded',
                payload: expect.objectContaining({
                    decision_text: decisionText
                })
            }),
            expect.anything()
        );
        expect(result).toEqual(mockUpdatedIssue);
    });

    it('should throw 404 if issue not found', async () => {
        const issueRepo = require('../repositories/issue.repository');
        issueRepo.findById.mockResolvedValue(null);
        
        const service = await import('./issue.service');
        await expect(service.recordDecision(teamId, issueId, userId, decisionText, currentVersion))
            .rejects.toThrow('Issue not found');
    });

    it('should throw 409 if version mismatch (atomic check via updateMany count=0)', async () => {
        const mockIssue = { id: issueId, teamId, version: currentVersion + 1 }; // DB has newer version
        const issueRepo = require('../repositories/issue.repository');
        issueRepo.findById.mockResolvedValue(mockIssue); // exists check passes

        // updateMany returns count: 0 (version mismatch)
        (prisma.issue as any).updateMany = jest.fn<any>().mockResolvedValue({ count: 0 });
        (prisma.issue as any).findUnique = jest.fn<any>().mockResolvedValue({ version: currentVersion + 1 });

        const service = await import('./issue.service');
        await expect(service.recordDecision(teamId, issueId, userId, decisionText, currentVersion))
            .rejects.toThrow('someone else');
    });
});

describe('evaluateIssue', () => {
    const teamId = 1;
    const issueId = 100;
    const userId = 5;
    const outcome = 'yes';
    const comments = 'The adaptation worked well';
    const currentVersion = 3;

    it('should evaluate issue atomically, update status to EVALUATED, increment version and log event', async () => {
        const mockIssue = { id: issueId, teamId, version: currentVersion, status: 'ADAPTATION_IN_PROGRESS' };
        const mockUpdatedIssue = {
            ...mockIssue,
            evaluationOutcome: outcome,
            evaluationComments: comments,
            status: 'EVALUATED',
            version: currentVersion + 1,
            evaluationRecordedBy: userId,
            evaluationRecordedAt: expect.any(Date),
            createdByUser: { id: 1, name: 'Alice' },
            decisionRecorder: { id: 2, name: 'Charlie' },
            evaluationRecorder: { id: userId, name: 'Bob' },
            linkedPractices: []
        };

        const issueRepo = require('../repositories/issue.repository');
        issueRepo.findById.mockResolvedValue(mockIssue);

        (prisma.issue as any).updateMany = jest.fn<any>().mockResolvedValue({ count: 1 });
        (prisma.issue as any).findUniqueOrThrow = jest.fn<any>().mockResolvedValue(mockUpdatedIssue);

        const service = await import('./issue.service');
        const result = await service.evaluateIssue(teamId, issueId, userId, outcome, comments, currentVersion);

        expect(issueRepo.findById).toHaveBeenCalledWith(issueId, teamId);
        expect(prisma.$transaction).toHaveBeenCalled();
        expect((prisma.issue as any).updateMany).toHaveBeenCalledWith({
            where: { id: issueId, teamId, version: currentVersion },
            data: expect.objectContaining({
                evaluationOutcome: outcome,
                evaluationComments: comments,
                status: 'EVALUATED',
                version: { increment: 1 },
                evaluationRecordedBy: userId,
            })
        });
        expect(eventService.logEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'issue.evaluated',
                teamId,
                actorId: userId,
                action: 'issue.evaluated',
                payload: expect.objectContaining({
                    outcome,
                    comments,
                })
            }),
            expect.anything()
        );
        expect(result).toEqual(mockUpdatedIssue);
    });

    it('should throw 404 if issue not found', async () => {
        const issueRepo = require('../repositories/issue.repository');
        issueRepo.findById.mockResolvedValue(null);

        const service = await import('./issue.service');
        await expect(service.evaluateIssue(teamId, issueId, userId, outcome, comments, currentVersion))
            .rejects.toThrow('Issue not found');
    });

    it('should throw 400 if issue is not in ADAPTATION_IN_PROGRESS status', async () => {
        const mockIssue = { id: issueId, teamId, version: currentVersion, status: 'OPEN' };
        const issueRepo = require('../repositories/issue.repository');
        issueRepo.findById.mockResolvedValue(mockIssue);

        const service = await import('./issue.service');
        await expect(service.evaluateIssue(teamId, issueId, userId, outcome, comments, currentVersion))
            .rejects.toThrow('Only issues with status "Adaptation in Progress" can be evaluated');
    });

    it('should throw 409 if version mismatch (atomic check via updateMany count=0)', async () => {
        const mockIssue = { id: issueId, teamId, version: currentVersion + 1, status: 'ADAPTATION_IN_PROGRESS' };
        const issueRepo = require('../repositories/issue.repository');
        issueRepo.findById.mockResolvedValue(mockIssue);

        (prisma.issue as any).updateMany = jest.fn<any>().mockResolvedValue({ count: 0 });
        (prisma.issue as any).findUnique = jest.fn<any>().mockResolvedValue({ version: currentVersion + 1 });

        const service = await import('./issue.service');
        await expect(service.evaluateIssue(teamId, issueId, userId, outcome, comments, currentVersion))
            .rejects.toThrow('someone else');
    });
});
