import { useState } from 'react'

import { AlertCircle } from 'lucide-react'

import { api } from '../../api/client'

type ReportModalProps = {
  isOpen: boolean
  onClose: () => void
  sampleAId: string
  sampleBId: string
  prompt: string
}

type ReportReason = 'technical' | 'broken' | 'inaccurate' | 'other'

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  sampleAId,
  sampleBId,
  prompt,
}) => {
  const [reason, setReason] = useState<ReportReason>('technical')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // This would connect to your backend API
      await api.post('/comparison/report', {
        sampleAId,
        sampleBId,
        prompt,
        reason,
        details,
      })

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setReason('technical')
        setDetails('')
      }, 2000)
    } catch (err) {
      setError('Failed to submit report. Please try again.')
      console.error('Failed to submit report:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/30 bg-opacity-75"
        onClick={onClose}
      ></div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg z-10 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h3 className="text-xl font-semibold dark:text-white">
            Report Comparison
          </h3>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="mb-3 text-green-600 dark:text-green-400 text-lg">
              Report submitted successfully!
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Thank you for helping us improve the quality of MC-Bench.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                What's wrong with this comparison?
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === 'technical'}
                    onChange={() => setReason('technical')}
                    className="text-blue-600"
                  />
                  <span className="text-gray-800 dark:text-gray-200">
                    Technical error or rendering issue
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === 'broken'}
                    onChange={() => setReason('broken')}
                    className="text-blue-600"
                  />
                  <span className="text-gray-800 dark:text-gray-200">
                    Models appear broken or don't load
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === 'inaccurate'}
                    onChange={() => setReason('inaccurate')}
                    className="text-blue-600"
                  />
                  <span className="text-gray-800 dark:text-gray-200">
                    Both models are bad
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === 'other'}
                    onChange={() => setReason('other')}
                    className="text-blue-600"
                  />
                  <span className="text-gray-800 dark:text-gray-200">
                    Other
                  </span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-600 dark:text-gray-300 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Please provide any additional information..."
              ></textarea>
            </div>

            {error && (
              <div className="mb-4 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ReportModal
