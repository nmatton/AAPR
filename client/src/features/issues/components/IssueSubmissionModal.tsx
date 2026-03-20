import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Practice } from '../../practices/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getTags, Tag } from '../api/tagsApi';

const issueSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
        message: 'Please select a priority'
    }),
    practiceIds: z.array(z.coerce.number()).max(50).optional(),
    tagIds: z.array(z.coerce.number()).max(50).optional(),
    isStandalone: z.boolean().optional(),
});

type IssueFormData = z.infer<typeof issueSchema>;

interface IssueSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    practices: Practice[];
    onSubmit: (data: IssueFormData) => Promise<void>;
}

export const IssueSubmissionModal: React.FC<IssueSubmissionModalProps> = ({
    isOpen,
    onClose,
    practices,
    onSubmit,
}) => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        watch,
        setValue,
    } = useForm<IssueFormData>({
        resolver: zodResolver(issueSchema) as any,
        defaultValues: {
            priority: 'MEDIUM',
            practiceIds: [],
            tagIds: [],
            isStandalone: false,
        },
    });

    const [tags, setTags] = useState<Tag[]>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);

    const selectedPracticeIds = watch('practiceIds') || [];
    const isStandalone = watch('isStandalone') || false;

    // Derive a stable key for the effect based on sorted practice selection
    const selectedPracticeKey = [...selectedPracticeIds].sort().join(',');

    useEffect(() => {
        const fetchTags = async () => {
            if (!isStandalone && selectedPracticeIds.length === 0) {
                setTags([]);
                return;
            }

            setIsLoadingTags(true);
            try {
                let fetchedTags;
                if (isStandalone) {
                    // Standalone issue: show all global tags
                    fetchedTags = await getTags();
                } else {
                    // Practice-linked issue: show only tags associated with selected practices
                    fetchedTags = await getTags({
                        practiceIds: selectedPracticeIds.map(Number).filter(n => n > 0),
                    });
                }
                setTags(fetchedTags);
            } catch (error) {
                console.error('Failed to fetch tags', error);
            } finally {
                setIsLoadingTags(false);
            }
        };

        fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStandalone, selectedPracticeKey]);

    const onFormSubmit = async (data: IssueFormData) => {
        try {
            await onSubmit(data);
            reset();
            onClose();
        } catch (error) {
            console.error('Failed to submit issue', error);
        }
    };

    const onFormInvalid = (formErrors: typeof errors) => {
        console.warn('Issue submission blocked by validation errors', formErrors);
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full rounded bg-white p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-lg font-bold">Submit New Issue</Dialog.Title>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onFormSubmit, onFormInvalid)} className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                Title
                            </label>
                            <input
                                id="title"
                                type="text"
                                {...register('title')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description
                            </label>
                            <textarea
                                id="description"
                                rows={4}
                                {...register('description')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                                Priority
                            </label>
                            <select
                                id="priority"
                                {...register('priority')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                            {errors.priority && (
                                <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Linked Practices
                            </label>
                            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                                {practices.map((practice) => (
                                    <div key={practice.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`practice-${practice.id}`}
                                            value={practice.id}
                                            {...register('practiceIds')}
                                            disabled={isStandalone}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <label htmlFor={`practice-${practice.id}`} className={`ml-2 text-sm text-gray-700 ${isStandalone ? 'opacity-50' : ''}`}>
                                            {practice.title}
                                        </label>
                                    </div>
                                ))}
                                {practices.length === 0 && (
                                    <p className="text-sm text-gray-500">No practices available to link.</p>
                                )}
                            </div>
                            <div className="mt-2 flex items-center">
                                <input
                                    type="checkbox"
                                    id="isStandalone"
                                    {...register('isStandalone')}
                                    onChange={(e) => {
                                        register('isStandalone').onChange(e);
                                        if (e.target.checked) {
                                            setValue('practiceIds', []); // clear practices if standalone
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isStandalone" className="ml-2 text-sm text-gray-700 italic">
                                    Practice not listed
                                </label>
                            </div>
                            {errors.practiceIds?.message && (
                                <p className="mt-1 text-sm text-red-600">{errors.practiceIds.message}</p>
                            )}
                        </div>

                        {(isStandalone || selectedPracticeIds.length > 0) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {isStandalone ? 'Select missing capabilities' : 'Select problem sources'}
                                </label>
                                {isLoadingTags ? (
                                    <p className="text-sm text-gray-500">Loading tags...</p>
                                ) : (
                                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                                        {tags.map((tag) => (
                                            <div key={tag.id} className="flex items-center" title={tag.description || ''}>
                                                <input
                                                    type="checkbox"
                                                    id={`tag-${tag.id}`}
                                                    value={tag.id}
                                                    {...register('tagIds')}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor={`tag-${tag.id}`} className="ml-2 text-sm text-gray-700">
                                                    {tag.name}
                                                </label>
                                            </div>
                                        ))}
                                        {tags.length === 0 && (
                                            <p className="text-sm text-gray-500">No tags available.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="mr-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Issue'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};
