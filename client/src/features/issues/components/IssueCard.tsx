import React from 'react';
import { IssueSummary } from '../api/issuesApi';
import { Link } from 'react-router-dom';

interface IssueCardProps {
    issue: IssueSummary;
    teamId: number;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, teamId }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <Link
            to={`/teams/${teamId}/issues/${issue.id}`}
            className="block p-4 mb-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${issue.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                        issue.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {issue.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${issue.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                        issue.status === 'IN_DISCUSSION' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {issue.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <p className="text-gray-600 mb-3 line-clamp-2">{issue.description}</p>

            <div className="flex flex-wrap gap-2 mb-3">
                {issue.practices.map(p => (
                    <span key={p.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                        {p.title}
                    </span>
                ))}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3">
                    <span>{issue.author.name}</span>
                    <span>•</span>
                    <span>{formatDate(issue.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{issue._count.comments}</span>
                </div>
            </div>
        </Link>
    );
};
