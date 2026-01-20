import { useMemo, useState } from 'react'
import type { Pillar } from '../types'

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

const getCategoryClass = (categoryName: string) =>
  CATEGORY_COLORS[normalizeCategoryKey(categoryName)] ?? 'bg-gray-100 text-gray-700 border-gray-200'

const CATEGORY_ORDER: Record<string, number> = {
  VALEURS_HUMAINES: 1,
  FEEDBACK_APPRENTISSAGE: 2,
  EXCELLENCE_TECHNIQUE: 3,
  ORGANISATION_AUTONOMIE: 4,
  FLUX_RAPIDITE: 5
}

interface PillarFilterDropdownProps {
  pillars: Pillar[]
  selectedPillars: number[]
  onToggle: (pillarId: number) => void
  onClear: () => void
  isLoading?: boolean
}

export const PillarFilterDropdown = ({
  pillars,
  selectedPillars,
  onToggle,
  onClear,
  isLoading = false
}: PillarFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const groupedPillars = useMemo(() => {
    const groups = pillars.reduce<Record<string, Pillar[]>>((acc, pillar) => {
      const category = pillar.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(pillar)
      return acc
    }, {})

    return Object.entries(groups)
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => {
        const aKey = normalizeCategoryKey(a.category)
        const bKey = normalizeCategoryKey(b.category)
        return (CATEGORY_ORDER[aKey] ?? 99) - (CATEGORY_ORDER[bKey] ?? 99)
      })
  }, [pillars])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Filter by Pillar
        {selectedPillars.length > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {selectedPillars.length} selected
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-700">Select pillars</p>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto px-4 py-3">
            {isLoading && <p className="text-sm text-gray-500">Loading pillars...</p>}
            {!isLoading && groupedPillars.length === 0 && (
              <p className="text-sm text-gray-500">No pillars available.</p>
            )}
            {!isLoading && groupedPillars.length > 0 && (
              <div className="space-y-4">
                {groupedPillars.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${getCategoryClass(group.category)}`}>
                        {group.category}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((pillar) => (
                        <label key={pillar.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedPillars.includes(pillar.id)}
                            onChange={() => onToggle(pillar.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{pillar.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
