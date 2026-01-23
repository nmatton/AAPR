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
  description?: string | null
  categoryId: string
  categoryName: string
  method?: string | null
  tags?: string[] | null
  benefits?: string[] | null
  pitfalls?: string[] | null
  workProducts?: string[] | null
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
