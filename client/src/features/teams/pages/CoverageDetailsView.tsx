import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CategoryCoverageBreakdown } from '../components/CategoryCoverageBreakdown'
import { useCoverageStore } from '../state/coverageSlice'

export const CoverageDetailsView = () => {
  const navigate = useNavigate()
  const { teamId } = useParams<{ teamId: string }>()
  const numericTeamId = Number(teamId)
  const { coverage, isLoading, error, fetchCoverage } = useCoverageStore()

  useEffect(() => {
    if (Number.isFinite(numericTeamId) && numericTeamId > 0) {
      fetchCoverage(numericTeamId)
    }
  }, [fetchCoverage, numericTeamId])

  const categoryBreakdown = useMemo(() => coverage?.categoryBreakdown ?? [], [coverage])

  const handleViewPractices = (categoryId: string) => {
    navigate(`/teams/${numericTeamId}/practices/manage?category=${categoryId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <button
          onClick={() => navigate(`/teams/${numericTeamId}`)}
          className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg
            className="mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Team Dashboard
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Coverage Details</h2>
          <p className="text-sm text-gray-600">Category coverage and pillar drill-down.</p>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">Loading coverage details...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && categoryBreakdown.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">No coverage data available yet.</p>
          </div>
        )}

        {!isLoading && !error && categoryBreakdown.length > 0 && (
          <CategoryCoverageBreakdown
            categoryBreakdown={categoryBreakdown}
            onViewPractices={handleViewPractices}
          />
        )}
      </div>
    </div>
  )
}
