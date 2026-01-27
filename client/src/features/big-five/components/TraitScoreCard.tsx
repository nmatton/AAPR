import React from 'react';
import { Trait, getTraitLabel, getTraitDescription, getScoreLevel, TRAIT_DEFINITIONS } from '../utils/traitInterpretation';

interface TraitScoreCardProps {
    trait: Trait;
    score: number;
}

export const TraitScoreCard: React.FC<TraitScoreCardProps> = ({ trait, score }) => {
    const def = TRAIT_DEFINITIONS[trait];
    const label = getTraitLabel(trait, score);
    const description = getTraitDescription(trait, score);
    const level = getScoreLevel(score);

    const getBorderColor = () => {
        switch (level) {
            case 'high': return 'border-emerald-500/50';
            case 'low': return 'border-blue-500/50';
            default: return 'border-gray-700';
        }
    }

    const getTextColor = () => {
        switch (level) {
            case 'high': return 'text-emerald-400';
            case 'low': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    }

    return (
        <div className={`bg-gray-800 rounded-lg p-4 border ${getBorderColor()} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-gray-100" style={{ color: def.color }}>{def.label}</h3>
                <span className="text-2xl font-bold text-white">{score}</span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score}%`, backgroundColor: def.color }}
                ></div>
            </div>

            <div className="space-y-1">
                <p className={`font-medium ${getTextColor()}`}>
                    {label}
                </p>
                <p className="text-sm text-gray-400">
                    {description}
                </p>
            </div>
        </div>
    );
};
