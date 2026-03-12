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

const normalizeDistinctMethods = (values: Array<{ method: string | null }>): string[] => {
  return Array.from(
    new Set(
      values
        .map((value) => value.method?.trim())
        .filter((method): method is string => Boolean(method))
    )
  ).sort((a, b) => a.localeCompare(b))
}

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
 * Generate a unique title for a practice by appending a suffix if needed
 * @param baseTitle - Base title to start from
 * @param categoryId - Category ID
 * @param tx - Optional Prisma transaction client
 * @returns A unique title that doesn't conflict with existing practices
 */
export async function generateUniquePracticeTitle(
  baseTitle: string,
  categoryId: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx ?? prisma;
  
  // Check if base title is already unique
  const existingPractice = await client.practice.findUnique({
    where: {
      title_categoryId: {
        title: baseTitle,
        categoryId
      }
    },
    select: { id: true }
  });

  if (!existingPractice) {
    return baseTitle;
  }

  // Try appending " (Team)" first
  let candidateTitle = `${baseTitle} (Team)`;
  let counter = 2;
  
  while (true) {
    const exists = await client.practice.findUnique({
      where: {
        title_categoryId: {
          title: candidateTitle,
          categoryId
        }
      },
      select: { id: true }
    });

    if (!exists) {
      return candidateTitle;
    }

    // Try with a counter
    candidateTitle = `${baseTitle} (Team ${counter})`;
    counter++;
    
    // Safety limit to prevent infinite loop
    if (counter > 100) {
      throw new Error('Unable to generate unique practice title');
    }
  }
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

  // Add search condition (OR logic for title/goal/description/method/tags)
  if (search && search.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { goal: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { method: { contains: search.trim(), mode: 'insensitive' } },
        {
          tags: {
            array_contains: search.trim(),
          },
        },
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

  // Add search condition (title/goal/description/method/tags)
  if (search && search.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { goal: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { method: { contains: search.trim(), mode: 'insensitive' } },
        {
          tags: {
            array_contains: search.trim(),
          },
        },
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

  // Add search condition (title/goal/description/method/tags)
  if (search && search.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { goal: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { method: { contains: search.trim(), mode: 'insensitive' } },
        {
          tags: {
            array_contains: search.trim(),
          },
        },
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

  // Add search condition (title/goal/description/method/tags)
  if (search && search.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { goal: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { method: { contains: search.trim(), mode: 'insensitive' } },
        {
          tags: {
            array_contains: search.trim(),
          },
        },
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
    method?: string | null
    tags?: string[]
    benefits?: string[]
    pitfalls?: string[]
    workProducts?: string[]
    activities?: unknown
    roles?: unknown
    completionCriteria?: string | null
    metrics?: unknown
    guidelines?: unknown
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
      method: data.method,
      tags: data.tags,
      ...(data.benefits !== undefined ? { benefits: data.benefits } : {}),
      ...(data.pitfalls !== undefined ? { pitfalls: data.pitfalls } : {}),
      ...(data.workProducts !== undefined ? { workProducts: data.workProducts } : {}),
      ...(data.activities !== undefined ? { activities: data.activities as Prisma.InputJsonValue } : {}),
      ...(data.roles !== undefined ? { roles: data.roles as Prisma.InputJsonValue } : {}),
      ...(data.completionCriteria !== undefined ? { completionCriteria: data.completionCriteria } : {}),
      ...(data.metrics !== undefined ? { metrics: data.metrics as Prisma.InputJsonValue } : {}),
      ...(data.guidelines !== undefined ? { guidelines: data.guidelines as Prisma.InputJsonValue } : {}),
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

/**
 * Find all distinct method values across global practices
 * Used to populate Method filter options for the full practice catalog
 * @returns Sorted array of all unique method strings
 */
export async function findAllDistinctMethods(): Promise<string[]> {
  const practices = await prisma.practice.findMany({
    where: { isGlobal: true, method: { not: null } },
    select: { method: true },
    distinct: ['method'],
    orderBy: { method: 'asc' }
  })
  return normalizeDistinctMethods(practices)
}

/**
 * Find all distinct method values across practices available for a team
 * (global practices not yet selected by the team)
 * Used to populate Method filter options in ManagePracticesView
 * @param teamId - Team identifier
 * @returns Sorted array of unique method strings available for the team
 */
export async function findDistinctMethodsAvailableForTeam(teamId: number): Promise<string[]> {
  const practices = await prisma.practice.findMany({
    where: {
      isGlobal: true,
      method: { not: null },
      NOT: {
        teamPractices: {
          some: { teamId }
        }
      }
    },
    select: { method: true },
    distinct: ['method'],
    orderBy: { method: 'asc' }
  })
  return normalizeDistinctMethods(practices)
}

/**
 * Sync practice associations (source → target) by replacing all existing source associations
 * Prevents self-links and duplicate (source, target, type) combinations
 * @param sourcePracticeId - Source practice identifier
 * @param associations - Desired associations after sync
 * @param tx - Optional Prisma transaction client
 */
export async function syncAssociations(
  sourcePracticeId: number,
  associations: Array<{ targetPracticeId: number; associationType: string }>,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma

  // Delete all existing source associations
  await client.practiceAssociation.deleteMany({
    where: { sourcePracticeId }
  })

  // Filter out self-links and deduplicate
  const seen = new Set<string>()
  const validAssociations = associations.filter((association) => {
    if (association.targetPracticeId === sourcePracticeId) return false
    const key = `${association.targetPracticeId}:${association.associationType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (validAssociations.length > 0) {
    await client.practiceAssociation.createMany({
      data: validAssociations.map((association) => ({
        sourcePracticeId,
        targetPracticeId: association.targetPracticeId,
        associationType: association.associationType
      }))
    })
  }
}

/**
 * Find all associations for a practice (as source)
 * @param sourcePracticeId - Source practice identifier
 * @returns Associations with target practice info
 */
export async function findAssociationsForPractice(
  sourcePracticeId: number
): Promise<Array<{ targetPracticeId: number; associationType: string; targetPracticeTitle: string }>> {
  const associations = await prisma.practiceAssociation.findMany({
    where: { sourcePracticeId },
    include: {
      targetPractice: {
        select: { id: true, title: true }
      }
    }
  })
  return associations.map((association) => ({
    targetPracticeId: association.targetPracticeId,
    associationType: association.associationType,
    targetPracticeTitle: association.targetPractice.title
  }))
}
