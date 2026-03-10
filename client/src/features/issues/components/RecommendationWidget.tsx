import { useEffect, useState, useCallback } from 'react';
import { getRecommendations, PracticeRecommendation } from '../api/recommendationsApi';

interface RecommendationWidgetProps {
  teamId: number;
  practiceId: number;
  onPracticeClick: (practiceId: number) => void;
}

/**
 * Sidebar widget that displays up to 3 recommended alternative practices
 * for a given team practice. Shows loading skeleton, error/empty states,
 * and makes each card clickable to view practice details.
 */
export const RecommendationWidget = ({
  teamId,
  practiceId,
  onPracticeClick,
}: RecommendationWidgetProps) => {
  const [recommendations, setRecommendations] = useState<PracticeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecommendations(teamId, practiceId);
      setRecommendations(data);
    } catch {
      setError('Unable to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [teamId, practiceId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Loading skeleton
  if (loading) {
    return (
      <div data-testid="recommendations-loading" className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Alternative Practices</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Error state — show friendly message
  if (error) {
    return (
      <div data-testid="recommendations-error" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Alternative Practices</h3>
        <p className="text-sm text-amber-700">{error}</p>
      </div>
    );
  }

  // Empty state — hide widget gracefully
  if (recommendations.length === 0) {
    return (
      <div data-testid="recommendations-empty" className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Alternative Practices</h3>
        <p className="text-sm text-gray-500">No alternative practices available for this practice.</p>
      </div>
    );
  }

  return (
    <div data-testid="recommendations-widget" className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Alternative Practices</h3>
      {recommendations.slice(0, 3).map((rec) => (
        <button
          key={rec.practiceId}
          type="button"
          data-testid={`recommendation-card-${rec.practiceId}`}
          className="w-full text-left rounded-lg border border-gray-200 bg-white p-3 space-y-1.5
                     hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
          onClick={() => onPracticeClick(rec.practiceId)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 truncate pr-2">{rec.title}</span>
            <AffinityBadge delta={rec.affinityDelta} />
          </div>
          <p className="text-xs text-gray-500 line-clamp-2">{rec.reason}</p>
        </button>
      ))}
    </div>
  );
};

/** Small badge showing affinity score difference with colour coding */
const AffinityBadge = ({ delta }: { delta: number }) => {
  const deltaPct = Math.round(delta * 100);
  const colorClass =
    deltaPct >= 20
      ? 'bg-green-100 text-green-700'
      : deltaPct >= 10
        ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      +{deltaPct}%
    </span>
  );
};
