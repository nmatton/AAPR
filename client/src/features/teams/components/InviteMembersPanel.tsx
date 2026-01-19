import { useEffect, useMemo, useState } from 'react'
import { createInvite, getInvites, resendInvite } from '../api/invitesApi'
import type { TeamInvite, InviteStatus } from '../types/invite.types'

interface InviteMembersPanelProps {
  teamId: number
  teamName: string
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

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const InviteMembersPanel = ({ teamId, teamName }: InviteMembersPanelProps) => {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const sortedInvites = useMemo(() => {
    return [...invites].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [invites])

  useEffect(() => {
    const loadInvites = async () => {
      setIsLoading(true)
      try {
        const data = await getInvites(teamId)
        setInvites(data)
      } catch (error) {
        setToast({ type: 'error', message: 'Failed to load invites.' })
      } finally {
        setIsLoading(false)
      }
    }

    loadInvites()
  }, [teamId])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast(null)
    }, 3000)

    return () => clearTimeout(timer)
  }, [toast])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!isValidEmail(email)) {
      setEmailError('Invalid email format')
      return
    }

    setEmailError(null)
    setIsSubmitting(true)

    try {
      const invite = await createInvite(teamId, email)
      setInvites((prev) => [invite, ...prev.filter((item) => item.id !== invite.id)])
      setEmail('')
      setToast({ type: 'success', message: `Invite sent to ${email}` })
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to send invite.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async (inviteId: number) => {
    try {
      const updated = await resendInvite(teamId, inviteId)
      setInvites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setToast({ type: 'success', message: 'Invite email resent.' })
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to resend invite.' })
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Invite Members</h3>
          <p className="text-sm text-gray-500">Invite teammates to join {teamName}</p>
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

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="name@company.com"
            aria-label="Email Address"
          />
          {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-70"
        >
          {isSubmitting ? 'Sending...' : 'Send Invite'}
        </button>
      </form>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Invites</h4>
          {isLoading && <span className="text-xs text-gray-400">Loading...</span>}
        </div>

        {!isLoading && sortedInvites.length === 0 && (
          <p className="text-sm text-gray-500">No invites yet.</p>
        )}

        <ul className="space-y-3">
          {sortedInvites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{invite.email}</p>
                <p className="text-xs text-gray-500">Status: {invite.status}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusStyles[invite.status as InviteStatus]
                  }`}
                >
                  {invite.status}
                </span>
                {(invite.status === 'Pending' || invite.status === 'Failed') && (
                  <button
                    type="button"
                    onClick={() => handleResend(invite.id)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    aria-label="Resend email"
                  >
                    Resend Email
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
