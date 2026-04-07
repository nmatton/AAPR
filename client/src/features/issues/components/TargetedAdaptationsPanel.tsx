import { useEffect, useState } from 'react';
import {
    getDirectedTagRecommendations,
    type DirectedTagRecommendation,
} from '../api/issuesApi';

interface TargetedAdaptationsPanelProps {
    teamId: number;
    issueId: number;
}

const DeltaBadge = ({ deltaScore }: { deltaScore: number }) => {
    const isPositive = deltaScore > 0;
    const label = `${deltaScore > 0 ? '+' : ''}${deltaScore.toFixed(1)} delta`;

    return (
        <span
            className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
                isPositive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
        >
            {label}
        </span>
    );
};

export const TargetedAdaptationsPanel = ({
    teamId,
    issueId,
}: TargetedAdaptationsPanelProps) => {
    const [recommendations, setRecommendations] = useState<DirectedTagRecommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        const fetchRecommendations = async () => {
            try {
                setLoading(true);
                setError(null);
                const items = await getDirectedTagRecommendations(teamId, issueId);

                if (isActive) {
                    setRecommendations(items);
                }
            } catch {
                if (isActive) {
                    setError('Unable to load targeted adaptations');
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        void fetchRecommendations();

        return () => {
            isActive = false;
        };
    }, [teamId, issueId]);

    if (loading) {
        return (
            <div data-testid="targeted-adaptations-loading" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-700">Targeted Adaptations</h3>
                {[1, 2].map((item) => (
                    <div key={item} className="animate-pulse rounded-lg border border-gray-200 p-3 space-y-2">
                        <div className="h-4 w-2/3 rounded bg-gray-200" />
                        <div className="h-3 w-full rounded bg-gray-200" />
                        <div className="h-3 w-4/5 rounded bg-gray-200" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div data-testid="targeted-adaptations-error" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-1 text-sm font-semibold text-gray-700">Targeted Adaptations</h3>
                <p className="text-sm text-amber-700">{error}</p>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return null;
    }

    return (
        <div data-testid="targeted-adaptations-panel" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-700">Targeted Adaptations</h3>

            {recommendations.map((recommendation) => (
                <article
                    key={recommendation.candidateTagId}
                    data-testid={`targeted-adaptation-card-${recommendation.candidateTagId}`}
                    className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                {recommendation.candidateTagName}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Resolves: {recommendation.sourceProblematicTagName}
                            </p>
                        </div>
                        <DeltaBadge deltaScore={recommendation.deltaScore} />
                    </div>

                    <p className="text-sm text-gray-700">{recommendation.recommendationText}</p>

                    {recommendation.implementationOptions.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Implementation options
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                {recommendation.implementationOptions.map((option) => (
                                    <li key={option}>{option}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </article>
            ))}
        </div>
    );
};