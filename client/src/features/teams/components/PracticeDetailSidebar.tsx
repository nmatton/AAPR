import { useEffect, useState } from 'react'
import { fetchPracticeDetail } from '../../practices/api/practices.api'
import type { Practice } from '../../practices/types'

interface PracticeDetailSidebarProps {
  practiceId: number | null
  onClose: () => void
}

export const PracticeDetailSidebar = ({ practiceId, onClose }: PracticeDetailSidebarProps) => {
  const [detail, setDetail] = useState<(Practice & {
    description?: string | null
    method?: string | null
    tags?: unknown | null
    activities?: unknown | null
    roles?: unknown | null
    workProducts?: unknown | null
    completionCriteria?: string | null
    metrics?: unknown | null
    guidelines?: unknown | null
    pitfalls?: unknown | null
    benefits?: unknown | null
    associatedPractices?: unknown | null
    importedBy?: string | null
    updatedAt: string
  }) | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!practiceId) return
      setIsLoading(true)
      setError(null)
      try {
        const { practice } = await fetchPracticeDetail(practiceId)
        setDetail(practice)
      } catch (err: any) {
        setError(err?.message || 'Unable to load practice detail.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [practiceId])

  const isOpen = Boolean(practiceId)

  return (
    <div
      className={`fixed inset-0 z-40 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'} ${isOpen ? 'bg-black/30' : 'bg-transparent'}`}
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform`}
        role="dialog"
        aria-modal="true"
        aria-label="Practice details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold text-gray-800">Practice Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {isLoading && <p className="text-xs text-gray-500">Loading…</p>}
          {!isLoading && error && <p className="text-xs text-red-600">{error}</p>}
          {!isLoading && !error && detail && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-gray-900">{detail.title}</h4>
                <p className="mt-1 text-sm text-gray-700">{detail.goal}</p>
              </div>
              {detail.description && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-800">Description</h5>
                  <p className="mt-1 text-sm text-gray-700">{detail.description}</p>
                </div>
              )}
              <div>
                <h5 className="text-sm font-semibold text-gray-800">Pillars</h5>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.pillars.map((p) => (
                    <span key={p.id} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{p.name}</span>
                  ))}
                </div>
              </div>
              {detail.benefits && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-800">Benefits</h5>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{JSON.stringify(detail.benefits, null, 2)}</pre>
                </div>
              )}
              {detail.pitfalls && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-800">Pitfalls</h5>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{JSON.stringify(detail.pitfalls, null, 2)}</pre>
                </div>
              )}
              {detail.workProducts && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-800">Work Products</h5>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{JSON.stringify(detail.workProducts, null, 2)}</pre>
                </div>
              )}
              <div className="text-xs text-gray-500">
                <span>Version {detail.practiceVersion}</span>
                <span className="mx-2">•</span>
                <span>Last updated {new Date(detail.updatedAt).toLocaleDateString()}</span>
                {detail.importedBy && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Updated by {detail.importedBy}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
