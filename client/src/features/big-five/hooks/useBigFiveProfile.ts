import { useState, useEffect } from 'react';
import { getMyScores, BigFiveScores } from '../api/bigFiveApi';

interface UseBigFiveProfileResult {
    scores: BigFiveScores | null;
    loading: boolean;
    error: string | null;
    completed: boolean;
    refresh: () => Promise<void>;
}

export const useBigFiveProfile = (): UseBigFiveProfileResult => {
    const [scores, setScores] = useState<BigFiveScores | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getMyScores();
            setCompleted(data.completed);
            setScores(data.scores);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return { scores, loading, error, completed, refresh: fetchProfile };
};
