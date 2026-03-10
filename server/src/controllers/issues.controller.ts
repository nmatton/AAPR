
import { Request, Response, NextFunction } from 'express';
import * as issueService from '../services/issue.service';
import { AuthenticatedRequest } from '../middleware/requireAuth';
import { AppError } from '../services/auth.service';
import { IssueStatus } from '@prisma/client';
import { recordDecisionSchema, evaluateIssueSchema } from '../schemas/issue.schema';

export const createIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId } = req.params;
        const { title, description, priority, practiceIds } = req.body;
        const userId = (req as AuthenticatedRequest).user?.userId; // Assumes requireAuth middleware attaches user

        if (!teamId || isNaN(Number(teamId))) {
            throw new AppError('validation_error', 'Invalid team ID', {}, 400);
        }

        if (!userId) {
            throw new AppError('unauthorized', 'User not authenticated', {}, 401);
        }

        const issue = await issueService.createIssue({
            title,
            description,
            priority,
            teamId: Number(teamId),
            createdBy: userId,
            practiceIds
        });

        res.status(201).json(issue);
    } catch (error) {
        next(error);
    }
};

export const getIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId, issueId } = req.params;

        if (!teamId || isNaN(Number(teamId))) {
            throw new AppError('validation_error', 'Invalid team ID', {}, 400);
        }
        if (!issueId || isNaN(Number(issueId))) {
            throw new AppError('validation_error', 'Invalid issue ID', {}, 400);
        }

        const details = await issueService.getIssueDetails(Number(teamId), Number(issueId));
        res.json(details);
    } catch (error) {
        next(error);
    }
};




export const createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { issueId } = req.params;
        const { content } = req.body;
        const userId = (req as AuthenticatedRequest).user?.userId;

        if (!issueId || isNaN(Number(issueId))) {
            throw new AppError('validation_error', 'Invalid issue ID', {}, 400);
        }

        if (!userId) {
            throw new AppError('unauthorized', 'User not authenticated', {}, 401);
        }

        const comment = await issueService.addComment(
            Number(issueId),
            userId,
            content
        );

        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
};

export const getIssues = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId } = req.params;
        const { status, practiceId, authorId, sortBy, sortDir } = req.query;

        if (!teamId || isNaN(Number(teamId))) {
            throw new AppError('validation_error', 'Invalid team ID', {}, 400);
        }

        const issues = await issueService.getIssues(Number(teamId), {
            status: status as IssueStatus,
            practiceId: practiceId ? Number(practiceId) : undefined,
            authorId: authorId ? Number(authorId) : undefined,
            sortBy: sortBy as 'createdAt' | 'comments',
            sortDir: sortDir as 'asc' | 'desc'
        });

        res.json(issues);
    } catch (error) {
        next(error);
    }
};

export const updateIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId, issueId } = req.params;
        const updates = req.body;
        const userId = (req as AuthenticatedRequest).user?.userId;

        if (!teamId || isNaN(Number(teamId))) {
            throw new AppError('validation_error', 'Invalid team ID', {}, 400);
        }
        if (!issueId || isNaN(Number(issueId))) {
            throw new AppError('validation_error', 'Invalid issue ID', {}, 400);
        }

        if (!userId) {
            throw new AppError('unauthorized', 'User not authenticated', {}, 401);
        }

        const issue = await issueService.updateIssue(
            Number(teamId),
            Number(issueId),
            userId,
            updates
        );

        res.json(issue);
    } catch (error) {
        next(error);
    }
};


export const getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId } = req.params;

        if (!teamId || isNaN(Number(teamId))) {
            throw new AppError('validation_error', 'Invalid team ID', {}, 400);
        }

        const stats = await issueService.getIssueStats(Number(teamId));
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

export const recordDecision = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId, issueId } = req.params;
        const userId = (req as AuthenticatedRequest).user?.userId;

        if (!teamId || isNaN(Number(teamId))) {
            throw new AppError('validation_error', 'Invalid team ID', {}, 400);
        }
        if (!issueId || isNaN(Number(issueId))) {
            throw new AppError('validation_error', 'Invalid issue ID', {}, 400);
        }
        if (!userId) {
            throw new AppError('unauthorized', 'User not authenticated', {}, 401);
        }

        const validation = recordDecisionSchema.safeParse(req.body);
        if (!validation.success) {
            throw new AppError('validation_error', 'Invalid input data', { errors: validation.error.format() }, 400);
        }

        const { decisionText, version } = validation.data;

        const issue = await issueService.recordDecision(
            Number(teamId),
            Number(issueId),
            userId,
            decisionText,
            version
        );

        res.json(issue);
    } catch (error) {
        next(error);
    }
};

export const evaluateIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId, issueId } = req.params;
        const userId = (req as AuthenticatedRequest).user?.userId;

        if (!teamId || isNaN(Number(teamId))) {
            throw new AppError('validation_error', 'Invalid team ID', {}, 400);
        }
        if (!issueId || isNaN(Number(issueId))) {
            throw new AppError('validation_error', 'Invalid issue ID', {}, 400);
        }
        if (!userId) {
            throw new AppError('unauthorized', 'User not authenticated', {}, 401);
        }

        const validation = evaluateIssueSchema.safeParse(req.body);
        if (!validation.success) {
            throw new AppError('validation_error', 'Invalid input data', { errors: validation.error.format() }, 400);
        }

        const { outcome, comments, version } = validation.data;

        const issue = await issueService.evaluateIssue(
            Number(teamId),
            Number(issueId),
            userId,
            outcome,
            comments,
            version
        );

        res.json(issue);
    } catch (error) {
        next(error);
    }
};
