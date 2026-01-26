import React, { useEffect, useState } from 'react'
import type { Pillar } from '../types'
import { getTeamPillarCoverage } from '../../teams/api/coverageApi'
import { fetchPractices, logPillarDetailViewed } from '../api/practices.api'

interface PillarContextPopoverProps {
    pillar: Pillar
    teamId?: number
    currentPracticeId: number
    onClose: () => void
    onNavigateToPractice: (practiceId: number) => void
}

interface RelatedPractice {
    id: number
    title: string
}

const CATEGORY_COLORS: Record<string, string> = {
    VALEURS_HUMAINES: 'bg-red-100 text-red-700 border-red-200',
    FEEDBACK_APPRENTISSAGE: 'bg-blue-100 text-blue-700 border-blue-200',
    EXCELLENCE_TECHNIQUE: 'bg-purple-100 text-purple-700 border-purple-200',
    ORGANISATION_AUTONOMIE: 'bg-green-100 text-green-700 border-green-200',
    FLUX_RAPIDITE: 'bg-amber-100 text-amber-700 border-amber-200'
}

const normalizeCategoryKey = (value: string) =>
    value
        .toUpperCase()
        .replace(/&/g, ' ')
        .replace(/\s+/g, '_')
        .replace(/__+/g, '_')
        .replace(/[^A-Z_]/g, '')
        .trim()

export const PillarContextPopover: React.FC<PillarContextPopoverProps> = ({
    pillar,
    teamId,
    currentPracticeId,
    onClose,
    onNavigateToPractice,
}) => {
    const [teamPractices, setTeamPractices] = useState<RelatedPractice[]>([])
    const [globalPractices, setGlobalPractices] = useState<RelatedPractice[]>([])
    const [loading, setLoading] = useState(false)
    const [description, setDescription] = useState<string | null>(pillar.description || null)

    useEffect(() => {
        // Lock body scroll
        document.body.style.overflow = 'hidden'

        // Log view event
        logPillarDetailViewed({
            teamId: teamId || null,
            practiceId: currentPracticeId,
            pillarId: pillar.id,
            timestamp: new Date().toISOString()
        })

        return () => {
            document.body.style.overflow = ''
        }
    }, [teamId, currentPracticeId, pillar.id])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    useEffect(() => {
        let isMounted = true
        const loadContext = async () => {
            setLoading(true)
            try {
                // 1. Fetch Global Practices first (always needed for Discovery)
                const globalData = await fetchPractices(1, 100, undefined, [pillar.id])

                let inTeamIds = new Set<number>()
                let descriptionFromCoverage: string | null = null

                // 2. If Team Context, fetch coverage to identify "In Team" practices
                if (teamId) {
                    const coverage = await getTeamPillarCoverage(teamId)

                    // The practices are in categoryBreakdown, not in coveredPillars/gapPillars
                    // We need to search through all categories to find this pillar
                    const allPillarsWithPractices: Array<{
                        id: number
                        name: string
                        description?: string | null
                        practices: Array<{ id: number; title: string }>
                    }> = []

                    coverage.categoryBreakdown.forEach(category => {
                        category.coveredPillars.forEach(p => {
                            allPillarsWithPractices.push({
                                id: p.id,
                                name: p.name,
                                description: p.description,
                                practices: p.practices || []
                            })
                        })
                        category.gapPillars.forEach(p => {
                            allPillarsWithPractices.push({
                                id: p.id,
                                name: p.name,
                                description: p.description,
                                practices: p.practices || []
                            })
                        })
                    })

                    const matchedPillar = allPillarsWithPractices.find(p => p.id === pillar.id)

                    if (matchedPillar) {
                        const practices = matchedPillar.practices
                        // Filter current practice from view
                        const filteredTeamApps = practices.filter(p => p.id !== currentPracticeId)
                        if (isMounted) setTeamPractices(filteredTeamApps)
                        practices.forEach(p => inTeamIds.add(p.id))

                        descriptionFromCoverage = matchedPillar.description || null
                    }
                }

                if (isMounted) {
                    // Update description if we got a better one from coverage, otherwise keep existing
                    if (descriptionFromCoverage) {
                        setDescription(descriptionFromCoverage)
                    }

                    // 4. Calculate "Discover" list: Global practices NOT in current team (and not current practice)
                    // We also filter out the current practice ID just in case it wasn't in the team list but returned globally
                    const discoverList = globalData.items.filter(p =>
                        !inTeamIds.has(p.id) && p.id !== currentPracticeId
                    ).map(p => ({ id: p.id, title: p.title }))

                    setGlobalPractices(discoverList)
                }

            } catch (err) {
                console.error('Failed to load pillar context', err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        loadContext()
        return () => { isMounted = false }
    }, [teamId, pillar.id, currentPracticeId])

    const getPillarColor = (category: string) => {
        const key = normalizeCategoryKey(category)
        const base = CATEGORY_COLORS[key]
        if (base?.includes('red')) return 'bg-red-100 text-red-800'
        if (base?.includes('blue')) return 'bg-blue-100 text-blue-800'
        if (base?.includes('purple')) return 'bg-purple-100 text-purple-800'
        if (base?.includes('green')) return 'bg-green-100 text-green-800'
        if (base?.includes('amber')) return 'bg-amber-100 text-amber-800'
        return 'bg-gray-100 text-gray-800'
    }

    const renderPracticeList = (practices: RelatedPractice[], emptyText: string) => (
        practices.length > 0 ? (
            <ul className="space-y-2">
                {practices.map(practice => (
                    <li key={practice.id}>
                        <button
                            onClick={() => {
                                console.log('[PillarContextPopover] Navigating to practice:', practice.id, practice.title)
                                onNavigateToPractice(practice.id)
                                onClose()
                            }}
                            className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-blue-700">{practice.title}</span>
                            <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm text-gray-500 italic">{emptyText}</p>
            </div>
        )
    )

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                data-testid="popover-backdrop"
            />

            {/* Popover Content */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase mb-2 ${getPillarColor(pillar.category)}`}>
                            {pillar.category}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{pillar.name}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-8">

                    {/* Definition */}
                    <div className="prose prose-sm text-gray-600">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Definition</h3>
                        <p className="text-base leading-relaxed">
                            {description || 'No description available for this pillar.'}
                        </p>
                    </div>

                    {loading ? (
                        <div className="space-y-4 animate-pulse" role="status">
                            <span className="sr-only">Loading...</span>
                            <div className="h-8 bg-gray-100 rounded w-1/3"></div>
                            <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                            <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                        </div>
                    ) : (
                        <>
                            {/* Team Context Section - Only if Team ID is present */}
                            {teamId && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span>Related Team Practices</span>
                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">TEAM CONTEXT</span>
                                    </h3>
                                    {renderPracticeList(teamPractices, "No other practices in this team cover this pillar.")}
                                </div>
                            )}

                            {/* Global Discovery Section */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span>Discover More</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">GLOBAL</span>
                                </h3>
                                {renderPracticeList(globalPractices, "No other global practices found for this pillar.")}
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}
