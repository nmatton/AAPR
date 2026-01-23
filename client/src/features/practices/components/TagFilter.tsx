
import { useState, useEffect } from 'react'
import { usePracticesStore } from '../state/practices.slice'

export const TagFilter = () => {
    const { selectedTags, setTags } = usePracticesStore()
    const [inputValue, setInputValue] = useState('')

    // Sync state to input if changed externally (e.g. clear filters)
    useEffect(() => {
        if (selectedTags.length === 0) {
            setInputValue('')
        }
    }, [selectedTags])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInputValue(value) // Local state for smooth typing

        // Debounce or immediate update? AC says "enter or select tags".
        // Let's parse on change for now, or maybe on blur/enter?
        // Implementation Plan says "Input/Select", AC says "multi-select or comma-separated text input".
        // Simple text input with comma separation is easier to start.
        const tags = value.split(',').map(t => t.trim()).filter(Boolean)
        setTags(tags)
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Tags</h3>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="e.g. Visual, Async"
                className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500">Separate multiple tags with commas</p>
        </div>
    )
}
