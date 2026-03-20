import { z } from 'zod';

export const createIssueSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(255),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
        message: 'Priority must be LOW, MEDIUM, or HIGH'
    }),
    practiceIds: z.array(z.number().int().positive()).max(50).optional(),
    tagIds: z.array(z.number().int().positive()).max(50).optional(),
    isStandalone: z.boolean().optional().default(false),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const recordDecisionSchema = z.object({
    decisionText: z.string()
        .min(10, 'Decision text must be at least 10 characters')
        .max(5000, 'Decision text cannot exceed 5000 characters'),
    version: z.number().int().positive('Version must be a positive integer')
});

export type RecordDecisionInput = z.infer<typeof recordDecisionSchema>;

export const evaluateIssueSchema = z.object({
    outcome: z.enum(['yes', 'no', 'partial'], {
        message: 'Outcome must be yes, no, or partial'
    }),
    comments: z.string()
        .max(5000, 'Comments cannot exceed 5000 characters')
        .optional()
        .default(''),
    version: z.number().int().positive('Version must be a positive integer')
});

export type EvaluateIssueInput = z.infer<typeof evaluateIssueSchema>;
