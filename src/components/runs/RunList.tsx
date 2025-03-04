import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  Box,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Terminal,
  User,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { RunResponse } from '../../types/generations'
import { Model } from '../../types/models'
import { Prompt } from '../../types/prompts'
import { RunData } from '../../types/runs'
import { Template } from '../../types/templates'
import RunControls from '../ui/RunControls'
import { SearchSelect } from '../ui/SearchSelect'
import { getStatusStyles } from '../ui/StatusStyles'

// Define filter state interface
interface FilterState {
  modelId: string[]
  templateId: string[]
  promptId: string[]
  states: string[]
  completedStages: string[]
  inProgressStages: string[]
  username: string | undefined
}

// Quick filter type
type QuickFilterState = Partial<FilterState>

// Define quick filters
const QUICK_FILTERS = {
  all: {
    label: 'All Runs',
    filters: {
      username: undefined,
    } as QuickFilterState,
  },
  myRuns: {
    label: 'My Runs',
    filters: {
      username: 'CURRENT_USER',
    } as QuickFilterState,
  },
  inProgress: {
    label: 'In Progress',
    filters: {
      states: ['CREATED', 'IN_PROGRESS', 'IN_RETRY'],
    } as QuickFilterState,
  },
  failed: {
    label: 'Failed',
    filters: {
      states: ['FAILED'],
    } as QuickFilterState,
  },
  completed: {
    label: 'Completed',
    filters: {
      states: ['COMPLETED'],
    } as QuickFilterState,
  },
} as const

// Helper to check if filters are active
const hasActiveFilters = (filters: FilterState): boolean => {
  return (
    (filters.modelId?.length || 0) > 0 ||
    (filters.templateId?.length || 0) > 0 ||
    (filters.promptId?.length || 0) > 0 ||
    (filters.states?.length || 0) > 0 ||
    (filters.completedStages?.length || 0) > 0 ||
    (filters.inProgressStages?.length || 0) > 0 ||
    filters.username !== undefined
  )
}

const RunList = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [expandedRunDetails, setExpandedRunDetails] = useState<{
    [key: string]: RunData
  }>({})
  const [loadingRunDetails, setLoadingRunDetails] = useState<{
    [key: string]: boolean
  }>({})
  const [showFilters, setShowFilters] = useState(false)

  // Add state for filter options
  const [models, setModels] = useState<Model[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [modelSearch, setModelSearch] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [promptSearch, setPromptSearch] = useState('')

  // Initialize with a single unified section that respects filters
  const [runsData, setRunsData] = useState<{
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
  }>({
    data: [],
    paging: null,
    loading: true,
  })

  // Remove separate filterState and keep just currentPage
  const [currentPage, setCurrentPage] = useState(1)

  // Get applied filters directly from URL params
  const appliedFilters: FilterState = {
    modelId: searchParams.getAll('modelId'),
    templateId: searchParams.getAll('templateId'),
    promptId: searchParams.getAll('promptId'),
    states: searchParams.getAll('state'),
    completedStages: searchParams.getAll('completedStage'),
    inProgressStages: searchParams.getAll('inProgressStage'),
    username: searchParams.get('username') || undefined,
  }

  // Fetch all available options on component mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [modelsRes, templatesRes, promptsRes, stagesRes] =
          await Promise.all([
            adminAPI.get('/model'),
            adminAPI.get('/template'),
            adminAPI.get('/prompt'),
            adminAPI.get('/run/stages'),
          ])

        setModels(modelsRes.data.data.filter((m: Model) => m.active))
        setTemplates(templatesRes.data.data.filter((t: Template) => t.active))
        setPrompts(promptsRes.data.data.filter((p: Prompt) => p.active))
        setStages(stagesRes.data.data || [])
      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      }
    }

    fetchFilterOptions()
    searchInputRef.current?.focus()
  }, [])

  // Load filters from URL parameters and fetch data
  useEffect(() => {
    // Get page from URL params, default to 1 if not present
    const page = searchParams.get('page')
      ? parseInt(searchParams.get('page') || '1', 10)
      : 1
    setCurrentPage(page)

    // Fetch runs with the filters from URL
    fetchRuns(page)
  }, [searchParams])

  // Updated fetch runs function that uses the filter state but doesn't depend on initialized flag
  const fetchRuns = async (page: number = 1) => {
    try {
      setRunsData((prev) => ({ ...prev, loading: true }))

      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '50',
      })

      // Add all filter parameters
      if (appliedFilters.modelId.length) {
        appliedFilters.modelId.forEach((id) => params.append('model_id', id))
      }
      if (appliedFilters.templateId.length) {
        appliedFilters.templateId.forEach((id) =>
          params.append('template_id', id)
        )
      }
      if (appliedFilters.promptId.length) {
        appliedFilters.promptId.forEach((id) => params.append('prompt_id', id))
      }
      if (appliedFilters.states.length) {
        appliedFilters.states.forEach((state) => params.append('state', state))
      }
      if (appliedFilters.completedStages.length) {
        appliedFilters.completedStages.forEach((stage) =>
          params.append('completed_stage', stage)
        )
      }
      if (appliedFilters.inProgressStages.length) {
        appliedFilters.inProgressStages.forEach((stage) =>
          params.append('in_progress_stage', stage)
        )
      }
      if (appliedFilters.username) {
        params.append('username', appliedFilters.username)
      }

      const { data } = await adminAPI.get(`/run?${params.toString()}`)

      setRunsData({
        data: data.data,
        paging: data.paging,
        loading: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch runs')
      setRunsData((prev) => ({ ...prev, loading: false }))
    }
  }

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
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400"
    >
      <ExternalLink className="h-4 w-4" />
      <span>View {label}</span>
    </Link>
  )

  // Handle applying filters - update to use the values directly from the form elements
  const handleApplyFilters = () => {
    // Create new URLSearchParams object to replace current params
    const newParams = new URLSearchParams()

    // Reset to page 1 when applying filters
    newParams.set('page', '1')

    // Add filter parameters (only add non-empty values)
    if (filterFormState.modelId.length) {
      filterFormState.modelId.forEach((id) => newParams.append('modelId', id))
    }
    if (filterFormState.templateId.length) {
      filterFormState.templateId.forEach((id) =>
        newParams.append('templateId', id)
      )
    }
    if (filterFormState.promptId.length) {
      filterFormState.promptId.forEach((id) => newParams.append('promptId', id))
    }
    if (filterFormState.states.length) {
      filterFormState.states.forEach((state) =>
        newParams.append('state', state)
      )
    }
    if (filterFormState.completedStages.length) {
      filterFormState.completedStages.forEach((stage) =>
        newParams.append('completedStage', stage)
      )
    }
    if (filterFormState.inProgressStages.length) {
      filterFormState.inProgressStages.forEach((stage) =>
        newParams.append('inProgressStage', stage)
      )
    }
    if (filterFormState.username) {
      newParams.set('username', filterFormState.username)
    }

    // Update URL with new params
    setSearchParams(newParams)

    // Close filters panel
    setShowFilters(false)
  }

  // Handle resetting filters
  const handleResetFilters = () => {
    // Reset form state without affecting URL yet
    setFilterFormState({
      modelId: [],
      templateId: [],
      promptId: [],
      states: [],
      completedStages: [],
      inProgressStages: [],
      username: undefined,
    })

    // If applied directly, also reset URL parameters
    if (!showFilters) {
      setSearchParams({ page: '1' })
    }
  }

  // Check if a quick filter is active
  const isQuickFilterActive = (
    quickFilter: QuickFilterState,
    currentFilters: FilterState
  ): boolean => {
    return Object.entries(quickFilter).every(([key, value]) => {
      const currentValue = currentFilters[key as keyof FilterState]

      // Handle arrays
      if (Array.isArray(value)) {
        return (
          Array.isArray(currentValue) &&
          value.length === currentValue.length &&
          value.every((v) => (currentValue as string[]).includes(v as string))
        )
      }

      // Handle special case for username
      if (key === 'username' && value === 'CURRENT_USER') {
        return currentValue === user?.username
      }

      // Handle other values
      return currentValue === value
    })
  }

  // Apply a quick filter
  const applyQuickFilter = (
    filterKey: keyof typeof QUICK_FILTERS,
    currentState: FilterState,
    user: { username: string } | null
  ): FilterState => {
    const quickFilter = QUICK_FILTERS[filterKey].filters
    const newFilters = { ...currentState }

    // Apply each filter from the quick filter
    Object.entries(quickFilter).forEach(([key, value]) => {
      if (key === 'username' && value === 'CURRENT_USER') {
        newFilters.username = user?.username
      } else {
        // Type assertion to ensure the value matches the expected type
        ;(newFilters as any)[key] = value
      }
    })

    return newFilters
  }

  // Remove a quick filter
  const removeQuickFilter = (
    filterKey: keyof typeof QUICK_FILTERS,
    currentState: FilterState
  ): FilterState => {
    const quickFilter = QUICK_FILTERS[filterKey].filters
    const newFilters = { ...currentState }

    Object.keys(quickFilter).forEach((key) => {
      // Create empty values instead of referring to initialFilterState
      switch (key) {
        case 'modelId':
        case 'templateId':
        case 'promptId':
        case 'states':
        case 'completedStages':
        case 'inProgressStages':
          ;(newFilters as any)[key] = []
          break
        case 'username':
          ;(newFilters as any)[key] = undefined
          break
        default:
          ;(newFilters as any)[key] = undefined
      }
    })

    return newFilters
  }

  // Handle quick filter click - update to use URL params
  const handleQuickFilter = (filterKey: keyof typeof QUICK_FILTERS) => {
    // Check if this quick filter is currently active
    const isActive = isQuickFilterActive(
      QUICK_FILTERS[filterKey].filters,
      appliedFilters
    )

    // If active, remove its filters, otherwise apply them
    const newFilters = isActive
      ? removeQuickFilter(filterKey, appliedFilters)
      : applyQuickFilter(filterKey, appliedFilters, user)

    // Create new URL params
    const newParams = new URLSearchParams()

    // Reset to page 1
    newParams.set('page', '1')

    // Add new filter parameters
    if (newFilters.modelId.length) {
      newFilters.modelId.forEach((id) => newParams.append('modelId', id))
    }
    if (newFilters.templateId.length) {
      newFilters.templateId.forEach((id) => newParams.append('templateId', id))
    }
    if (newFilters.promptId.length) {
      newFilters.promptId.forEach((id) => newParams.append('promptId', id))
    }
    if (newFilters.states.length) {
      newFilters.states.forEach((state) => newParams.append('state', state))
    }
    if (newFilters.completedStages.length) {
      newFilters.completedStages.forEach((stage) =>
        newParams.append('completedStage', stage)
      )
    }
    if (newFilters.inProgressStages.length) {
      newFilters.inProgressStages.forEach((stage) =>
        newParams.append('inProgressStage', stage)
      )
    }
    if (newFilters.username) {
      newParams.set('username', newFilters.username)
    }

    // Update URL params
    setSearchParams(newParams)
  }

  // Update pagination to use URL params
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', newPage.toString())
    setSearchParams(newParams)
  }

  // Filter runs based on search term
  const filteredRuns = runsData.data.filter((run) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      run.prompt.name.toLowerCase().includes(searchLower) ||
      (run.prompt.buildSpecification || '')
        .toLowerCase()
        .includes(searchLower) ||
      run.template.name.toLowerCase().includes(searchLower) ||
      run.template.description.toLowerCase().includes(searchLower) ||
      run.template.content.toLowerCase().includes(searchLower) ||
      run.model.slug.toLowerCase().includes(searchLower) ||
      run.createdBy.toLowerCase().includes(searchLower)
    )
  })

  // Create temporary state for filter form values
  const [filterFormState, setFilterFormState] = useState<FilterState>({
    modelId: [],
    templateId: [],
    promptId: [],
    states: [],
    completedStages: [],
    inProgressStages: [],
    username: undefined,
  })

  // Update filter form state when applied filters change
  useEffect(() => {
    setFilterFormState({
      modelId: searchParams.getAll('modelId'),
      templateId: searchParams.getAll('templateId'),
      promptId: searchParams.getAll('promptId'),
      states: searchParams.getAll('state'),
      completedStages: searchParams.getAll('completedStage'),
      inProgressStages: searchParams.getAll('inProgressStage'),
      username: searchParams.get('username') || undefined,
    })
  }, [searchParams])

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Runs
        </h1>
        <div className="flex items-center gap-2">
          {hasActiveFilters(appliedFilters) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <XCircle className="h-4 w-4" />
              Clear Filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md ${
              showFilters
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Filter Runs
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilterFormState({
                    modelId: [],
                    templateId: [],
                    promptId: [],
                    states: [],
                    completedStages: [],
                    inProgressStages: [],
                    username: undefined,
                  })
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Models
              </label>
              <SearchSelect
                items={models}
                selected={models.filter((m) =>
                  filterFormState.modelId.includes(m.id)
                )}
                onSelectionChange={(selected) => {
                  const newModelIds = selected.map((s) => s.id)
                  setFilterFormState((prev) => ({
                    ...prev,
                    modelId: newModelIds,
                  }))
                }}
                searchValue={modelSearch}
                onSearchChange={setModelSearch}
                placeholder="Select models"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prompts
              </label>
              <SearchSelect
                items={prompts}
                selected={prompts.filter((p) =>
                  filterFormState.promptId.includes(p.id)
                )}
                onSelectionChange={(selected) => {
                  const newPromptIds = selected.map((s) => s.id)
                  setFilterFormState((prev) => ({
                    ...prev,
                    promptId: newPromptIds,
                  }))
                }}
                searchValue={promptSearch}
                onSearchChange={setPromptSearch}
                placeholder="Select prompts"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Templates
              </label>
              <SearchSelect
                items={templates}
                selected={templates.filter((t) =>
                  filterFormState.templateId.includes(t.id)
                )}
                onSelectionChange={(selected) => {
                  const newTemplateIds = selected.map((s) => s.id)
                  setFilterFormState((prev) => ({
                    ...prev,
                    templateId: newTemplateIds,
                  }))
                }}
                searchValue={templateSearch}
                onSearchChange={setTemplateSearch}
                placeholder="Select templates"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Run States
              </label>
              <select
                multiple
                value={filterFormState.states}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  )
                  setFilterFormState((prev) => ({
                    ...prev,
                    states: values,
                  }))
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="CREATED">Created</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_RETRY">In Retry</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Completed Stages
              </label>
              <select
                multiple
                value={filterFormState.completedStages}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  )
                  setFilterFormState((prev) => ({
                    ...prev,
                    completedStages: values,
                  }))
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                In Progress Stages
              </label>
              <select
                multiple
                value={filterFormState.inProgressStages}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  )
                  setFilterFormState((prev) => ({
                    ...prev,
                    inProgressStages: values,
                  }))
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 items-center">
        {/* User filter group */}
        <div className="flex items-center">
          <button
            onClick={() => handleQuickFilter('all')}
            className={`px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
              ${
                isQuickFilterActive(QUICK_FILTERS.all.filters, appliedFilters)
                  ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
          >
            All Runs
          </button>
          <button
            onClick={() => handleQuickFilter('myRuns')}
            className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
              ${
                isQuickFilterActive(
                  QUICK_FILTERS.myRuns.filters,
                  appliedFilters
                )
                  ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
          >
            My Runs
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

        {/* Status filter group */}
        <div className="flex items-center">
          <button
            onClick={() => handleQuickFilter('inProgress')}
            className={`px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
              ${
                isQuickFilterActive(
                  QUICK_FILTERS.inProgress.filters,
                  appliedFilters
                )
                  ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
          >
            In Progress
          </button>
          <button
            onClick={() => handleQuickFilter('failed')}
            className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
              ${
                isQuickFilterActive(
                  QUICK_FILTERS.failed.filters,
                  appliedFilters
                )
                  ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
          >
            Failed
          </button>
          <button
            onClick={() => handleQuickFilter('completed')}
            className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
              ${
                isQuickFilterActive(
                  QUICK_FILTERS.completed.filters,
                  appliedFilters
                )
                  ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
          >
            Completed
          </button>
        </div>
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
          />
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            {runsData.loading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            <div className="divide-y divide-gray-200 dark:divide-gray-700 relative min-h-[100px]">
              {filteredRuns.length > 0 ? (
                filteredRuns.map((run) => (
                  <div key={run.id} className="p-4">
                    <div className="flex items-center">
                      <button
                        className="mr-2"
                        onClick={() => toggleRun(run.id)}
                      >
                        {expandedRuns.has(run.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 grid grid-cols-5 gap-4">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-gray-400" />
                          <span className="dark:text-gray-200">
                            {run.prompt.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-gray-400" />
                          <span className="dark:text-gray-200">
                            {run.model.slug}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-gray-400" />
                          <span className="dark:text-gray-200">
                            {run.template.name}
                          </span>
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
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {run.latestCompletedStage && (
                                  <div>
                                    Completed: {run.latestCompletedStage}
                                  </div>
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
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>View Run</span>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {expandedRuns.has(run.id) && (
                      <div className="mt-4 ml-7 space-y-4">
                        <div className="border rounded-lg p-4 dark:border-gray-700">
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>Created By: {run.createdBy}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>
                                Created:{' '}
                                {new Date(run.created).toLocaleString()}
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
                            <div className="p-4 dark:text-gray-300">
                              Loading run details...
                            </div>
                          ) : (
                            <RunControls
                              runId={run.id}
                              startExpanded={true}
                              run={expandedRunDetails[run.id]}
                              onRetryComplete={async () => {
                                await fetchRuns(currentPage)
                              }}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                  No runs found matching your criteria.
                </div>
              )}
            </div>
          </div>

          {runsData.paging && !runsData.loading && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredRuns.length} of {runsData.paging.totalItems}{' '}
                runs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!runsData.paging.hasPrevious}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Previous
                </button>
                <span className="px-3 py-1 dark:text-gray-300">
                  Page {runsData.paging.page} of {runsData.paging.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!runsData.paging.hasNext}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-500 p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default RunList
