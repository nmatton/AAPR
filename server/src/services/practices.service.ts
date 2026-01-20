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