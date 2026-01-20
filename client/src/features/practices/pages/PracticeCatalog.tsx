import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePracticesStore } from '../state/practices.slice'
import { PracticeCard } from '../components/PracticeCard'
import { PracticeCardSkeleton } from '../components/PracticeCardSkeleton'
import { PracticeEmptyState } from '../components/PracticeEmptyState'
import { PracticeErrorState } from '../components/PracticeErrorState'
import { PracticeCatalogDetail } from '../components/PracticeCatalogDetail'
import { useAuthStore } from '../../auth/state/authSlice'

export const PracticeCatalog = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout, isLoading: isAuthLoading, user } = useAuthStore()
  const {
    practices,
    isLoading,
    error,
    loadPractices,
    retry,
    currentDetail,
    setCurrentDetail
  } = usePracticesStore()

  useEffect(() => {
    const teamIdParam = searchParams.get('teamId')
    const parsedTeamId = teamIdParam ? Number(teamIdParam) : null
    const teamId = Number.isFinite(parsedTeamId) ? parsedTeamId : user?.id ?? null
    void loadPractices(1, 20, teamId)
  }, [loadPractices, searchParams, user?.id])

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

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleBack = () => navigate('/teams')

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

        {!isLoading && !error && practices.length === 0 && (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
            <p className="text-gray-600 text-sm">Browse all practices with goals and pillar coverage.</p>
            <PracticeEmptyState />
          </div>
        )}

        {!isLoading && !error && practices.length > 0 && (
          <div className="relative">
            <div className="max-w-6xl mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600 text-sm">Browse all practices with goals and pillar coverage.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {practices.map((practice) => (
                  <PracticeCard key={practice.id} practice={practice} onSelect={setCurrentDetail} />
                ))}
              </div>
            </div>

            {currentDetail && (
              <PracticeCatalogDetail practice={currentDetail} onClose={() => setCurrentDetail(null)} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
