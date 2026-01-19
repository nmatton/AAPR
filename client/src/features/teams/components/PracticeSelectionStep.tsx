import { useEffect, useMemo, useState } from 'react';
import { getPractices } from '../api/practicesApi';
import type { Practice } from '../types/practice.types';

interface PracticeSelectionStepProps {
  onBack: () => void;
  onSubmit: (practiceIds: number[]) => void;
  onCreate: () => void;
  isCreating: boolean;
  selectedPracticeIds: number[];
}

export const PracticeSelectionStep = ({
  onBack,
  onSubmit,
  onCreate,
  isCreating,
  selectedPracticeIds: initialSelectedIds
}: PracticeSelectionStepProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [selectedPillarIds, setSelectedPillarIds] = useState<number[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPractices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPractices();
      setPractices(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load practices. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPractices();
  }, []);

  const pillars = useMemo(() => {
    const map = new Map<number, string>();
    practices.forEach((practice) => {
      practice.pillars.forEach((pillar) => {
        map.set(pillar.id, pillar.name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [practices]);

  const filteredPractices = practices.filter((practice) => {
    const matchesSearch =
      practice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      practice.goal.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPillar =
      selectedPillarIds.length === 0 ||
      practice.pillars.some((pillar) => selectedPillarIds.includes(pillar.id));

    return matchesSearch && matchesPillar;
  });

  const togglePractice = (practiceId: number) => {
    setSelectedIds((prev) =>
      prev.includes(practiceId)
        ? prev.filter((id) => id !== practiceId)
        : [...prev, practiceId]
    );
  };

  const togglePillar = (pillarId: number) => {
    setSelectedPillarIds((prev) =>
      prev.includes(pillarId)
        ? prev.filter((id) => id !== pillarId)
        : [...prev, pillarId]
    );
  };

  const handleCreate = () => {
    onSubmit(selectedIds);
    onCreate();
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading practices...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={loadPractices}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search practices..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-2">Filter by pillar</div>
          <div className="flex flex-wrap gap-2">
            {pillars.map((pillar) => (
              <button
                key={pillar.id}
                type="button"
                onClick={() => togglePillar(pillar.id)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedPillarIds.includes(pillar.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                {pillar.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredPractices.map((practice) => (
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {practice.pillars.map((pillar) => (
                    <span key={pillar.id} className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                      {pillar.name}
                    </span>
                  ))}
                </div>
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

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>{selectedIds.length}</strong> practice{selectedIds.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {selectedIds.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            ⚠️ Please select at least one practice to continue
          </p>
        </div>
      )}

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
