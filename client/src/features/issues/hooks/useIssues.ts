import { useState, useEffect, useCallback } from 'react';
import { getIssues, IssueFilters, IssueSummary } from '../api/issuesApi';

export const useIssues = (teamId: number, filters: IssueFilters) => {
    const [data, setData] = useState<IssueSummary[] | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchIssues = useCallback(async () => {
        if (!teamId || isNaN(teamId)) return;
        setIsLoading(true);
        try {
            const result = await getIssues(teamId, filters);
            setData(result);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [teamId, JSON.stringify(filters)]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    return { data, isLoading, error, refetch: fetchIssues };
};
