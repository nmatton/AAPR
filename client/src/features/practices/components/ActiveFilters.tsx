
import { usePracticesStore } from '../state/practices.slice'

export const ActiveFilters = () => {
    const {
        selectedCategories,
        selectedMethods,
        selectedTags,
        toggleCategory,
        toggleMethod,
        setTags,
        clearFilters
    } = usePracticesStore()

    const hasFilters = selectedCategories.length > 0 || selectedMethods.length > 0 || selectedTags.length > 0

    if (!hasFilters) return null

    const removeTag = (tag: string) => {
        setTags(selectedTags.filter(t => t !== tag))
    }

    return (
        <div className="flex flex-wrap gap-2 items-center mt-2">
            <span className="text-sm text-gray-500">Active filters:</span>

            {selectedCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                    {cat}
                    <button onClick={() => toggleCategory(cat)} className="hover:text-blue-900">×</button>
                </span>
            ))}

            {selectedMethods.map(method => (
                <span key={method} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                    {method}
                    <button onClick={() => toggleMethod(method)} className="hover:text-purple-900">×</button>
                </span>
            ))}

            {selectedTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-green-900">×</button>
                </span>
            ))}

            <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
            >
                Clear all
            </button>
        </div>
    )
}
