import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePracticesStore } from '../state/practices.slice'
import { PracticeCard } from '../components/PracticeCard'
import { PracticeCardSkeleton } from '../components/PracticeCardSkeleton'
import { PracticeEmptyState } from '../components/PracticeEmptyState'
import { PracticeErrorState } from '../components/PracticeErrorState'
import { PracticeCatalogDetail } from '../components/PracticeCatalogDetail'
import { PillarFilterDropdown } from '../components/PillarFilterDropdown'
import { PracticeEditForm } from '../../teams/components/PracticeEditForm'
import type { Practice } from '../types'

const PAGE_SIZE = 100

const CATEGORY_COLORS: Record<string, string> = {
  VALEURS_HUMAINES: 'bg-red-100 text-red-700',
  FEEDBACK_APPRENTISSAGE: 'bg-blue-100 text-blue-700',
  EXCELLENCE_TECHNIQUE: 'bg-purple-100 text-purple-700',
  ORGANISATION_AUTONOMIE: 'bg-green-100 text-green-700',
  FLUX_RAPIDITE: 'bg-amber-100 text-amber-700'
}

const normalizeCategoryKey = (value: string) =>
  value
    .toUpperCase()
    .replace(/&/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .replace(/[^A-Z_]/g, '')
    .trim()

const getPillarBadgeClass = (category: string) =>
  CATEGORY_COLORS[normalizeCategoryKey(category)] ?? 'bg-gray-100 text-gray-700'
import { useAuthStore } from '../../auth/state/authSlice'

export const PracticeCatalog = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout, isLoading: isAuthLoading } = useAuthStore()
  const {
    practices,
    availablePillars,
    isPillarsLoading,
    total,
    isLoading,
    error,
    loadPractices,
    loadAvailablePillars,
    retry,
    currentDetail,
    setCurrentDetail,
    searchQuery,
    selectedPillars,
    setSearchQuery,
    togglePillar,
    clearFilters
  } = usePracticesStore()

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const lastResultsSignature = useRef<string | null>(null)
  const lastScrollPosition = useRef(0)
  const [practiceToEdit, setPracticeToEdit] = useState<Practice | null>(null)

  // Debounce search input
  useEffect(() => {
    if (localSearchQuery === searchQuery) {
      return
    }

    setIsDebouncing(true)

    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery)
      setIsDebouncing(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearchQuery, searchQuery, setSearchQuery])

  useEffect(() => {
    const teamIdParam = searchParams.get('teamId')
    const parsedTeamId = teamIdParam ? Number(teamIdParam) : null
    const teamId = Number.isFinite(parsedTeamId) ? parsedTeamId : null
    lastScrollPosition.current = window.scrollY
    void loadPractices(1, PAGE_SIZE, teamId)
  }, [loadPractices, searchParams, searchQuery, selectedPillars])

  const teamIdParam = searchParams.get('teamId')
  const teamId = teamIdParam ? Number(teamIdParam) : null
  const canEdit = Number.isFinite(teamId)

  useEffect(() => {
    void loadAvailablePillars()
  }, [loadAvailablePillars])

  useEffect(() => {
    if (currentDetail) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [currentDetail])

  useEffect(() => {
    if (!toastMessage) return

    const timer = setTimeout(() => {
      setToastMessage(null)
    }, 2500)

    return () => clearTimeout(timer)
  }, [toastMessage])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleBack = () => navigate('/teams')

  const handleClearFilters = useCallback(() => {
    setLocalSearchQuery('')
    clearFilters()
  }, [clearFilters])

  const hasActiveFilters = searchQuery.length > 0 || selectedPillars.length > 0
  const showControls = !isLoading && !error
  const emptyStateMessage = searchQuery.trim().length > 0
    ? `No practices found for "${searchQuery.trim()}". Try a different search.`
    : 'No practices found for the selected filters. Try a different search.'

  const selectedPillarLabels = selectedPillars
    .map((pillarId) => availablePillars.find((pillar) => pillar.id === pillarId))
    .filter((pillar): pillar is NonNullable<typeof pillar> => Boolean(pillar))

  useEffect(() => {
    if (isLoading) return

    const signature = `${practices.map((practice) => practice.id).join(',')}-${total}`

    if (hasActiveFilters && lastResultsSignature.current !== signature) {
      setToastMessage(`Results updated (${total} practices found)`)
    }

    lastResultsSignature.current = signature
  }, [hasActiveFilters, isLoading, practices, total])

  useEffect(() => {
    if (!isLoading && lastScrollPosition.current > 0) {
      window.scrollTo(0, lastScrollPosition.current)
    }
  }, [isLoading])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Back to Teams
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Practice Catalog</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isAuthLoading}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="relative">
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 rounded-md bg-teal-50 text-teal-700 px-4 py-2 text-sm shadow">
            {toastMessage}
          </div>
        )}

        {showControls && (
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="mb-6 space-y-4">
              <p className="text-gray-600 text-sm">Browse all practices with goals and pillar coverage.</p>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search practices..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {localSearchQuery && (
                  <button
                    onClick={() => setLocalSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PillarFilterDropdown
                  pillars={availablePillars}
                  selectedPillars={selectedPillars}
                  onToggle={togglePillar}
                  onClear={handleClearFilters}
                  isLoading={isPillarsLoading}
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedPillarLabels.map((pillar) => (
                    <button
                      key={pillar.id}
                      type="button"
                      onClick={() => togglePillar(pillar.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getPillarBadgeClass(pillar.category)}`}
                    >
                      {pillar.name}
                      <span aria-hidden>×</span>
                    </button>
                  ))}
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Browse all practices with goals and pillar coverage.</p>
              </div>
              <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                <PracticeCardSkeleton key={idx} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="max-w-3xl mx-auto px-4 py-8">
            <p className="text-gray-600 text-sm mb-4">Browse all practices with goals and pillar coverage.</p>
            <PracticeErrorState message={error} onRetry={retry} />
          </div>
        )}

        {!isLoading && !error && practices.length === 0 && !hasActiveFilters && (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
            <p className="text-gray-600 text-sm">Browse all practices with goals and pillar coverage.</p>
            <PracticeEmptyState />
          </div>
        )}

        {!isLoading && !error && practices.length === 0 && hasActiveFilters && (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No practices found</h3>
              <p className="mt-2 text-sm text-gray-500">{emptyStateMessage}</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && practices.length > 0 && (
          <div className="relative">
            <div className="max-w-6xl mx-auto px-4 py-2">
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${isDebouncing ? 'opacity-60' : 'opacity-100'}`}
              >
                {practices.map((practice) => (
                  <PracticeCard
                    key={practice.id}
                    practice={practice}
                    onSelect={setCurrentDetail}
                    highlightQuery={searchQuery}
                    onEdit={canEdit ? setPracticeToEdit : undefined}
                    editLabel="Edit"
                  />
                ))}
              </div>
            </div>

            {currentDetail && (
              <PracticeCatalogDetail
                practice={currentDetail}
                onClose={() => setCurrentDetail(null)}
                onEdit={canEdit ? () => setPracticeToEdit(currentDetail) : undefined}
              />
            )}
          </div>
        )}
      </main>

      {practiceToEdit && canEdit && teamId && (
        <PracticeEditForm
          teamId={teamId}
          practice={practiceToEdit}
          onClose={() => setPracticeToEdit(null)}
          onSaved={async () => {
            await loadPractices(1, PAGE_SIZE, teamId)
          }}
          onRefreshRequested={async () => {
            await loadPractices(1, PAGE_SIZE, teamId)
            const refreshedPractice = usePracticesStore.getState().practices
              .find((entry) => entry.id === practiceToEdit.id) ?? null
            if (refreshedPractice) {
              setPracticeToEdit(refreshedPractice)
            }
            return refreshedPractice
          }}
        />
      )}
    </div>
  )
}
