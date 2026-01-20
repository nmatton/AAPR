interface PracticeErrorStateProps {
  message: string
  onRetry: () => void
}

export const PracticeErrorState = ({ message, onRetry }: PracticeErrorStateProps) => (
  <div className="text-center py-10 bg-white border border-red-200 rounded-lg">
    <p className="text-red-600 font-semibold mb-4">Unable to load practices. Please refresh the page.</p>
    <p className="text-gray-600 text-sm mb-6">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Retry
    </button>
  </div>
)
