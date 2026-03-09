import { CategorizedTagSelector } from '../../../shared/components/CategorizedTagSelector'
import { usePracticesStore } from '../state/practices.slice'

export const TagFilter = () => {
  const { selectedTags, setTags } = usePracticesStore()

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Tags</h3>
      <CategorizedTagSelector selectedTags={selectedTags} onChange={setTags} />
    </div>
  )
}
