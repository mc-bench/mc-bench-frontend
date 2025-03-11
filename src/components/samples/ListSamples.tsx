import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
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
  experimentalState: keyof typeof EXPERIMENTAL_STATES | null
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
  experimentalStates: (keyof typeof EXPERIMENTAL_STATES)[]
  pending: boolean | undefined
  complete: boolean | undefined
  username: string | undefined
  tagNames: string[]
}

type QuickFilterState = Partial<FilterState>

const EXPERIMENTAL_STATES = {
  RELEASED: 'RELEASED',
  EXPERIMENTAL: 'EXPERIMENTAL',
} as const

const hasActiveFilters = (filters: FilterState): boolean => {
  return (
    (filters.modelId?.length || 0) > 0 ||
    (filters.templateId?.length || 0) > 0 ||
    (filters.promptId?.length || 0) > 0 ||
    (filters.approvalStates?.length || 0) > 0 ||
    (filters.experimentalStates?.length || 0) > 0 ||
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
  complete: {
    label: 'Complete',
    icon: CheckCircle,
    filters: {
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

const ListSamples = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [models, setModels] = useState<Model[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [samples, setSamples] = useState<SampleResponse[]>([])
  const [paging, setPaging] = useState<PagingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modelSearch, setModelSearch] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [promptSearch, setPromptSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Pagination state - remove currentPage since we use paging.page now
  // We're keeping setCurrentPage for compatibility with any existing code
  const [_, setCurrentPage] = useState(1)

  // Create temporary state for filter form values
  const [filterFormState, setFilterFormState] = useState<FilterState>({
    modelId: [],
    templateId: [],
    promptId: [],
    approvalStates: [],
    experimentalStates: [],
    pending: undefined,
    complete: undefined,
    username: undefined,
    tagNames: [],
  })

  // Get applied filters directly from URL params (like in RunList)
  const appliedFilters: FilterState = {
    modelId: searchParams.getAll('modelId'),
    templateId: searchParams.getAll('templateId'),
    promptId: searchParams.getAll('promptId'),
    approvalStates: searchParams.getAll(
      'approvalState'
    ) as SampleApprovalState[],
    experimentalStates: searchParams.getAll(
      'experimentalState'
    ) as (keyof typeof EXPERIMENTAL_STATES)[],
    pending: searchParams.has('pending')
      ? searchParams.get('pending') === 'true'
      : undefined,
    complete: searchParams.has('complete')
      ? searchParams.get('complete') === 'true'
      : undefined,
    username: searchParams.get('username') || undefined,
    tagNames: searchParams.getAll('tag'),
  }

  // Update filter form state when applied filters change
  useEffect(() => {
    setFilterFormState({
      modelId: searchParams.getAll('modelId'),
      templateId: searchParams.getAll('templateId'),
      promptId: searchParams.getAll('promptId'),
      approvalStates: searchParams.getAll(
        'approvalState'
      ) as SampleApprovalState[],
      experimentalStates: searchParams.getAll(
        'experimentalState'
      ) as (keyof typeof EXPERIMENTAL_STATES)[],
      pending: searchParams.has('pending')
        ? searchParams.get('pending') === 'true'
        : undefined,
      complete: searchParams.has('complete')
        ? searchParams.get('complete') === 'true'
        : undefined,
      username: searchParams.get('username') || undefined,
      tagNames: searchParams.getAll('tag'),
    })
  }, [searchParams])

  // Load page from URL and fetch data - only when searchParams change
  useEffect(() => {
    // Get page from URL params, default to 1 if not present
    const page = searchParams.get('page')
      ? parseInt(searchParams.get('page') || '1', 10)
      : 1
    setCurrentPage(page)

    // Fetch data with filters from URL
    fetchData()
  }, [searchParams])

  // Fetch all filter options once on component mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [modelsRes, templatesRes, promptsRes, tagsRes] =
          await Promise.all([
            adminAPI.get('/model'),
            adminAPI.get('/template'),
            adminAPI.get('/prompt'),
            adminAPI.get('/tag'),
          ])

        setModels(modelsRes.data.data.filter((m: Model) => m.active))
        setTemplates(templatesRes.data.data.filter((t: Template) => t.active))
        setPrompts(promptsRes.data.data.filter((p: Prompt) => p.active))
        setTags(tagsRes.data.data || [])
      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      }
    }

    fetchFilterOptions()
  }, [])

  // Fetch samples data with current URL parameters
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const samplesRes = await fetchSamplesData()
      setSamples(samplesRes.data.data)
      setPaging(samplesRes.data.paging)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  // Update fetchSamplesData to use URL parameters directly
  const fetchSamplesData = async () => {
    const params = new URLSearchParams()
    const page = searchParams.get('page') || '1'
    params.append('page', page)
    params.append('page_size', '50')

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
    if (appliedFilters.experimentalStates.length) {
      appliedFilters.experimentalStates.forEach((state) =>
        params.append('experimental_state', state)
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

  // Update handleApplyFilters to use form state
  const handleApplyFilters = () => {
    // Create new URLSearchParams object to replace current params
    const newParams = new URLSearchParams()

    // Add page parameter
    newParams.set('page', '1') // Reset to page 1 when applying filters

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
    if (filterFormState.approvalStates.length) {
      filterFormState.approvalStates.forEach((state) =>
        newParams.append('approvalState', state)
      )
    }
    if (filterFormState.experimentalStates.length) {
      filterFormState.experimentalStates.forEach((state) =>
        newParams.append('experimentalState', state)
      )
    }
    if (filterFormState.tagNames.length) {
      filterFormState.tagNames.forEach((tag) => newParams.append('tag', tag))
    }
    if (filterFormState.pending !== undefined) {
      newParams.set('pending', filterFormState.pending.toString())
    }
    if (filterFormState.complete !== undefined) {
      newParams.set('complete', filterFormState.complete.toString())
    }
    if (filterFormState.username) {
      newParams.set('username', filterFormState.username)
    }

    // Update URL with new params
    setSearchParams(newParams)

    // Close filters panel
    setShowFilters(false)
  }

  // Update handleResetFilters to clear URL params
  const handleResetFilters = () => {
    // Reset form state without affecting URL yet
    setFilterFormState({
      modelId: [],
      templateId: [],
      promptId: [],
      approvalStates: [],
      experimentalStates: [],
      pending: undefined,
      complete: undefined,
      username: undefined,
      tagNames: [],
    })

    // If applied directly, also reset URL parameters
    if (!showFilters) {
      setSearchParams({ page: '1' })
    }
  }

  const getApprovalStateStyles = (
    state: 'APPROVED' | 'REJECTED' | null,
    isComplete: boolean,
    isPending: boolean,
    experimentalState: keyof typeof EXPERIMENTAL_STATES | null
  ) => {
    // First handle special cases
    if (isPending) {
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800'
    }

    if (!isComplete) {
      return 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    }

    if (experimentalState && experimentalState !== 'RELEASED') {
      return 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    }

    // Then handle normal approval states
    switch (state) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800'
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
    }
  }

  const getApprovalStateText = (
    state: 'APPROVED' | 'REJECTED' | null,
    isComplete: boolean,
    isPending: boolean,
    experimentalState: keyof typeof EXPERIMENTAL_STATES | null
  ) => {
    // If sample failed (not pending and not complete), show permanently ineligible
    if (!isComplete && !isPending) {
      return 'Permanently Ineligible'
    }
    // If sample is still pending or not complete yet, show temporarily ineligible
    if (!isComplete || isPending) {
      return 'Temporarily Ineligible'
    }
    // If sample is in experimental state, show permanently ineligible
    if (
      experimentalState &&
      experimentalState !== EXPERIMENTAL_STATES.RELEASED
    ) {
      return 'Permanently Ineligible'
    }
    return state || 'Pending Approval'
  }

  // Update the isQuickFilterActive function to use filterState type
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
      // Create empty values
      switch (key) {
        case 'modelId':
        case 'templateId':
        case 'promptId':
        case 'approvalStates':
        case 'experimentalStates':
        case 'tagNames':
          ;(newFilters as any)[key] = []
          break
        case 'pending':
        case 'complete':
        case 'username':
          ;(newFilters as any)[key] = undefined
          break
        default:
          ;(newFilters as any)[key] = undefined
      }
    })

    return newFilters
  }

  // Handle quick filter click - update to use URL params directly
  const handleQuickFilter = (filterKey: keyof typeof QUICK_FILTERS) => {
    // Check if this quick filter is currently active
    const isActive = isQuickFilterActive(
      QUICK_FILTERS[filterKey].filters,
      filterFormState
    )

    // If active, remove its filters, otherwise apply them
    const newFilters = isActive
      ? removeQuickFilter(filterKey, filterFormState)
      : applyQuickFilter(filterKey, filterFormState, user)

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
    if (newFilters.approvalStates.length) {
      newFilters.approvalStates.forEach((state) =>
        newParams.append('approvalState', state)
      )
    }
    if (newFilters.experimentalStates.length) {
      newFilters.experimentalStates.forEach((state) =>
        newParams.append('experimentalState', state)
      )
    }
    if (newFilters.tagNames.length) {
      newFilters.tagNames.forEach((tag) => newParams.append('tag', tag))
    }
    if (newFilters.pending !== undefined) {
      newParams.set('pending', newFilters.pending.toString())
    }
    if (newFilters.complete !== undefined) {
      newParams.set('complete', newFilters.complete.toString())
    }
    if (newFilters.username) {
      newParams.set('username', newFilters.username)
    }

    // Update URL params
    setSearchParams(newParams)
  }

  // Update pagination to use URL params directly
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', newPage.toString())
    setSearchParams(newParams)
  }

  if (error) {
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Samples
        </h1>
        <div className="flex items-center gap-2">
          {hasActiveFilters(filterFormState) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
            >
              <XCircle className="h-4 w-4" />
              Clear Filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md ${
              showFilters
                ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Filter Samples
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilterFormState({
                    modelId: [],
                    templateId: [],
                    promptId: [],
                    approvalStates: [],
                    experimentalStates: [],
                    pending: undefined,
                    complete: undefined,
                    username: undefined,
                    tagNames: [],
                  })
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700"
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
                Tags
              </label>
              <SearchSelect
                items={tags}
                selected={tags.filter((t) =>
                  filterFormState.tagNames.includes(t.name)
                )}
                onSelectionChange={(selected) => {
                  const newTagNames = selected.map((s) => s.name)
                  setFilterFormState((prev) => ({
                    ...prev,
                    tagNames: newTagNames,
                  }))
                }}
                searchValue={tagSearch}
                onSearchChange={setTagSearch}
                placeholder="Select tags"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Approval States
              </label>
              <select
                multiple
                value={filterFormState.approvalStates}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  ) as SampleApprovalState[]
                  setFilterFormState((prev) => ({
                    ...prev,
                    approvalStates: values,
                  }))
                }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:bg-gray-700"
                    checked={filterFormState.pending === true}
                    onChange={(e) =>
                      setFilterFormState((prev) => ({
                        ...prev,
                        pending: e.target.checked ? true : undefined,
                      }))
                    }
                  />
                  <span className="ml-2 dark:text-gray-300">Pending</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:bg-gray-700"
                    checked={filterFormState.complete === true}
                    onChange={(e) =>
                      setFilterFormState((prev) => ({
                        ...prev,
                        complete: e.target.checked ? true : undefined,
                      }))
                    }
                  />
                  <span className="ml-2 dark:text-gray-300">Complete</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Experimental States
              </label>
              <select
                multiple
                value={filterFormState.experimentalStates}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  ) as (keyof typeof EXPERIMENTAL_STATES)[]
                  setFilterFormState((prev) => ({
                    ...prev,
                    experimentalStates: values,
                  }))
                }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-gray-200"
              >
                {Object.entries(EXPERIMENTAL_STATES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 items-center">
          {/* User filter group */}
          <div className="flex items-center">
            <button
              onClick={() => handleQuickFilter('all')}
              className={`px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.all.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <Box className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.all.label}
            </button>
            <button
              onClick={() => handleQuickFilter('mySamples')}
              className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.mySamples.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <User className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.mySamples.label}
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* Approval state filter group */}
          <div className="flex items-center">
            <button
              onClick={() => handleQuickFilter('needsApproval')}
              className={`px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.needsApproval.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <CircleEllipsis className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.needsApproval.label}
            </button>
            <button
              onClick={() => handleQuickFilter('approved')}
              className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.approved.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.approved.label}
            </button>
            <button
              onClick={() => handleQuickFilter('rejected')}
              className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.rejected.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <XSquare className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.rejected.label}
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* Status filter group */}
          <div className="flex items-center">
            <button
              onClick={() => handleQuickFilter('complete')}
              className={`px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.complete.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.complete.label}
            </button>
            <button
              onClick={() => handleQuickFilter('failed')}
              className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.failed.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <XOctagon className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.failed.label}
            </button>
            <button
              onClick={() => handleQuickFilter('pending')}
              className={`ml-2 px-3 py-1 text-sm border rounded-md flex items-center gap-1 transition-colors
                ${
                  isQuickFilterActive(
                    QUICK_FILTERS.pending.filters,
                    filterFormState
                  )
                    ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
            >
              <Clock className="h-4 w-4 mr-1" />
              {QUICK_FILTERS.pending.label}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8">
          <div className="flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border divide-y dark:divide-gray-700">
            {samples.map((sample) => (
              <div key={sample.id} className="p-4">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {sample.run.model.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-gray-400" />
                        <span
                          className="text-gray-700 dark:text-gray-300"
                          title={sample.run.template.name}
                        >
                          {sample.run.template.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-gray-400" />
                        <span
                          className="text-gray-700 dark:text-gray-300"
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
                      <div className="flex items-center gap-2">
                        {/* Show experimental badge first */}
                        {sample.experimentalState &&
                          sample.experimentalState !== 'RELEASED' && (
                            <div
                              className="px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-700 border border-amber-200 tooltip-container"
                              data-tooltip="Indicates that one or more of the model, prompt, or template are in experimental state"
                            >
                              {sample.experimentalState}
                            </div>
                          )}
                        {/* Then show approval state badge */}
                        <div
                          className={`px-3 py-1 rounded-full text-sm border tooltip-container ${getApprovalStateStyles(
                            sample.approvalState,
                            sample.isComplete,
                            sample.isPending,
                            sample.experimentalState
                          )}`}
                          data-tooltip={
                            !sample.isComplete && !sample.isPending
                              ? 'This sample failed to generate completely and cannot be used for voting'
                              : !sample.isComplete || sample.isPending
                                ? 'This sample is not yet ready for voting approval'
                                : sample.experimentalState &&
                                    sample.experimentalState !==
                                      EXPERIMENTAL_STATES.RELEASED
                                  ? 'This sample is in experimental state and cannot be used for voting'
                                  : 'Indicates whether this sample is approved for voting'
                          }
                        >
                          {getApprovalStateText(
                            sample.approvalState,
                            sample.isComplete,
                            sample.isPending,
                            sample.experimentalState
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <div
                        className="flex items-center gap-1 tooltip-container"
                        data-tooltip="Indicates whether the generation process is still running"
                      >
                        {sample.isPending ? (
                          <div
                            className="flex items-center gap-1 tooltip-container"
                            data-tooltip="Indicates whether the generation process is still running"
                          >
                            <Clock size={16} className="text-yellow-500" />
                            <span className="text-yellow-700 dark:text-yellow-400">
                              Generating
                            </span>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1 tooltip-container"
                            data-tooltip="Generation has completed"
                          >
                            <CheckCircle size={16} className="text-green-500" />
                            <span className="text-green-700 dark:text-green-400">
                              Generation Finished
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-1 tooltip-container"
                        data-tooltip="Indicates whether the sample has all required artifacts and content"
                      >
                        {sample.isComplete ? (
                          <div
                            className="flex items-center gap-1 tooltip-container"
                            data-tooltip="All expected artifacts were generated"
                          >
                            <CheckCircle size={16} className="text-green-500" />
                            <span className="text-green-700 dark:text-green-400">
                              Complete
                            </span>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1 tooltip-container"
                            data-tooltip="Some expected artifacts are missing"
                          >
                            <XCircle size={16} className="text-red-500" />
                            <span className="text-red-700 dark:text-red-400">
                              Incomplete
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <Clock size={14} className="inline mr-1" />
                      {new Date(sample.created).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          {paging && paging.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav
                className="inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(paging.page - 1)}
                  disabled={!paging.hasPrevious}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Previous 5 pages button (only show if current page > 4) */}
                {paging.totalPages > 10 && paging.page > 4 && (
                  <button
                    onClick={() =>
                      handlePageChange(Math.max(1, paging.page - 5))
                    }
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    &laquo;
                  </button>
                )}

                {/* Render pagination with first 3, last 3, and 5 around current page */}
                {(() => {
                  const pagesToShow = new Set<number>()
                  const totalPages = paging.totalPages
                  const currentPage = paging.page

                  // Always show first 3 pages
                  for (let i = 1; i <= Math.min(3, totalPages); i++) {
                    pagesToShow.add(i)
                  }

                  // Always show last 3 pages
                  for (
                    let i = Math.max(1, totalPages - 2);
                    i <= totalPages;
                    i++
                  ) {
                    pagesToShow.add(i)
                  }

                  // Show 5 pages around current page
                  for (
                    let i = Math.max(1, currentPage - 2);
                    i <= Math.min(totalPages, currentPage + 2);
                    i++
                  ) {
                    pagesToShow.add(i)
                  }

                  // Convert to array and sort
                  const pagesArray = Array.from(pagesToShow).sort(
                    (a, b) => a - b
                  )

                  // Create array with ellipses
                  const result: (number | string)[] = []
                  let prev: number | null = null

                  for (const page of pagesArray) {
                    if (prev !== null && page > prev + 1) {
                      result.push('...')
                    }
                    result.push(page)
                    prev = page
                  }

                  return result.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400"
                        >
                          {page}
                        </span>
                      )
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          page === currentPage
                            ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-600 text-blue-600 dark:text-blue-200 z-10'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } text-sm font-medium`}
                      >
                        {page}
                      </button>
                    )
                  })
                })()}

                {/* Next 5 pages button (only show if not near the end) */}
                {paging.totalPages > 10 &&
                  paging.page < paging.totalPages - 3 && (
                    <button
                      onClick={() =>
                        handlePageChange(
                          Math.min(paging.totalPages, paging.page + 5)
                        )
                      }
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      &raquo;
                    </button>
                  )}

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(paging.page + 1)}
                  disabled={!paging.hasNext}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ListSamples
