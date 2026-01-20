export const PracticeCardSkeleton = () => (
  <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
    <div className="flex gap-2">
      <span className="h-6 w-16 bg-gray-200 rounded-full"></span>
      <span className="h-6 w-14 bg-gray-200 rounded-full"></span>
      <span className="h-6 w-12 bg-gray-200 rounded-full"></span>
    </div>
  </div>
)
