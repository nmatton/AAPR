import { apiClient } from '../../../lib/apiClient';

export interface CreateIssueDto {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    practiceIds?: number[];
}

export const createIssue = async (teamId: number, data: CreateIssueDto) => {
    return apiClient(`/api/v1/teams/${teamId}/issues`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export interface IssueDetails {
    issue: {
        id: number;
        title: string;
        description: string;
        priority: 'LOW' | 'MEDIUM' | 'HIGH';
        status: string;
        createdAt: string;
        author: { id: number; name: string };
        practices: { id: number; title: string }[];
    };
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

