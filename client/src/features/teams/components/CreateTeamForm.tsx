import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamsStore } from '../state/teamsSlice';
import { TeamNameStep } from './TeamNameStep';
import { PracticeSelectionStep } from './PracticeSelectionStep';

// Mock practices data for MVP - in real implementation, this would be fetched from API
const MOCK_PRACTICES = [
  { id: 1, title: 'Daily Standup', goal: 'Synchronize team daily', category: 'FEEDBACK & APPRENTISSAGE' },
  { id: 2, title: 'Sprint Planning', goal: 'Plan upcoming sprint work', category: 'PLANIFICATION' },
  { id: 3, title: 'Sprint Review', goal: 'Demo completed work', category: 'FEEDBACK & APPRENTISSAGE' },
  { id: 4, title: 'Sprint Retrospective', goal: 'Reflect on process improvements', category: 'FEEDBACK & APPRENTISSAGE' },
  { id: 5, title: 'Pair Programming', goal: 'Two developers working together', category: 'PRATIQUES TECHNIQUES' },
  { id: 6, title: 'Code Review', goal: 'Peer review of code changes', category: 'PRATIQUES TECHNIQUES' },
  { id: 7, title: 'Test-Driven Development', goal: 'Write tests before implementation', category: 'PRATIQUES TECHNIQUES' },
  { id: 8, title: 'Continuous Integration', goal: 'Automated build and test', category: 'PRATIQUES TECHNIQUES' },
];

export const CreateTeamForm = () => {
  const [step, setStep] = useState<'name' | 'practices'>('name');
  const [teamName, setTeamName] = useState('');
  const [selectedPracticeIds, setSelectedPracticeIds] = useState<number[]>([]);
  
  const { createTeam, isCreating, error } = useTeamsStore();
  const navigate = useNavigate();
  
  const handleNameSubmit = (name: string) => {
    setTeamName(name);
    setStep('practices');
  };
  
  const handlePracticeSelection = (practiceIds: number[]) => {
    setSelectedPracticeIds(practiceIds);
  };
  
  const handleCreateTeam = async () => {
    try {
      const team = await createTeam(teamName, selectedPracticeIds);
      // Navigate to teams list (team dashboard would be /teams/${team.id} when implemented)
      navigate('/teams');
    } catch (error) {
      // Error handled by state; component displays error message
      console.error('Failed to create team:', error);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create New Team</h1>
      
      {/* Progress Indicator */}
      <div className="flex items-center mb-8">
        <div className={`flex-1 ${step === 'name' ? 'text-blue-600' : 'text-green-600'}`}>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full ${step === 'name' ? 'bg-blue-600' : 'bg-green-600'} text-white flex items-center justify-center font-bold`}>
              {step === 'name' ? '1' : '✓'}
            </div>
            <span className="ml-2 font-medium">Team Name</span>
          </div>
        </div>
        <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
        <div className={`flex-1 ${step === 'practices' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full ${step === 'practices' ? 'bg-blue-600' : 'bg-gray-300'} text-white flex items-center justify-center font-bold`}>
              2
            </div>
            <span className="ml-2 font-medium">Select Practices</span>
          </div>
        </div>
      </div>
      
      {/* Step Content */}
      {step === 'name' && (
        <TeamNameStep onSubmit={handleNameSubmit} />
      )}
      
      {step === 'practices' && (
        <PracticeSelectionStep
          practices={MOCK_PRACTICES}
          onBack={() => setStep('name')}
          onSubmit={handlePracticeSelection}
          onCreate={handleCreateTeam}
          isCreating={isCreating}
          selectedPracticeIds={selectedPracticeIds}
        />
      )}
      
      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};
