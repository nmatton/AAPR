import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileRadarChart } from './ProfileRadarChart';

// Mock Recharts since it renders SVG and can be complex to test in jsdom
vi.mock('recharts', () => {
    const OriginalModule = vi.importActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: { children: any }) => <div>{children}</div>,
        RadarChart: ({ children }: { children: any }) => <div data-testid="radar-chart">{children}</div>,
        PolarGrid: () => <div data-testid="polar-grid" />,
        PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
        PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
        Radar: () => <div data-testid="radar" />,
    };
});

describe('ProfileRadarChart', () => {
    const mockScores = {
        id: 1,
        userId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        openness: 70,
        conscientiousness: 60,
        extraversion: 40,
        agreeableness: 80,
        neuroticism: 30,
    };

    it('renders the radar chart components', () => {
        render(<ProfileRadarChart scores={mockScores} />);

        expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('polar-grid')).toBeInTheDocument();
        expect(screen.getByTestId('polar-angle-axis')).toBeInTheDocument();
        expect(screen.getByTestId('polar-radius-axis')).toBeInTheDocument();
        expect(screen.getByTestId('radar')).toBeInTheDocument();
    });

    it('renders without crashing with zero scores', () => {
        const zeroScores = {
            id: 2,
            userId: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            openness: 0,
            conscientiousness: 0,
            extraversion: 0,
            agreeableness: 0,
            neuroticism: 0,
        };
        render(<ProfileRadarChart scores={zeroScores} />);
        expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });
});
