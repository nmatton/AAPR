import { useEffect, useMemo, useState } from 'react';
import { CategorizedTagSelector } from '../../../shared/components/CategorizedTagSelector';
import { Tooltip } from '../../../shared/components/Tooltip';
import { normalizeValidTags, type ValidTag } from '../../../shared/constants/tags.constants';
import { fetchAvailablePractices, fetchTeamPractices } from '../api/teamPracticesApi';
import { fetchPracticeDetail } from '../../practices/api/practices.api';
import { useManagePracticesStore } from '../state/managePracticesSlice';
import type { Practice, ActivityInput, RoleInput, MetricInput, GuidelineInput, AssociatedPracticeInput } from '../types/practice.types';
interface CreatePracticeModalProps {
  teamId: number;
  onClose: () => void;
  onCreated: (practiceName: string) => void;
}

type ModalStep = 'choice' | 'template' | 'form';

type FormState = {
  title: string;
  goal: string;
  description: string;
  categoryId: string;
  pillarIds: number[];
  tags: ValidTag[];
  method: string;
  benefits: string;
  pitfalls: string;
  workProducts: string;
  activities: ActivityInput[];
  roles: RoleInput[];
  completionCriteria: string;
  metrics: MetricInput[];
  guidelines: GuidelineInput[];
  associatedPractices: AssociatedPracticeInput[];
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
    description: '',
    categoryId: '',
    pillarIds: [],
    tags: [],
    method: '',
    benefits: '',
    pitfalls: '',
    workProducts: '',
    activities: [],
    roles: [],
    completionCriteria: '',
    metrics: [],
    guidelines: [],
    associatedPractices: []
  });

  const normalizeValueToText = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
    if (value && typeof value === 'object') {
      const maybeRecord = value as Record<string, unknown>;
      const preferredText = maybeRecord.name ?? maybeRecord.title ?? maybeRecord.description;
      if (typeof preferredText === 'string') return preferredText.trim();
    }
    return '';
  };

  const joinValues = (values?: unknown[] | null) =>
    values?.map(normalizeValueToText).filter(Boolean).join(', ') ?? '';

  const normalizeListInput = (value: string): string[] | undefined => {
    const parts = value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  };

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
    setFormState({
      title: '',
      goal: '',
      description: '',
      categoryId: '',
      pillarIds: [],
      tags: [],
      method: '',
      benefits: '',
      pitfalls: '',
      workProducts: '',
      activities: [],
      roles: [],
      completionCriteria: '',
      metrics: [],
      guidelines: [],
      associatedPractices: []
    });
    setStep('form');
  };

  const handleStartTemplate = () => {
    setStep('template');
  };

  const generateUniqueCopyTitle = (baseName: string): string => {
    const simpleCopy = `${baseName} (Copy)`;
    const existingNames = new Set(templates.map((practice) => practice.title.toLowerCase()));

    if (!existingNames.has(simpleCopy.toLowerCase())) {
      return simpleCopy;
    }

    // Find next available " - Copy N"
    let counter = 1;
    let candidateName = `${baseName} - Copy ${counter}`;
    while (existingNames.has(candidateName.toLowerCase())) {
      counter++;
      candidateName = `${baseName} - Copy ${counter}`;
    }
    return candidateName;
  };

  const handleDuplicateTemplate = async () => {
    const selected = templates.find((practice) => practice.id === selectedTemplateId);
    if (!selected) return;

    // Fetch full practice detail to get extended fields
    let detail: Practice = selected;
    try {
      const { practice: fullDetail } = await fetchPracticeDetail(selected.id);
      if (fullDetail?.id === selected.id) {
        detail = { ...selected, ...fullDetail } as Practice;
      }
    } catch {
      // Fall back to shallow template data if detail fetch fails
    }

    const uniqueTitle = generateUniqueCopyTitle(selected.title);

    const safeActivities = Array.isArray(detail.activities) ? detail.activities as ActivityInput[] : [];
    const safeRoles = Array.isArray(detail.roles) ? detail.roles as RoleInput[] : [];
    const safeMetrics = Array.isArray(detail.metrics) ? detail.metrics as MetricInput[] : [];
    const safeGuidelines = Array.isArray(detail.guidelines) ? detail.guidelines as GuidelineInput[] : [];
    const safeAssociatedPractices = Array.isArray(detail.associatedPractices) ? detail.associatedPractices as AssociatedPracticeInput[] : [];

    setFormState({
      title: uniqueTitle,
      // Keep primary identity fields from the selected template row for deterministic duplication
      goal: selected.goal,
      description: selected.description ?? detail.description ?? '',
      categoryId: selected.categoryId,
      pillarIds: selected.pillars.map((pillar) => pillar.id),
      tags: normalizeValidTags(selected.tags ?? detail.tags),
      method: selected.method ?? detail.method ?? '',
      benefits: joinValues(selected.benefits ?? detail.benefits ?? undefined),
      pitfalls: joinValues(selected.pitfalls ?? detail.pitfalls ?? undefined),
      workProducts: joinValues(selected.workProducts ?? detail.workProducts ?? undefined),
      activities: safeActivities,
      roles: safeRoles,
      completionCriteria: (detail.completionCriteria as string) ?? '',
      metrics: safeMetrics,
      guidelines: safeGuidelines,
      associatedPractices: safeAssociatedPractices,
      templatePracticeId: detail.id
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
      const description = formState.description.trim();
      const method = formState.method.trim();

      await createPractice(teamId, {
        title: formState.title.trim(),
        goal: formState.goal.trim(),
        categoryId: formState.categoryId,
        pillarIds: formState.pillarIds,
        description: description.length > 0 ? description : undefined,
        method: method.length > 0 ? method : undefined,
        tags: formState.tags.length > 0 ? formState.tags : undefined,
        benefits: normalizeListInput(formState.benefits),
        pitfalls: normalizeListInput(formState.pitfalls),
        workProducts: normalizeListInput(formState.workProducts),
        activities: formState.activities.length > 0 ? formState.activities : undefined,
        roles: formState.roles.length > 0 ? formState.roles : undefined,
        completionCriteria: formState.completionCriteria.trim() || undefined,
        metrics: formState.metrics.length > 0 ? formState.metrics : undefined,
        guidelines: formState.guidelines.length > 0 ? formState.guidelines : undefined,
        associatedPractices: formState.associatedPractices.length > 0 ? formState.associatedPractices : undefined,
        templatePracticeId: formState.templatePracticeId
      });
      onCreated(formState.title.trim());
    } catch (submitError) {
      // Error handled via store error
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
        <div className="p-6 overflow-y-auto min-h-0">
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
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-description">
                  Detailed Description
                </label>
                <textarea
                  id="practice-description"
                  value={formState.description}
                  onChange={(event) => setFormState({ ...formState, description: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
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
                      {pillar.description ? (
                        <Tooltip content={pillar.description}>
                          <span>{pillar.name}</span>
                        </Tooltip>
                      ) : (
                        <span>{pillar.name}</span>
                      )}
                    </label>
                  ))}
                </div>
                {validationErrors.pillarIds && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.pillarIds}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-method">
                  Method / Framework
                </label>
                <select
                  id="practice-method"
                  value={formState.method}
                  onChange={(event) => setFormState({ ...formState, method: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a method</option>
                  <option value="Agile">Agile</option>
                  <option value="Design Thinking & UX">Design Thinking & UX</option>
                  <option value="Facilitation & Workshops">Facilitation & Workshops</option>
                  <option value="Kanban">Kanban</option>
                  <option value="Lean">Lean</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Project Management">Project Management</option>
                  <option value="Scaled Agile">Scaled Agile</option>
                  <option value="Scrum">Scrum</option>
                  <option value="XP">XP</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Tags</p>
                <CategorizedTagSelector
                  selectedTags={formState.tags}
                  onChange={(tags) => setFormState({ ...formState, tags })}
                  showDescriptions
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-benefits">
                  Benefits
                </label>
                <textarea
                  id="practice-benefits"
                  value={formState.benefits}
                  onChange={(event) => setFormState({ ...formState, benefits: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="List benefits separated by commas or new lines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-pitfalls">
                  Pitfalls
                </label>
                <textarea
                  id="practice-pitfalls"
                  value={formState.pitfalls}
                  onChange={(event) => setFormState({ ...formState, pitfalls: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="List pitfalls separated by commas or new lines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-work-products">
                  Work Products
                </label>
                <textarea
                  id="practice-work-products"
                  value={formState.workProducts}
                  onChange={(event) => setFormState({ ...formState, workProducts: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="List work products separated by commas or new lines"
                />
              </div>

              {/* Activities */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Activities</label>
                  <button
                    type="button"
                    onClick={() => setFormState({
                      ...formState,
                      activities: [...formState.activities, { sequence: formState.activities.length + 1, name: '', description: '' }]
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Add Activity
                  </button>
                </div>
                {formState.activities.map((activity, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-start">
                    <input
                      type="number"
                      value={activity.sequence}
                      onChange={(e) => {
                        const next = [...formState.activities];
                        next[index] = { ...next[index], sequence: parseInt(e.target.value, 10) || 1 };
                        setFormState({ ...formState, activities: next });
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="#"
                      min={1}
                    />
                    <input
                      type="text"
                      value={activity.name}
                      onChange={(e) => {
                        const next = [...formState.activities];
                        next[index] = { ...next[index], name: e.target.value };
                        setFormState({ ...formState, activities: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Activity name"
                    />
                    <input
                      type="text"
                      value={activity.description}
                      onChange={(e) => {
                        const next = [...formState.activities];
                        next[index] = { ...next[index], description: e.target.value };
                        setFormState({ ...formState, activities: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Description"
                    />
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, activities: formState.activities.filter((_, i) => i !== index) })}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Roles (RACI) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Roles (RACI)</label>
                  <button
                    type="button"
                    onClick={() => setFormState({
                      ...formState,
                      roles: [...formState.roles, { role: '', responsibility: 'Responsible' }]
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Add Role
                  </button>
                </div>
                {formState.roles.map((role, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      value={role.role}
                      onChange={(e) => {
                        const next = [...formState.roles];
                        next[index] = { ...next[index], role: e.target.value };
                        setFormState({ ...formState, roles: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Role name"
                    />
                    <select
                      value={role.responsibility}
                      onChange={(e) => {
                        const next = [...formState.roles];
                        next[index] = { ...next[index], responsibility: e.target.value as RoleInput['responsibility'] };
                        setFormState({ ...formState, roles: next });
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="Responsible">Responsible</option>
                      <option value="Accountable">Accountable</option>
                      <option value="Consulted">Consulted</option>
                      <option value="Informed">Informed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, roles: formState.roles.filter((_, i) => i !== index) })}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Completion Criteria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice-completion-criteria">
                  Completion Criteria
                </label>
                <textarea
                  id="practice-completion-criteria"
                  value={formState.completionCriteria}
                  onChange={(event) => setFormState({ ...formState, completionCriteria: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Define when the practice is considered complete"
                />
              </div>

              {/* Metrics */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Metrics</label>
                  <button
                    type="button"
                    onClick={() => setFormState({
                      ...formState,
                      metrics: [...formState.metrics, { name: '' }]
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Add Metric
                  </button>
                </div>
                {formState.metrics.map((metric, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      value={metric.name}
                      onChange={(e) => {
                        const next = [...formState.metrics];
                        next[index] = { ...next[index], name: e.target.value };
                        setFormState({ ...formState, metrics: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Metric name"
                    />
                    <input
                      type="text"
                      value={metric.unit ?? ''}
                      onChange={(e) => {
                        const next = [...formState.metrics];
                        next[index] = { ...next[index], unit: e.target.value || undefined };
                        setFormState({ ...formState, metrics: next });
                      }}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Unit"
                    />
                    <input
                      type="text"
                      value={metric.formula ?? ''}
                      onChange={(e) => {
                        const next = [...formState.metrics];
                        next[index] = { ...next[index], formula: e.target.value || undefined };
                        setFormState({ ...formState, metrics: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Formula (optional)"
                    />
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, metrics: formState.metrics.filter((_, i) => i !== index) })}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Guidelines */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Guidelines / Resources</label>
                  <button
                    type="button"
                    onClick={() => setFormState({
                      ...formState,
                      guidelines: [...formState.guidelines, { name: '', url: '' }]
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Add Guideline
                  </button>
                </div>
                {formState.guidelines.map((guideline, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      value={guideline.name}
                      onChange={(e) => {
                        const next = [...formState.guidelines];
                        next[index] = { ...next[index], name: e.target.value };
                        setFormState({ ...formState, guidelines: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Guideline name"
                    />
                    <input
                      type="text"
                      value={guideline.url}
                      onChange={(e) => {
                        const next = [...formState.guidelines];
                        next[index] = { ...next[index], url: e.target.value };
                        setFormState({ ...formState, guidelines: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="URL"
                    />
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, guidelines: formState.guidelines.filter((_, i) => i !== index) })}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Associated Practices */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Associated Practices</label>
                  <button
                    type="button"
                    onClick={() => setFormState({
                      ...formState,
                      associatedPractices: [...formState.associatedPractices, { targetPracticeId: 0, associationType: 'Complementarity' }]
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Add Association
                  </button>
                </div>
                {formState.associatedPractices.map((assoc, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <select
                      value={assoc.targetPracticeId || ''}
                      onChange={(e) => {
                        const next = [...formState.associatedPractices];
                        next[index] = { ...next[index], targetPracticeId: parseInt(e.target.value, 10) || 0 };
                        setFormState({ ...formState, associatedPractices: next });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select practice</option>
                      {templates.map((practice) => (
                        <option key={practice.id} value={practice.id}>{practice.title}</option>
                      ))}
                    </select>
                    <select
                      value={assoc.associationType}
                      onChange={(e) => {
                        const next = [...formState.associatedPractices];
                        next[index] = { ...next[index], associationType: e.target.value as AssociatedPracticeInput['associationType'] };
                        setFormState({ ...formState, associatedPractices: next });
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="Complementarity">Complementarity</option>
                      <option value="Configuration">Configuration</option>
                      <option value="Dependency">Dependency</option>
                      <option value="Equivalence">Equivalence</option>
                      <option value="Exclusion">Exclusion</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, associatedPractices: formState.associatedPractices.filter((_, i) => i !== index) })}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
