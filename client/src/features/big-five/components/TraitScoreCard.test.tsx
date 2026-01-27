import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraitScoreCard } from './TraitScoreCard';

describe('TraitScoreCard', () => {
    it('renders trait label and score correctly', () => {
        render(<TraitScoreCard trait="openness" score={75} />);
        expect(screen.getByText('Openness')).toBeInTheDocument();
        expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('displays high score interpretation correctly', () => {
        render(<TraitScoreCard trait="extraversion" score={80} />);
        expect(screen.getByText('Outgoing / Energetic')).toBeInTheDocument();
        // Check for high score styling (emerald color)
        const label = screen.getByText('Outgoing / Energetic');
        expect(label).toHaveClass('text-emerald-400');
    });

    it('displays low score interpretation correctly', () => {
        render(<TraitScoreCard trait="extraversion" score={20} />);
        expect(screen.getByText('Reserved / Solitary')).toBeInTheDocument();
        // Check for low score styling (blue color)
        const label = screen.getByText('Reserved / Solitary');
        expect(label).toHaveClass('text-blue-400');
    });

    it('displays neutral score interpretation correctly', () => {
        render(<TraitScoreCard trait="extraversion" score={50} />);
        expect(screen.getByText('Balanced')).toBeInTheDocument();
        // Check for neutral score styling (gray color)
        const label = screen.getByText('Balanced');
        expect(label).toHaveClass('text-gray-400');
    });
});
