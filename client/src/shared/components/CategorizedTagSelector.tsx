import { TAG_CATEGORIES, normalizeValidTags, type ValidTag } from '../constants/tags.constants'

interface CategorizedTagSelectorProps {
  selectedTags: string[]
  onChange: (tags: ValidTag[]) => void
  disabled?: boolean
}

export const CategorizedTagSelector = ({
  selectedTags,
  onChange,
  disabled = false
}: CategorizedTagSelectorProps) => {
  const normalizedSelectedTags = normalizeValidTags(selectedTags)
  const selectedSet = new Set<string>(normalizedSelectedTags)

  const toggleTag = (tag: ValidTag) => {
    if (selectedSet.has(tag)) {
      onChange(normalizedSelectedTags.filter((selectedTag) => selectedTag !== tag))
      return
    }

    onChange([...normalizedSelectedTags, tag])
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 p-3 space-y-3">
      {TAG_CATEGORIES.map((category) => (
        <section key={category.name} aria-label={category.name}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">{category.name}</h4>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {category.tags.map((tag) => (
              <label key={tag} className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedSet.has(tag)}
                  onChange={() => toggleTag(tag)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                />
                <span>{tag}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
