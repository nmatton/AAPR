import React from 'react';
import { TraitScoreCard } from './TraitScoreCard';
import { Trait } from '../utils/traitInterpretation';

interface BigFiveScores {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
}

interface TraitScoreListProps {
    scores: BigFiveScores;
}

export const TraitScoreList: React.FC<TraitScoreListProps> = ({ scores }) => {
    const traits: Trait[] = [
        'openness',
        'conscientiousness',
        'extraversion',
        'agreeableness',
        'neuroticism',
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {traits.map((trait) => (
                <TraitScoreCard
                    key={trait}
                    trait={trait}
                    score={scores[trait]}
                />
            ))}
        </div>
    );
};
