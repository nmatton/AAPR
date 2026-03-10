import React from 'react';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';

const decisionSchema = z.object({
    decisionText: z.string().min(10, 'Decision must be at least 10 characters').max(5000),
});

type DecisionFormData = z.infer<typeof decisionSchema>;

interface DecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (decisionText: string) => Promise<void>;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<DecisionFormData>({
        resolver: zodResolver(decisionSchema),
    });

    const onFormSubmit = async (data: DecisionFormData) => {
        try {
            await onSubmit(data.decisionText);
            reset();
            onClose();
        } catch (error) {
            console.error('Failed to submit decision', error);
            // Re-throw so parent can handle 409
            throw error;
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full rounded bg-white p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-lg font-bold">Record Adaptation Decision</Dialog.Title>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                        <div>
                            <label htmlFor="decisionText" className="block text-sm font-medium text-gray-700">
                                Decision Details
                            </label>
                            <textarea
                                id="decisionText"
                                rows={6}
                                placeholder="Describe the adaptation decision made (e.g., 'Switch to async standups')..."
                                {...register('decisionText')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                            {errors.decisionText && (
                                <p className="mt-1 text-sm text-red-600">{errors.decisionText.message}</p>
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
                                {isSubmitting ? 'Saving...' : 'Save Decision'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};
