import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchMyPracticeAffinity,
  fetchTeamPracticeAffinity,
  type AffinityStatus,
  type MyPracticeAffinityResponse,
  type TeamPracticeAffinityResponse
} from '../api/affinity.api'

export interface PracticeAffinityViewModel {
  individual: {
    score: number | null
    status: AffinityStatus
  }
  team: {
    score: number | null
    status: AffinityStatus
  }
  isLoading: boolean
  error?: string
}

type PairResult = {
  individual: MyPracticeAffinityResponse
  team: TeamPracticeAffinityResponse
}

const affinityCache = new Map<string, PairResult>()
const inflightByKey = new Map<string, Promise<PairResult>>()

const getKey = (teamId: number, practiceId: number) => `${teamId}:${practiceId}`

const getDefault = (): PracticeAffinityViewModel => ({
  individual: { score: null, status: 'insufficient_profile_data' },
  team: { score: null, status: 'insufficient_profile_data' },
  isLoading: false
})

const loadPair = async (teamId: number, practiceId: number): Promise<PairResult> => {
  const key = getKey(teamId, practiceId)

  if (affinityCache.has(key)) {
    return affinityCache.get(key) as PairResult
  }

  if (inflightByKey.has(key)) {
    return inflightByKey.get(key) as Promise<PairResult>
  }

  const request = (async () => {
    const [individual, team] = await Promise.all([
      fetchMyPracticeAffinity(teamId, practiceId),
      fetchTeamPracticeAffinity(teamId, practiceId)
    ])

    const result = { individual, team }
    affinityCache.set(key, result)
    return result
  })()

  inflightByKey.set(key, request)

  try {
    return await request
  } finally {
    inflightByKey.delete(key)
  }
}

export const usePracticeAffinities = (teamId: number | null, practiceIds: number[]) => {
  const [byPracticeId, setByPracticeId] = useState<Record<number, PracticeAffinityViewModel>>({})

  const practiceIdsKey = practiceIds.join(',')
  const normalizedPracticeIds = useMemo(
    () => Array.from(new Set(practiceIds.filter((id) => Number.isFinite(id)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [practiceIdsKey]
  )

  useEffect(() => {
    if (!teamId || normalizedPracticeIds.length === 0) {
      setByPracticeId({})
      return
    }

    let isCancelled = false

    normalizedPracticeIds.forEach((practiceId) => {
      const key = getKey(teamId, practiceId)
      const cached = affinityCache.get(key)

      if (cached) {
        setByPracticeId((prev) => ({
          ...prev,
          [practiceId]: {
            individual: { score: cached.individual.score, status: cached.individual.status },
            team: { score: cached.team.score, status: cached.team.status },
            isLoading: false
          }
        }))
        return
      }

      setByPracticeId((prev) => ({
        ...prev,
        [practiceId]: {
          ...getDefault(),
          isLoading: true
        }
      }))

      void loadPair(teamId, practiceId)
        .then((result) => {
          if (isCancelled) return

          setByPracticeId((prev) => ({
            ...prev,
            [practiceId]: {
              individual: { score: result.individual.score, status: result.individual.status },
              team: { score: result.team.score, status: result.team.status },
              isLoading: false
            }
          }))
        })
        .catch((error: unknown) => {
          if (isCancelled) return

          setByPracticeId((prev) => ({
            ...prev,
            [practiceId]: {
              ...getDefault(),
              isLoading: false,
              error: error instanceof Error ? error.message : 'Unable to load affinity'
            }
          }))
        })
    })

    return () => {
      isCancelled = true
    }
  }, [teamId, normalizedPracticeIds])

  const getForPractice = useCallback(
    (practiceId: number): PracticeAffinityViewModel => byPracticeId[practiceId] ?? getDefault(),
    [byPracticeId]
  )

  return {
    byPracticeId,
    getForPractice
  }
}
