import { useId, useState } from 'react'
import type { AffinityStatus } from '../api/affinity.api'

export const LOW_THRESHOLD = -0.3
export const HIGH_THRESHOLD = 0.3

export type AffinityVisualState = 'good' | 'neutral' | 'poor' | 'na'

export interface AffinityBadgeValue {
  score: number | null
  status?: AffinityStatus
}

export interface AffinityBadgeProps {
  individual: AffinityBadgeValue
  team: AffinityBadgeValue
  isLoading?: boolean
  showTeam?: boolean
}

const STATE_CLASSES: Record<AffinityVisualState, string> = {
  good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  poor: 'bg-rose-100 text-rose-800 border-rose-200',
  na: 'bg-slate-100 text-slate-600 border-slate-200'
}

const getAffinityState = (value: AffinityBadgeValue): AffinityVisualState => {
  if (value.status === 'insufficient_profile_data' || value.status === 'no_tag_mapping') {
    return 'na'
  }

  if (typeof value.score !== 'number' || Number.isNaN(value.score)) {
    return 'na'
  }

  if (value.score < LOW_THRESHOLD) {
    return 'poor'
  }

  if (value.score > HIGH_THRESHOLD) {
    return 'good'
  }

  return 'neutral'
}

const formatScore = (value: AffinityBadgeValue): string => {
  if (typeof value.score !== 'number' || Number.isNaN(value.score)) {
    return 'N/A'
  }
  return value.score.toFixed(2)
}

const AffinityRow = ({ label, value }: { label: string; value: AffinityBadgeValue }) => {
  const state = getAffinityState(value)
  return (
    <div className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-[11px] ${STATE_CLASSES[state]}`}>
      <span className="font-medium">{label}</span>
      <span className="font-semibold" aria-label={`${label} affinity value`}>
        {formatScore(value)}
      </span>
    </div>
  )
}

export const AffinityBadge = ({ individual, team, isLoading = false, showTeam = true }: AffinityBadgeProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const popoverId = useId()

  if (isLoading) {
    return (
      <div className="w-36 rounded-md border border-gray-200 bg-white/90 p-2" aria-label="Affinity loading">
        <div className="h-4 animate-pulse rounded bg-gray-200" />
        {showTeam && <div className="mt-1 h-4 animate-pulse rounded bg-gray-200" />}
      </div>
    )
  }

  return (
    <div className="relative w-36" data-testid="affinity-badge">
      <div className="rounded-md border border-gray-200 bg-white/95 p-2 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Affinity</span>
          <button
            type="button"
            aria-label="Affinity score legend"
            aria-expanded={isOpen}
            aria-controls={popoverId}
            onClick={(event) => {
              event.stopPropagation()
              setIsOpen((prev) => !prev)
            }}
            className="h-5 w-5 rounded-full border border-gray-300 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            ?
          </button>
        </div>
        <div className="space-y-1">
          <AffinityRow label="Individual" value={individual} />
          {showTeam && <AffinityRow label="Team" value={team} />}
        </div>
      </div>

      {isOpen && (
        <div
          id={popoverId}
          role="tooltip"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg"
        >
          <p><strong>Individual</strong>: personal fit based on Big Five profile and practice tags.</p>
          {showTeam && <p className="mt-1"><strong>Team</strong>: average fit across team members with completed profiles.</p>}
          <p className="mt-1">Legend: Green (&gt;0.3) good, Grey (-0.3 to 0.3) neutral, Red (&lt;-0.3) poor.</p>
        </div>
      )}
    </div>
  )
}

export const affinityBadgeUtils = {
  getAffinityState,
  formatScore
}
