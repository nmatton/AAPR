export type InviteStatus = 'Pending' | 'Added' | 'Failed'

export interface TeamInvite {
  id: number
  teamId: number
  email: string
  status: InviteStatus
  invitedBy?: number
  invitedUserId?: number | null
  createdAt?: string
  updatedAt?: string
  lastSentAt?: string | null
  errorMessage?: string | null
}
