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
  Loader2,
  Terminal,
  User,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import {
  GenerationResponseWithRuns,
  RunResponse,
} from '../../types/generations'
import { RunResources } from '../ui/RunResources'

type RunPaging = {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrevious: boolean
}

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
        className="flex items-center gap-2 border rounded px-2 py-1 text-sm bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <span>Filter Status</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute mt-1 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-10">
          {statuses.map(({ value, label }) => (
            <div
              key={value}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer dark:text-gray-200"
              onClick={() => toggleOption(value)}
            >
              <div className="w-4 h-4 border dark:border-gray-600 rounded flex items-center justify-center">
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
  // TODO: Handle error
  const [_, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(['all'])
  )
  const [sortByInProgress, setSortByInProgress] = useState(false)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [runs, setRuns] = useState<RunResponse[]>([])
  const [runPaging, setRunPaging] = useState<RunPaging | null>(null)
  const [currentRunPage, setCurrentRunPage] = useState(1)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

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

  const fetchRuns = async (page: number) => {
    if (!id) return

    try {
      setLoadingRuns(true)
      setRunError(null)
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '50',
        generation_id: id,
      })

      if (!statusFilter.has('all')) {
        statusFilter.forEach((state) => {
          params.append('state', state)
        })
      }

      const { data } = await adminAPI.get(`/run?${params.toString()}`)
      setRuns(data.data)
      setRunPaging(data.paging)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to fetch runs')
    } finally {
      setLoadingRuns(false)
    }
  }

  const handleStatusFilterChange = (newSelection: Set<string>) => {
    setStatusFilter(newSelection)
    setCurrentRunPage(1)
  }

  useEffect(() => {
    fetchGeneration()
    fetchRuns(currentRunPage)
    const interval = setInterval(fetchGeneration, 5000)
    return () => {
      clearInterval(interval)
    }
  }, [id, currentRunPage, statusFilter])

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

  const sortRuns = (runsToSort: RunResponse[]) => {
    if (!sortByInProgress) return runsToSort

    const sortedRuns = [...runsToSort].sort((a, b) => {
      if (a.status === 'COMPLETED' || a.status === 'FAILED') return 1
      if (b.status === 'COMPLETED' || b.status === 'FAILED') return -1

      const aCompletedIdx = getStageIndex(a.latestCompletedStage)
      const bCompletedIdx = getStageIndex(b.latestCompletedStage)

      if (aCompletedIdx !== bCompletedIdx) {
        return aCompletedIdx - bCompletedIdx
      }

      const aInProgressIdx = getStageIndex(a.earliestInProgressStage)
      const bInProgressIdx = getStageIndex(b.earliestInProgressStage)

      if (aInProgressIdx === -1 && bInProgressIdx >= 0) return -1
      if (bInProgressIdx === -1 && aInProgressIdx >= 0) return 1

      return aInProgressIdx - bInProgressIdx
    })

    return sortDirection === 'desc' ? sortedRuns.reverse() : sortedRuns
  }

  if (!generation) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
              {generation.name}
            </h1>
            {generation.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {generation.description}
              </p>
            )}
            <div
              className={`grid ${generation.defaultTestSet ? 'grid-cols-5' : 'grid-cols-4'} gap-0 text-sm divide-x divide-gray-200 dark:divide-gray-700`}
            >
              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Created
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-200">
                    {new Date(generation.created).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Created By
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-200">
                    {generation.createdBy}
                  </span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Status
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-gray-900 dark:text-gray-200">
                    {generation.status}
                  </span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Total Runs
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-gray-900 dark:text-gray-200">
                    {generation.runCount}
                  </span>
                </div>
              </div>

              {generation.defaultTestSet && (
                <div className="px-4 first:pl-0 last:pr-0">
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                    Default Test Set
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm font-medium">
                      {generation.defaultTestSet.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b dark:border-gray-700 p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Runs
              </h2>
              <div className="flex gap-4 items-center">
                <StatusFilterDropdown
                  selected={statusFilter}
                  onChange={handleStatusFilterChange}
                />
                <button
                  onClick={toggleSort}
                  className={`flex items-center gap-1 text-sm ${
                    sortByInProgress
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  } hover:text-blue-800 dark:hover:text-blue-300`}
                >
                  <span>Sort by Progress</span>
                  {sortByInProgress ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {loadingRuns ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
              </div>
            ) : runError ? (
              <div className="text-red-500 dark:text-red-400 p-4">
                {runError}
              </div>
            ) : (
              <>
                {sortRuns(runs).map((run) => (
                  <div key={run.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="flex items-center cursor-pointer flex-1"
                        onClick={() => toggleRun(run.id)}
                      >
                        {expandedRuns.has(run.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        )}
                        <div className="flex-1 grid grid-cols-3 gap-4 ml-2">
                          <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span className="dark:text-gray-200">
                              {run.model.slug}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span className="truncate dark:text-gray-200">
                              {run.prompt.name}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="grid grid-cols-[100px_1fr] gap-1 text-xs">
                              <div className="text-right text-gray-500 dark:text-gray-400">
                                Status:
                              </div>
                              <div className="text-left dark:text-gray-200">
                                {run.status}
                              </div>
                            </div>
                            {run.status !== 'COMPLETED' &&
                              (run.latestCompletedStage ||
                                run.earliestInProgressStage) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {run.latestCompletedStage && (
                                    <div className="grid grid-cols-[100px_1fr] gap-1">
                                      <div className="text-right">
                                        Completed:
                                      </div>
                                      <div className="text-left dark:text-gray-300">
                                        {run.latestCompletedStage}
                                      </div>
                                    </div>
                                  )}
                                  {run.earliestInProgressStage && (
                                    <div className="grid grid-cols-[100px_1fr] gap-1">
                                      <div className="text-right">
                                        In Progress:
                                      </div>
                                      <div className="text-left dark:text-gray-300">
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 ml-4"
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

                {runPaging && (
                  <div className="mt-4 flex justify-between items-center p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Showing {runs.length} of {runPaging.totalItems} runs
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentRunPage(runPaging.page - 1)}
                        disabled={!runPaging.hasPrevious}
                        className="px-3 py-1 border rounded hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 dark:text-gray-300">
                        Page {runPaging.page} of {runPaging.totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentRunPage(runPaging.page + 1)}
                        disabled={!runPaging.hasNext}
                        className="px-3 py-1 border rounded hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewGeneration
