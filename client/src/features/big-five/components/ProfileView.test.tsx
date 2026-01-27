import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileView } from './ProfileView';
import { BrowserRouter } from 'react-router-dom';

describe('ProfileView', () => {
    const mockScores = {
        id: 1,
        userId: 1,
        openness: 70,
        conscientiousness: 60,
        extraversion: 40,
        agreeableness: 80,
        neuroticism: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    it('triggers onRetake when retake button is clicked', () => {
        const handleRetake = vi.fn();
        render(
            <BrowserRouter>
                <ProfileView scores={mockScores} onRetake={handleRetake} />
            </BrowserRouter>
        );

        const retakeButton = screen.getByText('Retake Assessment');
        fireEvent.click(retakeButton);
        expect(handleRetake).toHaveBeenCalled();
    });
});
