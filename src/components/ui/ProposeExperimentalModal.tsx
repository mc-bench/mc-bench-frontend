import { useState } from 'react'

import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface ProposeExperimentalModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (state: string, justification: string) => Promise<void>
  isSubmitting: boolean
  availableExperimentalStates: Array<{ id: string; name: string }>
}

const ProposeExperimentalModal = ({
  isOpen,
  onClose,
  onSubmit,
  // currentState not used currently but kept for future use
  // currentState = 'EXPERIMENTAL',
  isSubmitting,
  availableExperimentalStates,
}: ProposeExperimentalModalProps) => {
  const [selectedExperimentalState, setSelectedExperimentalState] =
    useState<string>('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          onSubmit(
            selectedExperimentalState,
            formData.get('justification') as string
          )
        }}
      >
        <h3 className="text-lg font-medium mb-4 dark:text-white">
          Propose Release
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Experimental State
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableExperimentalStates.map((state) => (
              <button
                key={state.id}
                type="button"
                onClick={() => setSelectedExperimentalState(state.name)}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                  selectedExperimentalState === state.name
                    ? state.name === 'RELEASED'
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800 ring-2 ring-green-200 dark:ring-green-800'
                      : state.name === 'EXPERIMENTAL'
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 ring-2 ring-amber-200 dark:ring-amber-800'
                        : state.name === 'DEPRECATED'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 ring-2 ring-gray-200 dark:ring-gray-600'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 ring-2 ring-red-200 dark:ring-red-800'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {state.name === 'RELEASED' && (
                  <CheckCircle className="h-4 w-4" />
                )}
                {state.name === 'EXPERIMENTAL' && (
                  <AlertCircle className="h-4 w-4" />
                )}
                {state.name === 'DEPRECATED' && <Clock className="h-4 w-4" />}
                {state.name === 'REJECTED' && <XCircle className="h-4 w-4" />}
                {state.name}
              </button>
            ))}
          </div>
        </div>

        <textarea
          name="justification"
          className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Enter your justification..."
          required
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedExperimentalState}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProposeExperimentalModal
