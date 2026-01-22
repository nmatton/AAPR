import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTeamsStore } from '../state/teamsSlice';
import { useAddPracticesStore } from '../state/addPracticesSlice';
import { useManagePracticesStore } from '../state/managePracticesSlice';
import { PracticeCard } from '../../practices/components/PracticeCard';
import { PillarFilterDropdown } from '../../practices/components/PillarFilterDropdown';
import { PracticeCatalogDetail } from '../../practices/components/PracticeCatalogDetail';
import { RemovePracticeModal } from '../components/RemovePracticeModal';
import { CreatePracticeModal } from '../components/CreatePracticeModal';
import { PracticeEditForm } from '../components/PracticeEditForm';
import type { Practice } from '../types/practice.types';

type TabType = 'available' | 'selected';

export const ManagePracticesView = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { teams, fetchTeams } = useTeamsStore();
  const { 
    practices: availablePractices, 
    isLoading: isLoadingAvailable, 
    error: availableError, 
    total: availableTotal, 
    page, 
    searchQuery,
    selectedPillars,
    loadAvailablePractices, 
    addPractice,
    setSearchQuery,
    togglePillar,
    clearFilters
  } = useAddPracticesStore();

  const {
    teamPractices,
    isLoading: isLoadingSelected,
    error: selectedError,
    loadTeamPractices,
    removePractice
  } = useManagePracticesStore();

  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successTimeoutId, setSuccessTimeoutId] = useState<number | null>(null);
  const [gapPillarSuggestions, setGapPillarSuggestions] = useState<string[]>([]);
  const [currentDetail, setCurrentDetail] = useState<Practice | null>(null);
  const [isAddingPracticeId, setIsAddingPracticeId] = useState<number | null>(null);
  const [practiceToRemove, setPracticeToRemove] = useState<Practice | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [practiceToEdit, setPracticeToEdit] = useState<Practice | null>(null);

  const categoryFilter = searchParams.get('category');

  const numericTeamId = Number(teamId);
  const selectedTeam = teams.find((team) => team.id === numericTeamId);

  // Cleanup success timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutId !== null) {
        clearTimeout(successTimeoutId);
      }
    };
  }, [successTimeoutId]);

  const availablePillars = useMemo(() => {
    const pillarMap = new Map<number, { id: number; name: string; category: string; description?: string | null }>();
    availablePractices.forEach((practice) => {
      practice.pillars.forEach((pillar) => {
        pillarMap.set(pillar.id, pillar);
      });
    });
    return Array.from(pillarMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availablePractices]);

  const filteredAvailablePractices = useMemo(() => {
    if (!categoryFilter) {
      return availablePractices;
    }
    return availablePractices.filter((practice) => practice.categoryId === categoryFilter);
  }, [availablePractices, categoryFilter]);

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    }
  }, [teams.length, fetchTeams]);

  useEffect(() => {
    if (numericTeamId && activeTab === 'available') {
      loadAvailablePractices(numericTeamId);
    }
  }, [numericTeamId, activeTab, loadAvailablePractices, searchQuery, selectedPillars]);

  useEffect(() => {
    if (numericTeamId && activeTab === 'selected') {
      loadTeamPractices(numericTeamId);
    }
  }, [numericTeamId, activeTab, loadTeamPractices]);

  useEffect(() => {
    if (categoryFilter && activeTab !== 'available') {
      setActiveTab('available');
    }
  }, [activeTab, categoryFilter]);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3000);
    setSuccessTimeoutId(timeoutId);
  };

  const handleAddPractice = async (practice: Practice) => {
    try {
      setIsAddingPracticeId(practice.id);
      await addPractice(numericTeamId, practice.id);
      showSuccessMessage(`"${practice.title}" added to team portfolio`);
      
      // Refresh teams to update coverage stats
      await fetchTeams();
      
      // If we're on selected tab, refresh that list too
      if (activeTab === 'selected') {
        await loadTeamPractices(numericTeamId);
      }
    } catch (error) {
      // Error is handled in the store
    } finally {
      setIsAddingPracticeId(null);
    }
  };

  const handleRemoveClick = (practice: Practice) => {
    setPracticeToRemove(practice);
  };

  const handleRemoveConfirm = async () => {
    if (!practiceToRemove) return;

    try {
      setIsRemoving(true);
      const result = await removePractice(numericTeamId, practiceToRemove.id);
      showSuccessMessage(`"${practiceToRemove.title}" removed from team portfolio`);
      setGapPillarSuggestions(result.gapPillarNames);
      
      // Refresh teams to update coverage stats
      await fetchTeams();
      
      // Close modal
      setPracticeToRemove(null);
    } catch (error) {
      // Error is handled in the store
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRemoveCancel = () => {
    setPracticeToRemove(null);
  };

  const handlePracticeCreated = async (practiceName: string) => {
    showSuccessMessage(`New practice created: ${practiceName}`);
    setIsCreateModalOpen(false);
    await fetchTeams();
    await loadTeamPractices(numericTeamId);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleLoadMore = () => {
    if (numericTeamId) {
      loadAvailablePractices(numericTeamId, page + 1);
    }
  };

  const hasMoreAvailable = availableTotal > availablePractices.length;
  const isLoading = activeTab === 'available' ? isLoadingAvailable : isLoadingSelected;
  const error = activeTab === 'available' ? availableError : selectedError;
  const practices = activeTab === 'available' ? filteredAvailablePractices : teamPractices;
  const isBlockingError = !isLoading && error && practices.length === 0;
  const handlePracticeAction = activeTab === 'available'
    ? (practice: Practice) => {
      if (isAddingPracticeId === practice.id) {
        return;
      }
      return handleAddPractice(practice);
    }
    : handleRemoveClick;

  const handleEditPractice = (practice: Practice) => {
    setPracticeToEdit(practice);
  };

  const clearCategoryFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('category');
    setSearchParams(nextParams);
  };

  const handlePracticeSaved = async (result: { practiceId?: number; practice?: Practice }) => {
    showSuccessMessage('Practice updated successfully');
    await fetchTeams();
    if (activeTab === 'selected') {
      await loadTeamPractices(numericTeamId);
    } else {
      await loadAvailablePractices(numericTeamId);
    }
    if (result.practice) {
      setCurrentDetail(result.practice);
    }
  };

  const handleRefreshAfterConflict = async () => {
    await loadTeamPractices(numericTeamId);
    await loadAvailablePractices(numericTeamId);

    const refreshedTeamPractices = useManagePracticesStore.getState().teamPractices;
    const refreshedAvailablePractices = useAddPracticesStore.getState().practices;
    const refreshedPractice = [...refreshedTeamPractices, ...refreshedAvailablePractices]
      .find((practice) => practice.id === practiceToEdit?.id) ?? null;

    if (refreshedPractice) {
      setPracticeToEdit(refreshedPractice);
    }

    return refreshedPractice;
  };

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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-700 mb-2">
              Manage Practices - {selectedTeam?.name || 'Team'}
            </h2>
            <p className="text-gray-600">
              Add practices from the catalog or remove practices from your team portfolio
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create New Practice
          </button>
        </div>

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

        {gapPillarSuggestions.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-900 font-medium mb-2">
              Consider adding a practice that covers:
            </p>
            <ul className="text-yellow-800 text-sm list-disc pl-5 space-y-1">
              {gapPillarSuggestions.map((pillar) => (
                <li key={pillar}>Consider adding a practice that covers {pillar}.</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('available')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available Practices
            </button>
            <button
              onClick={() => setActiveTab('selected')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'selected'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Selected Practices ({teamPractices.length})
            </button>
          </nav>
        </div>

        {/* Filters (only on available tab) */}
        {activeTab === 'available' && (
          <div className="mb-6 space-y-4">
            {categoryFilter && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <span>
                  Filtering by category: <strong>{categoryFilter}</strong>
                </span>
                <button
                  type="button"
                  onClick={clearCategoryFilter}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                >
                  Clear category filter
                </button>
              </div>
            )}
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
                isLoading={isLoadingAvailable && availablePillars.length === 0}
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
        )}

        {/* Loading state */}
        {isLoading && practices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">
              {activeTab === 'available' ? 'Loading available practices...' : 'Loading team practices...'}
            </p>
          </div>
        )}

        {/* Error state */}
        {isBlockingError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => activeTab === 'available' ? loadAvailablePractices(numericTeamId) : loadTeamPractices(numericTeamId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {!isBlockingError && !isLoading && error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
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
            {activeTab === 'available' ? (
              <>
                <p className="text-gray-600 text-lg font-medium mb-2">
                  All practices already selected
                </p>
                <p className="text-gray-500 mb-4">
                  Your team has already added all available practices
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-lg font-medium mb-2">
                  No practices selected yet
                </p>
                <p className="text-gray-500 mb-4">
                  Add practices from the Available Practices tab
                </p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Browse Practices
                </button>
              </>
            )}
          </div>
        )}

        {/* Practices list */}
        {!isLoading && practices.length > 0 && (
          <>
            {activeTab === 'available' && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {practices.length} of {availableTotal} practices
              </div>
            )}
            <div className="space-y-4 mb-6">
              {practices.map((practice) => (
                <PracticeCard
                  key={practice.id}
                  practice={practice}
                  onSelect={setCurrentDetail}
                  onAction={handlePracticeAction}
                  actionLabel={activeTab === 'available' ? 'Add to team' : 'Remove'}
                  actionAriaLabel={activeTab === 'available' ? 'Add to team' : 'Remove from team'}
                  highlightQuery={activeTab === 'available' ? searchQuery : ''}
                  onEdit={handleEditPractice}
                  editLabel="Edit"
                />
              ))}
            </div>

            {/* Load more button (only for available tab) */}
            {activeTab === 'available' && hasMoreAvailable && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingAvailable}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoadingAvailable ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Practice detail modal */}
        {currentDetail && (
          <PracticeCatalogDetail
            practice={currentDetail}
            onClose={() => setCurrentDetail(null)}
            actionLabel={activeTab === 'available' ? 'Add to team' : 'Remove'}
            onAction={() => activeTab === 'available' ? handleAddPractice(currentDetail) : handleRemoveClick(currentDetail)}
            actionDisabled={isAddingPracticeId === currentDetail.id}
            actionLoading={isAddingPracticeId === currentDetail.id}
            onEdit={() => handleEditPractice(currentDetail)}
          />
        )}

        {/* Remove practice modal */}
        {practiceToRemove && (
          <RemovePracticeModal
            practice={practiceToRemove}
            teamId={numericTeamId}
            onConfirm={handleRemoveConfirm}
            onCancel={handleRemoveCancel}
            isRemoving={isRemoving}
          />
        )}

        {isCreateModalOpen && (
          <CreatePracticeModal
            teamId={numericTeamId}
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={handlePracticeCreated}
          />
        )}

        {practiceToEdit && (
          <PracticeEditForm
            teamId={numericTeamId}
            practice={practiceToEdit}
            onClose={() => setPracticeToEdit(null)}
            onSaved={handlePracticeSaved}
            onRefreshRequested={handleRefreshAfterConflict}
          />
        )}
      </div>
    </div>
  );
};
