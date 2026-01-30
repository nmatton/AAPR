import React from 'react';
import { IssueFilters as FilterOptions } from '../api/issuesApi';

interface IssueSortProps {
    filters: FilterOptions;
    onSortChange: (newFilters: Partial<FilterOptions>) => void;
}

export const IssueSort: React.FC<IssueSortProps> = ({ filters, onSortChange }) => {
    const handleSortChange = (value: string) => {
        const [sortBy, sortDir] = value.split('-');
        onSortChange({
            sortBy: sortBy as 'createdAt' | 'comments',
            sortDir: sortDir as 'asc' | 'desc'
        });
    };

    const currentValue = `${filters.sortBy || 'createdAt'}-${filters.sortDir || 'desc'}`;

    return (
        <div className="mb-4">
            <select
                className="form-select text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={currentValue}
                onChange={(e) => handleSortChange(e.target.value)}
            >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="comments-desc">Most Comments</option>
                <option value="comments-asc">Least Comments</option>
            </select>
        </div>
    );
};
