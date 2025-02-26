import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Box,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Search,
  Terminal,
  User,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { RunResponse } from '../../types/generations'
import { RunData } from '../../types/runs'
import RunControls from '../ui/RunControls'
import { getStatusStyles } from '../ui/StatusStyles'

// Add these types to help with section management
type RunSection = {
  title: string
  states: string[]
  data: RunResponse[]
  paging: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrevious: boolean
  } | null
  loading: boolean
}

const RunList = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  // TODO: Add error handling
  const [_, setError] = useState<string | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [expandedRunDetails, setExpandedRunDetails] = useState<{
    [key: string]: RunData
  }>({})
  const [loadingRunDetails, setLoadingRunDetails] = useState<{
    [key: string]: boolean
  }>({})

  // Replace single page state with section-specific states
  const [sections, setSections] = useState<{ [key: string]: RunSection }>({
    inProgress: {
      title: 'In Progress',
      states: ['CREATED', 'IN_PROGRESS', 'IN_RETRY'],
      data: [],
      paging: null,
      loading: true,
    },
    failed: {
      title: 'Failed',
      states: ['FAILED'],
      data: [],
      paging: null,
      loading: true,
    },
    completed: {
      title: 'Completed',
      states: ['COMPLETED'],
      data: [],
      paging: null,
      loading: true,
    },
  })

  // Update fetchRuns to handle sections
  const fetchRuns = async (sectionKey: string, page: number = 1) => {
    const section = sections[sectionKey]

    try {
      setSections((prev) => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], loading: true },
      }))

      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '10',
      })

      // Add state filters for the section
      section.states.forEach((state) => {
        params.append('state', state)
      })

      const { data } = await adminAPI.get(`/run?${params.toString()}`)

      setSections((prev) => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          data: data.data,
          paging: data.paging,
          loading: false,
        },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch runs')
      setSections((prev) => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], loading: false },
      }))
    }
  }

  // Fetch data for all sections on mount
  useEffect(() => {
    Object.keys(sections).forEach((sectionKey) => {
      fetchRuns(sectionKey)
    })
    searchInputRef.current?.focus()
  }, [])

  const toggleRun = async (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
        // Fetch full run details when expanding
        fetchRunDetails(runId)
      }
      return next
    })
  }

  const fetchRunDetails = async (runId: string) => {
    setLoadingRunDetails((prev) => ({ ...prev, [runId]: true }))
    try {
      const { data } = await adminAPI.get(`/run/${runId}`)
      setExpandedRunDetails((prev) => ({ ...prev, [runId]: data }))
    } catch (err) {
      console.error('Failed to fetch run details:', err)
    } finally {
      setLoadingRunDetails((prev) => ({ ...prev, [runId]: false }))
    }
  }

  const ExternalLinkButton = ({
    href,
    label,
  }: {
    href: string
    label: string
  }) => (
    <Link
      to={href}
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
    >
      <ExternalLink className="h-4 w-4" />
      <span>View {label}</span>
    </Link>
  )

  // Update renderRunSection to handle pagination per section
  const renderRunSection = (sectionKey: string) => {
    const section = sections[sectionKey]
    if (section.loading) {
      return (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      )
    }

    if (section.data.length === 0) return null

    const filteredRuns = section.data.filter((run) => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        run.prompt.name.toLowerCase().includes(searchLower) ||
        run.prompt.buildSpecification.toLowerCase().includes(searchLower) ||
        run.template.name.toLowerCase().includes(searchLower) ||
        run.template.description.toLowerCase().includes(searchLower) ||
        run.template.content.toLowerCase().includes(searchLower) ||
        run.model.slug.toLowerCase().includes(searchLower) ||
        run.createdBy.toLowerCase().includes(searchLower)
      )
    })

    if (filteredRuns.length === 0) return null

    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y">
            {filteredRuns.map((run) => (
              <div key={run.id} className="p-4">
                <div className="flex items-center">
                  <button className="mr-2" onClick={() => toggleRun(run.id)}>
                    {expandedRuns.has(run.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 grid grid-cols-5 gap-4">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-gray-400" />
                      <span>{run.prompt.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-gray-400" />
                      <span>{run.model.slug}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-gray-400" />
                      <span>{run.template.name}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div>
                        <span
                          className={`px-2 py-1 text-sm rounded-full ${getStatusStyles(
                            run.status
                          )}`}
                        >
                          {run.status}
                        </span>
                      </div>
                      {(run.status === 'IN_PROGRESS' ||
                        run.status === 'IN_RETRY' ||
                        run.status === 'FAILED') &&
                        (run.latestCompletedStage ||
                          run.earliestInProgressStage) && (
                          <div className="text-xs text-gray-500">
                            {run.latestCompletedStage && (
                              <div>Completed: {run.latestCompletedStage}</div>
                            )}
                            {run.earliestInProgressStage && (
                              <div>
                                In Progress: {run.earliestInProgressStage}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                      <Link
                        to={`/runs/${run.id}`}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View Run</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {expandedRuns.has(run.id) && (
                  <div className="mt-4 ml-7 space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="text-sm text-gray-600 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>Created By: {run.createdBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>
                            Created: {new Date(run.created).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <ExternalLinkButton
                            href={`/prompts/${run.prompt.id}`}
                            label="Prompt"
                          />
                          <ExternalLinkButton
                            href={`/models/${run.model.id}`}
                            label="Model"
                          />
                          <ExternalLinkButton
                            href={`/templates/${run.template.id}`}
                            label="Template"
                          />
                          {run.generationId && (
                            <ExternalLinkButton
                              href={`/generations/${run.generationId}`}
                              label="Generation"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {(run.status === 'IN_PROGRESS' ||
                      run.status === 'IN_RETRY' ||
                      run.status === 'FAILED') &&
                      (loadingRunDetails[run.id] ? (
                        <div className="p-4">Loading run details...</div>
                      ) : (
                        <RunControls
                          runId={run.id}
                          startExpanded={true}
                          run={expandedRunDetails[run.id]}
                          onRetryComplete={async () => {
                            await fetchRuns(sectionKey)
                          }}
                        />
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {section.paging && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {section.data.length} of {section.paging.totalItems} runs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchRuns(sectionKey, section.paging!.page - 1)}
                disabled={!section.paging.hasPrevious}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {section.paging.page} of {section.paging.totalPages}
              </span>
              <button
                onClick={() => fetchRuns(sectionKey, section.paging!.page + 1)}
                disabled={!section.paging.hasNext}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Runs</h1>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search runs by prompt, template, model, or creator... (Press '/' to focus)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-8">
        {renderRunSection('inProgress')}
        {renderRunSection('failed')}
        {renderRunSection('completed')}

        {Object.values(sections).every(
          (section) => !section.loading && section.data.length === 0
        ) && (
          <div className="text-center p-8 text-gray-500 bg-white rounded-lg border border-gray-200">
            No runs found.
          </div>
        )}
      </div>
    </div>
  )
}

export default RunList
