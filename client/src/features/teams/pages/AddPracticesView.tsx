import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeamsStore } from '../state/teamsSlice';
import { useAddPracticesStore } from '../state/addPracticesSlice';
import { PracticeCard } from '../../practices/components/PracticeCard';
import { PillarFilterDropdown } from '../../practices/components/PillarFilterDropdown';
import { PracticeCatalogDetail } from '../../practices/components/PracticeCatalogDetail';
import type { Practice } from '../types/practice.types';

export const AddPracticesView = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { teams, fetchTeams } = useTeamsStore();
  const { 
    practices, 
    isLoading, 
    error, 
    total, 
    page, 
    pageSize,
    searchQuery,
    selectedPillars,
    loadAvailablePractices, 
    addPractice,
    setSearchQuery,
    togglePillar,
    clearFilters
  } = useAddPracticesStore();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentDetail, setCurrentDetail] = useState<Practice | null>(null);
  const [isAddingPracticeId, setIsAddingPracticeId] = useState<number | null>(null);
  const numericTeamId = Number(teamId);

  const selectedTeam = teams.find((team) => team.id === numericTeamId);

  const availablePillars = useMemo(() => {
    const pillarMap = new Map<number, { id: number; name: string; category: string; description?: string | null }>();
    practices.forEach((practice) => {
      practice.pillars.forEach((pillar) => {
        pillarMap.set(pillar.id, pillar);
      });
    });
    return Array.from(pillarMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [practices]);

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    }
  }, [teams.length, fetchTeams]);

  useEffect(() => {
    if (numericTeamId) {
      loadAvailablePractices(numericTeamId);
    }
  }, [numericTeamId, loadAvailablePractices, searchQuery, selectedPillars]);

  const handleAddPractice = async (practice: Practice) => {
    try {
      setIsAddingPracticeId(practice.id);
      await addPractice(numericTeamId, practice.id);
      setSuccessMessage(`"${practice.title}" added to team portfolio`);
      
      // Refresh teams to update coverage stats
      await fetchTeams();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      // Error is handled in the store
    } finally {
      setIsAddingPracticeId(null);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleLoadMore = () => {
    if (numericTeamId) {
      loadAvailablePractices(numericTeamId, page + 1);
    }
  };

  const hasMore = total > practices.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/teams/${teamId}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Team Dashboard
        </button>

        <h2 className="text-3xl font-bold text-gray-700 mb-2">
          Add Practices to {selectedTeam?.name || 'Team'}
        </h2>
        <p className="text-gray-600 mb-6">
          Select practices from the catalog to add to your team portfolio
        </p>

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {successMessage}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search practices..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <PillarFilterDropdown
              pillars={availablePillars}
              selectedPillars={selectedPillars}
              onToggle={togglePillar}
              onClear={clearFilters}
              isLoading={isLoading && availablePillars.length === 0}
            />
          </div>

          {(searchQuery || selectedPillars.length > 0) && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {searchQuery && (
                  <span>
                    Search: <strong>{searchQuery}</strong>
                  </span>
                )}
                {searchQuery && selectedPillars.length > 0 && <span> • </span>}
                {selectedPillars.length > 0 && (
                  <span>
                    {selectedPillars.length} pillar{selectedPillars.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && practices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">Loading available practices...</p>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => loadAvailablePractices(numericTeamId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && practices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-600 text-lg font-medium mb-2">
              All practices already selected
            </p>
            <p className="text-gray-500 mb-4">
              Your team has already added all available practices
            </p>
            <button
              onClick={() => navigate(`/teams/${teamId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Practices list */}
        {!isLoading && !error && practices.length > 0 && (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {practices.length} of {total} practices
            </div>
            <div className="space-y-4 mb-6">
              {practices.map((practice) => (
                <PracticeCard
                  key={practice.id}
                  practice={practice}
                  onSelect={setCurrentDetail}
                  onAction={handleAddPractice}
                  actionLabel="Add to team"
                  actionAriaLabel="Add to team"
                  highlightQuery={searchQuery}
                />
              ))}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
        {currentDetail && (
          <PracticeCatalogDetail
            practice={currentDetail}
            onClose={() => setCurrentDetail(null)}
            actionLabel="Add to team"
            onAction={() => handleAddPractice(currentDetail)}
            actionDisabled={isAddingPracticeId === currentDetail.id}
            actionLoading={isAddingPracticeId === currentDetail.id}
          />
        )}
      </div>
    </div>
  );
};
