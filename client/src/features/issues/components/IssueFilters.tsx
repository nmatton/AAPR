import React from 'react';
import { IssueFilters as FilterOptions } from '../api/issuesApi';

interface IssueFiltersProps {
    filters: FilterOptions;
    onFilterChange: (newFilters: Partial<FilterOptions>) => void;
    // We would need fetching practices/authors here or pass them as props
    practices?: { id: number; title: string }[];
    authors?: { id: number; name: string }[];
}

export const IssueFilters: React.FC<IssueFiltersProps> = ({ filters, onFilterChange, practices = [], authors = [] }) => {
    return (
        <div className="flex flex-wrap gap-3 mb-4">
            <select
                className="form-select text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.status || ''}
                onChange={(e) => onFilterChange({ status: e.target.value })}
            >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_DISCUSSION">In Discussion</option>
                <option value="ADAPTATION_IN_PROGRESS">Adaptation in Progress</option>
                <option value="EVALUATED">Evaluated</option>
                <option value="RESOLVED">Resolved</option>
            </select>

            <select
                className="form-select text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.practiceId || ''}
                onChange={(e) => onFilterChange({ practiceId: e.target.value ? Number(e.target.value) : undefined })}
            >
                <option value="">All Practices</option>
                {practices.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                ))}
            </select>

            <select
                className="form-select text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.authorId || ''}
                onChange={(e) => onFilterChange({ authorId: e.target.value ? Number(e.target.value) : undefined })}
            >
                <option value="">All Authors</option>
                {authors.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </select>
        </div>
    );
};
