import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssueDetails, IssueDetails, createComment } from '../api/issuesApi';
import { IssueTimeline } from './IssueTimeline';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { formatDistanceToNow } from 'date-fns';

export const IssueDetailView = () => {
    const { teamId, issueId } = useParams<{ teamId: string; issueId: string }>();
    const navigate = useNavigate();
    const [details, setDetails] = useState<IssueDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submittingComment, setSubmittingComment] = useState(false);

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

    const { issue, history } = details;

    const priorityColors = {
        LOW: 'bg-gray-100 text-gray-800',
        MEDIUM: 'bg-yellow-100 text-yellow-800',
        HIGH: 'bg-red-100 text-red-800',
    };

    const statusColors = {
        OPEN: 'bg-green-100 text-green-800',
        IN_DISCUSSION: 'bg-blue-100 text-blue-800',
        RESOLVED: 'bg-gray-100 text-gray-800',
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(`/teams/${teamId}`)}
                    className="text-blue-600 hover:text-blue-800"
                >
                    ← Back to Issues
                </button>
            </div>

            {/* Issue Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                {/* Title and Badges */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">{issue.title}</h1>
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[issue.priority as keyof typeof priorityColors]}`}>
                            {issue.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[issue.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                            {issue.status.replace('_', ' ')}
                        </span>
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

                {/* Linked Practices */}
                {issue.practices.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Linked Practices</h3>
                        <div className="flex flex-wrap gap-2">
                            {issue.practices.map((practice) => (
                                <span
                                    key={practice.id}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm cursor-pointer hover:bg-blue-100"
                                    onClick={() => navigate(`/teams/${teamId}/practices/${practice.id}`)}
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
        </div>
    );
};
