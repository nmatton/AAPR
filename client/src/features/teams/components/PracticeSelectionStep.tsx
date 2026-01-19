import { useState } from 'react';

interface Practice {
  id: number;
  title: string;
  goal: string;
  category: string;
}

interface PracticeSelectionStepProps {
  practices: Practice[];
  onBack: () => void;
  onSubmit: (practiceIds: number[]) => void;
  onCreate: () => void;
  isCreating: boolean;
  selectedPracticeIds: number[];
}

export const PracticeSelectionStep = ({
  practices,
  onBack,
  onSubmit,
  onCreate,
  isCreating,
  selectedPracticeIds: initialSelectedIds
}: PracticeSelectionStepProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  
  const filteredPractices = practices.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.goal.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const togglePractice = (practiceId: number) => {
    setSelectedIds(prev =>
      prev.includes(practiceId)
        ? prev.filter(id => id !== practiceId)
        : [...prev, practiceId]
    );
  };
  
  const handleCreate = () => {
    onSubmit(selectedIds);
    onCreate();
  };
  
  return (
    <div className="space-y-6">
      {/* Search Box */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search practices..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      
      {/* Practice List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredPractices.map(practice => (
          <div
            key={practice.id}
            onClick={() => togglePractice(practice.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedIds.includes(practice.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{practice.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{practice.goal}</p>
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {practice.category}
                </span>
              </div>
              <div className="ml-4">
                {selectedIds.includes(practice.id) && (
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Selection Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>{selectedIds.length}</strong> practice{selectedIds.length !== 1 ? 's' : ''} selected
        </p>
      </div>
      
      {/* Validation Warning */}
      {selectedIds.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            ⚠️ Please select at least one practice to continue
          </p>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={selectedIds.length === 0 || isCreating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Create Team'
          )}
        </button>
      </div>
    </div>
  );
};
