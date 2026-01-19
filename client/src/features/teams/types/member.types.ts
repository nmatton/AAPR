import type { InviteStatus } from './invite.types'

export interface TeamMemberSummary {
  id: number
  name: string
  email: string
  joinDate: string
  inviteStatus: InviteStatus
  bigFiveCompleted: boolean
}

export interface BigFiveProfile {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

export interface MemberIssueSummary {
  id: number
  title: string
  status: string
  createdAt: string
}

export interface TeamMemberDetail {
  id: number
  name: string
  email: string
  joinDate: string
  bigFiveCompleted: boolean
  bigFiveProfile: BigFiveProfile | null
  issues: MemberIssueSummary[]
}
