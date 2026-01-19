/**
 * Practice Import Service
 * Handles importing practice data from JSON with validation, deduplication, and transactional safety
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { validatePractice, type Practice } from '../schemas/practice.schema';
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

// Practice type to category mapping
// Map practice types to one of the 5 APR categories
const PRACTICE_TYPE_TO_CATEGORY: Record<string, string> = {
  // Planning & Organization
  'Planning Practice': 'ORGANISATION_AUTONOMIE',
  'Process Practice': 'ORGANISATION_AUTONOMIE',
  'Estimation Practice': 'ORGANISATION_AUTONOMIE',
  'Governance Practice': 'ORGANISATION_AUTONOMIE',
  
  // Communication & Values
  'Communication Practice': 'VALEURS_HUMAINES',
  'Team Practice': 'VALEURS_HUMAINES',
  'Teamwork Practice': 'VALEURS_HUMAINES',
  'Team Building Practice': 'VALEURS_HUMAINES',
  'Requirements Practice': 'VALEURS_HUMAINES',
  'Meeting Facilitation': 'VALEURS_HUMAINES',
  
  // Feedback & Learning
  'Feedback Practice': 'FEEDBACK_APPRENTISSAGE',
  'Review Practice': 'FEEDBACK_APPRENTISSAGE',
  'Inspection Practice': 'FEEDBACK_APPRENTISSAGE',
  'Validation Practice': 'FEEDBACK_APPRENTISSAGE',
  
  // Technical Excellence
  'Technical Practice': 'EXCELLENCE_TECHNIQUE',
  'Quality Practice': 'EXCELLENCE_TECHNIQUE',
  'Testing Practice': 'EXCELLENCE_TECHNIQUE',
  'Design Practice': 'EXCELLENCE_TECHNIQUE',
  
  // Delivery & Flow
  'Delivery Practice': 'FLUX_RAPIDITE',
  'Discovery Practice': 'FLUX_RAPIDITE',
  'Product Discovery Practice': 'FLUX_RAPIDITE',
  'Product Management Practice': 'FLUX_RAPIDITE',
  'Strategy Practice': 'FLUX_RAPIDITE',
  'Prioritization Practice': 'FLUX_RAPIDITE',
  'Risk Management Practice': 'FLUX_RAPIDITE',
  'Problem Solving': 'FLUX_RAPIDITE',
  'Management Practice': 'FLUX_RAPIDITE',
};

/**
 * Map practice type to category
 * If no exact match found, use a default heuristic
 */
function mapTypeToCategory(practiceType: string): string {
  // Try exact match first
  if (PRACTICE_TYPE_TO_CATEGORY[practiceType]) {
    return PRACTICE_TYPE_TO_CATEGORY[practiceType];
  }
  
  // Heuristic fallbacks based on keywords
  const lowerType = practiceType.toLowerCase();
  if (lowerType.includes('technical') || lowerType.includes('quality') || lowerType.includes('test')) {
    return 'EXCELLENCE_TECHNIQUE';
  }
  if (lowerType.includes('feedback') || lowerType.includes('review') || lowerType.includes('retrospective')) {
    return 'FEEDBACK_APPRENTISSAGE';
  }
  if (lowerType.includes('team') || lowerType.includes('communication')) {
    return 'VALEURS_HUMAINES';
  }
  if (lowerType.includes('delivery') || lowerType.includes('product') || lowerType.includes('discovery')) {
    return 'FLUX_RAPIDITE';
  }
  if (lowerType.includes('planning') || lowerType.includes('process') || lowerType.includes('governance')) {
    return 'ORGANISATION_AUTONOMIE';
  }
  
  // Default fallback
  console.warn(`[WARN] No category mapping for practice type: ${practiceType}, using default: ORGANISATION_AUTONOMIE`);
  return 'ORGANISATION_AUTONOMIE';
}

/**
 * Calculate SHA256 checksum for a practice JSON object
 * Used for idempotency - detect if practice content has changed
 */
function calculateChecksum(practice: Practice): string {
  const content = JSON.stringify({
    name: practice.name,
    type: practice.type,
    objective: practice.objective,
    description: practice.description,
    practice_goal: practice.practice_goal,
  });
  
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
      
      // Calculate checksum
      const checksum = calculateChecksum(practice);
      
      // Map practice type to category
      const categoryId = mapTypeToCategory(practice.type);
      
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
            tags: practice.tags || null,
            activities: practice.activities || null,
            roles: practice.roles || null,
            workProducts: practice.work_products || null,
            completionCriteria: practice.completion_criteria || null,
            metrics: practice.metrics || null,
            guidelines: practice.resources?.guidelines || null,
            pitfalls: practice.resources?.pitfalls || null,
            benefits: practice.resources?.benefits || null,
            associatedPractices: practice.associated_practices || null,
            isGlobal: true,
            importedAt: new Date(),
            sourceFile,
            jsonChecksum: checksum,
            practiceVersion: 1,
            importedBy,
            sourceGitSha: process.env.GIT_SHA || null,
            rawJson: practiceData as Prisma.JsonValue,
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
            action: 'imported',
            payload: {
              practiceId: createdPractice.id,
              title: practice.name,
              category: categoryId,
              pillarCount: pillarIds.length,
            } as Prisma.JsonValue,
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
        action: 'imported',
        payload: {
          count: importedCount,
          skipped: skippedCount,
          errors: errors.length,
          duration_ms: duration,
          source_file: sourceFile,
          imported_by: importedBy,
          git_sha: process.env.GIT_SHA || 'unknown',
        } as Prisma.JsonValue,
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
