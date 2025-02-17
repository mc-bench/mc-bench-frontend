import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  AlertCircle,
  Box,
  CheckCircle,
  CheckSquare,
  CircleEllipsis,
  Clock,
  ExternalLink,
  FileCode,
  Filter,
  Loader2,
  Terminal,
  User,
  XCircle,
  XOctagon,
  XSquare,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { Model } from '../../types/models'
import { Prompt, Tag } from '../../types/prompts'
import { SampleApprovalState } from '../../types/sample'
import { Template } from '../../types/templates'
import { SearchSelect } from '../ui/SearchSelect'

interface SampleResponse {
  id: string
  created: string
  resultInspirationText: string | null
  resultDescriptionText: string | null
  resultCodeText: string | null
  raw: string | null
  lastModified: string | null
  lastModifiedBy: string | null
  logs: any[] // TODO: Type this properly
  isPending: boolean
  isComplete: boolean
  approvalState: 'APPROVED' | 'REJECTED' | null
  run: {
    model: { slug: string }
    prompt: { name: string }
    template: { name: string }
  }
}

interface PagingResponse {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrevious: boolean
}

interface PagedListResponse {
  data: SampleResponse[]
  paging: PagingResponse
}

interface FilterState {
  modelId: string[]
  templateId: string[]
  promptId: string[]
  approvalStates: SampleApprovalState[]
  pending: boolean | undefined
  complete: boolean | undefined
  username: string | undefined
  tagNames: string[]
}

type QuickFilterState = Partial<FilterState>

const STORAGE_KEY = 'sample-list-state'

// Add hasActiveFilters function back
const hasActiveFilters = (filters: FilterState): boolean => {
  return (
    (filters.modelId?.length || 0) > 0 ||
    (filters.templateId?.length || 0) > 0 ||
    (filters.promptId?.length || 0) > 0 ||
    (filters.approvalStates?.length || 0) > 0 ||
    filters.pending !== undefined ||
    filters.complete !== undefined ||
    filters.username !== undefined ||
    (filters.tagNames?.length || 0) > 0
  )
}

const QUICK_FILTERS = {
  all: {
    label: 'All Samples',
    icon: Box,
    filters: {
      username: undefined,
    } as QuickFilterState,
  },
  mySamples: {
    label: 'My Samples',
    icon: User,
    filters: {
      username: 'CURRENT_USER',
    } as QuickFilterState,
  },
  needsApproval: {
    label: 'Needs Approval',
    icon: CircleEllipsis,
    filters: {
      approvalStates: ['PENDING_APPROVAL'],
      pending: false,
      complete: true,
    } as QuickFilterState,
  },
  approved: {
    label: 'Approved',
    icon: CheckSquare,
    filters: {
      approvalStates: ['APPROVED'],
      pending: false,
      complete: true,
    } as QuickFilterState,
  },
  rejected: {
    label: 'Rejected',
    icon: XSquare,
    filters: {
      approvalStates: ['REJECTED'],
      pending: false,
      complete: true,
    } as QuickFilterState,
  },
  failed: {
    label: 'Failed',
    icon: XOctagon,
    filters: {
      approvalStates: [],
      pending: false,
      complete: false,
    } as QuickFilterState,
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    filters: {
      pending: true,
    } as QuickFilterState,
  },
} as const

// Add type for the stored state
interface StoredState {
  filters: FilterState
  page: number
}

const ListSamples = () => {
  const { user } = useAuth()
  const [samples, setSamples] = useState<SampleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [paging, setPaging] = useState<PagingResponse | null>(null)

  // Filter state
  const initialFilterState: FilterState = {
    modelId: [],
    templateId: [],
    promptId: [],
    approvalStates: [],
    pending: undefined,
    complete: undefined,
    username: undefined,
    tagNames: [],
  }

  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState)
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(initialFilterState)

  // Search values for SearchSelect components
  const [modelSearch, setModelSearch] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [promptSearch, setPromptSearch] = useState('')

  const [models, setModels] = useState<Model[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])

  // Add a flag to track if we've initialized from storage
  const [initialized, setInitialized] = useState(false)

  // Add state for tags
  const [tags, setTags] = useState<Tag[]>([])
  const [tagSearch, setTagSearch] = useState('')

  // Update the storage effect to use proper typing
  useEffect(() => {
    if (!initialized) return

    const stateToSave: StoredState = {
      filters: appliedFilters,
      page: currentPage,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  }, [appliedFilters, currentPage, initialized])

  // Update the load from storage effect to ensure all arrays are initialized
  useEffect(() => {
    const savedStateJson = localStorage.getItem(STORAGE_KEY)
    if (savedStateJson) {
      try {
        const savedState = JSON.parse(savedStateJson) as StoredState
        // Ensure all array properties are initialized
        const loadedFilters = {
          ...initialFilterState, // Start with default empty arrays
          ...savedState.filters, // Override with saved values
          // Ensure arrays are initialized even if missing from storage
          modelId: savedState.filters.modelId || [],
          templateId: savedState.filters.templateId || [],
          promptId: savedState.filters.promptId || [],
          approvalStates: savedState.filters.approvalStates || [],
          tagNames: savedState.filters.tagNames || [],
        }
        // Set all state synchronously to avoid race conditions
        setFilterState(loadedFilters)
        setAppliedFilters(loadedFilters)
        setCurrentPage(savedState.page)
      } catch (err) {
        console.error('Failed to parse saved filter state:', err)
        localStorage.removeItem(STORAGE_KEY)
        // Set to initial state if loading fails
        setFilterState(initialFilterState)
        setAppliedFilters(initialFilterState)
      }
    } else {
      // Explicitly set initial state if no saved state exists
      setFilterState(initialFilterState)
      setAppliedFilters(initialFilterState)
    }
    setInitialized(true)
  }, []) // Only run once on mount

  // Combine fetchSamples and data fetching into a single effect
  useEffect(() => {
    if (!initialized) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch filter options and samples in parallel
        const [modelsRes, templatesRes, promptsRes, tagsRes, samplesRes] =
          await Promise.all([
            adminAPI.get('/model'),
            adminAPI.get('/template'),
            adminAPI.get('/prompt'),
            adminAPI.get('/tag'),
            fetchSamplesData(),
          ])

        // Update all state at once
        setModels(modelsRes.data.data.filter((m: Model) => m.active))
        setTemplates(templatesRes.data.data.filter((t: Template) => t.active))
        setPrompts(promptsRes.data.data.filter((p: Prompt) => p.active))
        setTags(tagsRes.data.data || [])
        setSamples(samplesRes.data.data)
        setPaging(samplesRes.data.paging)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [initialized, currentPage, appliedFilters])

  // Update fetchSamplesData to include tags
  const fetchSamplesData = async () => {
    const params = new URLSearchParams()
    params.append('page', currentPage.toString())
    params.append('page_size', '10')

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
    if (appliedFilters.approvalStates.length) {
      appliedFilters.approvalStates.forEach((state) =>
        params.append('approval_state', state)
      )
    }
    if (appliedFilters.pending !== undefined) {
      params.append('pending', appliedFilters.pending.toString())
    }
    if (appliedFilters.complete !== undefined) {
      params.append('complete', appliedFilters.complete.toString())
    }
    if (appliedFilters.username) {
      params.append('username', appliedFilters.username)
    }
    if (appliedFilters.tagNames.length) {
      appliedFilters.tagNames.forEach((tagName) =>
        params.append('tag', tagName)
      )
    }

    return adminAPI.get<PagedListResponse>(`/sample?${params.toString()}`)
  }

  const handleApplyFilters = () => {
    setAppliedFilters(filterState)
    setCurrentPage(1) // Reset to first page when applying new filters
    setShowFilters(false) // Close the filters section after applying
  }

  // Modify handleResetFilters to be more explicit about when we clear storage
  const handleResetFilters = () => {
    console.log('Explicitly resetting filters')
    const emptyFilters = {
      modelId: [],
      templateId: [],
      promptId: [],
      approvalStates: [],
      pending: undefined,
      complete: undefined,
      username: undefined,
      tagNames: [],
    }
    setFilterState(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
    localStorage.removeItem(STORAGE_KEY) // Only place we should explicitly clear storage
  }

  const getApprovalStateStyles = (
    state: 'APPROVED' | 'REJECTED' | null,
    isComplete: boolean,
    isPending: boolean
  ) => {
    // If sample is not complete or is pending, show ineligible state
    if (!isComplete || isPending) {
      return 'bg-gray-100 text-gray-500 border-gray-200'
    }

    switch (state) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getApprovalStateText = (
    state: 'APPROVED' | 'REJECTED' | null,
    isComplete: boolean,
    isPending: boolean
  ) => {
    // If sample failed (not pending and not complete), show permanently ineligible
    if (!isComplete && !isPending) {
      return 'Permanently Ineligible'
    }
    // If sample is still pending or not complete yet, show temporarily ineligible
    if (!isComplete || isPending) {
      return 'Temporarily Ineligible'
    }
    return state || 'Pending Approval'
  }

  // Update the isQuickFilterActive function to handle type safety
  const isQuickFilterActive = (
    quickFilter: QuickFilterState,
    currentFilters: FilterState
  ): boolean => {
    return Object.entries(quickFilter).every(([key, value]) => {
      const currentValue = currentFilters[key as keyof FilterState]

      // Handle arrays (like approvalStates)
      if (Array.isArray(value)) {
        return (
          Array.isArray(currentValue) &&
          value.length === currentValue.length &&
          value.every((v) => currentValue.includes(v as any))
        )
      }

      // Handle special case for username
      if (key === 'username' && value === 'CURRENT_USER') {
        return currentValue !== undefined
      }

      // Handle other values (including undefined)
      return currentValue === value
    })
  }

  // Update the applyQuickFilter function to handle type safety
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

  // Add this helper function to remove quick filter values
  const removeQuickFilter = (
    filterKey: keyof typeof QUICK_FILTERS,
    currentState: FilterState
  ): FilterState => {
    const quickFilter = QUICK_FILTERS[filterKey].filters
    const newFilters = { ...currentState }

    Object.keys(quickFilter).forEach((key) => {
      ;(newFilters as any)[key] = initialFilterState[key as keyof FilterState]
    })

    return newFilters
  }

  // Update the handleQuickFilter function
  const handleQuickFilter = (filterKey: keyof typeof QUICK_FILTERS) => {
    // Check if this quick filter is currently active
    const isActive = isQuickFilterActive(
      QUICK_FILTERS[filterKey].filters,
      filterState
    )

    // If active, remove its filters, otherwise apply them
    const newFilters = isActive
      ? removeQuickFilter(filterKey, filterState)
      : applyQuickFilter(filterKey, filterState, user)

    setFilterState(newFilters)
    setAppliedFilters(newFilters)
    setCurrentPage(1)
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Samples</h1>
        <div className="flex items-center gap-2">
          {hasActiveFilters(appliedFilters) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-50"
            >
              <XCircle className="h-4 w-4" />
              Clear Filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Filter Samples
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Models
              </label>
              <SearchSelect
                items={models}
                selected={models.filter((m) =>
                  filterState.modelId.includes(m.id)
                )}
                onSelectionChange={(selected) =>
                  setFilterState((prev) => ({
                    ...prev,
                    modelId: selected.map((s) => s.id),
                  }))
                }
                searchValue={modelSearch}
                onSearchChange={setModelSearch}
                placeholder="Select models"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <SearchSelect
                items={tags}
                selected={tags.filter((t) =>
                  filterState.tagNames.includes(t.name)
                )}
                onSelectionChange={(selected) =>
                  setFilterState((prev) => ({
                    ...prev,
                    tagNames: selected.map((s) => s.name),
                  }))
                }
                searchValue={tagSearch}
                onSearchChange={setTagSearch}
                placeholder="Select tags"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompts
              </label>
              <SearchSelect
                items={prompts}
                selected={prompts.filter((p) =>
                  filterState.promptId.includes(p.id)
                )}
                onSelectionChange={(selected) =>
                  setFilterState((prev) => ({
                    ...prev,
                    promptId: selected.map((s) => s.id),
                  }))
                }
                searchValue={promptSearch}
                onSearchChange={setPromptSearch}
                placeholder="Select prompts"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Templates
              </label>
              <SearchSelect
                items={templates}
                selected={templates.filter((t) =>
                  filterState.templateId.includes(t.id)
                )}
                onSelectionChange={(selected) =>
                  setFilterState((prev) => ({
                    ...prev,
                    templateId: selected.map((s) => s.id),
                  }))
                }
                searchValue={templateSearch}
                onSearchChange={setTemplateSearch}
                placeholder="Select templates"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval State
              </label>
              <select
                multiple
                value={filterState.approvalStates}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value as SampleApprovalState
                  )
                  setFilterState((prev) => ({
                    ...prev,
                    approvalStates: values,
                  }))
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filters
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <select
                    value={
                      filterState.pending === undefined
                        ? ''
                        : filterState.pending.toString()
                    }
                    onChange={(e) =>
                      setFilterState((prev) => ({
                        ...prev,
                        pending:
                          e.target.value === ''
                            ? undefined
                            : e.target.value === 'true',
                      }))
                    }
                    className="rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Any Pending Status</option>
                    <option value="true">Pending</option>
                    <option value="false">Not Pending</option>
                  </select>
                </label>

                <label className="flex items-center gap-2">
                  <select
                    value={
                      filterState.complete === undefined
                        ? ''
                        : filterState.complete.toString()
                    }
                    onChange={(e) =>
                      setFilterState((prev) => ({
                        ...prev,
                        complete:
                          e.target.value === ''
                            ? undefined
                            : e.target.value === 'true',
                      }))
                    }
                    className="rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Any Complete Status</option>
                    <option value="true">Complete</option>
                    <option value="false">Incomplete</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 items-center">
        {Object.entries(QUICK_FILTERS).map(([key, filter], index) => {
          const isActive = isQuickFilterActive(filter.filters, appliedFilters)
          const Icon = filter.icon

          // Add dividers after specific filters - only after mySamples and after rejected
          const showDivider = index === 1 || index === 4 // After mySamples and after rejected

          return (
            <div key={key} className="flex items-center">
              <button
                onClick={() =>
                  handleQuickFilter(key as keyof typeof QUICK_FILTERS)
                }
                className={`px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                  ${
                    isActive
                      ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? 'text-blue-500' : 'text-gray-500'}`}
                />
                {filter.label}
              </button>
              {showDivider && <div className="h-6 w-px bg-gray-300 mx-2" />}
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border divide-y">
            {samples.map((sample) => (
              <div key={sample.id} className="p-4">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 font-medium">
                          {sample.run.model.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-gray-400" />
                        <span
                          className="text-gray-700"
                          title={sample.run.template.name}
                        >
                          {sample.run.template.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-gray-400" />
                        <span
                          className="text-gray-700"
                          title={sample.run.prompt.name}
                        >
                          {sample.run.prompt.name}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Link
                          to={`/samples/${sample.id}`}
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          View Sample
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-4">
                      <div
                        className={`px-3 py-1 rounded-full text-sm border tooltip-container ${getApprovalStateStyles(sample.approvalState, sample.isComplete, sample.isPending)}`}
                        data-tooltip={
                          !sample.isComplete && !sample.isPending
                            ? 'This sample failed to generate completely and cannot be used for voting'
                            : !sample.isComplete || sample.isPending
                              ? 'This sample is not yet ready for voting approval'
                              : 'Indicates whether this sample is approved for voting'
                        }
                      >
                        {getApprovalStateText(
                          sample.approvalState,
                          sample.isComplete,
                          sample.isPending
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <div
                        className="flex items-center gap-1 tooltip-container"
                        data-tooltip="Indicates whether the generation process is still running"
                      >
                        {sample.isPending ? (
                          <>
                            <Clock size={16} className="text-yellow-500" />
                            <span>Generating</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} className="text-green-500" />
                            <span>Generation Finished</span>
                          </>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-1 tooltip-container"
                        data-tooltip="Indicates whether the sample has all required artifacts and content"
                      >
                        {sample.isComplete ? (
                          <>
                            <CheckCircle size={16} className="text-green-500" />
                            <span>Sample Ready</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="text-red-500" />
                            <span>Sample Incomplete</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      <Clock size={14} className="inline mr-1" />
                      {new Date(sample.created).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          {paging && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {samples.length} of {paging.totalItems} samples
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={!paging.hasPrevious}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {paging.page} of {paging.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!paging.hasNext}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ListSamples
