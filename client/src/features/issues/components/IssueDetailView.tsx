import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getIssueDetails, IssueDetails, createComment, updateIssue, recordDecision } from '../api/issuesApi';
import { IssueTimeline } from './IssueTimeline';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
import { PracticeDetailSidebar } from '../../practices/components/PracticeDetailSidebar';
import { RecommendationWidget } from './RecommendationWidget';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { formatDistanceToNow } from 'date-fns';
import { DecisionModal } from './DecisionModal';
import { StatusSelect, IssueStatus } from './StatusSelect';
import { PrioritySelect, PriorityLevel } from './PrioritySelect';

export const IssueDetailView = () => {
    const { teamId, issueId } = useParams<{ teamId: string; issueId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [details, setDetails] = useState<IssueDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    const openPracticeId = searchParams.get('practiceId') ? Number(searchParams.get('practiceId')) : null;

    useEffect(() => {
        const fetchDetails = async () => {
            if (!teamId || !issueId) return;

            try {
                setLoading(true);
                const data = await getIssueDetails(Number(teamId), Number(issueId));
                setDetails(data);
            } catch (err: any) {
                if (err.status === 404) {
                    setError('Issue not found');
                } else if (err.status === 403) {
                    setError('Access denied');
                } else {
                    setError('Failed to load issue details');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [teamId, issueId]);

    // Auto-dismiss toast after timeout
    useEffect(() => {
        if (!toast) return;
        const duration = toast.type === 'success' ? 3000 : 5000;
        const timer = setTimeout(() => setToast(null), duration);
        return () => clearTimeout(timer);
    }, [toast]);

    const handleCommentSubmit = async (content: string) => {
        if (!teamId || !issueId || !details) return;

        try {
            setSubmittingComment(true);
            await createComment(Number(teamId), Number(issueId), content);

            // Refresh details to show new comment
            // In a real app we might append confidently, but refresh ensures consistency
            const updatedData = await getIssueDetails(Number(teamId), Number(issueId));
            setDetails(updatedData);
        } catch (err) {
            console.error('Failed to post comment', err);
            // Could show a toast here
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleRecordDecision = async (decisionText: string) => {
        if (!teamId || !issueId || !details) return;
        try {
            await recordDecision(Number(teamId), Number(issueId), decisionText, details.issue.version);
            const updatedData = await getIssueDetails(Number(teamId), Number(issueId));
            setDetails(updatedData);
            setIsDecisionModalOpen(false);
            setToast({ type: 'success', message: 'Decision recorded successfully.' });
        } catch (err: any) {
            console.error('Failed to record decision', err);
            if (err.status === 409) {
                setToast({ type: 'warning', message: 'Conflict: The issue was updated by someone else. Please refresh and try again.' });
                // Refetch to get latest data
                const updatedData = await getIssueDetails(Number(teamId), Number(issueId));
                setDetails(updatedData);
            } else {
                setToast({ type: 'error', message: 'Failed to record decision. Please try again.' });
            }
            throw err;
        }
    };

    const handleStatusChange = async (newStatus: IssueStatus) => {
        if (!teamId || !issueId || !details) return;
        try {
            setDetails(prev => prev ? { ...prev, issue: { ...prev.issue, status: newStatus } } : null);
            await updateIssue(Number(teamId), Number(issueId), { status: newStatus });
        } catch (error) {
            console.error('Failed to update status', error);
            // Revert by fetching fresh data
            const data = await getIssueDetails(Number(teamId), Number(issueId));
            setDetails(data);
        }
    };

    const handlePriorityChange = async (newPriority: PriorityLevel) => {
        if (!teamId || !issueId || !details) return;
        try {
            setDetails(prev => prev ? { ...prev, issue: { ...prev.issue, priority: newPriority } } : null);
            await updateIssue(Number(teamId), Number(issueId), { priority: newPriority });
        } catch (error) {
            console.error('Failed to update priority', error);
            const data = await getIssueDetails(Number(teamId), Number(issueId));
            setDetails(data);
        }
    };

    if (loading) {
        return (
            <div className="p-6" data-testid="loading-skeleton">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-32 bg-gray-200 rounded" />
                </div>
            </div>
        );
    }

    if (error || !details) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error || 'Issue not found'}</p>
                    <button
                        onClick={() => navigate(`/teams/${teamId}`)}
                        className="mt-2 text-red-600 hover:text-red-800 underline"
                    >
                        Back to Team
                    </button>
                </div>
            </div>
        );
    }

    const { issue } = details;



    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(`/teams/${teamId}/issues`)}
                    className="text-blue-600 hover:text-blue-800"
                >
                    ← Back to Issues
                </button>
            </div>

            {/* Issue Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
                    <div className="flex gap-2 items-center">
                        {issue.status !== 'ADAPTATION_IN_PROGRESS' && (
                            <button
                                onClick={() => setIsDecisionModalOpen(true)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                            >
                                Record Decision
                            </button>
                        )}
                        <PrioritySelect
                            value={issue.priority as PriorityLevel}
                            onChange={handlePriorityChange}
                        />
                        <StatusSelect
                            value={issue.status as IssueStatus}
                            onChange={handleStatusChange}
                        />
                    </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                        Created by <strong>{issue.author.name}</strong>
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
                </div>

                {/* Description */}
                <div className="prose max-w-none text-gray-800">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{issue.description}</ReactMarkdown>
                </div>

                {issue.decisionText && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="text-lg font-bold text-green-900 flex items-center mb-2">
                            ✅ Adaptation Decision Recorded
                        </h3>
                        <p className="text-green-800 whitespace-pre-wrap">{issue.decisionText}</p>
                        <div className="mt-2 text-sm text-green-600 flex items-center gap-3">
                            {issue.decisionRecordedBy && (
                                <span>Recorded by <strong>{issue.decisionRecordedBy.name}</strong></span>
                            )}
                            {issue.decisionRecordedAt && (
                                <span>• {formatDistanceToNow(new Date(issue.decisionRecordedAt), { addSuffix: true })}</span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Implementation in progress
                            </span>
                        </div>
                    </div>
                )}

                {/* Linked Practices */}
                {issue.practices.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Linked Practices</h3>
                        <div className="flex flex-wrap gap-2">
                            {issue.practices.map((practice) => (
                                <span
                                    key={practice.id}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm cursor-pointer hover:bg-blue-100"
                                    onClick={() => setSearchParams({ practiceId: practice.id.toString() })}
                                >
                                    {practice.title}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline & Comments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline - Left/Top on mobile, Left on Desktop */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <IssueTimeline events={details.history} />
                    </div>

                    {/* Alternative Practices — one widget per linked practice */}
                    {issue.practices.length > 0 && issue.practices.map((practice) => (
                        <div key={`rec-${practice.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <p className="text-xs text-gray-400 mb-2">For: {practice.title}</p>
                            <RecommendationWidget
                                teamId={Number(teamId)}
                                practiceId={practice.id}
                                onPracticeClick={(id) => setSearchParams({ practiceId: id.toString() })}
                            />
                        </div>
                    ))}
                </div>

                {/* Discussion - Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
                        <CommentList comments={details.comments || []} />

                        <div className="pt-6 border-t border-gray-100">
                            <CommentForm
                                issueId={Number(issueId)}
                                onSubmit={handleCommentSubmit}
                                isSubmitting={submittingComment}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <PracticeDetailSidebar
                isOpen={!!openPracticeId}
                practiceId={openPracticeId}
                onClose={() => setSearchParams({})}
                teamId={Number(teamId)}
                isPracticeInTeam={issue.practices.some((p) => p.id === openPracticeId)}
            />

            <DecisionModal
                isOpen={isDecisionModalOpen}
                onClose={() => setIsDecisionModalOpen(false)}
                onSubmit={handleRecordDecision}
            />

            {/* Toast notification */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                    <div
                        className={`rounded-lg px-4 py-3 text-sm shadow-lg flex items-center gap-2 ${
                            toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                            toast.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                            'bg-red-50 text-red-800 border border-red-200'
                        }`}
                    >
                        {toast.type === 'success' && '✅ '}
                        {toast.type === 'warning' && '⚠️ '}
                        {toast.type === 'error' && '❌ '}
                        {toast.message}
                        <button onClick={() => setToast(null)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
                    </div>
                </div>
            )}
        </div>
    );
};

