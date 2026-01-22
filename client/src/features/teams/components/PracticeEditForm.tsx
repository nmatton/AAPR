import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTeamPillarCoverage } from '../api/coverageApi'
import { useManagePracticesStore } from '../state/managePracticesSlice'

const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave anyway?'

interface PracticeEditFormProps {
  teamId: number
  practice: {
    id: number
    title: string
    goal: string
    categoryId: string
    categoryName: string
    pillars: Array<{ id: number; name: string; category: string; description?: string | null }>
    isGlobal?: boolean
    practiceVersion?: number
    usedByTeamsCount?: number
  }
  onClose: () => void
  onSaved: (result: { practiceId?: number; practice?: PracticeEditFormProps['practice'] }) => void
  onRefreshRequested: () => Promise<PracticeEditFormProps['practice'] | null>
}

interface CategoryOption {
  id: string
  name: string
}

export const PracticeEditForm = ({
  teamId,
  practice,
  onClose,
  onSaved,
  onRefreshRequested
}: PracticeEditFormProps) => {
  const { editPractice, isUpdating } = useManagePracticesStore()
  const [title, setTitle] = useState(practice.title)
  const [goal, setGoal] = useState(practice.goal)
  const [categoryId, setCategoryId] = useState(practice.categoryId)
  const [pillarIds, setPillarIds] = useState<number[]>(practice.pillars.map((pillar) => pillar.id))
  const [availablePillars, setAvailablePillars] = useState(practice.pillars)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const [showGlobalWarning, setShowGlobalWarning] = useState(false)

  const goalRef = useRef<HTMLTextAreaElement | null>(null)

  const initialState = useMemo(() => ({
    title: practice.title,
    goal: practice.goal,
    categoryId: practice.categoryId,
    pillarIds: practice.pillars.map((pillar) => pillar.id).sort((a, b) => a - b)
  }), [practice])

  const isDirty = useMemo(() => {
    const sortedCurrent = [...pillarIds].sort((a, b) => a - b)
    return (
      title !== initialState.title ||
      goal !== initialState.goal ||
      categoryId !== initialState.categoryId ||
      sortedCurrent.join(',') !== initialState.pillarIds.join(',')
    )
  }, [title, goal, categoryId, pillarIds, initialState])

  const isGlobal = Boolean(practice.isGlobal)
  const usedByTeamsCount = practice.usedByTeamsCount ?? 0
  const shouldWarnGlobalEdit = isGlobal && usedByTeamsCount > 1

  useEffect(() => {
    const loadCoverage = async () => {
      const coverage = await getTeamPillarCoverage(teamId)
      const allPillars = [...coverage.coveredPillars, ...coverage.gapPillars]
      const uniquePillars = new Map<number, typeof allPillars[number]>()
      allPillars.forEach((pillar) => uniquePillars.set(pillar.id, pillar))
      const pillarList = Array.from(uniquePillars.values())
        .sort((a, b) => a.name.localeCompare(b.name))
      setAvailablePillars(pillarList)

      const categoryOptions = coverage.categoryBreakdown
        .map((category) => ({
          id: category.categoryId,
          name: category.categoryName
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setCategories(categoryOptions)
    }

    loadCoverage()
  }, [teamId])

  useEffect(() => {
    setTitle(practice.title)
    setGoal(practice.goal)
    setCategoryId(practice.categoryId)
    setPillarIds(practice.pillars.map((pillar) => pillar.id))
    setErrors({})
  }, [practice])

  useEffect(() => {
    if (!goalRef.current) return
    goalRef.current.style.height = 'auto'
    goalRef.current.style.height = `${goalRef.current.scrollHeight}px`
  }, [goal])

  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const handlePopState = () => {
      const confirmLeave = window.confirm(UNSAVED_CHANGES_MESSAGE)
      if (!confirmLeave) {
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isDirty])

  const validate = useCallback(() => {
    const nextErrors: Record<string, string> = {}

    if (!title.trim() || title.trim().length < 2 || title.trim().length > 100) {
      nextErrors.title = 'Title must be between 2 and 100 characters.'
    }

    if (!goal.trim() || goal.trim().length < 1 || goal.trim().length > 500) {
      nextErrors.goal = 'Goal must be between 1 and 500 characters.'
    }

    if (!categoryId.trim()) {
      nextErrors.categoryId = 'Category is required.'
    }

    if (pillarIds.length === 0) {
      nextErrors.pillarIds = 'Select at least one pillar.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [title, goal, categoryId, pillarIds])

  const handleClose = () => {
    if (isDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      return
    }
    onClose()
  }

  const handleTogglePillar = (pillarId: number) => {
    setPillarIds((prev) =>
      prev.includes(pillarId) ? prev.filter((id) => id !== pillarId) : [...prev, pillarId]
    )
  }

  const handleSubmit = async (saveAsCopy: boolean) => {
    setConflictMessage(null)

    if (!validate()) {
      return
    }

    if (!saveAsCopy && shouldWarnGlobalEdit) {
      setShowGlobalWarning(true)
      return
    }

    try {
      const result = await editPractice(teamId, practice.id, {
        title: title.trim(),
        goal: goal.trim(),
        categoryId,
        pillarIds,
        saveAsCopy,
        version: practice.practiceVersion ?? 1
      })

      onSaved({ practice: result.practice, practiceId: result.practiceId })
      onClose()
    } catch (error: any) {
      if (error.code === 'practice_version_conflict') {
        setConflictMessage('This practice was updated by another team member. Refresh to see changes.')
      }
    }
  }

  const handleRefresh = async () => {
    if (isDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      return
    }
    const updatedPractice = await onRefreshRequested()
    if (updatedPractice) {
      setTitle(updatedPractice.title)
      setGoal(updatedPractice.goal)
      setCategoryId(updatedPractice.categoryId)
      setPillarIds(updatedPractice.pillars.map((pillar) => pillar.id))
    }
    setConflictMessage(null)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-start overflow-y-auto" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white mt-10 mb-10 rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Practice</h2>
            <p className="text-sm text-gray-500">Update practice details and pillar coverage.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {conflictMessage && (
          <div className="mx-6 mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <div className="flex items-center justify-between gap-4">
              <span>{conflictMessage}</span>
              <button
                type="button"
                onClick={handleRefresh}
                className="text-sm font-medium text-amber-800 hover:text-amber-900"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-5 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{errors.title ?? ''}</span>
              <span>{title.length}/100</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Goal / Objective</label>
            <textarea
              ref={goalRef}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
              rows={3}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{errors.goal ?? ''}</span>
              <span>{goal.length}/500</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="" disabled>Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-xs text-red-600 mt-1">{errors.categoryId}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Pillars Covered</label>
              <span className="text-xs text-gray-500">{pillarIds.length} pillars selected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availablePillars.map((pillar) => (
                <label key={pillar.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={pillarIds.includes(pillar.id)}
                    onChange={() => handleTogglePillar(pillar.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  {pillar.name}
                </label>
              ))}
            </div>
            {errors.pillarIds && (
              <p className="text-xs text-red-600 mt-1">{errors.pillarIds}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-6 py-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {isGlobal && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50"
                disabled={isUpdating}
              >
                Save as Team-Specific Copy
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
              disabled={isUpdating}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {showGlobalWarning && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Global practice update</h3>
            <p className="text-sm text-gray-600">
              This will affect {usedByTeamsCount} teams using this practice.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowGlobalWarning(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGlobalWarning(false)
                  handleSubmit(true)
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50"
              >
                Save as Team-Specific Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGlobalWarning(false)
                  handleSubmit(false)
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
