/**
 * Practices Service Tests
 * Tests for search and filter functionality
 */

import * as practicesService from '../practices.service';
import * as practiceRepository from '../../repositories/practice.repository';
import type { PracticeWithRelations } from '../../repositories/practice.repository';

// Mock the repository
jest.mock('../../repositories/practice.repository');

const mockPracticeRepository = practiceRepository as jest.Mocked<typeof practiceRepository>;

describe('PracticesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchPractices', () => {
    it('searches practices by title (case-insensitive)', async () => {
      const mockPractices: PracticeWithRelations[] = [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team progress',
          description: null,
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          method: 'Scrum',
          isGlobal: true,
          createdAt: new Date(),
          category: {
            id: 'FEEDBACK_APPRENTISSAGE',
            name: 'FEEDBACK & APPRENTISSAGE',
            createdAt: new Date()
          },
          practicePillars: [
            {
              pillar: {
                id: 5,
                name: 'Communication',
                categoryId: 'VALEURS_HUMAINES',
                description: null,
                createdAt: new Date(),
                category: {
                  id: 'VALEURS_HUMAINES',
                  name: 'VALEURS HUMAINES',
                  createdAt: new Date()
                }
              }
            }
          ]
        } as any
      ];

      mockPracticeRepository.searchAndFilter.mockResolvedValue(mockPractices);
      mockPracticeRepository.countFiltered.mockResolvedValue(1);

      const result = await practicesService.searchPractices({
        search: 'standup',
        page: 1,
        pageSize: 20
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Daily Standup');
      expect(result.total).toBe(1);
    });

    it('filters by single pillar', async () => {
      const mockPractices: PracticeWithRelations[] = [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team progress',
          description: null,
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          method: 'Scrum',
          isGlobal: true,
          createdAt: new Date(),
          category: {
            id: 'FEEDBACK_APPRENTISSAGE',
            name: 'FEEDBACK & APPRENTISSAGE',
            createdAt: new Date()
          },
          practicePillars: [
            {
              pillar: {
                id: 5,
                name: 'Communication',
                categoryId: 'VALEURS_HUMAINES',
                description: null,
                createdAt: new Date(),
                category: {
                  id: 'VALEURS_HUMAINES',
                  name: 'VALEURS HUMAINES',
                  createdAt: new Date()
                }
              }
            }
          ]
        } as any
      ];

      mockPracticeRepository.validatePillarIds.mockResolvedValue([]);
      mockPracticeRepository.searchAndFilter.mockResolvedValue(mockPractices);
      mockPracticeRepository.countFiltered.mockResolvedValue(1);

      const result = await practicesService.searchPractices({
        pillars: [5],
        page: 1,
        pageSize: 20
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].pillars.some((p: any) => p.id === 5)).toBe(true);
    });

    it('filters by multiple pillars with OR logic', async () => {
      const mockPractices: PracticeWithRelations[] = [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team progress',
          description: null,
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          method: 'Scrum',
          isGlobal: true,
          createdAt: new Date(),
          category: {
            id: 'FEEDBACK_APPRENTISSAGE',
            name: 'FEEDBACK & APPRENTISSAGE',
            createdAt: new Date()
          },
          practicePillars: [
            {
              pillar: {
                id: 5,
                name: 'Communication',
                categoryId: 'VALEURS_HUMAINES',
                description: null,
                createdAt: new Date(),
                category: {
                  id: 'VALEURS_HUMAINES',
                  name: 'VALEURS HUMAINES',
                  createdAt: new Date()
                }
              }
            }
          ]
        } as any,
        {
          id: 2,
          title: 'Retrospective',
          goal: 'Reflect and improve',
          description: null,
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          method: 'Scrum',
          isGlobal: true,
          createdAt: new Date(),
          category: {
            id: 'FEEDBACK_APPRENTISSAGE',
            name: 'FEEDBACK & APPRENTISSAGE',
            createdAt: new Date()
          },
          practicePillars: [
            {
              pillar: {
                id: 8,
                name: 'Feedback',
                categoryId: 'FEEDBACK_APPRENTISSAGE',
                description: null,
                createdAt: new Date(),
                category: {
                  id: 'FEEDBACK_APPRENTISSAGE',
                  name: 'FEEDBACK & APPRENTISSAGE',
                  createdAt: new Date()
                }
              }
            }
          ]
        } as any
      ];

      mockPracticeRepository.validatePillarIds.mockResolvedValue([]);
      mockPracticeRepository.searchAndFilter.mockResolvedValue(mockPractices);
      mockPracticeRepository.countFiltered.mockResolvedValue(2);

      const result = await practicesService.searchPractices({
        pillars: [5, 8],
        page: 1,
        pageSize: 20
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('combines search and filter with AND logic', async () => {
      const mockPractices: PracticeWithRelations[] = [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Synchronize team progress',
          description: null,
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          method: 'Scrum',
          isGlobal: true,
          createdAt: new Date(),
          category: {
            id: 'FEEDBACK_APPRENTISSAGE',
            name: 'FEEDBACK & APPRENTISSAGE',
            createdAt: new Date()
          },
          practicePillars: [
            {
              pillar: {
                id: 5,
                name: 'Communication',
                categoryId: 'VALEURS_HUMAINES',
                description: null,
                createdAt: new Date(),
                category: {
                  id: 'VALEURS_HUMAINES',
                  name: 'VALEURS HUMAINES',
                  createdAt: new Date()
                }
              }
            }
          ]
        } as any
      ];

      mockPracticeRepository.validatePillarIds.mockResolvedValue([]);
      mockPracticeRepository.searchAndFilter.mockResolvedValue(mockPractices);
      mockPracticeRepository.countFiltered.mockResolvedValue(1);

      const result = await practicesService.searchPractices({
        search: 'standup',
        pillars: [5],
        page: 1,
        pageSize: 20
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Daily Standup');
      expect(result.items[0].pillars.some((p: any) => p.id === 5)).toBe(true);
    });

    it('returns empty array when no results match', async () => {
      mockPracticeRepository.searchAndFilter.mockResolvedValue([]);
      mockPracticeRepository.countFiltered.mockResolvedValue(0);

      const result = await practicesService.searchPractices({
        search: 'nonexistent',
        page: 1,
        pageSize: 20
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('validates invalid pillar IDs', async () => {
      mockPracticeRepository.validatePillarIds.mockResolvedValue([999]);

      await expect(
        practicesService.searchPractices({
          pillars: [5, 999],
          page: 1,
          pageSize: 20
        })
      ).rejects.toThrow('Invalid pillar IDs provided');
    });

    it('handles pagination correctly', async () => {
      const mockPractices = Array(5).fill(null).map((_, i) => ({
        id: i + 1,
        title: `Practice ${i + 1}`,
        goal: 'Test goal',
        description: null,
        categoryId: 'TEST',
        method: 'Scrum',
        isGlobal: true,
        createdAt: new Date(),
        category: {
          id: 'TEST',
          name: 'Test Category',
          createdAt: new Date()
        },
        practicePillars: []
      })) as any;

      mockPracticeRepository.searchAndFilter.mockResolvedValue(mockPractices);
      mockPracticeRepository.countFiltered.mockResolvedValue(25);

      const result = await practicesService.searchPractices({
        page: 2,
        pageSize: 10
      });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(25);
    });
  });
});
