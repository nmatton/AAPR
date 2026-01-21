import { useState } from 'react'
import type { CategoryCoverage } from '../types/coverage.types'

interface CategoryCoverageBreakdownProps {
  categoryBreakdown: CategoryCoverage[]
  onViewPractices?: (categoryId: string) => void
}

const getCoverageColor = (coveragePct: number): string => {
  if (coveragePct >= 75) return 'bg-green-500'
  if (coveragePct >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getCoverageTextColor = (coveragePct: number): string => {
  if (coveragePct >= 75) return 'text-green-700'
  if (coveragePct >= 50) return 'text-yellow-700'
  return 'text-red-700'
}

const getCoverageBadge = (coveragePct: number): JSX.Element | null => {
  if (coveragePct >= 75) return <span className="text-green-600">✅</span>
  if (coveragePct >= 50) return <span className="text-yellow-600">⚠️</span>
  return <span className="text-red-600">❌</span>
}

export const CategoryCoverageBreakdown = ({ 
  categoryBreakdown,
  onViewPractices 
}: CategoryCoverageBreakdownProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  const handleViewPractices = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onViewPractices?.(categoryId)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Coverage by Category</h2>
      <p className="text-sm text-gray-600 mb-6">
        Click on a category to see detailed breakdown of covered and gap pillars.
      </p>
      
      <div className="space-y-4">
        {categoryBreakdown.map((category) => (
          <div key={category.categoryId} className="border rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.categoryId)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                {getCoverageBadge(category.coveragePct)}
                <span className="font-semibold text-gray-800">
                  {category.categoryName}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`font-bold ${getCoverageTextColor(category.coveragePct)}`}>
                  {category.coveredCount}/{category.totalCount} pillars ({category.coveragePct}%)
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform ${expandedCategory === category.categoryId ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Progress Bar */}
            <div className="px-4 py-2 bg-gray-50">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getCoverageColor(category.coveragePct)} transition-all`}
                  style={{ width: `${category.coveragePct}%` }}
                />
              </div>
            </div>

            {/* Expanded Detail */}
            {expandedCategory === category.categoryId && (
              <div className="px-4 py-4 bg-white border-t">
                {/* Covered Pillars */}
                {category.coveredPillars.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-green-700 mb-2">
                      ✅ Covered Pillars ({category.coveredPillars.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {category.coveredPillars.map((pillar) => (
                        <li key={pillar.id} className="text-sm text-gray-700">
                          {pillar.name}
                          {pillar.description && (
                            <span className="text-gray-500 ml-2">- {pillar.description}</span>
                          )}
                          {pillar.practices && pillar.practices.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Practices: {pillar.practices.map((practice) => practice.title).join(', ')}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gap Pillars */}
                {category.gapPillars.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-700 mb-2">
                      ❌ Gap Pillars ({category.gapPillars.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      {category.gapPillars.map((pillar) => (
                        <li key={pillar.id} className="text-sm text-gray-700">
                          {pillar.name}
                          {pillar.description && (
                            <span className="text-gray-500 ml-2">- {pillar.description}</span>
                          )}
                          {pillar.practices && pillar.practices.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Practices: {pillar.practices.map((practice) => practice.title).join(', ')}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Gap Warning & Recommendation */}
                    {category.coveragePct < 50 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-red-800 font-semibold mb-1">
                          ⚠️ Warning: Low coverage in this category
                        </p>
                        <p className="text-sm text-red-700">
                          Consider adding practices from this category to improve your team's agile maturity.
                        </p>
                      </div>
                    )}

                    {/* View Available Practices Button */}
                    {onViewPractices && category.coveragePct < 50 && (
                      <button
                        onClick={(e) => handleViewPractices(category.categoryId, e)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        View Available Practices in {category.categoryName}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
