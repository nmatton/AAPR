/**
 * Zod validation schemas for practice JSON import
 * Based on docs/PRACTICES_REFERENCE_GUIDE.md schema
 */

import { z } from 'zod';

// Activity schema
export const ActivitySchema = z.object({
  sequence: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().min(1),
});

// Role schema with RACI responsibility types
export const RoleSchema = z.object({
  role: z.string().min(1).max(100),
  responsibility: z.enum(['Responsible', 'Accountable', 'Consulted', 'Informed']),
});

// Work product schema
export const WorkProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
});

// Metric schema
export const MetricSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(50).optional(),
  formula: z.string().optional(),
});

// Resource guideline schema
export const GuidelineSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().refine(
    (url) => url.startsWith('https://'),
    { message: 'URL must use HTTPS protocol' }
  ),
  type: z.string().optional(), // Allow any resource type
});

// Associated practice schema
export const AssociatedPracticeSchema = z.object({
  target_practice: z.string().min(1).max(200),
  association_type: z.enum(['Configuration', 'Equivalence', 'Dependency', 'Complementarity', 'Exclusion']),
});

// Valid tags - allow any string for flexibility with real-world data
// Valid practice goals (pillars) - keep strict for data integrity
const ValidPracticeGoals = [
  'Communication',
  'Simplicity',
  'Feedback',
  'Courage',
  'Humility',
  'Transparency',
  'Inspection',
  'Adaptation',
  'Collective Code Ownership',
  'Continuous Integration',
  'TDD (Test First)',
  'Refactoring',
  'Simple Design',
  'Coding Standards',
  'Sustainable Pace',
  'Self-Organization',
  'Cross-Functional Teams',
  'Active Stakeholder Participation',
  'Short Releases',
] as const;

// Main practice schema
export const PracticeSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  type: z.string().min(1).max(100), // Allow any practice type
  objective: z.string().min(1).max(500).trim(),
  description: z.string().min(1).max(10000).optional(),
  method: z.string().max(100).optional(), // Allow any method/framework
  tags: z.array(z.string()).optional(), // Allow any tags
  practice_goal: z.array(z.enum(ValidPracticeGoals)).min(1), // Keep pillars strict
  activities: z.array(ActivitySchema).optional(),
  roles: z.array(RoleSchema).optional(),
  work_products: z.array(WorkProductSchema).optional(),
  completion_criteria: z.string().optional(),
  metrics: z.array(MetricSchema).optional(),
  resources: z.object({
    guidelines: z.array(GuidelineSchema).optional(),
    pitfalls: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
  }).optional(),
  associated_practices: z.array(AssociatedPracticeSchema).optional(),
});

// Type inference from schema
export type Practice = z.infer<typeof PracticeSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Role = z.infer<typeof RoleSchema>;
export type WorkProduct = z.infer<typeof WorkProductSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type Guideline = z.infer<typeof GuidelineSchema>;
export type AssociatedPractice = z.infer<typeof AssociatedPracticeSchema>;

// Validation result type
export interface ValidationResult {
  success: boolean;
  data?: Practice;
  errors?: z.ZodError;
}

/**
 * Validate a practice JSON object
 * @param practiceData - Raw practice data from JSON
 * @returns Validation result with parsed data or errors
 */
export function validatePractice(practiceData: unknown): ValidationResult {
  const result = PracticeSchema.safeParse(practiceData);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      errors: result.error,
    };
  }
}
