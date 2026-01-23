
import { usePracticesStore } from '../state/practices.slice'

const CATEGORIES = [
    { id: 'VALEURS_HUMAINES', label: 'Valeurs Humaines' },
    { id: 'FEEDBACK_APPRENTISSAGE', label: 'Feedback & Apprentissage' },
    { id: 'EXCELLENCE_TECHNIQUE', label: 'Excellence Technique' },
    { id: 'ORGANISATION_AUTONOMIE', label: 'Organisation & Autonomie' },
    { id: 'FLUX_RAPIDITE', label: 'Flux & Rapidité' }
]

export const CategoryFilter = () => {
    const { selectedCategories, toggleCategory } = usePracticesStore()

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
