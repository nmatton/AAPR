
import { usePracticesStore } from '../state/practices.slice'

export const MethodFilter = () => {
    const { availableMethods, selectedMethods, toggleMethod } = usePracticesStore()

    const methods = Array.from(new Set([...availableMethods, ...selectedMethods]))
        .sort((a, b) => a.localeCompare(b))

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Method / Framework</h3>
            <div className="space-y-1">
                {methods.map((method) => (
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
                {methods.length === 0 && (
                    <p className="text-xs text-gray-500">No methods available for current results.</p>
                )}
            </div>
        </div>
    )
}
