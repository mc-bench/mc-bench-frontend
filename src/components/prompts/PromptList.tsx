import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  AlertCircle,
  Bell,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { Prompt, Tag } from '../../types/prompts'
import { SimpleSearchSelect } from '../ui/SimpleSearchSelect'
import { getExperimentalStateStyles } from '../ui/StatusStyles'
import HelpButton from './HelpButton'

const EXPERIMENTAL_STATES = [
  {
    value: 'EXPERIMENTAL',
    label: 'Experimental',
    get color() {
      return getExperimentalStateStyles('EXPERIMENTAL')
    },
  },
  {
    value: 'RELEASED',
    label: 'Released',
    get color() {
      return getExperimentalStateStyles('RELEASED')
    },
  },
  {
    value: 'DEPRECATED',
    label: 'Deprecated',
    get color() {
      return getExperimentalStateStyles('DEPRECATED')
    },
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    get color() {
      return getExperimentalStateStyles('REJECTED')
    },
  },
] as const

// Define default filter values - update active to true since "Hide Inactive" is the default
const DEFAULT_FILTER_VALUES: FilterState = {
  experimentalStates: ['EXPERIMENTAL', 'RELEASED'],
  active: true, // Default is to hide inactive (only show active)
  hasObservations: undefined,
  hasPendingProposals: undefined,
  tags: [],
}

// Define the filter state interface
interface FilterState {
  experimentalStates: string[]
  active: boolean | undefined
  hasObservations: boolean | undefined
  hasPendingProposals: boolean | undefined
  tags: string[]
}

const PromptList = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Form state for filters - use DEFAULT_FILTER_VALUES
  const [filterFormState, setFilterFormState] = useState<FilterState>({
    ...DEFAULT_FILTER_VALUES,
  })

  // Get applied filters from URL params with proper defaults
  const appliedFilters: FilterState = {
    experimentalStates:
      searchParams.getAll('experimentalState').length > 0
        ? searchParams.getAll('experimentalState')
        : [...DEFAULT_FILTER_VALUES.experimentalStates], // Use spread to create a new array
    active: searchParams.has('active')
      ? searchParams.get('active') === 'true'
      : DEFAULT_FILTER_VALUES.active,
    hasObservations: searchParams.has('hasObservations')
      ? searchParams.get('hasObservations') === 'true'
      : DEFAULT_FILTER_VALUES.hasObservations,
    hasPendingProposals: searchParams.has('hasPendingProposals')
      ? searchParams.get('hasPendingProposals') === 'true'
      : DEFAULT_FILTER_VALUES.hasPendingProposals,
    tags: searchParams.getAll('tag'),
  }

  // Update form state when applied filters change
  useEffect(() => {
    setFilterFormState({
      experimentalStates:
        searchParams.getAll('experimentalState').length > 0
          ? searchParams.getAll('experimentalState')
          : DEFAULT_FILTER_VALUES.experimentalStates,
      active: searchParams.has('active')
        ? searchParams.get('active') === 'true'
        : DEFAULT_FILTER_VALUES.active,
      hasObservations: searchParams.has('hasObservations')
        ? searchParams.get('hasObservations') === 'true'
        : DEFAULT_FILTER_VALUES.hasObservations,
      hasPendingProposals: searchParams.has('hasPendingProposals')
        ? searchParams.get('hasPendingProposals') === 'true'
        : DEFAULT_FILTER_VALUES.hasPendingProposals,
      tags: searchParams.getAll('tag'),
    })
  }, [searchParams])

  // Fetch data when URL params change
  useEffect(() => {
    fetchPrompts()
    searchInputRef.current?.focus()
  }, [searchParams])

  // Fetch tags once
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await adminAPI.get('/tag')
        setTags(response.data.data || [])
      } catch (err) {
        console.error('Failed to fetch tags:', err)
      }
    }

    fetchTags()
  }, [])

  const fetchPrompts = async () => {
    try {
      setLoading(true)

      // Build query parameters for server-side filtering
      const params = new URLSearchParams()

      // Add filter for active status - only add if active=true (hide inactive)
      if (appliedFilters.active === true) {
        params.append('active', 'true')
      }
      // If active is false, don't add the parameter to show all prompts

      // Add filter for observations if set
      if (appliedFilters.hasObservations !== undefined) {
        params.append(
          'has_observations',
          appliedFilters.hasObservations.toString()
        )
      }

      // Add filter for pending proposals if set
      if (appliedFilters.hasPendingProposals !== undefined) {
        params.append(
          'has_pending_proposals',
          appliedFilters.hasPendingProposals.toString()
        )
      }

      // Add experimental states filter
      if (
        appliedFilters.experimentalStates &&
        appliedFilters.experimentalStates.length > 0
      ) {
        appliedFilters.experimentalStates.forEach((state) =>
          params.append('experimental_states', state)
        )
      }

      // Add tags if any
      if (appliedFilters.tags.length > 0) {
        appliedFilters.tags.forEach((tag) => params.append('tags', tag))
      }

      const { data } = await adminAPI.get(`/prompt?${params.toString()}`)
      setPrompts(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts')
    } finally {
      setLoading(false)
    }
  }

  const togglePromptStatus = async (id: string, currentStatus: boolean) => {
    try {
      await adminAPI.patch(`/prompt/${id}`, {
        active: !currentStatus,
      })

      fetchPrompts()
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prompt')
    }
  }

  const deletePrompt = async (id: string) => {
    try {
      await adminAPI.delete(`/prompt/${id}`)
      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt')
    }
  }

  const clonePrompt = async (promptId: string) => {
    try {
      window.location.href = `/prompts/new?clone=${promptId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone prompt')
    }
  }

  // Reset filters to defaults
  const handleResetFilters = () => {
    // Reset form state to defaults - create a new object to avoid reference issues
    setFilterFormState({ ...DEFAULT_FILTER_VALUES })

    // When resetting to defaults, we clear URL params completely since defaults are implied
    setSearchParams({})

    // Close filter panel if open
    setShowFilters(false)
  }

  // Apply filters by updating URL params
  const handleApplyFilters = () => {
    const newParams = new URLSearchParams()

    // Only add filters that differ from defaults to keep URL clean

    // Add experimental states only if different from default
    const isDefaultExpStates =
      filterFormState.experimentalStates.length ===
        DEFAULT_FILTER_VALUES.experimentalStates.length &&
      filterFormState.experimentalStates.every((state) =>
        DEFAULT_FILTER_VALUES.experimentalStates.includes(state)
      ) &&
      DEFAULT_FILTER_VALUES.experimentalStates.every((state) =>
        filterFormState.experimentalStates.includes(state)
      )

    if (!isDefaultExpStates && filterFormState.experimentalStates.length) {
      filterFormState.experimentalStates.forEach((state) =>
        newParams.append('experimentalState', state)
      )
    }

    // Add active status only if we're showing all prompts (including inactive)
    // We only ever send active=true, or nothing at all
    if (filterFormState.active === false) {
      // Don't add an active parameter - this shows both active and inactive
    } else {
      // Either we're explicitly filtering for active, or using the default
      if (DEFAULT_FILTER_VALUES.active !== true) {
        // Only add if different from default
        newParams.set('active', 'true')
      }
    }

    // Add observation filter only if set (different from default undefined)
    if (filterFormState.hasObservations !== undefined) {
      newParams.set(
        'hasObservations',
        filterFormState.hasObservations.toString()
      )
    }

    // Add pending proposals filter only if set (different from default undefined)
    if (filterFormState.hasPendingProposals !== undefined) {
      newParams.set(
        'hasPendingProposals',
        filterFormState.hasPendingProposals.toString()
      )
    }

    // Add tags if any
    if (filterFormState.tags.length) {
      filterFormState.tags.forEach((tag) => newParams.append('tag', tag))
    }

    // Update URL params
    setSearchParams(newParams)

    // Close filter panel
    setShowFilters(false)
  }

  // Completely rewritten hasActiveFilters function to be more precise
  const hasActiveFilters = (): boolean => {
    // If loading, consider no filters active
    if (loading) return false

    // Get experimental states from URL params
    const urlExpStates = searchParams.getAll('experimentalState')

    // Check if experimentalStates is different from default
    // If URL has no experimental states, it should match default
    const hasNonDefaultExpStates =
      urlExpStates.length > 0 &&
      (urlExpStates.length !==
        DEFAULT_FILTER_VALUES.experimentalStates.length ||
        !urlExpStates.every((state) =>
          DEFAULT_FILTER_VALUES.experimentalStates.includes(state)
        ) ||
        !DEFAULT_FILTER_VALUES.experimentalStates.every((state) =>
          urlExpStates.includes(state)
        ))

    // Check if active parameter is different from default
    // Default is to hide inactive (active=true)
    // If param is not in URL, it means we're using the default (active=true)
    // If param is in URL but not "true", it means we're showing all prompts
    const hasNonDefaultActive = searchParams.has('active')
      ? searchParams.get('active') !== 'true'
      : false // If param missing, we're using default

    // Check if hasObservations is set (different from default undefined)
    const hasObservationsFilter = searchParams.has('hasObservations')

    // Check if hasPendingProposals is set (different from default undefined)
    const hasPendingProposalsFilter = searchParams.has('hasPendingProposals')

    // Check if tags are present
    const hasTagsFilter = searchParams.getAll('tag').length > 0

    // Filter is active if ANY non-default filter is applied
    return (
      hasNonDefaultExpStates ||
      hasNonDefaultActive ||
      hasObservationsFilter ||
      hasPendingProposalsFilter ||
      hasTagsFilter
    )
  }

  // Filter prompts client-side only for search term since that's not handled by the server
  const filteredPrompts = prompts.filter((prompt) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      prompt.name.toLowerCase().includes(searchLower) ||
      prompt.createdBy.toLowerCase().includes(searchLower) ||
      prompt.buildSpecification.toLowerCase().includes(searchLower) ||
      (prompt.buildSize?.toLowerCase().includes(searchLower) ?? false)
    )
  })

  if (error)
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Prompts
          </h1>
          <HelpButton section="list" />
        </div>
        <div className="flex items-center gap-4">
          {!loading && hasActiveFilters() && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <XCircle size={16} />
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
          <Link
            to="/prompts/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={16} />
            New Prompt
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
              Filter Prompts
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilterFormState({ ...DEFAULT_FILTER_VALUES })
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Experimental State
              </h4>
              <div className="flex flex-wrap gap-2">
                {EXPERIMENTAL_STATES.map((state) => (
                  <button
                    key={state.value}
                    onClick={() => {
                      const newStates = [...filterFormState.experimentalStates]
                      if (newStates.includes(state.value)) {
                        // Allow removing all states
                        setFilterFormState({
                          ...filterFormState,
                          experimentalStates: newStates.filter(
                            (s) => s !== state.value
                          ),
                        })
                      } else {
                        setFilterFormState({
                          ...filterFormState,
                          experimentalStates: [...newStates, state.value],
                        })
                      }
                    }}
                    className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 border ${
                      filterFormState.experimentalStates.includes(state.value)
                        ? `${state.color} border-current`
                        : 'bg-gray-100 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {state.value === 'RELEASED' && <CheckCircle size={14} />}
                    {state.value === 'EXPERIMENTAL' && (
                      <AlertCircle size={14} />
                    )}
                    {state.value === 'DEPRECATED' && <Clock size={14} />}
                    {state.value === 'REJECTED' && <XCircle size={14} />}
                    {state.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </h4>
              <button
                onClick={() =>
                  setFilterFormState({
                    ...filterFormState,
                    active: !filterFormState.active,
                  })
                }
                className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 border ${
                  filterFormState.active === false
                    ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                    : 'bg-gray-100 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {filterFormState.active === false ? (
                  <Eye size={14} />
                ) : (
                  <EyeOff size={14} />
                )}
                {filterFormState.active === false
                  ? 'Show All Prompts'
                  : 'Hide Inactive'}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Observations
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFilterFormState({
                        ...filterFormState,
                        hasObservations:
                          filterFormState.hasObservations === true
                            ? undefined
                            : true,
                      })
                    }
                    className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 border ${
                      filterFormState.hasObservations === true
                        ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                        : 'bg-gray-100 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <FileText size={14} />
                    Has Observations
                  </button>
                  <button
                    onClick={() =>
                      setFilterFormState({
                        ...filterFormState,
                        hasObservations:
                          filterFormState.hasObservations === false
                            ? undefined
                            : false,
                      })
                    }
                    className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 border ${
                      filterFormState.hasObservations === false
                        ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                        : 'bg-gray-100 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <XCircle size={14} />
                    No Observations
                  </button>
                </div>
              </div>

              <div>
                <h4 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pending Proposals
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFilterFormState({
                        ...filterFormState,
                        hasPendingProposals:
                          filterFormState.hasPendingProposals === true
                            ? undefined
                            : true,
                      })
                    }
                    className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 border ${
                      filterFormState.hasPendingProposals === true
                        ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-gray-100 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <Bell size={14} />
                    Has Pending Proposals
                  </button>
                  <button
                    onClick={() =>
                      setFilterFormState({
                        ...filterFormState,
                        hasPendingProposals:
                          filterFormState.hasPendingProposals === false
                            ? undefined
                            : false,
                      })
                    }
                    className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 border ${
                      filterFormState.hasPendingProposals === false
                        ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                        : 'bg-gray-100 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <XCircle size={14} />
                    No Pending Proposals
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </h4>
            <SimpleSearchSelect
              items={tags.map((tag) => ({ id: tag.name, name: tag.name }))}
              selected={tags
                .filter((tag) => filterFormState.tags.includes(tag.name))
                .map((tag) => ({ id: tag.name, name: tag.name }))}
              onSelectionChange={(selected) => {
                setFilterFormState({
                  ...filterFormState,
                  tags: selected.map((s) => s.name),
                })
              }}
              searchValue={tagSearch}
              onSearchChange={setTagSearch}
              placeholder="Select tags"
            />
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
            size={20}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search prompts by name, creator, or specification... (Press '/' to focus)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="relative grid gap-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 dark:bg-gray-900 dark:bg-opacity-60 z-10 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              <span className="text-gray-700 dark:text-gray-300">
                Loading prompts...
              </span>
            </div>
          </div>
        )}
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${!prompt.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between pb-2">
                <div className="flex-1 flex items-center gap-2">
                  <h2 className="text-xl font-semibold dark:text-white">
                    {prompt.name}
                  </h2>
                  <Link
                    to={`/prompts/${prompt.id}`}
                    className="group relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <Eye size={16} />
                    <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      View prompt details
                    </span>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  {prompt.pendingProposalCount > 0 && (
                    <Link
                      to={`/prompts/${prompt.id}`}
                      className="group relative cursor-pointer"
                      title="View pending proposals"
                    >
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors">
                        <Bell size={14} />
                        <span className="text-xs font-medium">
                          {prompt.pendingProposalCount}
                        </span>
                      </div>
                      <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 right-0 whitespace-nowrap">
                        View {prompt.pendingProposalCount} pending proposal
                        {prompt.pendingProposalCount !== 1 ? 's' : ''}
                      </span>
                    </Link>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getExperimentalStateStyles(prompt.experimentalState || 'EXPERIMENTAL')}`}
                  >
                    {(prompt.experimentalState || 'EXPERIMENTAL') ===
                      'RELEASED' && <CheckCircle size={12} />}
                    {(prompt.experimentalState || 'EXPERIMENTAL') ===
                      'EXPERIMENTAL' && <AlertCircle size={12} />}
                    {(prompt.experimentalState || 'EXPERIMENTAL') ===
                      'DEPRECATED' && <Clock size={12} />}
                    {(prompt.experimentalState || 'EXPERIMENTAL') ===
                      'REJECTED' && <XCircle size={12} />}
                    <span className="ml-0.5">
                      {prompt.experimentalState || 'EXPERIMENTAL'}
                    </span>
                  </span>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === prompt.id ? null : prompt.id
                        )
                      }
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeDropdown === prompt.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        <Link
                          to={`/prompts/${prompt.id}`}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          <Eye size={16} /> View Details
                        </Link>
                        <button
                          onClick={() => clonePrompt(prompt.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          <Copy size={16} /> Clone Prompt
                        </button>
                        <button
                          onClick={() =>
                            togglePromptStatus(prompt.id, prompt.active)
                          }
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          {prompt.active ? (
                            <>
                              <EyeOff size={16} /> Mark Inactive
                            </>
                          ) : (
                            <>
                              <Eye size={16} /> Mark Active
                            </>
                          )}
                        </button>
                        {prompt.usage === 0 && (
                          <button
                            onClick={() => deletePrompt(prompt.id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Created: {new Date(prompt.created).toLocaleDateString()}
                </span>
                <span>By: {prompt.createdBy}</span>
                {prompt.lastModified && (
                  <span>
                    Updated:{' '}
                    {new Date(prompt.lastModified).toLocaleDateString()}
                  </span>
                )}
                <span className={prompt.usage > 0 ? 'font-medium' : ''}>
                  Usage Count: {prompt.usage}
                  {prompt.usage > 0 && (
                    <span className="ml-2 text-xs text-gray-600 dark:text-gray-500">
                      (cannot be deleted)
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <FileText size={14} />
                  Observations: {prompt.observationalNoteCount}
                </span>
              </div>

              {prompt.tags && prompt.tags.length > 0 && (
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 mr-2">
                    Tags:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.map((tag) => (
                      <span
                        key={tag.name}
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 text-sm">
                <div className="text-gray-500 dark:text-gray-400 float-left">
                  Build Specification:
                  {prompt.buildSize && (
                    <span className="ml-2 text-gray-400 dark:text-gray-500">
                      (Build Size: {prompt.buildSize})
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 clear-both">
                  {prompt.buildSpecification.length > 200
                    ? prompt.buildSpecification.slice(0, 200) + '...'
                    : prompt.buildSpecification}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {prompts.length === 0 && !loading
              ? 'No prompts found. Click "New Prompt" to create one.'
              : 'No prompts match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default PromptList
