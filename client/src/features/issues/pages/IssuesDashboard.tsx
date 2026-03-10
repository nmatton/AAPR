import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IssueFilters as FilterOptions, CreateIssueDto } from '../api/issuesApi';
import { useIssues } from '../hooks/useIssues';
import { IssueFilters } from '../components/IssueFilters';
import { IssueSort } from '../components/IssueSort';
import { IssueList } from '../components/IssueList';
import { IssueSubmissionModal } from '../components/IssueSubmissionModal';
import { fetchTeamPractices } from '../../teams/api/teamPracticesApi';
import { getMembers } from '../../teams/api/membersApi';
import type { Practice } from '../../practices/types';
import type { TeamMemberSummary } from '../../teams/types/member.types';


export const IssuesDashboard = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const numericTeamId = Number(teamId);

    const [filters, setFilters] = useState<FilterOptions>({
        sortBy: 'createdAt',
        sortDir: 'desc'
    });

    const [practices, setPractices] = useState<Practice[]>([]);
    const [members, setMembers] = useState<TeamMemberSummary[]>([]);

    // 1. Fetch Issues
    const { data: issues, isLoading, refetch } = useIssues(numericTeamId, filters);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

    // 2. Fetch Practices and Members
    useEffect(() => {
        if (!numericTeamId) return;

        const fetchData = async () => {
            try {
                const [practicesData, membersData] = await Promise.all([
                    fetchTeamPractices(numericTeamId),
                    getMembers(numericTeamId)
                ]);
                setPractices(practicesData.items);
                setMembers(membersData);
            } catch (error) {
                console.error('Failed to fetch filter data', error);
            }
        };

        fetchData();
    }, [numericTeamId]);

    const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-6">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Issues Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage impediments and track adaptation progress for your team.
                    </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <button
                        onClick={() => setIsIssueModalOpen(true)}
                        className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        New Issue
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <IssueFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        practices={practices.map(p => ({ id: p.id, title: p.title }))}
                        authors={members.map(m => ({ id: m.id, name: m.name }))}
                    />
                    <IssueSort
                        filters={filters}
                        onSortChange={handleFilterChange}
                    />
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <IssueList
                    issues={issues || []}
                    isLoading={isLoading}
                    teamId={numericTeamId}
                />
            </div>

            {isIssueModalOpen && (
                <IssueSubmissionModal
                    isOpen={isIssueModalOpen}
                    onClose={() => setIsIssueModalOpen(false)}
                    practices={practices}
                    onSubmit={async (data: CreateIssueDto) => {
                        try {
                            // Import createIssue dynamically or ensure it is imported
                            const { createIssue } = await import('../api/issuesApi');
                            await createIssue(numericTeamId, data);
                            setIsIssueModalOpen(false);
                            refetch();
                        } catch (e) {
                            console.error('Failed to create issue', e);
                            alert('Failed to create issue');
                        }
                    }}
                />
            )}
        </div>
    );
};

