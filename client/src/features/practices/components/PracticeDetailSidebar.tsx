import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../issues/hooks/useIssues';
import { SidebarPanel } from '../../../components/ui/SidebarPanel';
import { Tooltip } from '../../../shared/components/Tooltip';
import { TAG_DESCRIPTIONS, isValidTag } from '../../../shared/constants/tags.constants';

import { fetchPracticeDetail, logPracticeDetailViewed } from '../api/practices.api';
import { PillarContextPopover } from './PillarContextPopover';
import type { PracticeDetail } from '../api/practices.api';
import type { Pillar } from '../types';

interface PracticeDetailSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    practiceId: number | null;
    teamId?: number;
    isPracticeInTeam?: boolean;
    onAddToTeam?: (practiceId: number) => void;
    onRemoveFromTeam?: (practiceId: number) => void;
    onEdit?: (practice: DetailedPractice) => void;
    onNavigateToPractice?: (practiceId: number) => void;
}

type DetailedPractice = PracticeDetail;

export const PracticeDetailSidebar: React.FC<PracticeDetailSidebarProps> = ({
    isOpen,
    onClose,
    practiceId,
    teamId,
    isPracticeInTeam,
    onAddToTeam,
    onRemoveFromTeam,
    onEdit,
    onNavigateToPractice
}) => {
    const navigate = useNavigate();
    const { data: linkedIssues } = useIssues(teamId || 0, { practiceId: practiceId || undefined });
    const [practice, setPractice] = useState<DetailedPractice | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activePillar, setActivePillar] = useState<Pillar | null>(null);

    useEffect(() => {
        if (isOpen && practiceId) {
            let isMounted = true;
            const loadData = async () => {
                setPractice(null);
                setIsLoading(true);
                setError(null);
                try {
                    const { practice: data } = await fetchPracticeDetail(practiceId);
                    if (isMounted) {
                        setPractice(data);
                    }

                    await logPracticeDetailViewed({
                        teamId: teamId || null,
                        practiceId,
                        timestamp: new Date().toISOString()
                    });

                } catch (err) {
                    if (isMounted) {
                        setError('Failed to load practice details');
                        console.error(err);
                    }
                } finally {
                    if (isMounted) {
                        setIsLoading(false);
                    }
                }
            };
            loadData();
            return () => { isMounted = false; };
        }
    }, [isOpen, practiceId, teamId]);

    const renderList = (items: unknown[] | undefined | null, emptyText = 'Not specified') => {
        if (!items || !Array.isArray(items) || items.length === 0) return <p className="text-gray-500 italic text-sm">{emptyText}</p>;
        return (
            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
                {items.map((item, idx) => {
                    // Handle objects (like Roles or WorkProducts)
                    if (typeof item === 'object' && item !== null) {
                        const obj = item as Record<string, unknown>;
                        // Role schema: { role, responsibility }
                        if ('role' in obj && 'responsibility' in obj) {
                            return (
                                <li key={idx}>
                                    <span className="font-semibold">{String(obj.role)}:</span> {String(obj.responsibility)}
                                </li>
                            );
                        }
                        // WorkProduct schema: { name, description }
                        if ('name' in obj && 'description' in obj) {
                            return (
                                <li key={idx}>
                                    <span className="font-semibold">{String(obj.name)}:</span> {String(obj.description)}
                                </li>
                            );
                        }
                        // Generic fallback for named objects
                        if ('name' in obj) return <li key={idx}>{String(obj.name)}</li>;
                        if ('title' in obj) return <li key={idx}>{String(obj.title)}</li>;

                        // Last resort: simple list of values
                        return <li key={idx}>{Object.values(obj).filter(v => typeof v === 'string').join(': ')}</li>;
                    }
                    // Handle simple strings
                    return <li key={idx}>{String(item)}</li>
                })}
            </ul>
        );
    };

    const renderBadge = (text: string, colorClass = 'bg-gray-100 text-gray-800') => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 mb-2 ${colorClass}`}>
            {text}
        </span>
    );

    const getTagDescription = (tag: string): string => {
        if (!isValidTag(tag)) {
            return '';
        }
        return TAG_DESCRIPTIONS[tag];
    };

    const getAssociationBadgeClass = (associationType: string) => {
        const normalized = associationType.toLowerCase();
        if (normalized === 'dependency') return 'bg-amber-50 text-amber-700 border border-amber-100';
        if (normalized === 'complementarity') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        if (normalized === 'equivalence') return 'bg-sky-50 text-sky-700 border border-sky-100';
        if (normalized === 'configuration') return 'bg-gray-100 text-gray-700 border border-gray-200';
        if (normalized === 'exclusion') return 'bg-red-50 text-red-700 border border-red-100';
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    return (
        <>
            <SidebarPanel isOpen={isOpen} onClose={onClose} title={isLoading ? 'Loading...' : practice?.title || 'Practice Details'}>
                {isLoading ? (
                    <div className="animate-pulse space-y-4 pt-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="space-y-2 pt-4">
                            <div className="h-3 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center py-4">{error}</div>
                ) : practice ? (
                    <div className="space-y-6 pt-2">

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                            {isPracticeInTeam === false && onAddToTeam && (
                                <button
                                    onClick={() => practiceId && onAddToTeam(practiceId)}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium shadow-sm"
                                >
                                    Add to Team
                                </button>
                            )}
                            {isPracticeInTeam === true && onRemoveFromTeam && (
                                <button
                                    onClick={() => practiceId && onRemoveFromTeam(practiceId)}
                                    className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 transition text-sm font-medium shadow-sm"
                                >
                                    Remove from Team
                                </button>
                            )}
                            {onEdit && practice && (
                                <button
                                    onClick={() => onEdit(practice)}
                                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition text-sm font-medium shadow-sm"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {/* Explicit Title for Better Context */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{practice.title}</h2>
                        </div>

                        {/* Goal */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Goal</h3>
                            <p className="text-gray-900 font-medium">{practice.goal}</p>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h3>
                            <div className="text-gray-700 text-sm whitespace-pre-wrap">{practice.description || 'No description available.'}</div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500 uppercase mb-1">Category</span>
                                <span className="inline-block bg-white border border-gray-200 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
                                    {practice.categoryName}
                                </span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 uppercase mb-1">Method</span>
                                <span className="font-medium text-sm text-gray-800">{practice.method || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 uppercase mb-1">Version</span>
                                <span className="font-medium text-sm text-gray-800">v{practice.practiceVersion || '1.0'}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 uppercase mb-1">Updated</span>
                                <span className="font-medium text-sm text-gray-800">{practice.updatedAt ? new Date(practice.updatedAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>

                        {/* Pillars */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pillars</h3>
                            <div className="flex flex-wrap">
                                {practice.pillars && practice.pillars.length > 0 ? (
                                    practice.pillars.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setActivePillar(p)}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 mb-2 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            title="Click to see details"
                                        >
                                            {p.name}
                                        </button>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 italic">None</span>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h3>
                            <div className="flex flex-wrap">
                                {practice.tags && Array.isArray(practice.tags) && practice.tags.length > 0 ? (
                                    practice.tags.map((tag) => (
                                        <Tooltip key={tag} content={getTagDescription(tag)}>
                                            {renderBadge(tag, 'bg-emerald-50 text-emerald-700 border border-emerald-100')}
                                        </Tooltip>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 italic">None</span>
                                )}
                            </div>
                        </div>

                        {/* Roles */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Roles</h3>
                            {renderList(practice.roles)}
                        </div>

                        {/* Benefits */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Benefits</h3>
                            {renderList(practice.benefits)}
                        </div>

                        {/* Pitfalls */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pitfalls</h3>
                            {renderList(practice.pitfalls)}
                        </div>

                        {/* Work Products */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Work Products</h3>
                            {renderList(practice.workProducts)}
                        </div>

                        {/* Activities */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Activities</h3>
                            {practice.activities && practice.activities.length > 0 ? (
                                <ul className="space-y-2 text-sm text-gray-700">
                                    {practice.activities
                                        .slice()
                                        .sort((a, b) => a.sequence - b.sequence)
                                        .map((activity, idx) => (
                                            <li key={`${activity.sequence}-${activity.name}-${idx}`}>
                                                <p className="font-semibold">
                                                    {activity.sequence}. {activity.name}
                                                </p>
                                                <p>{activity.description}</p>
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic text-sm">Not specified</p>
                            )}
                        </div>

                        {/* Completion Criteria */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Completion Criteria</h3>
                            {practice.completionCriteria ? (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{practice.completionCriteria}</p>
                            ) : (
                                <p className="text-gray-500 italic text-sm">Not specified</p>
                            )}
                        </div>

                        {/* Metrics */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Metrics</h3>
                            {practice.metrics && practice.metrics.length > 0 ? (
                                <ul className="space-y-2 text-sm text-gray-700">
                                    {practice.metrics.map((metric, idx) => (
                                        <li key={`${metric.name}-${idx}`}>
                                            <p className="font-semibold">
                                                {metric.name}
                                                {metric.unit ? ` (${metric.unit})` : ''}
                                            </p>
                                            {metric.formula ? <p>{metric.formula}</p> : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic text-sm">Not specified</p>
                            )}
                        </div>

                        {/* Guidelines (Resources) */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Resources</h3>
                            {practice.guidelines && practice.guidelines.length > 0 ? (
                                <ul className="space-y-2 text-sm text-gray-700">
                                    {practice.guidelines.map((guideline, idx) => {
                                        const hasUrl = guideline.url.trim() !== '';
                                        return (
                                            <li key={`${guideline.name}-${idx}`}>
                                                {hasUrl ? (
                                                    <a
                                                        href={guideline.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-700 hover:text-blue-800 underline"
                                                    >
                                                        {guideline.name}
                                                    </a>
                                                ) : (
                                                    <span>{guideline.name}</span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic text-sm">Not specified</p>
                            )}
                        </div>

                        {/* Associated Practices */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Associated Practices</h3>
                            {practice.associatedPractices && practice.associatedPractices.length > 0 ? (
                                <ul className="space-y-2">
                                    {practice.associatedPractices.map((association, idx) => (
                                        <li key={`${association.targetPracticeId}-${association.associationType}-${idx}`}>
                                            {onNavigateToPractice ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onNavigateToPractice(association.targetPracticeId)}
                                                    className="w-full text-left bg-white border border-gray-200 rounded-md p-2 hover:bg-gray-50 transition-colors"
                                                >
                                                    <span className="text-sm font-medium text-gray-900">{association.targetPracticeTitle}</span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${getAssociationBadgeClass(association.associationType)}`}>
                                                        {association.associationType}
                                                    </span>
                                                </button>
                                            ) : (
                                                <div className="bg-white border border-gray-200 rounded-md p-2">
                                                    <span className="text-sm font-medium text-gray-900">{association.targetPracticeTitle}</span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${getAssociationBadgeClass(association.associationType)}`}>
                                                        {association.associationType}
                                                    </span>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic text-sm">Not specified</p>
                            )}
                        </div>

                        {/* Linked Issues */}
                        {teamId && linkedIssues && linkedIssues.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Linked Issues</h3>
                                <ul className="space-y-2">
                                    {linkedIssues.map(issue => (
                                        <li
                                            key={issue.id}
                                            className="bg-white border border-gray-200 rounded-md p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => {
                                                onClose();
                                                setTimeout(() => {
                                                    navigate(`/teams/${teamId}/issues/${issue.id}`);
                                                }, 100);
                                            }}
                                        >
                                            <div className="font-medium text-gray-900 text-sm truncate">{issue.title}</div>
                                            <div className="flex justify-between items-center mt-1 text-xs">
                                                <span className={`px-2 py-0.5 rounded-full ${issue.status === 'OPEN' ? 'bg-blue-100 text-blue-800' : issue.status === 'IN_DISCUSSION' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {issue.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-gray-500">#{issue.id}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}


                    </div>
                ) : null}
            </SidebarPanel>

            {activePillar && practice && (
                <PillarContextPopover
                    pillar={activePillar}
                    teamId={teamId}
                    currentPracticeId={practice.id}
                    onClose={() => setActivePillar(null)}
                    onNavigateToPractice={(id) => {
                        setActivePillar(null);
                        onNavigateToPractice?.(id);
                    }}
                />
            )}
        </>
    );
};
