import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Box,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Search,
  Terminal,
  User,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { RunListData } from '../../types/runs'
import RunControls from '../ui/RunControls'

// TODO: Refactor into shared location for runs
const getStatusStyles = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-700'
    case 'FAILED':
      return 'bg-red-100 text-red-700'
    case 'CREATED':
    case 'IN_PROGRESS':
    case 'IN_RETRY':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const RunList = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [runs, setRuns] = useState<RunListData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchRuns()
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const fetchRuns = async () => {
    try {
      setLoading(true)
      const { data } = await adminAPI.get('/run')
      setRuns(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch runs')
    } finally {
      setLoading(false)
    }
  }

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

  const filteredRuns = runs.filter((run) => {
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

  const groupedRuns = filteredRuns.reduce(
    (acc, run) => {
      if (
        run.status === 'IN_PROGRESS' ||
        run.status === 'IN_RETRY' ||
        run.status === 'CREATED'
      ) {
        acc.inProgress.push(run)
      } else if (run.status === 'FAILED') {
        acc.failed.push(run)
      } else if (run.status === 'COMPLETED') {
        acc.completed.push(run)
      }
      return acc
    },
    {
      inProgress: [] as RunListData[],
      failed: [] as RunListData[],
      completed: [] as RunListData[],
    }
  )

  const sortByDate = (a: RunListData, b: RunListData) =>
    new Date(b.created).getTime() - new Date(a.created).getTime()

  groupedRuns.inProgress.sort(sortByDate)
  groupedRuns.failed.sort(sortByDate)
  groupedRuns.completed.sort(sortByDate)

  if (loading)
    return <div className="flex justify-center p-8">Loading runs...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>

  const renderRunSection = (title: string, runs: RunListData[]) => {
    if (runs.length === 0) return null

    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y">
            {runs.map((run) => (
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
                    <div>
                      <span
                        className={`px-2 py-1 text-sm rounded-full ${getStatusStyles(
                          run.status
                        )}`}
                      >
                        {run.status}
                      </span>
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
                      (run.status === 'FAILED' && run.stages)) && (
                      <RunControls runId={run.id} startExpanded={true} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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
        {renderRunSection('In Progress', groupedRuns.inProgress)}
        {renderRunSection('Failed', groupedRuns.failed)}
        {renderRunSection('Completed', groupedRuns.completed)}

        {filteredRuns.length === 0 && (
          <div className="text-center p-8 text-gray-500 bg-white rounded-lg border border-gray-200">
            {runs.length === 0
              ? 'No runs found.'
              : 'No runs match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default RunList
