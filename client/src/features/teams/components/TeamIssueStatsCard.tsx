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
    // Calculate percentages
    const openPct = total > 0 ? (byStatus.open / total) * 100 : 0;
    const wipPct = total > 0 ? (byStatus.in_progress / total) * 100 : 0;
    const donePct = total > 0 ? (byStatus.done / total) * 100 : 0;

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
                    <div className="h-full bg-blue-500" style={{ width: `${openPct}%` }} title={`Open: ${byStatus.open}`} />
                    <div className="h-full bg-yellow-500" style={{ width: `${wipPct}%` }} title={`In Progress: ${byStatus.in_progress}`} />
                    <div className="h-full bg-green-500" style={{ width: `${donePct}%` }} title={`Done: ${byStatus.done}`} />
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>Op ({byStatus.open})</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span>WIP ({byStatus.in_progress})</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Dn ({byStatus.done})</span>
                    </div>
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
