import { getPractices } from './practices.service'
import * as practiceRepository from '../repositories/practice.repository'

jest.mock('../repositories/practice.repository')

describe('practices.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('maps practices with category and pillars', async () => {
    const mockPractice = {
      id: 1,
      title: 'Daily Standup',
      goal: 'Sync',
      categoryId: 'FEEDBACK_APPRENTISSAGE',
      category: { id: 'FEEDBACK_APPRENTISSAGE', name: 'FEEDBACK & APPRENTISSAGE' },
      isGlobal: true,
      practiceVersion: 2,
      _count: { teamPractices: 3 },
      practicePillars: [
        {
          pillar: {
            id: 5,
            name: 'Communication',
            categoryId: 'FEEDBACK_APPRENTISSAGE',
            description: 'desc',
            category: { id: 'FEEDBACK_APPRENTISSAGE', name: 'FEEDBACK & APPRENTISSAGE' }
          }
        }
      ]
    } as any

    ;(practiceRepository.findPaginated as jest.Mock).mockResolvedValue([mockPractice])
    ;(practiceRepository.count as jest.Mock).mockResolvedValue(42)

    const result = await getPractices(1, 20)

    expect(result).toEqual({
      items: [
        {
          id: 1,
          title: 'Daily Standup',
          goal: 'Sync',
          categoryId: 'FEEDBACK_APPRENTISSAGE',
          categoryName: 'FEEDBACK & APPRENTISSAGE',
          isGlobal: true,
          practiceVersion: 2,
          usedByTeamsCount: 3,
          pillars: [
            {
              id: 5,
              name: 'Communication',
              category: 'FEEDBACK & APPRENTISSAGE',
              description: 'desc'
            }
          ]
        }
      ],
      page: 1,
      pageSize: 20,
      total: 42
    })
  })

  it('calculates skip based on page and pageSize', async () => {
    ;(practiceRepository.findPaginated as jest.Mock).mockResolvedValue([])
    ;(practiceRepository.count as jest.Mock).mockResolvedValue(0)

    await getPractices(3, 10)

    expect(practiceRepository.findPaginated).toHaveBeenCalledWith(20, 10)
  })
})
