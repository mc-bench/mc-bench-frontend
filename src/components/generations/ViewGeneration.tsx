import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  Box,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Terminal,
  User,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { GenerationResponseWithRuns } from '../../types/generations'
import { RunResources } from '../ui/RunResources'

const ViewGeneration = () => {
  const { id } = useParams()
  const [generation, setGeneration] =
    useState<GenerationResponseWithRuns | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [_error, setError] = useState<string | null>(null)

  const fetchGeneration = async () => {
    try {
      const { data } = await adminAPI.get(`/generation/${id}`)
      setGeneration(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch generation'
      )
    }
  }

  useEffect(() => {
    fetchGeneration()
    const interval = setInterval(fetchGeneration, 5000)
    return () => clearInterval(interval)
  }, [id])

  const toggleRun = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  if (!generation) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">{generation.name}</h1>
            {generation.description && (
              <p className="text-gray-600 mb-4">{generation.description}</p>
            )}
            <div className="grid grid-cols-4 gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 block">Created</span>
                  <span className="text-gray-900">
                    {new Date(generation.created).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 block">Created By</span>
                  <span className="text-gray-900">{generation.createdBy}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-500 block">Status</span>
                <span className="text-gray-900">{generation.status}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Total Runs</span>
                <span className="text-gray-900">{generation.runCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Runs</h2>
          </div>
          <div className="divide-y">
            {generation.runs.map((run) => (
              <div key={run.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="flex items-center cursor-pointer flex-1"
                    onClick={() => toggleRun(run.id)}
                  >
                    {expandedRuns.has(run.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="flex-1 grid grid-cols-3 gap-4 ml-2">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-gray-400" />
                        <span>{run.model.slug}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{run.prompt.name}</span>
                      </div>
                      <div>
                        <span className="px-2 py-1 text-sm rounded-full bg-gray-100">
                          {run.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/runs/${run.id}`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-4"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Run</span>
                  </Link>
                </div>

                {expandedRuns.has(run.id) && (
                  <div className="mt-4 ml-7">
                    <RunResources
                      model={run.model}
                      template={run.template}
                      prompt={run.prompt}
                      isExpanded={true}
                      onToggle={() => {}}
                      showHeader={false}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewGeneration
