import { useEffect, useMemo, useState } from 'react';
import { fetchAvailablePractices, fetchTeamPractices } from '../api/teamPracticesApi';
import { useManagePracticesStore } from '../state/managePracticesSlice';
import type { Practice } from '../types/practice.types';

interface CreatePracticeModalProps {
  teamId: number;
  onClose: () => void;
  onCreated: (practiceName: string) => void;
}

type ModalStep = 'choice' | 'template' | 'form';

type FormState = {
  title: string;
  goal: string;
  categoryId: string;
  pillarIds: number[];
  templatePracticeId?: number;
};

export const CreatePracticeModal = ({ teamId, onClose, onCreated }: CreatePracticeModalProps) => {
  const { createPractice, isCreating, error } = useManagePracticesStore();
  const [step, setStep] = useState<ModalStep>('choice');
  const [templates, setTemplates] = useState<Practice[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [formState, setFormState] = useState<FormState>({
    title: '',
    goal: '',
    categoryId: '',
    pillarIds: []
  });

  useEffect(() => {
    if (step === 'choice') return;
    if (templates.length > 0) return;

    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        setTemplateError(null);

        const teamResponse = await fetchTeamPractices(teamId);
        let availablePractices: Practice[] = [];
        let total = 0;
        let page = 1;
        const pageSize = 50;

        do {
          const availableResponse = await fetchAvailablePractices({ teamId, page, pageSize });
          availablePractices = [...availablePractices, ...availableResponse.items];
          total = availableResponse.total;
          page += 1;
        } while (availablePractices.length < total);

        const combined = [...teamResponse.items, ...availablePractices];
        const uniquePractices = new Map<number, Practice>();
        combined.forEach((practice) => {
          uniquePractices.set(practice.id, practice);
        });

        setTemplates(Array.from(uniquePractices.values()));
      } catch (loadError: any) {
        setTemplateError(loadError.message || 'Unable to load practices');
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [step, teamId, templates.length]);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    templates.forEach((practice) => {
      categoryMap.set(practice.categoryId, practice.categoryName);
    });
    return Array.from(categoryMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

  const pillars = useMemo(() => {
    const pillarMap = new Map<number, { id: number; name: string; category: string; description?: string | null }>();
    templates.forEach((practice) => {
      practice.pillars.forEach((pillar) => {
        pillarMap.set(pillar.id, pillar);
      });
    });
    // Group by category first, then sort by name within category
    return Array.from(pillarMap.values()).sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category);
      return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name);
    });
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const query = templateSearch.toLowerCase();
    return templates.filter((practice) =>
      practice.title.toLowerCase().includes(query) ||
      practice.goal.toLowerCase().includes(query)
    );
  }, [templates, templateSearch]);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (!formState.title.trim() || formState.title.trim().length < 2) {
      errors.title = 'Title is required';
    } else if (formState.title.length > 100) {
      errors.title = 'Title must be between 2 and 100 characters';
    }

    if (!formState.goal.trim()) {
      errors.goal = 'Goal is required';
    } else if (formState.goal.length > 500) {
      errors.goal = 'Goal must be between 1 and 500 characters';
    }

    if (!formState.categoryId) {
      errors.categoryId = 'Category is required';
    }

    if (formState.pillarIds.length === 0) {
      errors.pillarIds = 'Select at least one pillar';
    }

    return errors;
  }, [formState]);


  const handleStartScratch = () => {
    setFormState({ title: '', goal: '', categoryId: '', pillarIds: [] });
    setStep('form');
  };

  const handleStartTemplate = () => {
    setStep('template');
  };

  const handleDuplicateTemplate = () => {
    const selected = templates.find((practice) => practice.id === selectedTemplateId);
    if (!selected) return;

    setFormState({
      title: `${selected.title} (Copy)`,
      goal: selected.goal,
      categoryId: selected.categoryId,
      pillarIds: selected.pillars.map((pillar) => pillar.id),
      templatePracticeId: selected.id
    });
    setStep('form');
  };

  const handleTogglePillar = (pillarId: number) => {
    setFormState((prev) => {
      const hasPillar = prev.pillarIds.includes(pillarId);
      const nextPillars = hasPillar
        ? prev.pillarIds.filter((id) => id !== pillarId)
        : [...prev.pillarIds, pillarId];
      return { ...prev, pillarIds: nextPillars };
    });
  };

  const handleSubmit = async () => {
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await createPractice(teamId, formState);
      onCreated(formState.title.trim());
    } catch (submitError) {
      // Error handled via store error
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Create New Practice
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {step === 'choice' && (
            <div className="space-y-4">
              <p className="text-gray-600">Choose how you want to create the practice:</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={handleStartScratch}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                >
                  <p className="font-medium text-gray-900">Create from Scratch</p>
                  <p className="text-sm text-gray-600">Start with an empty form</p>
                </button>
                <button
                  onClick={handleStartTemplate}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                >
                  <p className="font-medium text-gray-900">Use Existing as Template</p>
                  <p className="text-sm text-gray-600">Duplicate an existing practice</p>
                </button>
              </div>
            </div>
          )}

          {step === 'template' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('choice')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ← Back
                </button>
                <h4 className="text-md font-semibold text-gray-800">Select a template</h4>
              </div>

              <input
                type="text"
                placeholder="Search practices..."
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {isLoadingTemplates && (
                <p className="text-gray-500">Loading practices...</p>
              )}

              {templateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {templateError}
                </div>
              )}

              {!isLoadingTemplates && !templateError && (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredTemplates.length === 0 && (
                    <p className="p-4 text-sm text-gray-500">No practices found.</p>
                  )}
                  {filteredTemplates.map((practice) => (
                    <label
                      key={practice.id}
                      className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="templatePractice"
                        checked={selectedTemplateId === practice.id}
                        onChange={() => setSelectedTemplateId(practice.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{practice.title}</p>
                        <p className="text-xs text-gray-500">{practice.goal}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDuplicateTemplate}
                  disabled={!selectedTemplateId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Duplicate
                </button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('choice')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-title">
                  Title
                </label>
                <input
                  id="practice-title"
                  type="text"
                  value={formState.title}
                  onChange={(event) => setFormState({ ...formState, title: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.title && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-goal">
                  Goal / Objective
                </label>
                <textarea
                  id="practice-goal"
                  value={formState.goal}
                  onChange={(event) => setFormState({ ...formState, goal: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                {validationErrors.goal && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.goal}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-category">
                  Category
                </label>
                <select
                  id="practice-category"
                  value={formState.categoryId}
                  onChange={(event) => setFormState({ ...formState, categoryId: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {validationErrors.categoryId && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.categoryId}</p>
                )}
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Pillars to cover</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {pillars.map((pillar) => (
                    <label key={pillar.id} className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formState.pillarIds.includes(pillar.id)}
                        onChange={() => handleTogglePillar(pillar.id)}
                        className="mt-1"
                      />
                      <span>{pillar.name}</span>
                    </label>
                  ))}
                </div>
                {validationErrors.pillarIds && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.pillarIds}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isCreating || Object.keys(validationErrors).length > 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Practice'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
