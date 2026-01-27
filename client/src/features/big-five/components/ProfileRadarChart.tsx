import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';

import { BigFiveScores } from '../api/bigFiveApi';

interface ProfileRadarChartProps {
    scores: BigFiveScores;
}

export const ProfileRadarChart: React.FC<ProfileRadarChartProps> = ({ scores }) => {
    const data = [
        { subject: 'Openness', A: scores.openness, fullMark: 100 },
        { subject: 'Conscientiousness', A: scores.conscientiousness, fullMark: 100 },
        { subject: 'Extraversion', A: scores.extraversion, fullMark: 100 },
        { subject: 'Agreeableness', A: scores.agreeableness, fullMark: 100 },
        { subject: 'Neuroticism', A: scores.neuroticism, fullMark: 100 },
    ];

    return (
        <div className="w-full h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#374151" />
                    {/* @ts-expect-error Recharts type definition mismatch with React 18 */}
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                    />
                    <Radar
                        name="My Profile"
                        dataKey="A"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.5}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
