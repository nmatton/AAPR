import { render, screen, fireEvent } from '@testing-library/react'
import { TeamPracticesPanel } from './TeamPracticesPanel'
import * as api from '../api/teamPracticesApi'
import type { Practice } from '../../practices/types'

vi.mock('../api/teamPracticesApi')

const mockPractices: Practice[] = [
  {
    id: 1,
    title: 'Daily Standup',
    goal: 'Improve team communication',
    categoryId: 'feedback',
    categoryName: 'FEEDBACK & APPRENTISSAGE',
    isGlobal: true,
    practiceVersion: 1,
    usedByTeamsCount: 5,
    pillars: [
      { id: 10, name: 'Communication', category: 'VALEURS HUMAINES' }
    ]
  }
]

describe('TeamPracticesPanel interactions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(api.fetchTeamPractices).mockResolvedValue({ items: mockPractices, total: 1 }) as any
  })

  it('calls onPracticeClick when title is clicked', async () => {
    const onPracticeClick = vi.fn()
    render(<TeamPracticesPanel teamId={1} onPracticeClick={onPracticeClick} />)
    const titleButton = await screen.findByRole('button', { name: /open details for Daily Standup/i })
    fireEvent.click(titleButton)
    expect(onPracticeClick).toHaveBeenCalledWith(1)
  })

  it('shows Remove action', async () => {
    render(<TeamPracticesPanel teamId={1} />)
    expect(await screen.findByText(/Remove/i)).toBeInTheDocument()
  })
})
