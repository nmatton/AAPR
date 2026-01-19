import { useEffect, useState } from 'react';
import { useTeamsStore } from '../state/teamsSlice';
import { TeamCard } from './TeamCard';
import { EmptyState } from './EmptyState';

export const TeamsList = () => {
  const { teams, isLoading, error, fetchTeams } = useTeamsStore();
  const [minLoadTime, setMinLoadTime] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Ensure loading skeleton shows for at least 300ms to avoid flash
  useEffect(() => {
    if (isLoading) {
      setMinLoadTime(false);
      const timer = setTimeout(() => setMinLoadTime(true), 300);
      return () => clearTimeout(timer);
    } else {
      setMinLoadTime(true);
    }
  }, [isLoading]);

  const handleRetry = () => {
    fetchTeams();
  };

  if (isLoading || !minLoadTime) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Teams</h1>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 h-32 rounded-lg"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Teams</h1>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="w-16 h-16 text-red-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Teams</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Teams</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
};
