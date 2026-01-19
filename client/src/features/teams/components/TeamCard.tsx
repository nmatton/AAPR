import { useNavigate } from 'react-router-dom';
import type { Team } from '../types/team.types';

interface TeamCardProps {
  team: Team;
}

export const TeamCard = ({ team }: TeamCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/teams/${team.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Open ${team.name} dashboard`}
    >
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{team.name}</h3>
      
      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
        <span>{team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}</span>
        <span>•</span>
        <span>{team.practiceCount} {team.practiceCount === 1 ? 'practice' : 'practices'}</span>
        <span>•</span>
        <span className="font-medium text-blue-600">{team.coverage}% coverage</span>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <span className={`text-xs px-2 py-1 rounded ${
          team.role === 'owner' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {team.role === 'owner' ? 'Owner' : 'Member'}
        </span>
        
        <span className="text-xs text-gray-500">
          {new Date(team.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};
