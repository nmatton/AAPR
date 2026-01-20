/**
 * Practice Repository
 * Database access layer for practices - no business logic, just queries
 */

import { prisma } from '../lib/prisma';
import type { Practice, Pillar, Category } from '@prisma/client';

// Types for practice with relationships
export type PracticeWithRelations = Practice & {
  category: Category;
  practicePillars: Array<{
    pillar: Pillar & { category: Category };
  }>;
};

/**
 * Find all global practices with related pillars and category
 * @returns Array of practices with full relationships
 */
export async function findAll(): Promise<PracticeWithRelations[]> {
  return prisma.practice.findMany({
    where: {
      isGlobal: true,
    },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  });
}

/**
 * Find practices with pagination
 * @param skip - Records to skip (calculated from page/pageSize)
 * @param take - Number of records to take
 */
export async function findPaginated(skip: number, take: number): Promise<PracticeWithRelations[]> {
  return prisma.practice.findMany({
    where: {
      isGlobal: true,
    },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
    skip,
    take,
  });
}

/**
 * Find practice by ID with related data
 * @param id - Practice ID
 * @returns Practice with relationships or null if not found
 */
export async function findById(id: number): Promise<PracticeWithRelations | null> {
  return prisma.practice.findUnique({
    where: { id },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Find practices by category
 * @param categoryId - Category ID
 * @returns Array of practices in the specified category
 */
export async function findByCategory(categoryId: string): Promise<PracticeWithRelations[]> {
  return prisma.practice.findMany({
    where: {
      categoryId,
      isGlobal: true,
    },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  });
}

/**
 * Find practices that cover a specific pillar
 * @param pillarId - Pillar ID
 * @returns Array of practices that cover the specified pillar
 */
export async function findByPillar(pillarId: number): Promise<PracticeWithRelations[]> {
  return prisma.practice.findMany({
    where: {
      practicePillars: {
        some: {
          pillarId,
        },
      },
      isGlobal: true,
    },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  });
}

/**
 * Search practices by title or description
 * @param searchTerm - Search term (case-insensitive)
 * @returns Array of matching practices
 */
export async function search(searchTerm: string): Promise<PracticeWithRelations[]> {
  return prisma.practice.findMany({
    where: {
      AND: [
        { isGlobal: true },
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { goal: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ],
    },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  });
}

/**
 * Count total practices
 * @returns Total count of global practices
 */
export async function count(): Promise<number> {
  return prisma.practice.count({
    where: {
      isGlobal: true,
    },
  });
}

/**
 * Find practices by method/framework
 * @param method - Framework name (Scrum, XP, Kanban, etc.)
 * @returns Array of practices from the specified framework
 */
export async function findByMethod(method: string): Promise<PracticeWithRelations[]> {
  return prisma.practice.findMany({
    where: {
      method,
      isGlobal: true,
    },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  });
}

/**
 * Validate that all provided pillar IDs exist in the database
 * @param pillarIds - Array of pillar IDs to validate
 * @returns Array of invalid pillar IDs (empty if all valid)
 */
export async function validatePillarIds(pillarIds: number[]): Promise<number[]> {
  const existingPillars = await prisma.pillar.findMany({
    where: {
      id: {
        in: pillarIds,
      },
    },
    select: {
      id: true,
    },
  });

  const existingIds = new Set(existingPillars.map((p) => p.id));
  return pillarIds.filter((id) => !existingIds.has(id));
}

/**
 * Search and filter practices with combined conditions
 * @param options - Search and filter options
 * @returns Array of matching practices
 */
export async function searchAndFilter(options: {
  search?: string;
  pillars?: number[];
  skip: number;
  take: number;
}): Promise<PracticeWithRelations[]> {
  const { search, pillars, skip, take } = options;

  const whereConditions: any[] = [{ isGlobal: true }];

  // Add search condition (OR logic for title/goal/description)
  if (search && search.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { goal: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ],
    });
  }

  // Add pillar filter (OR logic for multiple pillars)
  if (pillars && pillars.length > 0) {
    whereConditions.push({
      practicePillars: {
        some: {
          pillarId: {
            in: pillars,
          },
        },
      },
    });
  }

  return prisma.practice.findMany({
    where: {
      AND: whereConditions,
    },
    include: {
      category: true,
      practicePillars: {
        include: {
          pillar: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
    skip,
    take,
  });
}

/**
 * Count practices matching search/filter criteria
 * @param options - Search and filter options
 * @returns Total count of matching practices
 */
export async function countFiltered(options: {
  search?: string;
  pillars?: number[];
}): Promise<number> {
  const { search, pillars } = options;

  const whereConditions: any[] = [{ isGlobal: true }];

  // Add search condition
  if (search && search.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { goal: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ],
    });
  }

  // Add pillar filter
  if (pillars && pillars.length > 0) {
    whereConditions.push({
      practicePillars: {
        some: {
          pillarId: {
            in: pillars,
          },
        },
      },
    });
  }

  return prisma.practice.count({
    where: {
      AND: whereConditions,
    },
  });
}
