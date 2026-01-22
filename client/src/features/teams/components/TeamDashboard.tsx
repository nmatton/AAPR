import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTeamsStore } from '../state/teamsSlice';
import { useCoverageStore } from '../state/coverageSlice';
import { TeamPracticesPanel } from './TeamPracticesPanel';
import { CoverageSidebar } from './CoverageSidebar';
import { MembersSidebar } from './MembersSidebar';
import { PracticeDetailSidebar } from './PracticeDetailSidebar';

export const TeamDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { teams, isLoading, fetchTeams, error } = useTeamsStore();
  const { fetchCoverage } = useCoverageStore();
  const openPracticeId = searchParams.get('practiceId') ? Number(searchParams.get('practiceId')) : null;

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    }
  }, [teams.length, fetchTeams]);

  const selectedTeam = useMemo(() => {
    const id = Number(teamId);
    return teams.find((team) => team.id === id);
  }, [teamId, teams]);

  const refreshCoverage = useCallback(async () => {
    if (!selectedTeam) return;
    await Promise.all([fetchTeams(), fetchCoverage(selectedTeam.id)]);
  }, [fetchCoverage, fetchTeams, selectedTeam]);

  useEffect(() => {
    if (selectedTeam) {
      fetchCoverage(selectedTeam.id);
    }
  }, [fetchCoverage, selectedTeam]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
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
            <button
              onClick={() => navigate(`/teams/${selectedTeam.id}/practices/add`)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Add Practices
            </button>
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
              <h2 className="text-2xl font-bold text-gray-800">{selectedTeam.name}</h2>
            </div>
            <div className="grid grid-cols-[3fr_1fr_1fr] gap-4">
              {/* Center column (60%) - practice list */}
              <div>
                <TeamPracticesPanel
                  teamId={selectedTeam.id}
                  onPracticeRemoved={refreshCoverage}
                  onPracticeClick={(id) => setSearchParams({ practiceId: id.toString() })}
                  onEditClick={() => navigate(`/teams/${selectedTeam.id}/practices/manage`)}
                />
              </div>
              {/* Right sidebar 1 (20%) - coverage */}
              <div>
                <CoverageSidebar teamId={selectedTeam.id} />
              </div>
              {/* Right sidebar 2 (20%) - members */}
              <div>
                <MembersSidebar teamId={selectedTeam.id} />
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Practice detail overlay */}
      <PracticeDetailSidebar
        practiceId={openPracticeId}
        onClose={() => setSearchParams({})}
      />
    </div>
  );
};
