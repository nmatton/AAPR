import * as practiceRepository from '../repositories/practice.repository';

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