export type Trait = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';

export type ScoreLevel = 'low' | 'neutral' | 'high';

interface TraitDefinition {
    label: string;
    lowLabel: string;
    lowDescription: string;
    highLabel: string;
    highDescription: string;
    color: string;
}

export const TRAIT_DEFINITIONS: Record<Trait, TraitDefinition> = {
    openness: {
        label: 'Openness',
        lowLabel: 'Practical / Conventional',
        lowDescription: 'Prefers routine, tradition, and familiar tasks.',
        highLabel: 'Imaginative / Curious',
        highDescription: 'Enjoys novelty, abstract thinking, and variety.',
        color: '#8884d8', // Example color, adjust to theme
    },
    conscientiousness: {
        label: 'Conscientiousness',
        lowLabel: 'Spontaneous / Flexible',
        lowDescription: 'Dislikes structure, prefers multitasking or improvising.',
        highLabel: 'Organized / Dependable',
        highDescription: 'Disciplined, goal-oriented, and detail-focused.',
        color: '#82ca9d',
    },
    extraversion: {
        label: 'Extraversion',
        lowLabel: 'Reserved / Solitary',
        lowDescription: 'Enjoys solitude, contemplative, lower energy in groups.',
        highLabel: 'Outgoing / Energetic',
        highDescription: 'Social, talkative, assertive, seeking stimulation.',
        color: '#ffc658',
    },
    agreeableness: {
        label: 'Agreeableness',
        lowLabel: 'Critical / Competitive',
        lowDescription: 'Skeptical, challenges ideas, focuses on self-interest.',
        highLabel: 'Compassionate / Cooperative',
        highDescription: 'Trusting, helpful, values harmony and empathy.',
        color: '#ff8042',
    },
    neuroticism: {
        label: 'Neuroticism',
        lowLabel: 'Calm / Resilient',
        lowDescription: 'Emotionally stable, handles stress well, confident.',
        highLabel: 'Sensitive / Anxious',
        highDescription: 'Prone to stress, worry, and emotional reactivity.',
        color: '#8dd1e1',
    },
};

export const getScoreLevel = (score: number): ScoreLevel => {
    if (score < 45) return 'low';
    if (score > 55) return 'high';
    return 'neutral';
};

export const getTraitLabel = (trait: Trait, score: number): string => {
    const level = getScoreLevel(score);
    const def = TRAIT_DEFINITIONS[trait];
    if (level === 'low') return def.lowLabel;
    if (level === 'high') return def.highLabel;
    return 'Balanced';
};

export const getTraitDescription = (trait: Trait, score: number): string => {
    const level = getScoreLevel(score);
    const def = TRAIT_DEFINITIONS[trait];
    if (level === 'low') return def.lowDescription;
    if (level === 'high') return def.highDescription;
    return 'You display a balance of characteristics from both ends of the spectrum.';
};

export const getMarkedColor = (trait: Trait, score: number): string => {
    const level = getScoreLevel(score);
    if (level === 'neutral') return '#9CA3AF'; // Gray-400 for neutral
    return TRAIT_DEFINITIONS[trait].color;
}
