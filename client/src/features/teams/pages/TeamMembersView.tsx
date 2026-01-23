import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMembersStore } from '../state/membersSlice'
import { logMembersPageViewed } from '../api/membersApi'
import { useInvitesStore } from '../state/invitesSlice'
import { useTeamsStore } from '../state/teamsSlice'
import { MembersList } from '../components/MembersList'
import { InvitePanel } from '../components/InvitePanel'
import { PendingInvitesList } from '../components/PendingInvitesList'

/**
 * TeamMembersView - Dedicated page for managing team members and invites
 * Includes members list, invite panel, and pending invites
 * Logs analytics event when page is viewed
 */
export const TeamMembersView = () => {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const numericTeamId = Number(teamId)

  const { teams, fetchTeams, isLoading: teamsLoading } = useTeamsStore()
  const { members, fetchMembers, isLoading: membersLoading, error: membersError, removeTeamMember } = useMembersStore()
  const { invites, fetchInvites, isLoading: invitesLoading, error: invitesError } = useInvitesStore()

  const selectedTeam = teams.find((team) => team.id === numericTeamId)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [successTimeoutId, setSuccessTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Cleanup success timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutId !== null) {
        clearTimeout(successTimeoutId)
      }
    }
  }, [successTimeoutId])

  // Log event when page is viewed
  useEffect(() => {
    if (numericTeamId) {
      void logMembersPageViewed(numericTeamId)
    }
  }, [numericTeamId])

  // Load teams if not already loaded
  useEffect(() => {
    if (teams.length === 0) {
      void fetchTeams()
    }
  }, [teams.length, fetchTeams])

  // Load members and invites when team is available
  useEffect(() => {
    if (numericTeamId) {
      void fetchMembers(numericTeamId)
      void fetchInvites(numericTeamId)
    }
  }, [numericTeamId, fetchMembers, fetchInvites])

  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message)
    const timeoutId = setTimeout(() => setSuccessMessage(null), 3000)
    setSuccessTimeoutId(timeoutId)
  }, [])

  const handleMemberRemoved = useCallback(
    async (memberId: number, memberName: string) => {
      try {
        await removeTeamMember(numericTeamId, memberId)
        showSuccessMessage(`${memberName} removed from team`)
      } catch (error) {
        // Error is handled in the store and shown via error state
      }
    },
    [numericTeamId, removeTeamMember, showSuccessMessage]
  )

  const handleInviteSent = useCallback(
    (email: string) => {
      showSuccessMessage(`Invite sent to ${email}`)
    },
    [showSuccessMessage]
  )

  const handleInviteRetried = useCallback(() => {
    showSuccessMessage('Invite resent successfully')
  }, [showSuccessMessage])

  const isLoading = teamsLoading || (membersLoading && members.length === 0) || (invitesLoading && invites.length === 0)
  const error = membersError || invitesError

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(`/teams/${teamId}`)}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
          aria-label="Back to team dashboard"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Team Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{selectedTeam?.name || 'Team'} Members</h1>
          <p className="mt-2 text-gray-600">Manage your team composition, invitations, and member access</p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">Loading team members...</p>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 flex items-center rounded-lg border border-green-200 bg-green-50 p-4">
            <svg className="mr-2 h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Main content */}
        {!isLoading && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left column - Members and Pending Invites (2/3 width) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Members List */}
              <div>
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Team Members</h2>
                <MembersList members={members} onMemberRemoved={handleMemberRemoved} />
              </div>

              {/* Pending Invites List */}
              {invites.length > 0 && (
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">Pending Invitations</h2>
                  <PendingInvitesList invites={invites} teamId={numericTeamId} onInviteRetried={handleInviteRetried} />
                </div>
              )}
            </div>

            {/* Right column - Invite Panel (1/3 width) */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <InvitePanel teamId={numericTeamId} onInviteSent={handleInviteSent} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
