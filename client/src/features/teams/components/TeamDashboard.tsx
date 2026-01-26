import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTeamsStore } from '../state/teamsSlice';
import { useCoverageStore } from '../state/coverageSlice';
import { useManagePracticesStore } from '../state/managePracticesSlice';
import { updateTeamName as updateTeamNameApi } from '../api/teamsApi';
import { TeamPracticesPanel } from './TeamPracticesPanel';
import { CoverageSidebar } from './CoverageSidebar';
import { PracticeDetailSidebar } from '../../practices/components/PracticeDetailSidebar';
import { fetchPracticeDetail } from '../../practices/api/practices.api';
import { TeamNameEditor } from './TeamNameEditor';
import { PracticeEditForm } from './PracticeEditForm';
import { RemovePracticeModal } from './RemovePracticeModal';
import type { Practice } from '../../practices/types';

export const TeamDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { teams, isLoading, fetchTeams, error } = useTeamsStore();
  const { fetchCoverage } = useCoverageStore();
  const { removePractice } = useManagePracticesStore();

  const openPracticeId = searchParams.get('practiceId') ? Number(searchParams.get('practiceId')) : null;

  // Team name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [currentVersion, setCurrentVersion] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Practice actions state
  const [practiceToEdit, setPracticeToEdit] = useState<Practice | null>(null);
  const [practiceToRemove, setPracticeToRemove] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    }
  }, [teams.length, fetchTeams]);

  const selectedTeam = useMemo(() => {
    const id = Number(teamId);
    return teams.find((team) => team.id === id);
  }, [teamId, teams]);

  // Update local state when selected team changes
  useEffect(() => {
    if (selectedTeam) {
      setOriginalName(selectedTeam.name);
      setEditingValue(selectedTeam.name);
      setCurrentVersion(selectedTeam.version || 1);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  const refreshCoverage = useCallback(async () => {
    if (!selectedTeam) return;
    await Promise.all([fetchTeams(), fetchCoverage(selectedTeam.id)]);
  }, [fetchCoverage, fetchTeams, selectedTeam]);

  useEffect(() => {
    if (selectedTeam) {
      fetchCoverage(selectedTeam.id);
    }
  }, [fetchCoverage, selectedTeam]);

  const handleEditStart = useCallback(() => {
    setIsEditingName(true);
    setEditingValue(originalName);
    setEditError(null);
  }, [originalName]);

  const handleEditCancel = useCallback(() => {
    setIsEditingName(false);
    setEditingValue(originalName);
    setEditError(null);
  }, [originalName]);

  const handleEditSave = useCallback(async () => {
    if (!teamId) return;

    const trimmedName = editingValue.trim();

    // Basic validation
    if (!trimmedName) {
      setEditError('Team name cannot be empty');
      return;
    }

    if (trimmedName === originalName) {
      setIsEditingName(false);
      return;
    }

    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setEditError('Team name must be 3-50 characters');
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const response = await updateTeamNameApi(parseInt(teamId), trimmedName, currentVersion);

      // Update local state
      setOriginalName(response.name);
      setCurrentVersion(response.version);
      setIsEditingName(false);
      setToastMessage('Team name updated');

      // Refresh team list to update in store
      await fetchTeams();
    } catch (error: any) {
      if (error.code === 'version_mismatch') {
        const currentName = error.details?.currentName || originalName;
        const currentVer = error.details?.currentVersion || currentVersion;
        setEditError(`Team name was updated by another member. Current name: ${currentName}`);
        setOriginalName(currentName);
        setEditingValue(currentName);
        setCurrentVersion(currentVer);
      } else if (error.code === 'duplicate_name') {
        setEditError('A team with this name already exists');
      } else {
        setEditError(error.message || 'Failed to update team name');
      }
    } finally {
      setIsSaving(false);
    }
  }, [teamId, editingValue, originalName, currentVersion, fetchTeams]);

  // Handle Practice Actions
  const handleRemoveClick = (practiceId: number) => {
    setPracticeToRemove(practiceId);
  };

  const handleRemoveConfirm = async () => {
    if (!practiceToRemove || !selectedTeam) return;
    try {
      setIsRemoving(true);
      await removePractice(selectedTeam.id, practiceToRemove);
      setToastMessage('Practice removed from team');
      setPracticeToRemove(null);
      setSearchParams({}); // Close sidebar if open
      refreshCoverage();
    } catch (err) {
      console.error('Failed to remove practice', err);
      setToastMessage('Failed to remove practice');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleEditClick = (practice: Practice) => {
    // Need to ensure practice has all detailed fields. 
    // The sidebar passes a "DetailedPractice", but we need to match what PracticeEditForm expects.
    // Casting for now as DetailedPractice is superset of Practice
    setPracticeToEdit(practice);
  };

  const handlePracticeSaved = async (result: { practiceId?: number; practice?: any }) => {
    setToastMessage('Practice updated successfully');
    await refreshCoverage();
    // Refresh sidebar if open (re-fetching detail handled by sidebar component if we close/reopen or force update, 
    // but React query/SWR would be better. For now, closing sidebar or just relying on internal update)
    // Actually, sidebar refetches on open. If we keep it open, we might see old data unless we trigger update.
    // For simplicity, let's keep it open but maybe we need a way to reload.
  };

  const handleNavigateToPractice = async (practiceId: number) => {
    // Update URL to open the new practice
    setSearchParams({ practiceId: practiceId.toString() });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 rounded-md bg-teal-50 text-teal-700 px-4 py-2 text-sm shadow">
            {toastMessage}
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/teams')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Teams
          </button>
          {selectedTeam && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/teams/${selectedTeam.id}/members`)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                aria-label="Manage team members"
              >
                Members
              </button>
              <button
                onClick={() => navigate(`/teams/${selectedTeam.id}/practices/add`)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Add Practices
              </button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">Loading team dashboard...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && !selectedTeam && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">Team not found.</p>
          </div>
        )}

        {!isLoading && !error && selectedTeam && (
          <div>
            <div className="mb-4">
              {isEditingName ? (
                <div>
                  <TeamNameEditor
                    value={editingValue}
                    onChange={setEditingValue}
                    onSave={handleEditSave}
                    onCancel={handleEditCancel}
                    isSaving={isSaving}
                  />
                  {editError && (
                    <p className="mt-2 text-sm text-red-600">{editError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-800">{originalName}</h2>
                  <button
                    onClick={handleEditStart}
                    className="text-gray-500 hover:text-gray-700 transition"
                    title="Edit team name"
                    aria-label="Edit team name"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-[3fr_1fr] gap-4">
              {/* Center column (75%) - practice list */}
              <div>
                <TeamPracticesPanel
                  teamId={selectedTeam.id}
                  onPracticeRemoved={refreshCoverage}
                  onPracticeClick={(id) => setSearchParams({ practiceId: id.toString() })}
                  onEditClick={() => navigate(`/teams/${selectedTeam.id}/practices/manage`)}
                />
              </div>
              {/* Right sidebar (25%) - coverage */}
              <div>
                <CoverageSidebar teamId={selectedTeam.id} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Practice detail overlay */}
      <PracticeDetailSidebar
        isOpen={!!openPracticeId}
        practiceId={openPracticeId}
        onClose={() => setSearchParams({})}
        teamId={Number(teamId)}
        isPracticeInTeam={true} // In Dashboard, we are looking at team practices
        onRemoveFromTeam={(id) => handleRemoveClick(id)}
        onEdit={(practice) => handleEditClick(practice)}
        onNavigateToPractice={handleNavigateToPractice}
      />

      {/* Edit Form Modal */}
      {practiceToEdit && selectedTeam && (
        <PracticeEditForm
          teamId={selectedTeam.id}
          practice={practiceToEdit as any}
          onClose={() => setPracticeToEdit(null)}
          onSaved={handlePracticeSaved}
          onRefreshRequested={async () => {
            // Return null or implement refresh logic if needed
            return null;
          }}
        />
      )}

      {/* Remove Confirmation Modal */}
      {practiceToRemove && selectedTeam && (
        <RemovePracticeModal
          practice={{ id: practiceToRemove, title: 'Practice' } as any} // Mock minimal practice object for modal
          teamId={selectedTeam.id}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setPracticeToRemove(null)}
          isRemoving={isRemoving}
        />
      )}
    </div>
  );
};
