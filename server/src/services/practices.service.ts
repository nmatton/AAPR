import * as practiceRepository from '../repositories/practice.repository';
import { AppError } from './auth.service';

export interface PracticePillarDto {
  id: number;
  name: string;
  category: string;
  description?: string | null;
}

export interface PracticeDto {
  id: number;
  title: string;
  goal: string;
  categoryId: string;
  categoryName: string;
  isGlobal: boolean;
  practiceVersion: number;
  usedByTeamsCount: number;
  pillars: PracticePillarDto[];
}

export interface PracticesResponse {
  items: PracticeDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SearchPracticesParams {
  search?: string;
  pillars?: number[];
  page?: number;
  pageSize?: number;
}

export interface PracticeDetailDto {
  id: number;
  title: string;
  goal: string;
  description?: string | null;
  categoryId: string;
  categoryName: string;
  method?: string | null;
  tags?: unknown | null;
  activities?: unknown | null;
  roles?: unknown | null;
  workProducts?: unknown | null;
  completionCriteria?: string | null;
  metrics?: unknown | null;
  guidelines?: unknown | null;
  pitfalls?: unknown | null;
  benefits?: unknown | null;
  associatedPractices?: unknown | null;
  isGlobal: boolean;
  practiceVersion: number;
  importedBy?: string | null;
  updatedAt: string;
  pillars: PracticePillarDto[];
}

export const getPractices = async (page = 1, pageSize = 20): Promise<PracticesResponse> => {
  const skip = (page - 1) * pageSize;

  const [practices, total] = await Promise.all([
    practiceRepository.findPaginated(skip, pageSize),
    practiceRepository.count()
  ]);

  return {
    items: practices.map((practice) => ({
      id: practice.id,
      title: practice.title,
      goal: practice.goal,
      categoryId: practice.categoryId,
      categoryName: practice.category.name,
      isGlobal: practice.isGlobal,
      practiceVersion: practice.practiceVersion,
      usedByTeamsCount: practice._count?.teamPractices ?? 0,
      pillars: practice.practicePillars.map((pp) => ({
        id: pp.pillar.id,
        name: pp.pillar.name,
        category: pp.pillar.category?.name ?? pp.pillar.categoryId,
        description: pp.pillar.description ?? undefined
      }))
    })),
    page,
    pageSize,
    total
  };
};

/**
 * Search and filter practices by keyword and/or pillars
 * @param params - Search parameters (search text, pillar IDs, pagination)
 * @returns Paginated practices matching criteria
 */
export const searchPractices = async (params: SearchPracticesParams): Promise<PracticesResponse> => {
  const { search, pillars, page = 1, pageSize = 20 } = params;

  // Validate pillar IDs if provided
  if (pillars && pillars.length > 0) {
    const invalidIds = await practiceRepository.validatePillarIds(pillars);
    if (invalidIds.length > 0) {
      throw new AppError(
        'invalid_filter',
        'Invalid pillar IDs provided',
        { invalidIds },
        400
      );
    }
  }

  const skip = (page - 1) * pageSize;

  const [practices, total] = await Promise.all([
    practiceRepository.searchAndFilter({ search, pillars, skip, take: pageSize }),
    practiceRepository.countFiltered({ search, pillars })
  ]);

  return {
    items: practices.map((practice) => ({
      id: practice.id,
      title: practice.title,
      goal: practice.goal,
      categoryId: practice.categoryId,
      categoryName: practice.category.name,
      isGlobal: practice.isGlobal,
      practiceVersion: practice.practiceVersion,
      usedByTeamsCount: practice._count?.teamPractices ?? 0,
      pillars: practice.practicePillars.map((pp) => ({
        id: pp.pillar.id,
        name: pp.pillar.name,
        category: pp.pillar.category?.name ?? pp.pillar.categoryId,
        description: pp.pillar.description ?? undefined
      }))
    })),
    page,
    pageSize,
    total
  };
};

/**
 * Fetch full practice detail by ID
 */
export const getPracticeDetail = async (id: number): Promise<PracticeDetailDto> => {
  const practice = await practiceRepository.findById(id);
  if (!practice) {
    throw new AppError('not_found', 'Practice not found', { id }, 404);
  }
  return {
    id: practice.id,
    title: practice.title,
    goal: practice.goal,
    description: practice.description ?? null,
    categoryId: practice.categoryId,
    categoryName: practice.category.name,
    method: practice.method ?? null,
    tags: practice.tags ?? null,
    activities: practice.activities ?? null,
    roles: practice.roles ?? null,
    workProducts: practice.workProducts ?? null,
    completionCriteria: practice.completionCriteria ?? null,
    metrics: practice.metrics ?? null,
    guidelines: practice.guidelines ?? null,
    pitfalls: practice.pitfalls ?? null,
    benefits: practice.benefits ?? null,
    associatedPractices: practice.associatedPractices ?? null,
    isGlobal: practice.isGlobal,
    practiceVersion: practice.practiceVersion,
    importedBy: practice.importedBy ?? null,
    updatedAt: practice.updatedAt.toISOString(),
    pillars: practice.practicePillars.map((pp) => ({
      id: pp.pillar.id,
      name: pp.pillar.name,
      category: pp.pillar.category?.name ?? pp.pillar.categoryId,
      description: pp.pillar.description ?? undefined
    }))
  };
};