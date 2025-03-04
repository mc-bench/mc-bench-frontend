interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  templateCount: number
  promptCount: number
  modelCount: number
  isSubmitting?: boolean
  numSamples: number
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  templateCount,
  promptCount,
  modelCount,
  isSubmitting,
  numSamples,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const totalCombinations =
    templateCount * promptCount * modelCount * numSamples
  const showWarning = totalCombinations > 100

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-xl">
        <div className="border-b dark:border-gray-800 p-4 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        </div>

        <div className="p-8 text-center space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to create a run with:
          </p>
          <div className="grid grid-cols-[1fr,auto] gap-x-8 gap-y-3 max-w-[200px] mx-auto text-lg">
            <div className="text-left text-gray-700 dark:text-gray-300">
              templates
            </div>
            <div className="text-right font-medium text-gray-900 dark:text-gray-100">
              {templateCount}
            </div>
            <div className="text-left text-gray-700 dark:text-gray-300">
              prompts
            </div>
            <div className="text-right font-medium text-gray-900 dark:text-gray-100">
              {promptCount}
            </div>
            <div className="text-left text-gray-700 dark:text-gray-300">
              models
            </div>
            <div className="text-right font-medium text-gray-900 dark:text-gray-100">
              {modelCount}
            </div>
            <div className="text-left text-gray-700 dark:text-gray-300">
              samples each
            </div>
            <div className="text-right font-medium text-gray-900 dark:text-gray-100">
              {numSamples}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              Total combinations: {totalCombinations}
            </p>
            {showWarning && (
              <p className="text-amber-600 dark:text-amber-400 text-sm">
                Warning: This will create a large number of combinations. This
                may take a significant amount of time to process.
              </p>
            )}
          </div>
        </div>

        <div className="border-t dark:border-gray-800 p-4 flex justify-center gap-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[120px] dark:text-gray-400 dark:hover:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px] dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
