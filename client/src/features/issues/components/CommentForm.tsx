import { useState, useEffect } from 'react';

interface CommentFormProps {
    issueId: number;
    onSubmit: (content: string) => Promise<void>;
    isSubmitting: boolean;
}

export const CommentForm = ({ issueId, onSubmit, isSubmitting }: CommentFormProps) => {
    const [content, setContent] = useState('');
    const storageKey = `issue_comment_draft_${issueId}`;

    useEffect(() => {
        const draft = localStorage.getItem(storageKey);
        if (draft) {
            setContent(draft);
        }
    }, [storageKey]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        localStorage.setItem(storageKey, newContent);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        await onSubmit(content);
        setContent('');
        localStorage.removeItem(storageKey);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Add a comment
                </label>
                <div className="relative">
                    <textarea
                        id="comment"
                        rows={4}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                        placeholder="Share your perspective..."
                        value={content}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    Markdown supported. Draft saved automatically.
                </p>
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={!content.trim() || isSubmitting}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${(!content.trim() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
            </div>
        </form>
    );
};
