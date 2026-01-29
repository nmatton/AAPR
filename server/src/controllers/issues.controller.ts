
import { Request, Response, NextFunction } from 'express';
import * as issueService from '../services/issue.service';
import { AuthenticatedRequest } from '../middleware/requireAuth';
import { AppError } from '../services/auth.service';

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
