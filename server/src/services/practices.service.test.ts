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
      categoryId: 'PROCESS_EXECUTION',
      category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' },
      isGlobal: true,
      practiceVersion: 2,
      _count: { teamPractices: 3 },
      practicePillars: [
        {
          pillar: {
            id: 5,
            name: 'Work Transparency & Synchronization',
            categoryId: 'PROCESS_EXECUTION',
            description: 'desc',
            category: { id: 'PROCESS_EXECUTION', name: 'Process & Execution' }
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
          description: null,
          categoryId: 'PROCESS_EXECUTION',
          categoryName: 'Process & Execution',
          method: null,
          tags: null,
          benefits: null,
          pitfalls: null,
          workProducts: null,
          isGlobal: true,
          practiceVersion: 2,
          usedByTeamsCount: 3,
          pillars: [
            {
              id: 5,
              name: 'Work Transparency & Synchronization',
              category: 'Process & Execution',
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
