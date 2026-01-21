import type { Practice, Pillar } from '../../practices/types'

interface PillarDetailModalProps {
  isOpen: boolean
  mode: 'covered' | 'gap'
  pillar: Pillar | null
  practices: Practice[]
  isLoading: boolean
  error: string | null
  onClose: () => void
  onAddPractice?: (practiceId: number) => Promise<void>
  addingPracticeId?: number | null
}

export const PillarDetailModal = ({
  isOpen,
  mode,
  pillar,
  practices,
  isLoading,
  error,
  onClose,
  onAddPractice,
  addingPracticeId
}: PillarDetailModalProps) => {
  if (!isOpen || !pillar) return null

  const title = mode === 'covered' ? 'Practices covering this pillar' : 'Practices that cover this pillar'

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800">Pillar Details</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          <p className="text-base font-semibold text-gray-800">{pillar.name}</p>
          {pillar.description && (
            <p className="mt-2 text-sm text-gray-600">{pillar.description}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">Category: {pillar.category}</p>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-gray-700">{title}</p>

          {isLoading && (
            <p className="mt-3 text-sm text-gray-500">Loading practices...</p>
          )}

          {!isLoading && error && (
            <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          {!isLoading && !error && practices.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No practices available.</p>
          )}

          {!isLoading && !error && practices.length > 0 && (
            <ul className="mt-3 space-y-3">
              {practices.map((practice) => (
                <li
                  key={practice.id}
                  className="rounded-md border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{practice.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{practice.goal}</p>
                    </div>
                    {mode === 'gap' && onAddPractice && (
                      <button
                        type="button"
                        onClick={() => onAddPractice(practice.id)}
                        disabled={addingPracticeId === practice.id}
                        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {addingPracticeId === practice.id ? 'Adding...' : `Add ${practice.title}`}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
