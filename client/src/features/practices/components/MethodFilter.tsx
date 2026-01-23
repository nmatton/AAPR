
import { usePracticesStore } from '../state/practices.slice'

const METHODS = [
    'Scrum',
    'XP',
    'Kanban',
    'Lean',
    'SAFe',
    'Custom'
]

export const MethodFilter = () => {
    const { selectedMethods, toggleMethod } = usePracticesStore()

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Method / Framework</h3>
            <div className="space-y-1">
                {METHODS.map((method) => (
                    <label key={method} className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedMethods.includes(method)}
                            onChange={() => toggleMethod(method)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">{method}</span>
                    </label>
                ))}
            </div>
        </div>
    )
}
