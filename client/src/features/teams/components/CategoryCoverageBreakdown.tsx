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
        Click on a category card to see detailed breakdown of covered and gap pillars.
      </p>
      
      {/* Responsive Grid: 3 columns on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryBreakdown.map((category) => (
          <div key={category.categoryId} className="border rounded-lg overflow-hidden flex flex-col">
            {/* Category Card */}
            <button
              onClick={() => toggleCategory(category.categoryId)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              aria-label={`${category.categoryName}, ${category.coveragePct}% coverage, click to expand details`}
              aria-expanded={expandedCategory === category.categoryId}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getCoverageBadge(category.coveragePct)}
                  <span className="font-semibold text-gray-800 text-sm">
                    {category.categoryName}
                  </span>
                </div>
                {category.coveragePct < 50 && (
                  <span className="text-red-600 text-xs" aria-label="Warning: Low coverage">⚠️</span>
                )}
              </div>
              
              <div className="mb-2">
                <span className={`text-lg font-bold ${getCoverageTextColor(category.coveragePct)}`}>
                  {category.coveragePct}%
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({category.coveredCount}/{category.totalCount} pillars)
                </span>
              </div>

              {/* Compact Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={category.coveragePct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`h-2 rounded-full ${getCoverageColor(category.coveragePct)} transition-all`}
                  style={{ width: `${category.coveragePct}%` }}
                />
              </div>

              {/* Tiny Pillar Indicators */}
              <div className="flex gap-1 mt-2 flex-wrap">
                {category.coveredPillars.map((pillar) => (
                  <span 
                    key={pillar.id} 
                    className="inline-block w-2 h-2 rounded-full bg-green-500" 
                    title={pillar.name}
                    aria-label={`${pillar.name} covered`}
                  />
                ))}
                {category.gapPillars.map((pillar) => (
                  <span 
                    key={pillar.id} 
                    className="inline-block w-2 h-2 rounded-full bg-gray-300" 
                    title={pillar.name}
                    aria-label={`${pillar.name} not covered`}
                  />
                ))}
              </div>
            </button>

            {/* Expanded Detail */}
            {expandedCategory === category.categoryId && (
              <div className="px-4 py-4 bg-white border-t">
                {/* Covered Pillars */}
                {category.coveredPillars.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-green-700 mb-2 text-sm">
                      ✅ Covered Pillars ({category.coveredPillars.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {category.coveredPillars.map((pillar) => (
                        <li key={pillar.id} className="text-xs text-gray-700">
                          {pillar.name}
                          {pillar.description && (
                            <span className="text-gray-500 ml-1">- {pillar.description}</span>
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
                    <h4 className="font-semibold text-red-700 mb-2 text-sm">
                      ❌ Gap Pillars ({category.gapPillars.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      {category.gapPillars.map((pillar) => (
                        <li key={pillar.id} className="text-xs text-gray-700">
                          {pillar.name}
                          {pillar.description && (
                            <span className="text-gray-500 ml-1">- {pillar.description}</span>
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
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3" role="alert">
                        <p className="text-xs text-red-800 font-semibold mb-1">
                          ⚠️ Warning: Low coverage in this category
                        </p>
                        <p className="text-xs text-red-700">
                          Consider adding practices from this category to improve your team's agile maturity.
                        </p>
                      </div>
                    )}

                    {/* View Available Practices Button */}
                    {onViewPractices && category.coveragePct < 50 && (
                      <button
                        onClick={(e) => handleViewPractices(category.categoryId, e)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                        aria-label={`View available practices in ${category.categoryName} category`}
                      >
                        View Available Practices
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
