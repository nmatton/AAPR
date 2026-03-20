import { apiClient } from '../../../lib/apiClient';

export interface CreateIssueDto {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    practiceIds?: number[];
    tagIds?: number[];
    isStandalone?: boolean;
}


export const createIssue = async (teamId: number, data: CreateIssueDto) => {
    return apiClient(`/api/v1/teams/${teamId}/issues`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export interface UpdateIssueDto {
    status?: 'OPEN' | 'IN_DISCUSSION' | 'ADAPTATION_IN_PROGRESS' | 'EVALUATED' | 'RESOLVED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const updateIssue = async (teamId: number, issueId: number, data: UpdateIssueDto) => {
    return apiClient(`/api/v1/teams/${teamId}/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
};


export interface IssueDetails {
    issue: {
        id: number;
        title: string;
        description: string;
        decisionText: string | null;
        decisionRecordedAt: string | null;
        decisionRecordedBy: { id: number; name: string } | null;
        evaluationOutcome: string | null;
        evaluationComments: string | null;
        evaluationRecordedAt: string | null;
        evaluationRecordedBy: { id: number; name: string } | null;
        version: number;
        priority: 'LOW' | 'MEDIUM' | 'HIGH';
        status: string;
        createdAt: string;
        author: { id: number; name: string };
        practices: { id: number; title: string }[];
        isStandalone: boolean;
        tags: { id: number; name: string; description: string | null }[];
    };
    comments: {
        id: number;
        content: string;
        createdAt: string;
        author: { id: number; name: string };
    }[];
    history: {
        id: number;
        eventType: string;
        action: string | null;
        actor: { id: number; name: string } | null;
        createdAt: string;
        payload: any;
    }[];
}

export const getIssueDetails = async (teamId: number, issueId: number): Promise<IssueDetails> => {
    // The apiClient wrapper likely handles response.json rejection?
    return apiClient(`/api/v1/teams/${teamId}/issues/${issueId}`);
};



export const createComment = async (teamId: number, issueId: number, content: string) => {
    return apiClient(`/api/v1/teams/${teamId}/issues/${issueId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });
};

export const recordDecision = async (teamId: number, issueId: number, decisionText: string, version: number) => {
    return apiClient(`/api/v1/teams/${teamId}/issues/${issueId}/decisions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decisionText, version }),
    });
};

export const evaluateIssue = async (teamId: number, issueId: number, outcome: string, comments: string, version: number) => {
    return apiClient(`/api/v1/teams/${teamId}/issues/${issueId}/evaluations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outcome, comments, version }),
    });
};


export interface IssueFilters {
    status?: string;
    practiceId?: number;
    authorId?: number;
    sortBy?: 'createdAt' | 'comments';
    sortDir?: 'asc' | 'desc';
}

export interface IssueSummary {
    id: number;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    author: { id: number; name: string };
    practices: { id: number; title: string }[];
    _count: { comments: number };
    isStandalone: boolean;
    tags: { id: number; name: string }[];
}

export const getIssues = async (teamId: number, filters?: IssueFilters): Promise<IssueSummary[]> => {
    const params = new URLSearchParams();
    if (filters) {
        if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
        if (filters.practiceId) params.append('practiceId', filters.practiceId.toString());
        if (filters.authorId) params.append('authorId', filters.authorId.toString());
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDir) params.append('sortDir', filters.sortDir);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient(`/api/v1/teams/${teamId}/issues${queryString}`);
};

export interface IssueStats {
    total: number;
    byStatus: {
        open: number;
        in_progress: number;
        adaptation_in_progress: number;
        evaluated: number;
        done: number;
    };
}

export const getIssueStats = async (teamId: number): Promise<IssueStats> => {
    return apiClient(`/api/v1/teams/${teamId}/issues/stats`);
};

