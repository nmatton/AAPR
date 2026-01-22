import type { ReactNode } from 'react'
import type { Practice } from '../types'

const CATEGORY_COLORS: Record<string, string> = {
  VALEURS_HUMAINES: 'bg-red-100 text-red-700 border-red-200',
  FEEDBACK_APPRENTISSAGE: 'bg-blue-100 text-blue-700 border-blue-200',
  EXCELLENCE_TECHNIQUE: 'bg-purple-100 text-purple-700 border-purple-200',
  ORGANISATION_AUTONOMIE: 'bg-green-100 text-green-700 border-green-200',
  FLUX_RAPIDITE: 'bg-amber-100 text-amber-700 border-amber-200'
}

const normalizeCategoryKey = (value: string) =>
  value
    .toUpperCase()
    .replace(/&/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .replace(/[^A-Z_]/g, '')
    .trim()

const getCategoryClass = (categoryId: string) => CATEGORY_COLORS[normalizeCategoryKey(categoryId)] ?? 'bg-gray-100 text-gray-700 border-gray-200'

const getPillarColor = (category: string) => {
  const key = normalizeCategoryKey(category)
  const base = CATEGORY_COLORS[key]
  if (base?.includes('red')) return 'bg-red-100 text-red-700'
  if (base?.includes('blue')) return 'bg-blue-100 text-blue-700'
  if (base?.includes('purple')) return 'bg-purple-100 text-purple-700'
  if (base?.includes('green')) return 'bg-green-100 text-green-700'
  if (base?.includes('amber')) return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-700'
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const renderHighlightedText = (text: string, query?: string) => {
  if (!query?.trim()) return text
  const escaped = escapeRegExp(query.trim())
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, index) => {
    if (part.toLowerCase() !== query.trim().toLowerCase()) {
      return <span key={`${part}-${index}`}>{part}</span>
    }
    return (
      <span key={`${part}-${index}`} className="bg-yellow-200 text-gray-900 rounded-sm px-1">
        {part}
      </span>
    )
  })
}

interface PracticeCardProps {
  practice: Practice
  onSelect: (practice: Practice) => void
  highlightQuery?: string
  onAction?: (practice: Practice) => void
  actionLabel?: string
  actionAriaLabel?: string
  actionIcon?: ReactNode
  onEdit?: (practice: Practice) => void
  editLabel?: string
  editAriaLabel?: string
}

export const PracticeCard = ({
  practice,
  onSelect,
  highlightQuery,
  onAction,
  actionLabel,
  actionAriaLabel,
  actionIcon,
  onEdit,
  editLabel = 'Edit',
  editAriaLabel
}: PracticeCardProps) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(practice)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(practice)
        }
      }}
      className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {renderHighlightedText(practice.title, highlightQuery)}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryClass(practice.categoryId)}`}>
              {practice.categoryName}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-3">{practice.goal}</p>
          <div className="flex flex-wrap gap-2">
            {practice.pillars.map((pillar) => (
              <span
                key={pillar.id}
                className={`px-2 py-1 text-xs rounded-full ${getPillarColor(pillar.category)}`}
              >
                {pillar.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onEdit(practice)
              }}
              aria-label={editAriaLabel ?? editLabel}
              className="text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              {editLabel}
            </button>
          )}
          {onAction && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onAction(practice)
              }}
              aria-label={actionAriaLabel ?? actionLabel ?? 'Action'}
              className="mt-1 inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-2 text-blue-700 hover:bg-blue-100"
            >
              {actionIcon ?? <span className="text-lg leading-none">+</span>}
            </button>
          )}
        </div>
      </div>
      {actionLabel && (
        <span className="sr-only">{actionLabel}</span>
      )}
    </div>
  )
}
