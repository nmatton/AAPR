import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssueStats, IssueStats } from '../../issues/api/issuesApi';

interface TeamIssueStatsCardProps {
    teamId: number;
}

export const TeamIssueStatsCard = ({ teamId }: TeamIssueStatsCardProps) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<IssueStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchStats = async () => {
            try {
                const data = await getIssueStats(teamId);
                if (mounted) {
                    setStats(data);
                    setIsLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    console.error('Failed to load stats', err);
                    setError('Failed to load issue stats');
                    setIsLoading(false);
                }
            }
        };

        fetchStats();
        return () => { mounted = false; };
    }, [teamId]);

    if (isLoading) {
        return (
            <div className="bg-white border rounded-lg p-4 mt-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white border rounded-lg p-4 mt-4">
                <p className="text-red-600 text-xs">{error}</p>
            </div>
        );
    }

    if (!stats) return null;

    const { total, byStatus } = stats;
    const statusSegments = [
        {
            key: 'open',
            label: 'Open',
            count: byStatus.open,
            colorClass: 'bg-blue-500',
        },
        {
            key: 'in_progress',
            label: 'In Progress',
            count: byStatus.in_progress,
            colorClass: 'bg-yellow-500',
        },
        {
            key: 'adaptation_in_progress',
            label: 'Adaptation in progress',
            count: byStatus.adaptation_in_progress,
            colorClass: 'bg-orange-500',
        },
        {
            key: 'evaluated',
            label: 'Evaluated',
            count: byStatus.evaluated,
            colorClass: 'bg-purple-500',
        },
        {
            key: 'done',
            label: 'Done',
            count: byStatus.done,
            colorClass: 'bg-green-500',
        },
    ] as const;
    const segmentTotal = statusSegments.reduce((sum, segment) => sum + segment.count, 0);

    return (
        <aside className="bg-white border rounded-lg p-4 mt-4" data-testid="team-issue-stats-card">
            <h3 className="text-sm font-semibold text-gray-800">Issues</h3>
            <div className="mt-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Total Issues</span>
                    <span className="text-xs font-semibold text-gray-800">{total}</span>
                </div>

                {/* Mini Bar Chart */}
                <div className="mt-2 h-3 w-full rounded-full bg-gray-200 flex overflow-hidden">
                    {statusSegments.map(segment => {
                        const width = segmentTotal > 0 ? (segment.count / segmentTotal) * 100 : 0;
                        return (
                            <div
                                key={segment.key}
                                data-testid={`issue-status-segment-${segment.key}`}
                                className={`h-full ${segment.colorClass}`}
                                style={{ width: `${width}%` }}
                                title={`${segment.label}: ${segment.count}`}
                            />
                        );
                    })}
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
                    {statusSegments.map(segment => (
                        <div key={`legend-${segment.key}`} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${segment.colorClass}`}></div>
                            <span>{segment.label} ({segment.count})</span>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => navigate(`/teams/${teamId}/issues`)}
                    className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-800 block w-full text-left"
                >
                    View All Issues
                </button>
            </div>
        </aside>
    );
};
