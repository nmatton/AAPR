import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PracticeEditForm } from './PracticeEditForm'
import * as coverageApi from '../api/coverageApi'
import { useManagePracticesStore } from '../state/managePracticesSlice'

vi.mock('../api/coverageApi')
vi.mock('../state/managePracticesSlice')

const basePractice = {
  id: 1,
  title: 'Sprint Planning',
  goal: 'Plan the sprint goals',
  categoryId: 'feedback',
  categoryName: 'FEEDBACK & APPRENTISSAGE',
  pillars: [
    { id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' },
    { id: 2, name: 'Alignment', category: 'VALEURS HUMAINES' }
  ],
  isGlobal: true,
  practiceVersion: 2,
  usedByTeamsCount: 3
}

const mockCoverage = {
  overallCoveragePct: 55,
  coveredCount: 10,
  totalCount: 19,
  coveredPillars: [
    { id: 1, name: 'Communication', category: 'FEEDBACK & APPRENTISSAGE' }
  ],
  gapPillars: [
    { id: 2, name: 'Alignment', category: 'VALEURS HUMAINES' }
  ],
  categoryBreakdown: [
    { categoryId: 'feedback', categoryName: 'FEEDBACK & APPRENTISSAGE', coveredCount: 1, totalCount: 4, coveragePct: 25, coveredPillars: [], gapPillars: [] },
    { categoryId: 'values', categoryName: 'VALEURS HUMAINES', coveredCount: 0, totalCount: 4, coveragePct: 0, coveredPillars: [], gapPillars: [] }
  ]
}

describe('PracticeEditForm', () => {
  const editPractice = vi.fn()
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const onRefreshRequested = vi.fn().mockResolvedValue(null)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(coverageApi.getTeamPillarCoverage).mockResolvedValue(mockCoverage as any)
    ;(useManagePracticesStore as any).mockReturnValue({
      editPractice,
      isUpdating: false
    })
  })

  it('renders pre-filled form fields', async () => {
    render(
      <PracticeEditForm
        teamId={1}
        practice={basePractice}
        onClose={onClose}
        onSaved={onSaved}
        onRefreshRequested={onRefreshRequested}
      />
    )

    expect(screen.getByDisplayValue('Sprint Planning')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Plan the sprint goals')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('2 pillars selected')).toBeInTheDocument()
    })
  })

  it('blocks save when validation fails', async () => {
    render(
      <PracticeEditForm
        teamId={1}
        practice={basePractice}
        onClose={onClose}
        onSaved={onSaved}
        onRefreshRequested={onRefreshRequested}
      />
    )

    fireEvent.change(screen.getByDisplayValue('Sprint Planning'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/title must be between 2 and 100 characters/i)).toBeInTheDocument()
    })
    expect(editPractice).not.toHaveBeenCalled()
  })

  it('shows global practice warning when multiple teams are affected', async () => {
    render(
      <PracticeEditForm
        teamId={1}
        practice={basePractice}
        onClose={onClose}
        onSaved={onSaved}
        onRefreshRequested={onRefreshRequested}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/This will affect 3 teams using this practice/i)).toBeInTheDocument()
    })
  })

  it('supports save-as-copy flow', async () => {
    editPractice.mockResolvedValue({ coverageByTeam: [], practiceId: 99 })

    render(
      <PracticeEditForm
        teamId={1}
        practice={basePractice}
        onClose={onClose}
        onSaved={onSaved}
        onRefreshRequested={onRefreshRequested}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /save as team-specific copy/i }))

    await waitFor(() => {
      expect(editPractice).toHaveBeenCalledWith(1, 1, expect.objectContaining({ saveAsCopy: true }))
      expect(onSaved).toHaveBeenCalledWith({ practiceId: 99, practice: undefined })
    })
  })

  it('prompts on close when there are unsaved changes', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <PracticeEditForm
        teamId={1}
        practice={basePractice}
        onClose={onClose}
        onSaved={onSaved}
        onRefreshRequested={onRefreshRequested}
      />
    )

    fireEvent.change(screen.getByDisplayValue('Sprint Planning'), { target: { value: 'New Title' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('prompts on refresh when there are unsaved changes', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    
    // Mock edit to trigger version conflict error
    editPractice.mockRejectedValueOnce({ code: 'practice_version_conflict' })

    render(
      <PracticeEditForm
        teamId={1}
        practice={{ ...basePractice, isGlobal: false, usedByTeamsCount: 1 }}
        onClose={onClose}
        onSaved={onSaved}
        onRefreshRequested={onRefreshRequested}
      />
    )

    // Make changes to trigger isDirty
    const titleInput = screen.getByDisplayValue('Sprint Planning')
    fireEvent.change(titleInput, { target: { value: 'New Title' } })

    // Save to trigger conflict
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    // Wait for conflict message to appear
    await waitFor(() => {
      expect(screen.getByText(/This practice was updated by another team member/i)).toBeInTheDocument()
    })

    // Try to refresh - should prompt about unsaved changes
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    // Should prompt about unsaved changes
    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Leave anyway?')
    expect(onRefreshRequested).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })
})
