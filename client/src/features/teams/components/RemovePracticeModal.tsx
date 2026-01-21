import { useEffect, useState } from 'react';
import type { Practice } from '../types/practice.types';
import { fetchPracticeRemovalImpact, type PracticeRemovalImpact } from '../api/teamPracticesApi';

interface RemovePracticeModalProps {
  practice: Practice;
  teamId: number;
  onConfirm: () => void;
  onCancel: () => void;
  isRemoving: boolean;
}

export const RemovePracticeModal = ({
  practice,
  teamId,
  onConfirm,
  onCancel,
  isRemoving
}: RemovePracticeModalProps) => {
  const [impact, setImpact] = useState<PracticeRemovalImpact | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);

  useEffect(() => {
    const loadImpact = async () => {
      try {
        setIsLoadingImpact(true);
        setImpactError(null);
        const result = await fetchPracticeRemovalImpact(teamId, practice.id);
        setImpact(result);
      } catch (error: any) {
        setImpactError(error.message || 'Failed to load impact preview');
      } finally {
        setIsLoadingImpact(false);
      }
    };

    loadImpact();
  }, [teamId, practice.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Remove "{practice.title}"?
          </h3>

          {isLoadingImpact && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Loading impact preview...</p>
            </div>
          )}

          {impactError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{impactError}</p>
            </div>
          )}

          {impact && !isLoadingImpact && (
            <div className="mb-4 space-y-3">
              {impact.willCreateGaps && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-900 mb-1">
                        Coverage gaps will be created
                      </p>
                      <p className="text-sm text-yellow-800 mb-2">
                        Removing this practice will leave gaps in:
                      </p>
                      <ul className="text-sm text-yellow-800 space-y-1 pl-4">
                        {impact.gapPillarNames.map((name) => (
                          <li key={name} className="list-disc">
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {!impact.willCreateGaps && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-green-900">
                        No coverage gaps will be created.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={isRemoving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isRemoving || isLoadingImpact}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRemoving ? 'Removing...' : 'Remove Practice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
