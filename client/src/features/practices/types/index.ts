export interface Pillar {
  id: number
  name: string
  category: string
  description?: string | null
}

export interface Practice {
  id: number
  title: string
  goal: string
  categoryId: string
  categoryName: string
  isGlobal?: boolean
  practiceVersion?: number
  usedByTeamsCount?: number
  pillars: Pillar[]
}

export interface PracticesResponse {
  items: Practice[]
  page: number
  pageSize: number
  total: number
  requestId?: string
}
