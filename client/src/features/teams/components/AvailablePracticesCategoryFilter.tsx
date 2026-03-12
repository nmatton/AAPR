import { useAddPracticesStore } from '../state/addPracticesSlice'

const CATEGORIES = [
  { id: 'TECHNICAL_QUALITY', label: 'Technical Quality & Engineering Excellence' },
  { id: 'TEAM_CULTURE', label: 'Team Culture & Psychology' },
  { id: 'PROCESS_EXECUTION', label: 'Process & Execution' },
  { id: 'PRODUCT_VALUE', label: 'Product Value & Customer Alignment' }
]

export const AvailablePracticesCategoryFilter = () => {
  const { selectedCategories, toggleCategory } = useAddPracticesStore()

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Categories</h3>
      <div className="space-y-1">
        {CATEGORIES.map((category) => (
          <label key={category.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCategories.includes(category.id)}
              onChange={() => toggleCategory(category.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">{category.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
