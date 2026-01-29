import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

interface Comment {
    id: number;
    content: string;
    createdAt: string;
    author: { id: number; name: string };
}

interface CommentListProps {
    comments: Comment[];
}

export const CommentList = ({ comments }: CommentListProps) => {
    if (comments.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                <p>No comments yet. Start the discussion!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
                Discussion <span className="text-gray-500 text-sm font-normal">({comments.length})</span>
            </h3>
            <div className="space-y-6">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 group">
                        <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                {comment.author.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex-grow space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">
                                    {comment.author.name}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            <div className="text-sm text-gray-700 prose prose-sm max-w-none bg-gray-50 rounded-lg p-3 border border-gray-100 group-hover:border-gray-200 transition-colors">
                                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                                    {comment.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
