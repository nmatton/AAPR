import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CategorizedTagSelector } from '../../../shared/components/CategorizedTagSelector'
import { normalizeValidTags } from '../../../shared/constants/tags.constants'
import { getTeamPillarCoverage } from '../api/coverageApi'
import { fetchPracticeDetail } from '../../practices/api/practices.api'
import { useManagePracticesStore } from '../state/managePracticesSlice'
import type { ActivityInput, RoleInput, MetricInput, GuidelineInput, AssociatedPracticeInput } from '../types/practice.types'

const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave anyway?'

interface PracticeEditFormProps {
  teamId: number
  practice: {
    id: number
    title: string
    goal: string
    description?: string | null
    categoryId: string
    categoryName: string
    method?: string | null
    tags?: unknown | null
    benefits?: string[] | null
    pitfalls?: string[] | null
    workProducts?: string[] | null
    activities?: unknown[] | null
    roles?: unknown[] | null
    completionCriteria?: string | null
    metrics?: unknown[] | null
    guidelines?: unknown[] | null
    associatedPractices?: unknown[] | null
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
  const [description, setDescription] = useState(practice.description ?? '')
  const [categoryId, setCategoryId] = useState(practice.categoryId)
  const [method, setMethod] = useState(practice.method ?? '')
  const [tags, setTags] = useState<string[]>(normalizeValidTags(Array.isArray(practice.tags) ? (practice.tags as string[]) : []))
  const [pillarIds, setPillarIds] = useState<number[]>(practice.pillars.map((pillar) => pillar.id))
  const [benefits, setBenefits] = useState(practice.benefits?.join('\n') ?? '')
  const [pitfalls, setPitfalls] = useState(practice.pitfalls?.join('\n') ?? '')
  const [workProducts, setWorkProducts] = useState(practice.workProducts?.join('\n') ?? '')
  const [activities, setActivities] = useState<ActivityInput[]>((practice.activities as ActivityInput[]) ?? [])
  const [roles, setRoles] = useState<RoleInput[]>((practice.roles as RoleInput[]) ?? [])
  const [completionCriteria, setCompletionCriteria] = useState(practice.completionCriteria ?? '')
  const [metrics, setMetrics] = useState<MetricInput[]>((practice.metrics as MetricInput[]) ?? [])
  const [guidelines, setGuidelines] = useState<GuidelineInput[]>((practice.guidelines as GuidelineInput[]) ?? [])
  const [associatedPractices, setAssociatedPractices] = useState<AssociatedPracticeInput[]>((practice.associatedPractices as AssociatedPracticeInput[]) ?? [])
  const [availablePillars, setAvailablePillars] = useState(practice.pillars)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const [showGlobalWarning, setShowGlobalWarning] = useState(false)

  const goalRef = useRef<HTMLTextAreaElement | null>(null)

  const initialState = useMemo(() => ({
    title: practice.title,
    goal: practice.goal,
    description: practice.description ?? '',
    categoryId: practice.categoryId,
    method: practice.method ?? '',
    tags: normalizeValidTags(Array.isArray(practice.tags) ? (practice.tags as string[]) : []),
    pillarIds: practice.pillars.map((pillar) => pillar.id).sort((a, b) => a - b),
    benefits: practice.benefits?.join('\n') ?? '',
    pitfalls: practice.pitfalls?.join('\n') ?? '',
    workProducts: practice.workProducts?.join('\n') ?? '',
    activities: JSON.stringify(practice.activities ?? []),
    roles: JSON.stringify(practice.roles ?? []),
    completionCriteria: practice.completionCriteria ?? '',
    metrics: JSON.stringify(practice.metrics ?? []),
    guidelines: JSON.stringify(practice.guidelines ?? []),
    associatedPractices: JSON.stringify(practice.associatedPractices ?? [])
  }), [practice])

  const isDirty = useMemo(() => {
    const sortedCurrent = [...pillarIds].sort((a, b) => a - b)
    const currentTags = [...tags].sort().join(',')
    const initialTags = [...initialState.tags].sort().join(',')

    return (
      title !== initialState.title ||
      goal !== initialState.goal ||
      description !== initialState.description ||
      categoryId !== initialState.categoryId ||
      method !== initialState.method ||
      currentTags !== initialTags ||
      sortedCurrent.join(',') !== initialState.pillarIds.join(',') ||
      benefits !== initialState.benefits ||
      pitfalls !== initialState.pitfalls ||
      workProducts !== initialState.workProducts ||
      JSON.stringify(activities) !== initialState.activities ||
      JSON.stringify(roles) !== initialState.roles ||
      completionCriteria !== initialState.completionCriteria ||
      JSON.stringify(metrics) !== initialState.metrics ||
      JSON.stringify(guidelines) !== initialState.guidelines ||
      JSON.stringify(associatedPractices) !== initialState.associatedPractices
    )
  }, [title, goal, description, categoryId, method, tags, pillarIds, benefits, pitfalls, workProducts, activities, roles, completionCriteria, metrics, guidelines, associatedPractices, initialState])

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

  // Fetch full practice detail to hydrate extended fields if not already present
  useEffect(() => {
    const hydrateExtendedFields = async () => {
      try {
        const response = await fetchPracticeDetail(practice.id)
        if (response?.practice) {
          const detail = response.practice
          const asArr = (v: unknown): string[] =>
            Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []
          const castArr = <T,>(v: unknown): T[] =>
            Array.isArray(v) ? (v as T[]) : []
          setDescription(typeof detail.description === 'string' ? detail.description : '')
          setBenefits(asArr(detail.benefits).join('\n'))
          setPitfalls(asArr(detail.pitfalls).join('\n'))
          setWorkProducts(asArr(detail.workProducts).join('\n'))
          setActivities(castArr<ActivityInput>(detail.activities))
          setRoles(castArr<RoleInput>(detail.roles))
          setCompletionCriteria(typeof detail.completionCriteria === 'string' ? detail.completionCriteria : '')
          setMetrics(castArr<MetricInput>(detail.metrics))
          setGuidelines(castArr<GuidelineInput>(detail.guidelines))
          setAssociatedPractices(castArr<AssociatedPracticeInput>(detail.associatedPractices))
        }
      } catch {
        // Extended fields stay at defaults from prop
      }
    }
    hydrateExtendedFields()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice.id])

  useEffect(() => {
    setTitle(practice.title)
    setGoal(practice.goal)
    setDescription(practice.description ?? '')
    setCategoryId(practice.categoryId)
    setMethod(practice.method ?? '')
    setTags(normalizeValidTags(Array.isArray(practice.tags) ? (practice.tags as string[]) : []))
    setPillarIds(practice.pillars.map((pillar) => pillar.id))
    setBenefits(practice.benefits?.join('\n') ?? '')
    setPitfalls(practice.pitfalls?.join('\n') ?? '')
    setWorkProducts(practice.workProducts?.join('\n') ?? '')
    setActivities((practice.activities as ActivityInput[]) ?? [])
    setRoles((practice.roles as RoleInput[]) ?? [])
    setCompletionCriteria(practice.completionCriteria ?? '')
    setMetrics((practice.metrics as MetricInput[]) ?? [])
    setGuidelines((practice.guidelines as GuidelineInput[]) ?? [])
    setAssociatedPractices((practice.associatedPractices as AssociatedPracticeInput[]) ?? [])
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
      const splitLines = (text: string) => text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      const result = await editPractice(teamId, practice.id, {
        title: title.trim(),
        goal: goal.trim(),
        categoryId,
        method: method || null,
        tags,
        pillarIds,
        benefits: splitLines(benefits),
        pitfalls: splitLines(pitfalls),
        workProducts: splitLines(workProducts),
        activities: activities.filter(a => a.name.trim()),
        roles: roles.filter(r => r.role.trim()),
        completionCriteria: completionCriteria || null,
        metrics: metrics.filter(m => m.name.trim()),
        guidelines: guidelines.filter(g => g.name.trim() && g.url.trim()),
        associatedPractices: associatedPractices.filter(a => a.targetPracticeId > 0),
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
      setDescription((updatedPractice as any).description ?? '')
      setCategoryId(updatedPractice.categoryId)
      setMethod(updatedPractice.method ?? '')
      setTags(normalizeValidTags(Array.isArray(updatedPractice.tags) ? (updatedPractice.tags as string[]) : []))
      setPillarIds(updatedPractice.pillars.map((pillar) => pillar.id))
      setBenefits((updatedPractice as any).benefits?.join('\n') ?? '')
      setPitfalls((updatedPractice as any).pitfalls?.join('\n') ?? '')
      setWorkProducts((updatedPractice as any).workProducts?.join('\n') ?? '')
      setActivities((updatedPractice as any).activities ?? [])
      setRoles((updatedPractice as any).roles ?? [])
      setCompletionCriteria((updatedPractice as any).completionCriteria ?? '')
      setMetrics((updatedPractice as any).metrics ?? [])
      setGuidelines((updatedPractice as any).guidelines ?? [])
      setAssociatedPractices((updatedPractice as any).associatedPractices ?? [])
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Method / Framework</label>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None</option>
                <option value="Agile">Agile</option>
                <option value="Design Thinking & UX">Design Thinking & UX</option>
                <option value="Facilitation & Workshops">Facilitation & Workshops</option>
                <option value="Kanban">Kanban</option>
                <option value="Lean">Lean</option>
                <option value="Product Management">Product Management</option>
                <option value="Project Management">Project Management</option>
                <option value="Scaled Agile">Scaled Agile</option>
                <option value="Scrum">Scrum</option>
                <option value="XP">XP</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <CategorizedTagSelector selectedTags={tags} onChange={setTags} disabled={isUpdating} />
            </div>
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Detailed description of the practice"
            />
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
            <textarea
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="List benefits separated by commas or new lines"
            />
          </div>

          {/* Pitfalls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pitfalls</label>
            <textarea
              value={pitfalls}
              onChange={(e) => setPitfalls(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="List pitfalls separated by commas or new lines"
            />
          </div>

          {/* Work Products */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Products</label>
            <textarea
              value={workProducts}
              onChange={(e) => setWorkProducts(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="List work products separated by commas or new lines"
            />
          </div>

          {/* Activities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Activities</label>
              <button
                type="button"
                onClick={() => setActivities([...activities, { sequence: activities.length + 1, name: '', description: '' }])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Add Activity
              </button>
            </div>
            {activities.map((activity, index) => (
              <div key={index} className="flex gap-2 mb-2 items-start">
                <input
                  type="number"
                  value={activity.sequence}
                  onChange={(e) => {
                    const next = [...activities]
                    next[index] = { ...next[index], sequence: parseInt(e.target.value, 10) || 1 }
                    setActivities(next)
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="#"
                  min={1}
                />
                <input
                  type="text"
                  value={activity.name}
                  onChange={(e) => {
                    const next = [...activities]
                    next[index] = { ...next[index], name: e.target.value }
                    setActivities(next)
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Activity name"
                />
                <input
                  type="text"
                  value={activity.description}
                  onChange={(e) => {
                    const next = [...activities]
                    next[index] = { ...next[index], description: e.target.value }
                    setActivities(next)
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Description"
                />
                <button
                  type="button"
                  onClick={() => setActivities(activities.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Roles (RACI) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Roles (RACI)</label>
              <button
                type="button"
                onClick={() => setRoles([...roles, { role: '', responsibility: 'Responsible' }])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Add Role
              </button>
            </div>
            {roles.map((role, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={role.role}
                  onChange={(e) => {
                    const next = [...roles]
                    next[index] = { ...next[index], role: e.target.value }
                    setRoles(next)
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Role name"
                />
                <select
                  value={role.responsibility}
                  onChange={(e) => {
                    const next = [...roles]
                    next[index] = { ...next[index], responsibility: e.target.value as RoleInput['responsibility'] }
                    setRoles(next)
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="Responsible">Responsible</option>
                  <option value="Accountable">Accountable</option>
                  <option value="Consulted">Consulted</option>
                  <option value="Informed">Informed</option>
                </select>
                <button
                  type="button"
                  onClick={() => setRoles(roles.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Completion Criteria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Completion Criteria</label>
            <textarea
              value={completionCriteria}
              onChange={(e) => setCompletionCriteria(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Define when the practice is considered complete"
            />
          </div>

          {/* Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Metrics</label>
              <button
                type="button"
                onClick={() => setMetrics([...metrics, { name: '' }])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Add Metric
              </button>
            </div>
            {metrics.map((metric, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={metric.name}
                  onChange={(e) => {
                    const next = [...metrics]
                    next[index] = { ...next[index], name: e.target.value }
                    setMetrics(next)
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Metric name"
                />
                <input
                  type="text"
                  value={metric.unit ?? ''}
                  onChange={(e) => {
                    const next = [...metrics]
                    next[index] = { ...next[index], unit: e.target.value || undefined }
                    setMetrics(next)
                  }}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Unit"
                />
                <input
                  type="text"
                  value={metric.formula ?? ''}
                  onChange={(e) => {
                    const next = [...metrics]
                    next[index] = { ...next[index], formula: e.target.value || undefined }
                    setMetrics(next)
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Formula (optional)"
                />
                <button
                  type="button"
                  onClick={() => setMetrics(metrics.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Guidelines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Guidelines / Resources</label>
              <button
                type="button"
                onClick={() => setGuidelines([...guidelines, { name: '', url: '' }])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Add Guideline
              </button>
            </div>
            {guidelines.map((guideline, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={guideline.name}
                  onChange={(e) => {
                    const next = [...guidelines]
                    next[index] = { ...next[index], name: e.target.value }
                    setGuidelines(next)
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Guideline name"
                />
                <input
                  type="text"
                  value={guideline.url}
                  onChange={(e) => {
                    const next = [...guidelines]
                    next[index] = { ...next[index], url: e.target.value }
                    setGuidelines(next)
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="URL"
                />
                <button
                  type="button"
                  onClick={() => setGuidelines(guidelines.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Associated Practices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Associated Practices</label>
              <button
                type="button"
                onClick={() => setAssociatedPractices([...associatedPractices, { targetPracticeId: 0, associationType: 'Complementarity' }])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Add Association
              </button>
            </div>
            {associatedPractices.map((assoc, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <input
                  type="number"
                  value={assoc.targetPracticeId || ''}
                  onChange={(e) => {
                    const next = [...associatedPractices]
                    next[index] = { ...next[index], targetPracticeId: parseInt(e.target.value, 10) || 0 }
                    setAssociatedPractices(next)
                  }}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Practice ID"
                  min={1}
                />
                <select
                  value={assoc.associationType}
                  onChange={(e) => {
                    const next = [...associatedPractices]
                    next[index] = { ...next[index], associationType: e.target.value as AssociatedPracticeInput['associationType'] }
                    setAssociatedPractices(next)
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="Complementarity">Complementarity</option>
                  <option value="Configuration">Configuration</option>
                  <option value="Dependency">Dependency</option>
                  <option value="Equivalence">Equivalence</option>
                  <option value="Exclusion">Exclusion</option>
                </select>
                <button
                  type="button"
                  onClick={() => setAssociatedPractices(associatedPractices.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
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
