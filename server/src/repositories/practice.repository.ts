/**
 * Practice Repository
 * Database access layer for practices - no business logic, just queries
 */

import { prisma } from '../lib/prisma';
import type { Practice, Pillar, Category, Prisma } from '@prisma/client';

// Types for practice with relationships
export type PracticeWithRelations = Practice & {
  category: Category;
  practicePillars: Array<{
    pillar: Pillar & { category: Category };
  }>;
  _count?: { teamPractices: number };
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
      _count: { select: { teamPractices: true } },
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
      _count: { select: { teamPractices: true } },
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
      _count: { select: { teamPractices: true } },
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
 * Find practice by ID (for template validation)
 * @param id - Practice ID
 * @returns Practice or null if not found
 */
export async function findPracticeById(id: number): Promise<Practice | null> {
  return prisma.practice.findUnique({
    where: { id }
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
      _count: { select: { teamPractices: true } },
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
      _count: { select: { teamPractices: true } },
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
      _count: { select: { teamPractices: true } },
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
      _count: { select: { teamPractices: true } },
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
 * Validate that a category ID exists
 * @param categoryId - Category ID to validate
 * @returns True if category exists
 */
export async function validateCategoryId(categoryId: string): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });
  return Boolean(category);
}

/**
 * Create a new practice (team-specific or global)
 * @param data - Practice data
 * @param tx - Optional Prisma transaction client
 * @returns Created practice
 */
export async function createPractice(
  data: Prisma.PracticeCreateInput,
  tx?: Prisma.TransactionClient
): Promise<Practice> {
  const client = tx ?? prisma;
  return client.practice.create({ data });
}

/**
 * Create practice pillar links in bulk
 * @param practiceId - Practice identifier
 * @param pillarIds - Pillar IDs to link
 * @param tx - Optional Prisma transaction client
 */
export async function createPracticePillars(
  practiceId: number,
  pillarIds: number[],
  tx?: Prisma.TransactionClient
): Promise<Prisma.BatchPayload> {
  const client = tx ?? prisma;
  return client.practicePillar.createMany({
    data: pillarIds.map((pillarId) => ({
      practiceId,
      pillarId
    }))
  });
}

/**
 * Link a practice to a team
 * @param teamId - Team identifier
 * @param practiceId - Practice identifier
 * @param tx - Optional Prisma transaction client
 */
export async function linkPracticeToTeam(
  teamId: number,
  practiceId: number,
  tx?: Prisma.TransactionClient
): Promise<Prisma.TeamPracticeGetPayload<{}>> {
  const client = tx ?? prisma;
  return client.teamPractice.create({
    data: {
      teamId,
      practiceId
    }
  });
}

/**
 * Search and filter practices with combined conditions
 * @param options - Search and filter options
 * @returns Array of matching practices
 */
export async function searchAndFilter(options: {
  search?: string;
  pillars?: number[];
  categories?: string[];
  methods?: string[];
  tags?: string[];
  skip: number;
  take: number;
}): Promise<PracticeWithRelations[]> {
  const { search, pillars, categories, methods, tags, skip, take } = options;

  const whereConditions: Prisma.PracticeWhereInput[] = [{ isGlobal: true }];

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

  // Add category filter (IN logic)
  if (categories && categories.length > 0) {
    whereConditions.push({
      categoryId: {
        in: categories,
      },
    });
  }

  // Add method filter (IN logic)
  if (methods && methods.length > 0) {
    whereConditions.push({
      method: {
        in: methods,
      },
    });
  }

  // Add tags filter (OR logic: practice has ANY of the selected tags)
  if (tags && tags.length > 0) {
    whereConditions.push({
      OR: tags.map(tag => ({
        tags: {
          array_contains: tag,
        },
      })),
    });
  }

  return prisma.practice.findMany({
    where: {
      AND: whereConditions,
    },
    include: {
      _count: { select: { teamPractices: true } },
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
  categories?: string[];
  methods?: string[];
  tags?: string[];
}): Promise<number> {
  const { search, pillars, categories, methods, tags } = options;

  const whereConditions: Prisma.PracticeWhereInput[] = [{ isGlobal: true }];

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

  // Add category filter
  if (categories && categories.length > 0) {
    whereConditions.push({
      categoryId: {
        in: categories,
      },
    });
  }

  // Add method filter
  if (methods && methods.length > 0) {
    whereConditions.push({
      method: {
        in: methods,
      },
    });
  }

  // Add tags filter
  if (tags && tags.length > 0) {
    whereConditions.push({
      OR: tags.map(tag => ({
        tags: {
          array_contains: tag,
        },
      })),
    });
  }

  return prisma.practice.count({
    where: {
      AND: whereConditions,
    },
  });
}

/**
 * Find practices NOT yet selected by a team (for Add Practices view)
 * Supports search and pillar filtering
 * @param teamId - Team identifier
 * @param options - Search and filter options with pagination
 * @returns Array of available practices
 */
export async function findAvailableForTeam(
  teamId: number,
  options: {
    search?: string;
    pillars?: number[];
    categories?: string[];
    methods?: string[];
    tags?: string[];
    skip: number;
    take: number;
  }
): Promise<PracticeWithRelations[]> {
  const { search, pillars, categories, methods, tags, skip, take } = options;

  const whereConditions: Prisma.PracticeWhereInput[] = [
    { isGlobal: true },
    // Exclude practices already selected by team
    {
      NOT: {
        teamPractices: {
          some: {
            teamId,
          },
        },
      },
    },
  ];

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

  // Add category filter
  if (categories && categories.length > 0) {
    whereConditions.push({
      categoryId: {
        in: categories,
      },
    });
  }

  // Add method filter
  if (methods && methods.length > 0) {
    whereConditions.push({
      method: {
        in: methods,
      },
    });
  }

  // Add tags filter
  if (tags && tags.length > 0) {
    whereConditions.push({
      OR: tags.map(tag => ({
        tags: {
          array_contains: tag,
        },
      })),
    });
  }

  return prisma.practice.findMany({
    where: {
      AND: whereConditions,
    },
    include: {
      _count: { select: { teamPractices: true } },
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
 * Count practices NOT yet selected by a team
 * @param teamId - Team identifier
 * @param options - Search and filter options
 * @returns Count of available practices
 */
export async function countAvailableForTeam(
  teamId: number,
  options: {
    search?: string;
    pillars?: number[];
    categories?: string[];
    methods?: string[];
    tags?: string[];
  }
): Promise<number> {
  const { search, pillars, categories, methods, tags } = options;

  const whereConditions: Prisma.PracticeWhereInput[] = [
    { isGlobal: true },
    // Exclude practices already selected by team
    {
      NOT: {
        teamPractices: {
          some: {
            teamId,
          },
        },
      },
    },
  ];

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

  // Add category filter
  if (categories && categories.length > 0) {
    whereConditions.push({
      categoryId: {
        in: categories,
      },
    });
  }

  // Add method filter
  if (methods && methods.length > 0) {
    whereConditions.push({
      method: {
        in: methods,
      },
    });
  }

  // Add tags filter
  if (tags && tags.length > 0) {
    whereConditions.push({
      OR: tags.map(tag => ({
        tags: {
          array_contains: tag,
        },
      })),
    });
  }

  return prisma.practice.count({
    where: {
      AND: whereConditions,
    },
  });
}

/**
 * Replace all pillar links for a practice
 * @param practiceId - Practice identifier
 * @param pillarIds - Pillar IDs to set
 * @param tx - Optional Prisma transaction client
 */
export async function replacePracticePillars(
  practiceId: number,
  pillarIds: number[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma
  await client.practicePillar.deleteMany({
    where: { practiceId }
  })
  if (pillarIds.length > 0) {
    await client.practicePillar.createMany({
      data: pillarIds.map((pillarId) => ({
        practiceId,
        pillarId
      }))
    })
  }
}

/**
 * Update practice fields with optimistic concurrency control
 * @param practiceId - Practice identifier
 * @param version - Expected practiceVersion
 * @param data - Fields to update
 * @param tx - Optional Prisma transaction client
 */
export async function updatePracticeWithVersion(
  practiceId: number,
  version: number,
  data: {
    title: string
    goal: string
    categoryId: string
  },
  tx?: Prisma.TransactionClient
): Promise<number> {
  const client = tx ?? prisma
  const result = await client.practice.updateMany({
    where: {
      id: practiceId,
      practiceVersion: version
    },
    data: {
      title: data.title,
      goal: data.goal,
      categoryId: data.categoryId,
      practiceVersion: { increment: 1 }
    }
  })
  return result.count
}

/**
 * Find team IDs using a given practice
 * @param practiceId - Practice identifier
 */
export async function findTeamIdsUsingPractice(practiceId: number): Promise<number[]> {
  const teamPractices = await prisma.teamPractice.findMany({
    where: { practiceId },
    select: { teamId: true },
    distinct: ['teamId']
  })
  return teamPractices.map((tp) => tp.teamId)
}

/**
 * Count teams using a given practice
 * @param practiceId - Practice identifier
 */
export async function countTeamsUsingPractice(practiceId: number): Promise<number> {
  return prisma.teamPractice.count({
    where: { practiceId }
  })
}
