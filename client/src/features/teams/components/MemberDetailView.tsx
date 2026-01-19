import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMemberDetail } from '../api/membersApi'
import type { TeamMemberDetail } from '../types/member.types'

export const MemberDetailView = () => {
  const { teamId, userId } = useParams<{ teamId: string; userId: string }>()
  const navigate = useNavigate()
  const [member, setMember] = useState<TeamMemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMember = async () => {
      if (!teamId || !userId) return
      setIsLoading(true)
      try {
        const data = await getMemberDetail(Number(teamId), Number(userId))
        setMember(data)
      } catch (err) {
        setError('Failed to load member details.')
      } finally {
        setIsLoading(false)
      }
    }

    loadMember()
  }, [teamId, userId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/teams/${teamId}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Members
        </button>

        {isLoading && <p className="text-gray-500">Loading member details...</p>}
        {!isLoading && error && <p className="text-red-600">{error}</p>}

        {!isLoading && !error && member && (
          <div className="space-y-6">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800">{member.name}</h2>
              <p className="text-sm text-gray-500">{member.email}</p>
              <p className="text-sm text-gray-500">Joined: {new Date(member.joinDate).toLocaleDateString()}</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800">Big Five Profile</h3>
              {!member.bigFiveCompleted && (
                <p className="text-sm text-gray-500 mt-2">Profile not completed yet.</p>
              )}
              {member.bigFiveCompleted && member.bigFiveProfile && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <p>Openness: {member.bigFiveProfile.openness}</p>
                  <p>Conscientiousness: {member.bigFiveProfile.conscientiousness}</p>
                  <p>Extraversion: {member.bigFiveProfile.extraversion}</p>
                  <p>Agreeableness: {member.bigFiveProfile.agreeableness}</p>
                  <p>Neuroticism: {member.bigFiveProfile.neuroticism}</p>
                </div>
              )}
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800">Issues Submitted</h3>
              {member.issues.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No issues submitted yet.</p>
              )}
              {member.issues.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {member.issues.map((issue) => (
                    <li key={issue.id} className="rounded-md border border-gray-200 p-3">
                      <p className="text-sm font-medium text-gray-800">{issue.title}</p>
                      <p className="text-xs text-gray-500">Status: {issue.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
