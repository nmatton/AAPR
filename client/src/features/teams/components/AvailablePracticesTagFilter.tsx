import { CategorizedTagSelector } from '../../../shared/components/CategorizedTagSelector'
import { useAddPracticesStore } from '../state/addPracticesSlice'

export const AvailablePracticesTagFilter = () => {
  const { selectedTags, setTags } = useAddPracticesStore()

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Tags</h3>
      <CategorizedTagSelector selectedTags={selectedTags} onChange={setTags} />
    </div>
  )
}
