import { useCallback, useState } from 'react'
import type { TeamInvite } from '../types/invite.types'
import { useInvitesStore } from '../state/invitesSlice'

interface PendingInvitesListProps {
  invites: TeamInvite[]
  teamId: number
  onInviteRetried?: () => void
}

const getInviteStatusDisplay = (status: string): { label: string; color: string } => {
  switch (status.toLowerCase()) {
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' }
    case 'added':
      return { label: 'Accepted', color: 'bg-green-50 text-green-800 border-green-200' }
    case 'failed':
      return { label: 'Failed', color: 'bg-red-50 text-red-800 border-red-200' }
    default:
      return { label: status, color: 'bg-gray-50 text-gray-800 border-gray-200' }
  }
}

const formatCreatedDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * PendingInvitesList - Displays pending invitations with retry functionality
 * Shows email, status, and retry button for failed invites
 */
export const PendingInvitesList = ({ invites, teamId, onInviteRetried }: PendingInvitesListProps) => {
  const [resendingId, setResendingId] = useState<number | null>(null)
  const { resendInviteEmail } = useInvitesStore()

  const handleRetryInvite = useCallback(
    async (inviteId: number) => {
      try {
        setResendingId(inviteId)
        await resendInviteEmail(teamId, inviteId)
        onInviteRetried?.()
      } catch (error) {
        // Error is handled in the store
      } finally {
        setResendingId(null)
      }
    },
    [teamId, resendInviteEmail, onInviteRetried]
  )

  const pendingInvites = invites.filter((invite) => invite.status !== 'Added')

  if (pendingInvites.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <svg className="mx-auto mb-4 h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-600">No pending invitations</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Sent</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pendingInvites.map((invite) => {
              const statusDisplay = getInviteStatusDisplay(invite.status)
              const isRetrying = resendingId === invite.id
              const canRetry = invite.status.toLowerCase() === 'failed'

              return (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm text-gray-600">{formatCreatedDate(invite.createdAt)}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    {canRetry ? (
                      <button
                        onClick={() => handleRetryInvite(invite.id)}
                        disabled={isRetrying}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                        aria-label={`Retry sending invite to ${invite.email}`}
                      >
                        {isRetrying ? 'Resending...' : 'Retry'}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
