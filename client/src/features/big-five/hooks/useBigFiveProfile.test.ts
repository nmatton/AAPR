import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBigFiveProfile } from './useBigFiveProfile';
import * as bigFiveApi from '../api/bigFiveApi';

// Mock the API module
vi.mock('../api/bigFiveApi', () => ({
    getMyScores: vi.fn(),
}));

describe('useBigFiveProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should start with loading state true', async () => {
        // Mock a pending promise to keep it loading
        (bigFiveApi.getMyScores as any).mockReturnValue(new Promise(() => { }));

        const { result } = renderHook(() => useBigFiveProfile());

        expect(result.current.loading).toBe(true);
        expect(result.current.scores).toBe(null);
        expect(result.current.error).toBe(null);
    });

    it('should return scores on successful fetch', async () => {
        const mockData = {
            completed: true,
            scores: {
                openness: 70,
                conscientiousness: 60,
                extraversion: 50,
                agreeableness: 40,
                neuroticism: 30,
            },
        };

        (bigFiveApi.getMyScores as any).mockResolvedValue(mockData);

        const { result } = renderHook(() => useBigFiveProfile());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.scores).toEqual(mockData.scores);
        expect(result.current.completed).toBe(true);
        expect(result.current.error).toBe(null);
    });

    it('should handle API errors', async () => {
        (bigFiveApi.getMyScores as any).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useBigFiveProfile());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Network error');
        expect(result.current.scores).toBe(null);
    });

    it('should handle non-Error objects thrown', async () => {
        (bigFiveApi.getMyScores as any).mockRejectedValue('String error');

        const { result } = renderHook(() => useBigFiveProfile());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Failed to load profile');
    });
});
