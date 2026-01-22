import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMembers } from '../api/membersApi'
import type { TeamMemberSummary } from '../types/member.types'

interface MembersSidebarProps {
  teamId: number
}

const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
      aria-label={`Team member: ${name}`}
      title={name}
    >
      {initials}
    </div>
  )
}

export const MembersSidebar = ({ teamId }: MembersSidebarProps) => {
  const navigate = useNavigate()
  const [members, setMembers] = useState<TeamMemberSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const items = await getMembers(teamId)
        setMembers(items)
      } catch (err: any) {
        setError(err?.message || 'Unable to load members.')
      } finally {
        setIsLoading(false)
      }
    }
    if (teamId) {
      void load()
    }
  }, [teamId])

  return (
    <aside className="bg-white border rounded-lg p-4 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Members</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700" aria-label={`Member count: ${members.length}`}>{members.length}</span>
      </div>
      {isLoading && <p className="mt-3 text-xs text-gray-500">Loading members…</p>}
      {!isLoading && error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {!isLoading && !error && (
        <div className="mt-3 flex -space-x-2">
          {members.slice(0, 5).map((m, idx) => (
            <div key={`${m.id}-${idx}`} className="ring-2 ring-white rounded-full">
              <Avatar name={m.name} />
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => navigate(`/teams/${teamId}/members`)}
        className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-800"
        aria-label="Manage team members"
      >
        Manage Members
      </button>
    </aside>
  )
}
