export interface PracticePillar {
  id: number;
  name: string;
}

export interface Practice {
  id: number;
  title: string;
  goal: string;
  category: string;
  pillars: PracticePillar[];
}

export interface PracticesResponse {
  practices: Practice[];
  requestId: string;
}