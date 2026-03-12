export interface PracticePillar {
  id: number;
  name: string;
  category: string;
  description?: string | null;
}

export interface ActivityInput {
  sequence: number;
  name: string;
  description: string;
}

export interface RoleInput {
  role: string;
  responsibility: 'Responsible' | 'Accountable' | 'Consulted' | 'Informed';
}

export interface WorkProductInput {
  name: string;
  description: string;
}

export interface MetricInput {
  name: string;
  unit?: string;
  formula?: string;
}

export interface GuidelineInput {
  name: string;
  url: string;
  type?: string;
}

export interface AssociatedPracticeInput {
  targetPracticeId: number;
  associationType: 'Configuration' | 'Equivalence' | 'Dependency' | 'Complementarity' | 'Exclusion';
}

export interface Practice {
  id: number;
  title: string;
  goal: string;
  description?: string | null;
  categoryId: string;
  categoryName: string;
  method?: string | null;
  tags?: string[] | null;
  benefits?: string[] | null;
  pitfalls?: string[] | null;
  workProducts?: string[] | null;
  activities?: unknown[] | null;
  roles?: unknown[] | null;
  completionCriteria?: string | null;
  metrics?: unknown[] | null;
  guidelines?: unknown[] | null;
  associatedPractices?: unknown[] | null;
  isGlobal?: boolean;
  practiceVersion?: number;
  usedByTeamsCount?: number;
  pillars: PracticePillar[];
}

export interface PracticesResponse {
  items: Practice[];
  page: number;
  pageSize: number;
  total: number;
  requestId?: string;
}