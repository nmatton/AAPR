
import { prisma } from '../lib/prisma';
import { AppError } from './auth.service';
import * as eventService from './events.service';
import { Priority } from '@prisma/client';

export interface IssueInput {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    teamId: number;
    createdBy: number;
    practiceIds?: number[];
}

export const createIssue = async (input: IssueInput) => {
    const { title, description, priority, teamId, createdBy, practiceIds } = input;

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

    // Validate practice IDs belong to team
    if (practiceIds && practiceIds.length > 0) {
        for (const pid of practiceIds) {
            const teamPractice = await prisma.teamPractice.findFirst({
                where: { teamId, practiceId: pid }
            });
            if (!teamPractice) {
                throw new AppError('validation_error', 'One or more practices are not valid for this team', { practiceId: pid }, 400);
            }
        }
    }

    return await prisma.$transaction(async (tx) => {
        // Create Issue
        const issue = await tx.issue.create({
            data: {
                title,
                description,
                priority: priority as Priority,
                status: 'OPEN',
                teamId,
                createdBy,
                // Link practices if provided
                linkedPractices: practiceIds && practiceIds.length > 0 ? {
                    create: practiceIds.map(pid => ({ practiceId: pid }))
                } : undefined
            },
            include: {
                linkedPractices: {
                    include: { practice: true }
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
                title: issue.title,
                linkedPracticeIds: practiceIds || []
            }
        }, tx); // Pass transaction client

        return issue;
    });
};
