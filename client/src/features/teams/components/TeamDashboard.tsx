import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeamsStore } from '../state/teamsSlice';
import { InviteMembersPanel } from './InviteMembersPanel';
import { TeamMembersPanel } from './TeamMembersPanel';

export const TeamDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { teams, isLoading, fetchTeams, error } = useTeamsStore();

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    }
  }, [teams.length, fetchTeams]);

  const selectedTeam = useMemo(() => {
    const id = Number(teamId);
    return teams.find((team) => team.id === id);
  }, [teamId, teams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/teams')}
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
          Back to Teams
        </button>
        
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
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-700">{selectedTeam.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white border rounded-lg">
                <p className="text-sm text-gray-500">Members</p>
                <p className="text-2xl font-semibold text-gray-800">{selectedTeam.memberCount}</p>
              </div>
              <div className="p-4 bg-white border rounded-lg">
                <p className="text-sm text-gray-500">Practices</p>
                <p className="text-2xl font-semibold text-gray-800">{selectedTeam.practiceCount}</p>
              </div>
              <div className="p-4 bg-white border rounded-lg">
                <p className="text-sm text-gray-500">Coverage</p>
                <p className="text-2xl font-semibold text-gray-800">{selectedTeam.coverage}%</p>
              </div>
            </div>
            <InviteMembersPanel teamId={selectedTeam.id} teamName={selectedTeam.name} />
            <TeamMembersPanel teamId={selectedTeam.id} />
          </div>
        )}
      </div>
    </div>
  );
};
