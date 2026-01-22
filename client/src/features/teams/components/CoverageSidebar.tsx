import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCoverageStore } from '../state/coverageSlice'

interface CoverageSidebarProps {
  teamId: number
}

export const CoverageSidebar = ({ teamId }: CoverageSidebarProps) => {
  const navigate = useNavigate()
  const { coverage, isLoading, error, fetchCoverage } = useCoverageStore()

  useEffect(() => {
    if (teamId) {
      fetchCoverage(teamId)
    }
  }, [teamId, fetchCoverage])

  const pct = coverage?.overallCoveragePct ?? 0

  return (
    <aside className="bg-white border rounded-lg p-4 sticky top-4">
      <h3 className="text-sm font-semibold text-gray-800">Coverage</h3>
      {isLoading && (
        <p className="mt-3 text-xs text-gray-500">Loading coverage…</p>
      )}
      {!isLoading && error && (
        <p className="mt-3 text-xs text-red-600">{error}</p>
      )}
      {!isLoading && !error && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Overall</span>
            <span className="text-xs font-semibold text-gray-800">{pct}%</span>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-gray-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-3 rounded-full ${pct >= 75 ? 'bg-green-600' : pct >= 50 ? 'bg-yellow-600' : 'bg-red-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate(`/teams/${teamId}/coverage`)}
            className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-800"
            aria-label="View coverage details"
          >
            View Details
          </button>
        </div>
      )}
    </aside>
  )
}
