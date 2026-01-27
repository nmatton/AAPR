import { useState } from 'react'

const BFI_ITEMS = [
    'Is talkative',
    'Tends to find fault with others',
    'Does a thorough job',
    'Is depressed, blue',
    'Is original, comes up with new ideas',
    'Is reserved',
    'Is helpful and unselfish with others',
    'Can be somewhat careless',
    'Is relaxed, handles stress well',
    'Is curious about many different things',
    'Is full of energy',
    'Starts quarrels with others',
    'Is a reliable worker',
    'Can be tense',
    'Is ingenious, a deep thinker',
    'Generates a lot of enthusiasm',
    'Has a forgiving nature',
    'Tends to be disorganized',
    'Worries a lot',
    'Has an active imagination',
    'Tends to be quiet',
    'Is generally trusting',
    'Tends to be lazy',
    'Is emotionally stable, not easily upset',
    'Is inventive',
    'Has an assertive personality',
    'Can be cold and aloof',
    'Perseveres until the task is finished',
    'Can be moody',
    'Values artistic, aesthetic experiences',
    'Is sometimes shy, inhibited',
    'Is considerate and kind to almost everyone',
    'Does things efficiently',
    'Remains calm in tense situations',
    'Prefers work that is routine',
    'Is outgoing, sociable',
    'Is sometimes rude to others',
    'Makes plans and follows through with them',
    'Gets nervous easily',
    'Likes to reflect, play with ideas',
    'Has few artistic interests',
    'Likes to cooperate with others',
    'Is easily distracted',
    'Is sophisticated in art, music, or literature'
]

const SCALE_LABELS = [
    'Disagree strongly',
    'Disagree a little',
    'Neither agree nor disagree',
    'Agree a little',
    'Agree strongly'
]

interface QuestionnaireProps {
    onSubmit: (responses: Record<number, number>) => Promise<void>
    onCancel?: () => void
}

export const Questionnaire = ({ onSubmit, onCancel }: QuestionnaireProps) => {
    const [responses, setResponses] = useState<Record<number, number>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleResponseChange = (itemNumber: number, value: number) => {
        setResponses(prev => ({
            ...prev,
            [itemNumber]: value
        }))
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate all 44 items are answered
        const answeredCount = Object.keys(responses).length
        if (answeredCount < 44) {
            setError(`Please answer all questions (${answeredCount}/44 answered)`)
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await onSubmit(responses)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit questionnaire. Please try again.'
            setError(errorMessage)
            setIsSubmitting(false)
        }
    }

    const progress = (Object.keys(responses).length / 44) * 100

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Big Five Personality Questionnaire
                </h2>
                <p className="text-gray-600 mb-4">
                    Please rate how accurately each statement describes you.
                </p>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    {Object.keys(responses).length} of 44 questions answered
                </p>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                </div>
            )}

            {/* Scale legend */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Rating scale:</p>
                <div className="grid grid-cols-5 gap-2 text-xs text-gray-600">
                    {SCALE_LABELS.map((label, idx) => (
                        <div key={idx} className="text-center">
                            <span className="font-medium">{idx + 1}</span> - {label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
                {BFI_ITEMS.map((item, index) => {
                    const itemNumber = index + 1
                    const currentValue = responses[itemNumber]

                    return (
                        <div
                            key={itemNumber}
                            className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <label className="text-gray-900 font-medium flex-1">
                                    <span className="text-gray-500 mr-2">{itemNumber}.</span>
                                    I see myself as someone who... {item}
                                </label>
                            </div>

                            <div className="flex gap-2 justify-center">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleResponseChange(itemNumber, value)}
                                        className={`
                      w-12 h-12 rounded-lg border-2 font-medium transition-all
                      ${currentValue === value
                                                ? 'bg-blue-600 text-white border-blue-600 scale-110'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                            }
                    `}
                                        aria-label={`${SCALE_LABELS[value - 1]}`}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Submit buttons */}
            <div className="mt-8 flex gap-4 justify-end sticky bottom-0 bg-white p-4 border-t border-gray-200">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting || Object.keys(responses).length < 44}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Questionnaire'}
                </button>
            </div>
        </form>
    )
}
