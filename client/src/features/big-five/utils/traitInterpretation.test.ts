import { describe, it, expect } from 'vitest';
import {
    getScoreLevel,
    getTraitLabel,
    getTraitDescription,
    TRAIT_DEFINITIONS,
    Trait,
    getMarkedColor
} from './traitInterpretation';

describe('Big Five Interpretation Utils', () => {
    describe('getScoreLevel', () => {
        it('returns "low" for scores < 45', () => {
            expect(getScoreLevel(0)).toBe('low');
            expect(getScoreLevel(44)).toBe('low');
        });

        it('returns "neutral" for scores 45-55', () => {
            expect(getScoreLevel(45)).toBe('neutral');
            expect(getScoreLevel(50)).toBe('neutral');
            expect(getScoreLevel(55)).toBe('neutral');
        });

        it('returns "high" for scores > 55', () => {
            expect(getScoreLevel(56)).toBe('high');
            expect(getScoreLevel(100)).toBe('high');
        });
    });

    describe('getTraitLabel', () => {
        const trait: Trait = 'openness';

        it('returns low label for low score', () => {
            expect(getTraitLabel(trait, 30)).toBe(TRAIT_DEFINITIONS.openness.lowLabel);
        });

        it('returns high label for high score', () => {
            expect(getTraitLabel(trait, 80)).toBe(TRAIT_DEFINITIONS.openness.highLabel);
        });

        it('returns "Balanced" for neutral score', () => {
            expect(getTraitLabel(trait, 50)).toBe('Balanced');
        });
    });

    describe('getTraitDescription', () => {
        const trait: Trait = 'neuroticism';

        it('returns low description for low score', () => {
            expect(getTraitDescription(trait, 20)).toBe(TRAIT_DEFINITIONS.neuroticism.lowDescription);
        });

        it('returns high description for high score', () => {
            expect(getTraitDescription(trait, 90)).toBe(TRAIT_DEFINITIONS.neuroticism.highDescription);
            // Verify specific content for Neuroticism (checking for "Sensitive / Anxious" logic)
            expect(getTraitDescription(trait, 90)).toContain('Prone to stress');
        });

        it('returns balanced description for neutral score', () => {
            expect(getTraitDescription(trait, 50)).toContain('balance');
        });
    });

    describe('getMarkedColor', () => {
        it('returns gray for neutral', () => {
            expect(getMarkedColor('extraversion', 50)).toBe('#9CA3AF');
        });
        it('returns trait color for non-neutral', () => {
            expect(getMarkedColor('extraversion', 20)).toBe(TRAIT_DEFINITIONS.extraversion.color);
            expect(getMarkedColor('extraversion', 80)).toBe(TRAIT_DEFINITIONS.extraversion.color);
        })
    })
});
