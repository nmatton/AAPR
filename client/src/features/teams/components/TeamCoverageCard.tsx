import { useCallback, useMemo, useState } from 'react'
import type { Practice, Pillar } from '../../practices/types'
import type { TeamPillarCoverage } from '../types/coverage.types'
import {
  fetchAvailablePractices,
  fetchTeamPractices,
  addPracticeToTeam
} from '../api/teamPracticesApi'
import { PillarDetailModal } from './PillarDetailModal'

interface TeamCoverageCardProps {
  teamId: number
  coverage: TeamPillarCoverage | null
  isLoading: boolean
  error: string | null
  onRefresh: () => Promise<void> | void
}

type DetailMode = 'covered' | 'gap'

export const TeamCoverageCard = ({
  teamId,
  coverage,
  isLoading,
  error,
  onRefresh
}: TeamCoverageCardProps) => {
  const [detailPillar, setDetailPillar] = useState<Pillar | null>(null)
  const [detailMode, setDetailMode] = useState<DetailMode>('covered')
  const [detailPractices, setDetailPractices] = useState<Practice[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cachedPractices, setCachedPractices] = useState<Practice[]>([])
  const [isAddingPracticeId, setIsAddingPracticeId] = useState<number | null>(null)

  const coverageLabel = useMemo(() => {
    if (!coverage) return 'Coverage: 0/0 pillars (0%)'
    const percent = Number.isFinite(coverage.overallCoveragePct)
      ? coverage.overallCoveragePct.toFixed(2)
      : '0.00'
    return `Coverage: ${coverage.coveredCount}/${coverage.totalCount} pillars (${percent}%)`
  }, [coverage])

  const progressWidth = useMemo(() => {
    if (!coverage || !Number.isFinite(coverage.overallCoveragePct)) return '0%'
    const clamped = Math.max(0, Math.min(coverage.overallCoveragePct, 100))
    return `${clamped}%`
  }, [coverage])

  const loadTeamPractices = useCallback(async () => {
    if (cachedPractices.length > 0) return cachedPractices
    const response = await fetchTeamPractices(teamId)
    setCachedPractices(response.items)
    return response.items
  }, [cachedPractices.length, teamId])

  const openDetail = async (pillar: Pillar, mode: DetailMode) => {
    setDetailPillar(pillar)
    setDetailMode(mode)
    setDetailError(null)
    setDetailLoading(true)
    setIsModalOpen(true)

    try {
      if (mode === 'covered') {
        const practices = await loadTeamPractices()
        const filtered = practices.filter((practice) =>
          practice.pillars.some((item) => item.id === pillar.id)
        )
        setDetailPractices(filtered)
      } else {
        const response = await fetchAvailablePractices({
          teamId,
          page: 1,
          pageSize: 20,
          pillars: [pillar.id]
        })
        setDetailPractices(response.items)
      }
    } catch (err: any) {
      setDetailError(err?.message ?? 'Unable to load pillar details.')
      setDetailPractices([])
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAddPractice = async (practiceId: number) => {
    if (!detailPillar) return

    setIsAddingPracticeId(practiceId)
    try {
      await addPracticeToTeam(teamId, practiceId)
      await onRefresh()
      setCachedPractices([])
      setIsModalOpen(false)
    } catch (err: any) {
      setDetailError(err?.message ?? 'Unable to add practice.')
    } finally {
      setIsAddingPracticeId(null)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Coverage</h3>
          <p className="text-sm text-gray-500">Track pillar coverage for this team</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-gray-500">Loading coverage...</p>
      )}

      {!isLoading && error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {!isLoading && !error && coverage && (
        <>
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-700">{coverageLabel}</p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                data-testid="coverage-progress"
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: progressWidth }}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-gray-700">Covered Pillars</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {coverage.coveredPillars.map((pillar) => (
                  <button
                    key={pillar.id}
                    type="button"
                    onClick={() => openDetail(pillar, 'covered')}
                    className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800"
                  >
                    {pillar.name}
                  </button>
                ))}
                {coverage.coveredPillars.length === 0 && (
                  <p className="text-xs text-gray-500">No covered pillars yet.</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Gap Pillars</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {coverage.gapPillars.map((pillar) => (
                  <button
                    key={pillar.id}
                    type="button"
                    onClick={() => openDetail(pillar, 'gap')}
                    className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
                  >
                    {pillar.name}
                  </button>
                ))}
                {coverage.gapPillars.length === 0 && (
                  <p className="text-xs text-gray-500">No gaps detected.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <PillarDetailModal
        isOpen={isModalOpen}
        mode={detailMode}
        pillar={detailPillar}
        practices={detailPractices}
        isLoading={detailLoading}
        error={detailError}
        onClose={() => setIsModalOpen(false)}
        onAddPractice={detailMode === 'gap' ? handleAddPractice : undefined}
        addingPracticeId={isAddingPracticeId}
      />
    </div>
  )
}
