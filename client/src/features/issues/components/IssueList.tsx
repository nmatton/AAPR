import React from 'react';
import { IssueSummary } from '../api/issuesApi';
import { IssueCard } from './IssueCard';

interface IssueListProps {
    issues: IssueSummary[];
    isLoading: boolean;
    teamId: number;
    onEmptyAction?: () => void;
}

export const IssueList: React.FC<IssueListProps> = ({ issues, isLoading, teamId, onEmptyAction }) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (issues.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Get started by submitting a new issue or try adjusting your filters.
                </p>
                {onEmptyAction && (
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={onEmptyAction}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Submit Issue
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {issues.map(issue => (
                <IssueCard key={issue.id} issue={issue} teamId={teamId} />
            ))}
        </div>
    );
};
