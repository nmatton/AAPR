import { useState, useEffect } from 'react'
import { Questionnaire } from '../components/Questionnaire'
import * as bigFiveApi from '../api/bigFiveApi'
import { ProfileView } from '../components/ProfileView'
import type { BigFiveScores } from '../api/bigFiveApi'

export const BigFivePage = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [hasCompleted, setHasCompleted] = useState(false)
    const [scores, setScores] = useState<BigFiveScores | null>(null)
    const [showQuestionnaire, setShowQuestionnaire] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadExistingScores()
    }, [])

    const loadExistingScores = async () => {
        try {
            const response = await bigFiveApi.getMyScores()
            if (response.completed && response.scores) {
                setHasCompleted(true)
                setScores(response.scores)
            }
        } catch (err) {
            console.error('Failed to load scores:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStartQuestionnaire = () => {
        setShowQuestionnaire(true)
        setError(null)
    }

    const handleSubmitQuestionnaire = async (responses: Record<number, number>) => {
        try {
            // Convert responses object to array format expected by API
            const responsesArray = Object.entries(responses).map(([itemNumber, response]) => ({
                itemNumber: parseInt(itemNumber),
                response
            }))

            const result = await bigFiveApi.submitQuestionnaire(responsesArray)
            setScores(result.scores)
            setHasCompleted(true)
            setShowQuestionnaire(false)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit questionnaire';
            throw new Error(message)
        }
    }

    const handleRetake = () => {
        setShowQuestionnaire(true)
        setError(null)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (showQuestionnaire) {
        return (
            <Questionnaire
                onSubmit={handleSubmitQuestionnaire}
                onCancel={hasCompleted ? () => setShowQuestionnaire(false) : undefined}
            />
        )
    }

    if (hasCompleted && scores) {
        return <ProfileView scores={scores} onRetake={handleRetake} />
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* ... keeping intro content ... */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Big Five Personality Assessment
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                    Discover your personality profile to get personalized practice recommendations.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    What you'll learn:
                </h2>
                <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        <span><strong>Extraversion:</strong> Your sociability and energy levels</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        <span><strong>Agreeableness:</strong> Your cooperation and empathy</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        <span><strong>Conscientiousness:</strong> Your organization and reliability</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        <span><strong>Neuroticism:</strong> Your emotional stability</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        <span><strong>Openness:</strong> Your creativity and curiosity</span>
                    </li>
                </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                    <strong>Time required:</strong> 5-10 minutes • <strong>Questions:</strong> 44 items
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                </div>
            )}

            <button
                onClick={handleStartQuestionnaire}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
            >
                Start Questionnaire
            </button>
        </div>
    )
}
