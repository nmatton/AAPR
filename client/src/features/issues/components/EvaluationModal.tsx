import React from 'react';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';

const evaluationSchema = z.object({
    outcome: z.enum(['yes', 'no', 'partial'], {
        message: 'Please select an outcome'
    }),
    comments: z.string().max(5000),
});

type EvaluationFormData = z.infer<typeof evaluationSchema>;

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (outcome: string, comments: string) => Promise<void>;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<EvaluationFormData>({
        resolver: zodResolver(evaluationSchema),
        defaultValues: { outcome: undefined, comments: '' },
    });

    React.useEffect(() => {
        if (isOpen) {
            reset({ outcome: undefined, comments: '' });
        }
    }, [isOpen, reset]);

    const onFormSubmit = async (data: EvaluationFormData) => {
        try {
            await onSubmit(data.outcome, data.comments || '');
            reset();
            onClose();
        } catch (error) {
            console.error('Failed to submit evaluation', error);
            throw error;
        }
    };

    const outcomeOptions = [
        { value: 'yes' as const, label: 'Yes — Effective', emoji: '✅', description: 'The adaptation achieved its goals' },
        { value: 'no' as const, label: 'No — Ineffective', emoji: '❌', description: 'The adaptation did not help' },
        { value: 'partial' as const, label: 'Partial — Mixed Results', emoji: '⚠️', description: 'Some improvement, but not fully effective' },
    ];

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full rounded bg-white p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-lg font-bold">Evaluate Adaptation</Dialog.Title>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        Was this adaptation effective? Evaluate after 1-2 sprints of use.
                    </p>

                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Effectiveness
                            </label>
                            <div className="space-y-2">
                                {outcomeOptions.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        <input
                                            type="radio"
                                            value={opt.value}
                                            {...register('outcome')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-medium">{opt.emoji} {opt.label}</span>
                                            <p className="text-sm text-gray-500">{opt.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {errors.outcome && (
                                <p className="mt-1 text-sm text-red-600">{errors.outcome.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="evaluationComments" className="block text-sm font-medium text-gray-700">
                                Comments (optional)
                            </label>
                            <textarea
                                id="evaluationComments"
                                rows={4}
                                placeholder="Describe the results of the adaptation..."
                                {...register('comments')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                            {errors.comments && (
                                <p className="mt-1 text-sm text-red-600">{errors.comments.message}</p>
                            )}
                        </div>

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
                                {isSubmitting ? 'Saving...' : 'Submit Evaluation'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};
