import { useEffect } from 'react'
import type { Practice } from '../types'

interface PracticeCatalogDetailProps {
  practice: Practice
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
  actionLoading?: boolean
}

export const PracticeCatalogDetail = ({
  practice,
  onClose,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionLoading = false
}: PracticeCatalogDetailProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-xl overflow-y-auto transform transition-transform translate-x-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{practice.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600">Goal</p>
            <p className="text-gray-800">{practice.goal}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="text-gray-800">{practice.categoryName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Pillars</p>
            <div className="flex flex-wrap gap-2">
              {practice.pillars.map((pillar) => (
                <span key={pillar.id} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                  {pillar.name}
                </span>
              ))}
            </div>
          </div>
          {practice.pillars.some((p) => p.description) && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Notes</p>
              {practice.pillars.map((pillar) => (
                pillar.description ? (
                  <div key={pillar.id} className="text-sm text-gray-700 bg-gray-50 border border-gray-100 p-2 rounded">
                    <strong>{pillar.name}:</strong> {pillar.description}
                  </div>
                ) : null
              ))}
            </div>
          )}
          {actionLabel && onAction && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled || actionLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {actionLoading ? 'Adding...' : actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
