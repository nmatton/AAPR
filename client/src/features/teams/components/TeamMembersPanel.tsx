import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMembers, removeMember, ApiError } from '../api/membersApi'
import { resendInvite } from '../api/invitesApi'
import type { TeamMemberSummary } from '../types/member.types'
import type { InviteStatus } from '../types/invite.types'

interface TeamMembersPanelProps {
  teamId: number
}

interface ToastState {
  type: 'success' | 'error'
  message: string
}

const statusStyles: Record<InviteStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Added: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800'
}

export const TeamMembersPanel = ({ teamId }: TeamMembersPanelProps) => {
  const navigate = useNavigate()
  const [members, setMembers] = useState<TeamMemberSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [hoveredMemberId, setHoveredMemberId] = useState<number | null>(null)
  const [removeTarget, setRemoveTarget] = useState<TeamMemberSummary | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const addedMembersCount = useMemo(() => {
    return members.filter((member) => member.inviteStatus === 'Added').length
  }, [members])

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getMembers(teamId)
      setMembers(data)
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to load team members.' })
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast(null)
    }, 3000)

    return () => clearTimeout(timer)
  }, [toast])

  const handleResend = async (inviteId: number) => {
    try {
      const updated = await resendInvite(teamId, inviteId)
      setMembers((prev) =>
        prev.map((member) =>
          member.id === inviteId
            ? {
                ...member,
                inviteStatus: updated.status
              }
            : member
        )
      )
      setToast({ type: 'success', message: 'Invite email resent.' })
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to resend invite.' })
    }
  }

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return
    setIsRemoving(true)

    try {
      await removeMember(teamId, removeTarget.id)
      setMembers((prev) => prev.filter((member) => member.id !== removeTarget.id))
      setToast({ type: 'success', message: 'Member removed successfully.' })
      setRemoveTarget(null)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'last_member_removal_forbidden') {
        setToast({ type: 'error', message: 'Cannot remove the last team member.' })
      } else {
        setToast({ type: 'error', message: 'Failed to remove member.' })
      }
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Team Members</h3>
          <p className="text-sm text-gray-500">Manage your team membership and invites</p>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`rounded-md px-4 py-2 text-sm ${
            toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading members...</p>}

      {!isLoading && members.length === 0 && (
        <p className="text-sm text-gray-500">No members yet.</p>
      )}

      <ul className="space-y-3">
        {members.map((member) => (
          <li
            key={`${member.inviteStatus}-${member.id}`}
            className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              onClick={() => {
                if (member.inviteStatus === 'Added') {
                  navigate(`/teams/${teamId}/members/${member.id}`)
                }
              }}
              className="text-left"
            >
              <p className="text-sm font-medium text-gray-800">{member.name}</p>
              <p className="text-xs text-gray-500">{member.email}</p>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {member.inviteStatus === 'Pending' ? (
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredMemberId(member.id)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                >
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      statusStyles[member.inviteStatus]
                    }`}
                  >
                    {member.inviteStatus}
                  </span>
                  {hoveredMemberId === member.id && (
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg">
                      <p className="mb-2 font-medium">Awaiting signup</p>
                      <button
                        type="button"
                        onClick={() => handleResend(member.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Resend Invite
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusStyles[member.inviteStatus]
                  }`}
                >
                  {member.inviteStatus}
                </span>
              )}

              {member.inviteStatus === 'Failed' && (
                <button
                  type="button"
                  onClick={() => handleResend(member.id)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Retry
                </button>
              )}

              {member.inviteStatus === 'Added' && (
                <button
                  type="button"
                  onClick={() => setRemoveTarget(member)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {removeTarget && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-gray-800">Remove {removeTarget.name}?</h4>
            <p className="mt-2 text-sm text-gray-600">
              Remove {removeTarget.name} from the team?
            </p>
            {addedMembersCount <= 1 && (
              <p className="mt-2 text-sm font-medium text-red-600">
                Cannot remove the last team member
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveConfirm}
                disabled={isRemoving || addedMembersCount <= 1}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
