import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  ArrowDown,
  ArrowUp,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Terminal,
  User,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import {
  GenerationResponseWithRuns,
  RunResponse,
} from '../../types/generations'
import { RunResources } from '../ui/RunResources'

const StatusFilterDropdown = ({
  selected,
  onChange,
}: {
  selected: Set<string>
  onChange: (newSelection: Set<string>) => void
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'CREATED', label: 'Created' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'IN_RETRY', label: 'In Retry' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: string) => {
    const newSelection = new Set(selected)
    if (value === 'all') {
      onChange(new Set(['all']))
      return
    }

    newSelection.delete('all')
    if (newSelection.has(value)) {
      newSelection.delete(value)
      if (newSelection.size === 0) {
        onChange(new Set(['all']))
        return
      }
    } else {
      newSelection.add(value)
    }
    onChange(newSelection)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border rounded px-2 py-1 text-sm bg-white hover:bg-gray-50"
      >
        <span>Filter Status</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute mt-1 w-48 bg-white border rounded-md shadow-lg z-10">
          {statuses.map(({ value, label }) => (
            <div
              key={value}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => toggleOption(value)}
            >
              <div className="w-4 h-4 border rounded flex items-center justify-center">
                {selected.has(value) && <Check className="h-3 w-3" />}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ViewGeneration = () => {
  const { id } = useParams()
  const [generation, setGeneration] =
    useState<GenerationResponseWithRuns | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [_error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(['all'])
  )
  const [sortByInProgress, setSortByInProgress] = useState(false)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const STAGE_SORT_ORDER = [
    'PROMPT_EXECUTION',
    'RESPONSE_PARSING',
    'CODE_VALIDATION',
    'BUILDING',
    'RENDERING_SAMPLE',
    'EXPORTING_CONTENT',
    'POST_PROCESSING',
    'PREPARING_SAMPLE',
  ]

  const getStageIndex = (stage: string | null | undefined) => {
    if (!stage) return -1
    return STAGE_SORT_ORDER.indexOf(stage)
  }

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

  const toggleSort = () => {
    if (!sortByInProgress) {
      setSortByInProgress(true)
      setSortDirection('asc')
    } else {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const sortAndFilterRuns = (runs: RunResponse[]) => {
    let filteredRuns = [...runs]

    if (!statusFilter.has('all')) {
      filteredRuns = filteredRuns.filter((run) => statusFilter.has(run.status))
    }

    if (sortByInProgress) {
      filteredRuns.sort((a, b) => {
        // Completed or failed runs should be at the end (most completed)
        if (a.status === 'COMPLETED' || a.status === 'FAILED') return 1
        if (b.status === 'COMPLETED' || b.status === 'FAILED') return -1

        const aCompletedIdx = getStageIndex(a.latestCompletedStage)
        const bCompletedIdx = getStageIndex(b.latestCompletedStage)

        // First sort by completed stages
        if (aCompletedIdx !== bCompletedIdx) {
          return aCompletedIdx - bCompletedIdx // least to most completed
        }

        // If completed stages are equal, then sort by in-progress
        const aInProgressIdx = getStageIndex(a.earliestInProgressStage)
        const bInProgressIdx = getStageIndex(b.earliestInProgressStage)

        // Runs with no in-progress stage should come before runs with in-progress
        if (aInProgressIdx === -1 && bInProgressIdx >= 0) return -1
        if (bInProgressIdx === -1 && aInProgressIdx >= 0) return 1

        return aInProgressIdx - bInProgressIdx
      })

      // Reverse the order if descending
      if (sortDirection === 'desc') {
        filteredRuns.reverse()
      }
    }

    return filteredRuns
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
            <div className="grid grid-cols-4 gap-0 text-sm divide-x divide-gray-200">
              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 text-center mb-2">
                  Created
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {new Date(generation.created).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 text-center mb-2">
                  Created By
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{generation.createdBy}</span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 text-center mb-2">
                  Status
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-gray-900">{generation.status}</span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 text-center mb-2">
                  Total Runs
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-gray-900">{generation.runCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Runs</h2>
              <div className="flex gap-4 items-center">
                <StatusFilterDropdown
                  selected={statusFilter}
                  onChange={setStatusFilter}
                />
                <button
                  onClick={toggleSort}
                  className={`flex items-center gap-1 text-sm ${
                    sortByInProgress ? 'text-blue-600' : 'text-gray-600'
                  } hover:text-blue-800`}
                >
                  <span>Sort by Progress</span>
                  {sortByInProgress ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y">
            {sortAndFilterRuns(generation.runs).map((run) => (
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
                      <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-[100px_1fr] gap-1 text-xs">
                          <div className="text-right text-gray-500">
                            Status:
                          </div>
                          <div className="text-left">{run.status}</div>
                        </div>
                        {run.status !== 'COMPLETED' &&
                          (run.latestCompletedStage ||
                            run.earliestInProgressStage) && (
                            <div className="text-xs text-gray-500">
                              {run.latestCompletedStage && (
                                <div className="grid grid-cols-[100px_1fr] gap-1">
                                  <div className="text-right">Completed:</div>
                                  <div className="text-left">
                                    {run.latestCompletedStage}
                                  </div>
                                </div>
                              )}
                              {run.earliestInProgressStage && (
                                <div className="grid grid-cols-[100px_1fr] gap-1">
                                  <div className="text-right">In Progress:</div>
                                  <div className="text-left">
                                    {run.earliestInProgressStage}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
