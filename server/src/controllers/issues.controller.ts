
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
