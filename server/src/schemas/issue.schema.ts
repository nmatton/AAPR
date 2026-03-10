import { z } from 'zod';

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
