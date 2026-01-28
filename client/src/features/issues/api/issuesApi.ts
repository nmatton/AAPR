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
