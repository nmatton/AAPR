import { prisma } from '../lib/prisma';

export const findAllWithPillars = async () => {
  return prisma.practice.findMany({
    include: {
      practicePillars: {
        include: {
          pillar: true
        }
      }
    },
    orderBy: {
      title: 'asc'
    }
  });
};