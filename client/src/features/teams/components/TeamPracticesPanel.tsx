import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTeamPractices, removePracticeFromTeam } from '../api/teamPracticesApi'
import type { Practice, Pillar } from '../../practices/types'

interface TeamPracticesPanelProps {
  teamId: number
  onPracticeRemoved?: () => void | Promise<void>
  onPracticeClick?: (practiceId: number) => void
  onEditClick?: (practice: Practice) => void
}

const computeGapPillars = (target: Practice, allPractices: Practice[]): Pillar[] => {
  const coverageCounts = new Map<number, { pillar: Pillar; count: number }>()

  allPractices.forEach((practice) => {
    practice.pillars.forEach((pillar) => {
      const existing = coverageCounts.get(pillar.id)
      if (existing) {
        existing.count += 1
      } else {
        coverageCounts.set(pillar.id, { pillar, count: 1 })
      }
    })
  })

  const gapPillars = new Map<number, Pillar>()
  target.pillars.forEach((pillar) => {
    const entry = coverageCounts.get(pillar.id)
    if (entry && entry.count === 1) {
      gapPillars.set(pillar.id, pillar)
    }
  })

  return Array.from(gapPillars.values())
}

export const TeamPracticesPanel = ({ teamId, onPracticeRemoved, onPracticeClick, onEditClick }: TeamPracticesPanelProps) => {
  const [practices, setPractices] = useState<Practice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Practice | null>(null)
  const [gapPillars, setGapPillars] = useState<Pillar[]>([])
  const [isRemoving, setIsRemoving] = useState(false)

  const loadPractices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchTeamPractices(teamId)
      setPractices(response.items)
    } catch (err: any) {
      setError(err?.message || 'Unable to load team practices.')
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    if (Number.isInteger(teamId) && teamId > 0) {
      loadPractices()
    }
  }, [loadPractices, teamId])

  const gapPreview = useMemo(() => {
    if (!removeTarget) return []
    return computeGapPillars(removeTarget, practices)
  }, [removeTarget, practices])

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return
    const pendingGapPillars = computeGapPillars(removeTarget, practices)

    setIsRemoving(true)
    setError(null)
    try {
      await removePracticeFromTeam(teamId, removeTarget.id)
      setPractices((prev) => prev.filter((practice) => practice.id !== removeTarget.id))
      setGapPillars(pendingGapPillars)
      setSuccessMessage('Practice removed from team portfolio')
      if (onPracticeRemoved) {
        await onPracticeRemoved()
      }
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (_error) {
      setError('Unable to remove practice. Please try again.')
    } finally {
      setIsRemoving(false)
      setRemoveTarget(null)
    }
  }

  const suggestion = gapPillars.length > 0 ? `Consider adding a practice that covers ${gapPillars[0].name}` : null

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Team Practices</h3>
          <p className="text-sm text-gray-500">Manage your team portfolio practices</p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {gapPillars.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Coverage gaps created</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {gapPillars.map((pillar) => (
              <span
                key={pillar.id}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
              >
                {pillar.name}
              </span>
            ))}
          </div>
          {suggestion && (
            <p className="mt-3 text-sm text-amber-800">{suggestion}</p>
          )}
        </div>
      )}

      {isLoading && (
        <div className="py-6 text-center text-sm text-gray-500">Loading team practices...</div>
      )}

      {!isLoading && error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && practices.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-500">
          No practices selected yet. Add practices to build your portfolio.
        </div>
      )}

      {!isLoading && practices.length > 0 && (
        <ul className="space-y-4">
          {practices.map((practice) => (
            <li
              key={practice.id}
              onClick={() => onPracticeClick?.(practice.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPracticeClick?.(practice.id)
                }
              }}
              role="button"
              tabIndex={0}
              className="rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                    {practice.title}
                  </h4>
                  <p className="mt-1 text-sm text-gray-600">{practice.goal}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {practice.pillars.map((pillar) => (
                      <span
                        key={pillar.id}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {pillar.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditClick?.(practice)
                      }}
                      className="relative z-10 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRemoveTarget(practice)
                      }}
                      className="relative z-10 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {removeTarget && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-gray-800">
              Remove "{removeTarget.title}" from your team?
            </h4>
            <p className="mt-2 text-sm text-gray-600">
              Remove "{removeTarget.title}" from your team?
            </p>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700">Pillars losing coverage</p>
              {gapPreview.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No coverage gaps created.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {gapPreview.map((pillar) => (
                    <span
                      key={pillar.id}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                    >
                      {pillar.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveConfirm}
                disabled={isRemoving}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isRemoving ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
