import { apiClient } from '../../../lib/apiClient';

export interface Tag {
    id: number;
    name: string;
    description: string | null;
    type: string;
    isGlobal: boolean;
}

export interface GetTagsParams {
    isGlobal?: boolean;
    type?: string;
    practiceIds?: number[];
}

export const getTags = async (params?: GetTagsParams): Promise<Tag[]> => {
    const urlParams = new URLSearchParams();
    if (params?.isGlobal !== undefined) urlParams.append('isGlobal', params.isGlobal.toString());
    if (params?.type !== undefined) urlParams.append('type', params.type);
    if (params?.practiceIds && params.practiceIds.length > 0) {
        params.practiceIds.forEach(id => urlParams.append('practiceIds', id.toString()));
    }

    const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
    return apiClient(`/api/v1/tags${queryString}`);
};
