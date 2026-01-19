import * as practicesRepository from '../repositories/practices.repository';

export interface PracticePillarDto {
  id: number;
  name: string;
}

export interface PracticeDto {
  id: number;
  title: string;
  goal: string;
  category: string;
  pillars: PracticePillarDto[];
}

export const getPractices = async (): Promise<PracticeDto[]> => {
  const practices = await practicesRepository.findAllWithPillars();

  return practices.map((practice) => ({
    id: practice.id,
    title: practice.title,
    goal: practice.goal,
    category: practice.category,
    pillars: practice.practicePillars.map((pp) => ({
      id: pp.pillar.id,
      name: pp.pillar.name
    }))
  }));
};