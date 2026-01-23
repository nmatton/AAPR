import { useState, useCallback } from 'react'
import type { TeamMemberSummary } from '../types/member.types'

interface MembersListProps {
  members: TeamMemberSummary[]
  onMemberRemoved: (memberId: number, memberName: string) => Promise<void>
}

interface ConfirmDialogState {
  isOpen: boolean
  memberId: number | null
  memberName: string
  isRemoving: boolean
}

const formatJoinDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * MembersList - Displays current team members with remove functionality
 * Includes name, email, join date, and remove button with confirmation dialog
 */
export const MembersList = ({ members, onMemberRemoved }: MembersListProps) => {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    memberId: null,
    memberName: '',
    isRemoving: false
  })

  const handleRemoveClick = useCallback((memberId: number, memberName: string) => {
    setConfirmDialog({
      isOpen: true,
      memberId,
      memberName,
      isRemoving: false
    })
  }, [])

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmDialog.memberId) return

    setConfirmDialog((prev) => ({ ...prev, isRemoving: true }))

    try {
      await onMemberRemoved(confirmDialog.memberId, confirmDialog.memberName)
      setConfirmDialog({
        isOpen: false,
        memberId: null,
        memberName: '',
        isRemoving: false
      })
    } catch (error) {
      // Error is handled by parent component
      setConfirmDialog((prev) => ({ ...prev, isRemoving: false }))
    }
  }, [confirmDialog.memberId, confirmDialog.memberName, onMemberRemoved])

  const handleCancelRemove = useCallback(() => {
    setConfirmDialog({
      isOpen: false,
      memberId: null,
      memberName: '',
      isRemoving: false
    })
  }, [])

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <svg className="mx-auto mb-4 h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 20H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v5a6 6 0 01-6 6z" />
        </svg>
        <p className="text-gray-600">No team members yet</p>
        <p className="text-sm text-gray-500">Invite members using the form on the right</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm text-gray-600">{formatJoinDate(member.joinDate)}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemoveClick(member.id, member.name)}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                      aria-label={`Remove ${member.name} from team`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Remove Member?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to remove <strong>{confirmDialog.memberName}</strong> from the team? They'll lose access to all team practices and data.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancelRemove}
                disabled={confirmDialog.isRemoving}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                aria-label="Cancel remove"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={confirmDialog.isRemoving}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
                aria-label={`Confirm remove ${confirmDialog.memberName}`}
              >
                {confirmDialog.isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
