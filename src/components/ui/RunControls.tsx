import { useEffect, useState } from 'react'

import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { RunData } from '../../types/runs'
import { Card, CardContent } from './Card'
import { Progress } from './Progress'

const RunControls = ({
  runId,
  startExpanded,
  run,
  onRetryComplete,
}: {
  runId: string | undefined
  startExpanded: boolean
  run: RunData
  onRetryComplete?: () => void
}) => {
  const [isExpanded, setIsExpanded] = useState(startExpanded)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stageStatus, setStageStatus] = useState<any>(null)

  const sampleCount = Math.max(1, run?.samples?.length || 0)
  const sampleLabel = `Sample ${sampleCount}`

  const pollStatus = async () => {
    try {
      const { data } = await adminAPI.get(`run/${runId}/status`)
      setStageStatus(data)
      return data.status !== 'COMPLETED' && !data.status.includes('FAILED')
    } catch (error) {
      console.error('Failed to fetch status:', error)
      return false
    }
  }

  useEffect(() => {
    let interval: number | null = null
    let isComponentMounted = true

    const startPolling = async () => {
      if (!isComponentMounted) return

      const shouldContinue = await pollStatus()
      if (shouldContinue && isComponentMounted) {
        interval = window.setInterval(async () => {
          if (!isComponentMounted) {
            if (interval) {
              clearInterval(interval)
            }
            return
          }

          const shouldContinuePolling = await pollStatus()
          if (!shouldContinuePolling && interval) {
            clearInterval(interval)
            interval = null
          }
        }, 5000)
      }
    }

    startPolling()

    return () => {
      isComponentMounted = false
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
  }, [runId])

  const handleRetry = async () => {
    if (!selectedTask) return
    setIsSubmitting(true)
    try {
      await adminAPI.post(`/run/${runId}/task-retry`, {
        tasks: [selectedTask.toUpperCase()],
      })
      await pollStatus()
      onRetryComplete?.()
    } catch (error) {
      console.error('Failed to retry task:', error)
    } finally {
      setIsSubmitting(false)
      setSelectedTask(null)
    }
  }

  const getStageIcon = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'IN_PROGRESS':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'FAILED':
        return <Circle className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-gray-300" />
    }
  }

  return (
    <Card className="mb-6">
      <CardContent>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full text-left font-medium dark:text-gray-200"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Stages - {sampleLabel}
        </button>

        {isExpanded && stageStatus?.stages && (
          <div className="mt-4 space-y-4">
            {stageStatus.stages.map((stage: any) => (
              <div key={stage.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-48">
                  {getStageIcon(stage.state)}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium dark:text-gray-200">
                      {stage.stage
                        .split('_')
                        .map(
                          (word: string) =>
                            word.charAt(0) + word.slice(1).toLowerCase()
                        )
                        .join(' ')}
                    </span>
                    {stage.state !== 'COMPLETED' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {stage.state}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <Progress
                    value={stage.progress * 100}
                    note={stage.note}
                    animated={stage.state === 'IN_PROGRESS'}
                  />
                </div>
                <div className="w-20 text-right">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(stage.progress * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTask(stage.stage.toLowerCase())}
                  className={`p-1 rounded ${stage.state === 'FAILED' ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                  disabled={!(stage.state === 'FAILED')}
                >
                  {!(stage.state === 'FAILED') ? (
                    <div className="h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="border-b dark:border-gray-800 p-4">
              <h2 className="text-xl font-semibold text-center dark:text-gray-200">
                Confirm Stage Retry
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-center dark:text-gray-400">
                This will retry this stage and all subsequent stages.
              </p>
            </div>
            <div className="border-t dark:border-gray-800 p-4 flex justify-center gap-4">
              <button
                onClick={() => setSelectedTask(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded-lg dark:text-gray-400 dark:hover:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {isSubmitting ? 'Retrying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default RunControls
