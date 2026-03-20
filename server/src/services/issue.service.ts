
import { prisma } from '../lib/prisma';
import { AppError } from './auth.service';
import * as eventService from './events.service';
import { IssueStatus, Priority } from '@prisma/client';
import * as issueRepository from '../repositories/issue.repository';
import * as eventRepository from '../repositories/event.repository';
import * as commentRepository from '../repositories/comment.repository';

export interface IssueInput {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    teamId: number;
    createdBy: number;
    practiceIds?: number[];
    tagIds?: number[];
    isStandalone?: boolean;
}

export interface UpdateIssueInput {
    status?: 'OPEN' | 'IN_DISCUSSION' | 'ADAPTATION_IN_PROGRESS' | 'EVALUATED' | 'RESOLVED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type NormalizedIssueStatusCounts = {
    open: number;
    in_progress: number;
    adaptation_in_progress: number;
    evaluated: number;
    done: number;
};

const ISSUE_STATUS_API_KEY_MAP: Record<IssueStatus, keyof NormalizedIssueStatusCounts> = {
    OPEN: 'open',
    IN_DISCUSSION: 'in_progress',
    ADAPTATION_IN_PROGRESS: 'adaptation_in_progress',
    EVALUATED: 'evaluated',
    RESOLVED: 'done'
};

export const createEmptyIssueStatusCounts = (): NormalizedIssueStatusCounts => ({
    open: 0,
    in_progress: 0,
    adaptation_in_progress: 0,
    evaluated: 0,
    done: 0
});

export const normalizeIssueStatusCounts = (
    statusCounts: Array<{ status: string; _count: { _all: number } }>,
    contextDetails: Record<string, unknown>
): NormalizedIssueStatusCounts => {
    const byStatus = createEmptyIssueStatusCounts();

    statusCounts.forEach((stat) => {
        const key = ISSUE_STATUS_API_KEY_MAP[stat.status as IssueStatus];

        if (!key) {
            throw new AppError('internal_error', 'Unsupported issue status in stats aggregation', {
                status: stat.status,
                ...contextDetails
            }, 500);
        }

        byStatus[key] = stat._count._all;
    });

    return byStatus;
};

const roundTo2 = (value: number): number => Number(value.toFixed(2));

const safeRate = (numerator: number, denominator: number): number => {
    if (denominator <= 0) {
        return 0;
    }
    return roundTo2(numerator / denominator);
};

export const buildIssueFlowRates = (byStatus: NormalizedIssueStatusCounts) => ({
    open_to_in_progress_rate: safeRate(byStatus.in_progress, byStatus.open),
    in_progress_to_adaptation_in_progress_rate: safeRate(byStatus.adaptation_in_progress, byStatus.in_progress),
    adaptation_in_progress_to_evaluated_rate: safeRate(byStatus.evaluated, byStatus.adaptation_in_progress),
    evaluated_to_done_rate: safeRate(byStatus.done, byStatus.evaluated),
});

export const meanDurationHours = (durationsMs: number[]): number => {
    if (durationsMs.length === 0) {
        return 0;
    }

    const averageMs = durationsMs.reduce((sum, value) => sum + value, 0) / durationsMs.length;
    return roundTo2(averageMs / (1000 * 60 * 60));
};


export const createIssue = async (input: IssueInput) => {
    const { title, description, priority, teamId, createdBy, practiceIds, tagIds, isStandalone } = input;

    // Validation
    if (!title || title.length < 5) {
        throw new AppError('validation_error', 'Validation failed', { field: 'title', message: 'Title must be at least 5 characters' }, 400);
    }
    if (!description || description.length < 10) {
        throw new AppError('validation_error', 'Validation failed', { field: 'description', message: 'Description must be at least 10 characters' }, 400);
    }

    // Ensure team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
        throw new AppError('not_found', 'Team not found', { teamId }, 404);
    }

    return await prisma.$transaction(async (tx) => {
        // Validate practice IDs belong to team (batch query inside tx prevents TOCTOU)
        if (practiceIds && practiceIds.length > 0) {
            const validPractices = await tx.teamPractice.findMany({
                where: { teamId, practiceId: { in: practiceIds } },
                select: { practiceId: true }
            });
            if (validPractices.length !== practiceIds.length) {
                const validIds = new Set(validPractices.map(tp => tp.practiceId));
                const invalidId = practiceIds.find(pid => !validIds.has(pid));
                throw new AppError('validation_error', 'One or more practices are not valid for this team', { practiceId: invalidId }, 400);
            }
        }

        // Validate tag IDs exist (inside tx prevents TOCTOU)
        if (tagIds && tagIds.length > 0) {
            const existingTags = await tx.tag.findMany({
                where: { id: { in: tagIds } },
                select: { id: true }
            });
            const existingTagIds = new Set(existingTags.map(t => t.id));
            const invalidTagIds = tagIds.filter(id => !existingTagIds.has(id));
            if (invalidTagIds.length > 0) {
                throw new AppError('validation_error', 'One or more tags do not exist', { invalidTagIds }, 400);
            }
        }

        // Create Issue
        const issue = await tx.issue.create({
            data: {
                title,
                description,
                priority: priority as Priority,
                status: 'OPEN',
                teamId,
                createdBy,
                isStandalone: isStandalone ?? false,
                // Link practices if provided
                linkedPractices: practiceIds && practiceIds.length > 0 ? {
                    create: practiceIds.map(pid => ({ practiceId: pid }))
                } : undefined,
                // Link tags if provided
                issueTags: tagIds && tagIds.length > 0 ? {
                    create: tagIds.map(tid => ({ tagId: tid }))
                } : undefined
            },
            include: {
                linkedPractices: {
                    include: { practice: true }
                },
                issueTags: {
                    include: { tag: true }
                }
            }
        });

        // Log Event
        await eventService.logEvent({
            eventType: 'issue.created',
            teamId,
            actorId: createdBy,
            entityType: 'issue',
            entityId: issue.id,
            action: 'created',
            payload: {
                issueId: issue.id,
                title: issue.title,
                descriptionSummary: issue.description.substring(0, 100) + (issue.description.length > 100 ? '...' : ''),
                priority: issue.priority,
                status: issue.status,
                linkedPracticeIds: practiceIds || [],
                linkedTagIds: tagIds || [],
                isStandalone: isStandalone ?? false,
                actorId: createdBy,
                teamId,
                timestamp: new Date().toISOString(),
            }
        }, tx); // Pass transaction client

        return issue;
    });
};

export const addComment = async (issueId: number, userId: number, content: string) => {
    // Validation
    if (!content || content.trim().length === 0) {
        throw new AppError('validation_error', 'Content is required', { field: 'content' }, 400);
    }

    // Ensure issue exists and user has access (via team)
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
        throw new AppError('not_found', 'Issue not found', { issueId }, 404);
    }

    // Check if user belongs to the team of the issue
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId: issue.teamId,
                userId: userId
            }
        }
    });

    if (!membership) {
        throw new AppError('forbidden', 'You do not have permission to comment on this issue', { issueId, userId }, 403);
    }

    return await prisma.$transaction(async (tx) => {
        // Create Comment
        const comment = await commentRepository.create({
            content,
            issueId,
            authorId: userId
        }, tx);

        // Log Event
        await eventService.logEvent({
            eventType: 'issue.comment_added',
            teamId: issue.teamId,
            actorId: userId,
            entityType: 'issue',
            entityId: issueId,
            action: 'issue.comment_added',
            payload: {
                issueId,
                commentId: comment.id,
                commentText: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
                actorId: userId,
                teamId: issue.teamId,
                timestamp: new Date().toISOString(),
            }
        }, tx);

        return comment;
    });
};

export const updateIssue = async (teamId: number, issueId: number, userId: number, updates: UpdateIssueInput) => {
    // 1. Check if issue exists
    const issue = await issueRepository.findById(issueId, teamId);
    if (!issue) {
        throw new AppError('not_found', 'Issue not found', { issueId, teamId }, 404);
    }

    // 2. Perform Update
    let dataToUpdate: any = {};
    if (updates.status) dataToUpdate.status = updates.status;
    if (updates.priority) dataToUpdate.priority = updates.priority;

    if (Object.keys(dataToUpdate).length === 0) {
        return issue;
    }

    const updatedIssue = await issueRepository.update(issueId, teamId, dataToUpdate);

    // 3. Log Events
    if (updates.status && updates.status !== issue.status) {
        const statusChangedAt = new Date().toISOString();
        await eventService.logEvent({
            eventType: 'issue.status_changed',
            teamId,
            actorId: userId,
            entityType: 'issue',
            entityId: issueId,
            action: 'updated',
            payload: {
                issueId,
                teamId,
                actorId: userId,
                oldStatus: issue.status,
                newStatus: updates.status,
                timestamp: statusChangedAt,
            }
        });
    }

    if (updates.priority && updates.priority !== issue.priority) {
        const priorityChangedAt = new Date().toISOString();
        await eventService.logEvent({
            eventType: 'issue.priority_changed',
            teamId,
            actorId: userId,
            entityType: 'issue',
            entityId: issueId,
            action: 'updated',
            payload: {
                issueId,
                teamId,
                actorId: userId,
                oldPriority: issue.priority,
                newPriority: updates.priority,
                timestamp: priorityChangedAt,
            }
        });
    }

    return updatedIssue;
};




export const getIssueDetails = async (teamId: number, issueId: number) => {
    // 1. Fetch Issue
    const issue = await issueRepository.findById(issueId, teamId);
    if (!issue) {
        throw new AppError('not_found', 'Issue not found', { issueId, teamId }, 404);
    }

    // 2. Fetch History Events
    const events = await eventRepository.findByEntity(teamId, 'issue', issueId);

    // 3. Resolve Actors for Events
    const actorIds = [...new Set(events.filter(e => e.actorId).map(e => e.actorId as number))];
    const users = await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // 4. Fetch Comments
    const comments = await commentRepository.findByIssueId(issueId);

    // 5. Map Response
    return {
        issue: {
            id: issue.id,
            title: issue.title,
            description: issue.description,
            decisionText: issue.decisionText,
            decisionRecordedAt: issue.decisionRecordedAt,
            decisionRecordedBy: issue.decisionRecorder
                ? { id: issue.decisionRecorder.id, name: issue.decisionRecorder.name }
                : null,
            evaluationOutcome: issue.evaluationOutcome,
            evaluationComments: issue.evaluationComments,
            evaluationRecordedAt: issue.evaluationRecordedAt,
            evaluationRecordedBy: issue.evaluationRecorder
                ? { id: issue.evaluationRecorder.id, name: issue.evaluationRecorder.name }
                : null,
            version: issue.version,
            priority: issue.priority,
            status: issue.status,
            createdAt: issue.createdAt,
            author: {
                id: issue.createdByUser.id,
                name: issue.createdByUser.name,
            },
            practices: issue.linkedPractices.map(lp => ({
                id: lp.practice.id,
                title: lp.practice.title,
            })),
            tags: (issue as any).issueTags?.map((it: any) => ({
                id: it.tag.id,
                name: it.tag.name,
                description: it.tag.description,
            })) || [],
            isStandalone: issue.isStandalone,
        },
        comments: comments.map(c => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            author: {
                id: c.authorId,
                name: c.author.name
            }
        })),
        history: events.map(event => ({
            id: Number(event.id), // BigInt to Number
            eventType: event.eventType,
            action: event.action,
            actor: event.actorId ? userMap.get(event.actorId) : null,
            createdAt: event.createdAt,
            payload: event.payload,
        })),
    };
};

export const getIssues = async (teamId: number, options: Omit<issueRepository.FindIssuesOptions, 'teamId'>) => {
    const issues = await issueRepository.findAll({
        teamId,
        ...options
    });

    return issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        createdAt: issue.createdAt,
        author: {
            id: issue.createdByUser.id,
            name: issue.createdByUser.name,
        },
        practices: issue.linkedPractices.map(lp => ({
            id: lp.practice.id,
            title: lp.practice.title,
        })),
        tags: (issue as any).issueTags?.map((it: any) => ({
            id: it.tag.id,
            name: it.tag.name,
        })) || [],
        isStandalone: (issue as any).isStandalone,
        _count: {
            comments: issue._count.comments
        }
    }));
};

export const getIssueStats = async (teamId: number) => {
    const statusCounts = await issueRepository.countByStatus(teamId);

    const total = statusCounts.reduce((acc, curr) => acc + curr._count._all, 0);
    const byStatus = normalizeIssueStatusCounts(statusCounts, { teamId });

    return { total, byStatus };
};

export const recordDecision = async (
    teamId: number,
    issueId: number,
    userId: number,
    decisionText: string,
    version: number
) => {
    // 1. Verify issue exists (fast check before transaction)
    const issue = await issueRepository.findById(issueId, teamId);
    if (!issue) {
        throw new AppError('not_found', 'Issue not found', { issueId, teamId }, 404);
    }

    return await prisma.$transaction(async (tx) => {
        // 2. Atomic version-checked update (eliminates TOCTOU race)
        //    Architecture Decision 5: WHERE id = ? AND version = ?
        const now = new Date();
        const updateResult = await tx.issue.updateMany({
            where: { id: issueId, teamId, version },
            data: {
                decisionText,
                status: 'ADAPTATION_IN_PROGRESS',
                version: { increment: 1 },
                decisionRecordedBy: userId,
                decisionRecordedAt: now
            }
        });

        if (updateResult.count === 0) {
            // Re-fetch to get current version for error detail
            const current = await tx.issue.findUnique({ where: { id: issueId }, select: { version: true } });
            throw new AppError('conflict', 'Issue has been updated by someone else', {
                currentVersion: current?.version,
                providedVersion: version
            }, 409);
        }

        // 3. Fetch the updated issue with relations for response
        const updatedIssue = await tx.issue.findUniqueOrThrow({
            where: { id: issueId },
            include: {
                createdByUser: {
                    select: { id: true, name: true }
                },
                decisionRecorder: {
                    select: { id: true, name: true }
                },
                linkedPractices: {
                    include: {
                        practice: {
                            select: { id: true, title: true }
                        }
                    }
                }
            }
        });

        // 4. Log Event
        await eventService.logEvent({
            eventType: 'issue.decision_recorded',
            teamId,
            actorId: userId,
            entityType: 'issue',
            entityId: issueId,
            action: 'issue.decision_recorded',
            payload: {
                issueId,
                teamId,
                actorId: userId,
                decisionText,
                timestamp: now.toISOString()
            }
        }, tx);
        
        return updatedIssue;
    });
};

export const evaluateIssue = async (
    teamId: number,
    issueId: number,
    userId: number,
    outcome: string,
    comments: string,
    version: number
) => {
    // 1. Verify issue exists and is in correct status (fast check before transaction)
    const issue = await issueRepository.findById(issueId, teamId);
    if (!issue) {
        throw new AppError('not_found', 'Issue not found', { issueId, teamId }, 404);
    }

    // 1b. Enforce workflow: only ADAPTATION_IN_PROGRESS issues can be evaluated
    if (issue.status !== 'ADAPTATION_IN_PROGRESS') {
        throw new AppError('validation_error', 'Only issues with status "Adaptation in Progress" can be evaluated', {
            currentStatus: issue.status,
            expectedStatus: 'ADAPTATION_IN_PROGRESS'
        }, 400);
    }

    return await prisma.$transaction(async (tx) => {
        // 2. Atomic version-checked update (eliminates TOCTOU race)
        //    Architecture Decision 5: WHERE id = ? AND version = ?
        const now = new Date();
        const updateResult = await tx.issue.updateMany({
            where: { id: issueId, teamId, version },
            data: {
                evaluationOutcome: outcome,
                evaluationComments: comments,
                status: 'EVALUATED',
                version: { increment: 1 },
                evaluationRecordedBy: userId,
                evaluationRecordedAt: now
            }
        });

        if (updateResult.count === 0) {
            // Re-fetch to get current version for error detail
            const current = await tx.issue.findUnique({ where: { id: issueId }, select: { version: true } });
            throw new AppError('conflict', 'Issue has been updated by someone else', {
                currentVersion: current?.version,
                providedVersion: version
            }, 409);
        }

        // 3. Fetch the updated issue with relations for response
        const updatedIssue = await tx.issue.findUniqueOrThrow({
            where: { id: issueId },
            include: {
                createdByUser: {
                    select: { id: true, name: true }
                },
                decisionRecorder: {
                    select: { id: true, name: true }
                },
                evaluationRecorder: {
                    select: { id: true, name: true }
                },
                linkedPractices: {
                    include: {
                        practice: {
                            select: { id: true, title: true }
                        }
                    }
                }
            }
        });

        // 4. Log Event
        await eventService.logEvent({
            eventType: 'issue.evaluated',
            teamId,
            actorId: userId,
            entityType: 'issue',
            entityId: issueId,
            action: 'issue.evaluated',
            payload: {
                issueId,
                teamId,
                actorId: userId,
                outcome,
                comments: comments || '',
                timestamp: now.toISOString()
            }
        }, tx);
        
        return updatedIssue;
    });
};

