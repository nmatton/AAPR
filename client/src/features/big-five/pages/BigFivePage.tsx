import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Questionnaire } from '../components/Questionnaire'
import * as bigFiveApi from '../api/bigFiveApi'
import type { BigFiveScores } from '../api/bigFiveApi'

export const BigFivePage = () => {
    const navigate = useNavigate()
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
        } catch (err: any) {
            console.error('Failed to load scores:', err)
            // Don't show error for missing scores - just means not completed yet
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
        } catch (err: any) {
            throw new Error(err.message || 'Failed to submit questionnaire')
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
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Your Big Five Personality Profile
                    </h1>
                    <p className="text-gray-600">
                        Completed on {new Date(scores.createdAt).toLocaleDateString()}
                    </p>
                </div>

                {/* Scores display */}
                <div className="space-y-4 mb-8">
                    <ScoreBar
                        label="Extraversion"
                        score={scores.extraversion}
                        min={8}
                        max={40}
                        description="Sociability, assertiveness, and enthusiasm"
                    />
                    <ScoreBar
                        label="Agreeableness"
                        score={scores.agreeableness}
                        min={9}
                        max={45}
                        description="Compassion, cooperation, and trust"
                    />
                    <ScoreBar
                        label="Conscientiousness"
                        score={scores.conscientiousness}
                        min={9}
                        max={45}
                        description="Organization, responsibility, and self-discipline"
                    />
                    <ScoreBar
                        label="Neuroticism"
                        score={scores.neuroticism}
                        min={8}
                        max={40}
                        description="Emotional stability and stress management"
                    />
                    <ScoreBar
                        label="Openness"
                        score={scores.openness}
                        min={10}
                        max={50}
                        description="Curiosity, creativity, and openness to new experiences"
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleRetake}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Retake Questionnaire
                    </button>
                    <button
                        onClick={() => navigate('/teams')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Continue to Teams
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
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

interface ScoreBarProps {
    label: string
    score: number
    min: number
    max: number
    description: string
}

const ScoreBar = ({ label, score, min, max, description }: ScoreBarProps) => {
    const percentage = ((score - min) / (max - min)) * 100

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                    {score}
                    <span className="text-sm text-gray-500">/{max}</span>
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
