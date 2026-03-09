/**
 * Practice Import Service
 * Handles importing practice data from JSON with validation, deduplication, and transactional safety
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { validatePractice, type Practice } from '../schemas/practice.schema';
import { isValidTag } from '../constants/tags.constants';
import type { Prisma } from '@prisma/client';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  duration_ms: number;
}

export interface ImportError {
  practice: string;
  field?: string;
  error: string;
  code: string;
}

// Pillar-to-category mapping — source of truth: docs/raw_practices/agile_pillars.md
const PILLAR_TO_CATEGORY: Record<string, string> = {
  // Technical Quality & Engineering Excellence
  'Code Quality & Simple Design': 'TECHNICAL_QUALITY',
  'Automation & Continuous Integration': 'TECHNICAL_QUALITY',
  'Technical Debt Management': 'TECHNICAL_QUALITY',
  'Technical Collective Ownership': 'TECHNICAL_QUALITY',
  // Team Culture & Psychology
  'Psychological Safety & Core Values': 'TEAM_CULTURE',
  'Self-Organization & Autonomy': 'TEAM_CULTURE',
  'Cross-Functionality & Shared Skills': 'TEAM_CULTURE',
  'Sustainable Pace': 'TEAM_CULTURE',
  // Process & Execution
  'Flow & Delivery Cadence': 'PROCESS_EXECUTION',
  'Inspection & Adaptation': 'PROCESS_EXECUTION',
  'Work Transparency & Synchronization': 'PROCESS_EXECUTION',
  // Product Value & Customer Alignment
  'Customer Involvement & Active Feedback': 'PRODUCT_VALUE',
  'Value-Driven Prioritization': 'PRODUCT_VALUE',
};

/**
 * Derive category from a practice's goals (pillars).
 * Uses majority vote: the category that appears most among the practice's pillars wins.
 * Returns null only when none of the goals map to a known pillar.
 */
function categoryFromPillars(goals: string[]): string | null {
  const counts: Record<string, number> = {};
  for (const goal of goals) {
    const cat = PILLAR_TO_CATEGORY[goal];
    if (cat) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  if (Object.keys(counts).length === 0) return null;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Calculate SHA256 checksum for a practice JSON object
 * Used for idempotency - detect if practice content has changed
 */
function stableStringify(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function calculateChecksum(practice: Practice): string {
  const content = stableStringify(practice);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Map pillar names to pillar IDs
 * @param pillarNames - Array of pillar names from practice JSON
 * @returns Array of pillar IDs
 */
async function mapPillarNamesToIds(pillarNames: string[]): Promise<number[]> {
  const pillars = await prisma.pillar.findMany({
    where: {
      name: {
        in: pillarNames,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
  
  const pillarMap = new Map(pillars.map(p => [p.name, p.id]));
  const pillarIds: number[] = [];
  
  for (const name of pillarNames) {
    const id = pillarMap.get(name);
    if (id) {
      pillarIds.push(id);
    } else {
      console.warn(`[WARN] Pillar not found: ${name}`);
    }
  }
  
  return pillarIds;
}

/**
 * Import practices from validated JSON data
 * @param practicesData - Array of raw practice JSON objects
 * @param sourceFile - Source file name for provenance
 * @param importedBy - Who imported the practices (default: 'system')
 * @returns Import result with counts and errors
 */
export async function importPractices(
  practicesData: unknown[],
  sourceFile: string = 'practices_reference.json',
  importedBy: string = 'system'
): Promise<ImportResult> {
  const startTime = Date.now();
  let importedCount = 0;
  let skippedCount = 0;
  const errors: ImportError[] = [];
  
  console.log(`[INFO] Starting practice import from ${sourceFile}...`);
  console.log(`[INFO] Found ${practicesData.length} practices to process`);
  
  // Process each practice
  for (const [index, practiceData] of practicesData.entries()) {
    try {
      // Validate practice data
      const validationResult = validatePractice(practiceData);
      
      if (!validationResult.success) {
        const practiceName = typeof practiceData === 'object' && practiceData !== null && 'name' in practiceData
          ? String(practiceData.name)
          : `Practice #${index + 1}`;
        
        console.warn(`[WARN] Validation failed for ${practiceName}`);
        errors.push({
          practice: practiceName,
          error: validationResult.errors?.message || 'Validation failed',
          code: 'validation_error',
        });
        skippedCount++;
        continue;
      }
      
      const practice = validationResult.data!;

      // Defensive validation at import boundary: reject deprecated or ad-hoc tags
      // even if upstream validation behavior changes in the future.
      const invalidTags = (practice.tags ?? []).filter((tag) => !isValidTag(tag));
      if (invalidTags.length > 0) {
        console.warn(`[WARN] Invalid tags found for ${practice.name}: ${invalidTags.join(', ')}`);
        errors.push({
          practice: practice.name,
          field: 'tags',
          error: `Invalid tags: ${invalidTags.join(', ')}`,
          code: 'invalid_tags'
        });
        skippedCount++;
        continue;
      }
      
      // Calculate checksum
      const checksum = calculateChecksum(practice);
      
      // Derive category from practice goals (pillars)
      const categoryId = categoryFromPillars(practice.practice_goal);
      if (!categoryId) {
        errors.push({
          practice: practice.name,
          field: 'practice_goal',
          error: `No pillar maps to a known category for goals: ${practice.practice_goal.join(', ')}`,
          code: 'invalid_category',
        });
        skippedCount++;
        continue;
      }
      
      // Check for existing practice (idempotency)
      const existing = await prisma.practice.findFirst({
        where: {
          title: practice.name,
          categoryId,
        },
      });
      
      if (existing) {
        if (existing.jsonChecksum === checksum) {
          // Same content, skip
          skippedCount++;
          continue;
        } else {
          // Content changed, log warning
          console.warn(`[WARN] Practice content differs: ${practice.name}`);
          console.warn(`  Old checksum: ${existing.jsonChecksum}`);
          console.warn(`  New checksum: ${checksum}`);
          // Skip for now (could be configurable to update)
          skippedCount++;
          continue;
        }
      }
      
      // Map pillar names to IDs
      const pillarIds = await mapPillarNamesToIds(practice.practice_goal);
      
      if (pillarIds.length === 0) {
        console.warn(`[WARN] No valid pillars found for practice: ${practice.name}`);
        errors.push({
          practice: practice.name,
          field: 'practice_goal',
          error: 'No valid pillars found',
          code: 'invalid_pillars',
        });
        skippedCount++;
        continue;
      }
      
      // Import practice in transaction
      await prisma.$transaction(async (tx) => {
        // Insert practice
        const createdPractice = await tx.practice.create({
          data: {
            title: practice.name,
            goal: practice.objective,
            description: practice.description,
            categoryId,
            method: practice.method || null,
            tags: (practice.tags || null) as Prisma.InputJsonValue,
            activities: (practice.activities || null) as Prisma.InputJsonValue,
            roles: (practice.roles || null) as Prisma.InputJsonValue,
            workProducts: (practice.work_products || null) as Prisma.InputJsonValue,
            completionCriteria: practice.completion_criteria || null,
            metrics: (practice.metrics || null) as Prisma.InputJsonValue,
            guidelines: (practice.resources?.guidelines || null) as Prisma.InputJsonValue,
            pitfalls: (practice.resources?.pitfalls || null) as Prisma.InputJsonValue,
            benefits: (practice.resources?.benefits || null) as Prisma.InputJsonValue,
            associatedPractices: (practice.associated_practices || null) as Prisma.InputJsonValue,
            isGlobal: true,
            importedAt: new Date(),
            sourceFile,
            jsonChecksum: checksum,
            practiceVersion: 1,
            importedBy,
            sourceGitSha: process.env.GIT_SHA || null,
            rawJson: practiceData as Prisma.InputJsonValue,
          },
        });
        
        // Insert practice-pillar relationships
        for (const pillarId of pillarIds) {
          await tx.practicePillar.create({
            data: {
              practiceId: createdPractice.id,
              pillarId,
            },
          });
        }
        
        // Log event
        await tx.event.create({
          data: {
            eventType: 'practice.imported',
            actorId: null, // System action
            teamId: 0, // System-level event
            entityType: 'practice',
            entityId: createdPractice.id,
            action: 'practice.imported',
            payload: {
              practiceId: createdPractice.id,
              title: practice.name,
              category: categoryId,
              pillarCount: pillarIds.length,
            } as Prisma.InputJsonValue,
            schemaVersion: 'v1',
          },
        });
      });
      
      importedCount++;
      
    } catch (error) {
      const practiceName = typeof practiceData === 'object' && practiceData !== null && 'name' in practiceData
        ? String(practiceData.name)
        : `Practice #${index + 1}`;
      
      console.error(`[ERROR] Failed to import practice: ${practiceName}`, error);
      errors.push({
        practice: practiceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'import_error',
      });
      skippedCount++;
    }
  }
  
  const duration = Date.now() - startTime;
  
  // Log final import event
  if (importedCount > 0) {
    await prisma.event.create({
      data: {
        eventType: 'practices.imported',
        actorId: null,
        teamId: 0,
        entityType: 'practice',
        entityId: null,
        action: 'practices.imported',
        payload: {
          count: importedCount,
          skipped: skippedCount,
          errors: errors.length,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
          source_file: sourceFile,
          imported_by: importedBy,
          git_sha: process.env.GIT_SHA || 'unknown',
        } as Prisma.InputJsonValue,
        schemaVersion: 'v1',
      },
    });
  }
  
  console.log(`[SUCCESS] Import complete: ${importedCount} imported, ${skippedCount} skipped, ${errors.length} errors`);
  console.log(`[INFO] Duration: ${duration}ms`);
  
  return {
    success: errors.length === 0 || importedCount > 0,
    imported: importedCount,
    skipped: skippedCount,
    errors,
    duration_ms: duration,
  };
}
