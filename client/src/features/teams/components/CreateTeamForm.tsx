import { useNavigate } from 'react-router-dom';

export const CreateTeamForm = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
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
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-3xl font-bold text-gray-700 mb-4">Create Team</h2>
          <p className="text-gray-500">
            Coming soon in Story 1.4
          </p>
        </div>
      </div>
    </div>
  );
};
