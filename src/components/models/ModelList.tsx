import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { Model } from '../../types/models'
import { hasModelExperimentProposalAccess } from '../../utils/permissions'
import ProposeExperimentalModal from '../ui/ProposeExperimentalModal'
import { getExperimentalStateStyles } from '../ui/StatusStyles'

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

// Define FilterState interface
interface FilterState {
  experimentalStates: string[]
  active: boolean | undefined
  hasObservations: boolean | undefined
  hasPendingProposals: boolean | undefined
}

// Define default filter values
const DEFAULT_FILTER_VALUES: FilterState = {
  experimentalStates: ['EXPERIMENTAL', 'RELEASED'],
  active: true, // Default is to hide inactive (only show active)
  hasObservations: undefined,
  hasPendingProposals: undefined,
}

const ModelList = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const [models, setModels] = useState<Model[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableExperimentalStates, setAvailableExperimentalStates] =
    useState<Array<{ id: string; name: string }>>([])

  // Check if user has access to propose experimental states
  const userScopes = user?.scopes || []
  const canProposeExperiment = hasModelExperimentProposalAccess(userScopes)

  // Form state for filters
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
    })
  }, [searchParams])

  // Fetch data when URL params change
  useEffect(() => {
    fetchModels()
    searchInputRef.current?.focus()
  }, [searchParams])

  useEffect(() => {
    // Add keyboard shortcut (optional)
    const handleKeyPress = (e: KeyboardEvent) => {
      // Focus search on '/' key press, common in many web apps
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Fetch experimental states once
  useEffect(() => {
    const fetchExperimentalStates = async () => {
      try {
        const { data } = await adminAPI.get(
          '/model/metadata/experimental-state'
        )
        setAvailableExperimentalStates(data.data)
      } catch (err) {
        console.error('Failed to fetch experimental states:', err)
        setAvailableExperimentalStates([])
      }
    }

    fetchExperimentalStates()
  }, [])

  const fetchModels = async () => {
    try {
      setLoading(true)

      // Build query parameters for server-side filtering
      const params = new URLSearchParams()

      // Add filter for active status - only add if active=true (hide inactive)
      if (appliedFilters.active === true) {
        params.append('active', 'true')
      }
      // If active is false, don't add the parameter to show all models

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
        appliedFilters.experimentalStates.forEach((state) => {
          params.append('experimental_states', state)
        })
      }

      const { data } = await adminAPI.get(`/model?${params.toString()}`)
      setModels(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models')
    } finally {
      setLoading(false)
    }
  }

  const toggleModelStatus = async (id: string, currentStatus: boolean) => {
    try {
      await adminAPI.patch(`/model/${id}`, {
        active: !currentStatus,
      })

      fetchModels()
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model')
    }
  }

  const handleProposeRelease = (model: Model) => {
    setSelectedModel(model)
    setShowProposeModal(true)
    setActiveDropdown(null)
  }

  const submitProposalAction = async (
    state: string,
    justificationText: string
  ) => {
    if (!selectedModel) return

    try {
      setIsSubmitting(true)
      setError(null)

      await adminAPI.post(
        `/model/${selectedModel.id}/experimental-state/proposal`,
        {
          current_state: selectedModel.experimentalState || 'EXPERIMENTAL',
          proposed_state: state,
          note: justificationText || 'Proposed state change',
        }
      )

      // Refresh the model data to update the pending proposal count
      const { data } = await adminAPI.get(`/model/${selectedModel.id}`)

      // Update the model in the list with the new data
      setModels((prev) =>
        prev.map((m) =>
          m.id === selectedModel.id
            ? { ...m, pendingProposalCount: data.pendingProposalCount }
            : m
        )
      )

      // Close the modal and reset state
      setShowProposeModal(false)
      setSelectedModel(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to propose experimental state'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteModel = async (id: string) => {
    try {
      await adminAPI.delete(`/model/${id}`)
      setModels((prev) => prev.filter((model) => model.id !== id))
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model')
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

    // Add active status only if we're showing all models (including inactive)
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

    // Update URL params
    setSearchParams(newParams)

    // Close filter panel
    setShowFilters(false)
  }

  // Check if there are any active filters that differ from defaults
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
    // If param is in URL but not "true", it means we're showing all models
    const hasNonDefaultActive = searchParams.has('active')
      ? searchParams.get('active') !== 'true'
      : false // If param missing, we're using default

    // Check if hasObservations is set (different from default undefined)
    const hasObservationsFilter = searchParams.has('hasObservations')

    // Check if hasPendingProposals is set (different from default undefined)
    const hasPendingProposalsFilter = searchParams.has('hasPendingProposals')

    // Filter is active if ANY non-default filter is applied
    return (
      hasNonDefaultExpStates ||
      hasNonDefaultActive ||
      hasObservationsFilter ||
      hasPendingProposalsFilter
    )
  }

  // Filter models client-side only for search term since that's not handled by the server
  const filteredModels = models.filter((model) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      model.slug?.toLowerCase().includes(searchLower) ||
      model.createdBy?.toLowerCase().includes(searchLower) ||
      model.providers.some(
        (provider) =>
          provider.name.toLowerCase().includes(searchLower) ||
          provider.providerClass.toLowerCase().includes(searchLower)
      )
    )
  })

  if (error)
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Models
        </h1>
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
            to="/models/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={16} />
            New Model
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
              Filter Models
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
                  ? 'Show All Models'
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
                    <BookOpen size={14} />
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
            placeholder="Search models by name, provider, or creator... (Press '/' to focus)"
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
                Loading models...
              </span>
            </div>
          </div>
        )}
        {filteredModels.length > 0 ? (
          filteredModels.map((model) => (
            <div
              key={model.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${!model.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between pb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold dark:text-white">
                      {model.name || model.slug}
                    </h2>
                    <Link
                      to={`/models/${model.id}`}
                      className="group relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <Eye size={16} />
                      <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        View model details
                      </span>
                    </Link>
                  </div>
                  {model.name && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {model.slug}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(model.pendingProposalCount ?? 0) > 0 && (
                    <Link
                      to={`/models/${model.id}`}
                      className="group relative cursor-pointer"
                      title="View pending proposals"
                    >
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors">
                        <Bell size={14} />
                        <span className="text-xs font-medium">
                          {model.pendingProposalCount}
                        </span>
                      </div>
                      <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 right-0 whitespace-nowrap">
                        View {model.pendingProposalCount} pending proposal
                        {model.pendingProposalCount !== 1 ? 's' : ''}
                      </span>
                    </Link>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getExperimentalStateStyles(model.experimentalState || 'EXPERIMENTAL')}`}
                  >
                    {(model.experimentalState || 'EXPERIMENTAL') ===
                      'RELEASED' && <CheckCircle size={12} />}
                    {(model.experimentalState || 'EXPERIMENTAL') ===
                      'EXPERIMENTAL' && <AlertCircle size={12} />}
                    {(model.experimentalState || 'EXPERIMENTAL') ===
                      'DEPRECATED' && <Clock size={12} />}
                    {(model.experimentalState || 'EXPERIMENTAL') ===
                      'REJECTED' && <XCircle size={12} />}
                    <span className="ml-0.5">
                      {model.experimentalState || 'EXPERIMENTAL'}
                    </span>
                  </span>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === model.id ? null : model.id
                        )
                      }
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeDropdown === model.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        <Link
                          to={`/models/${model.id}`}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          <Eye size={16} /> View Details
                        </Link>
                        <Link
                          to={`/models/${model.id}/edit`}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          <Edit size={16} /> Edit Model
                        </Link>
                        {canProposeExperiment && (
                          <button
                            onClick={() => handleProposeRelease(model)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                          >
                            <FileText size={16} /> Propose Release
                          </button>
                        )}
                        <button
                          onClick={() =>
                            toggleModelStatus(model.id, model.active)
                          }
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          {model.active ? (
                            <>
                              <EyeOff size={16} /> Mark Inactive
                            </>
                          ) : (
                            <>
                              <Eye size={16} /> Mark Active
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => deleteModel(model.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center gap-2"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Created: {new Date(model.created).toLocaleDateString()}
                </span>
                <span>By: {model.createdBy}</span>
                {model.lastModified && (
                  <span>
                    Updated: {new Date(model.lastModified).toLocaleDateString()}
                  </span>
                )}
                <span>Providers: {model.providers.length}</span>
                <span className="flex items-center gap-1">
                  <Settings size={14} />
                  Default:{' '}
                  {model.providers.find((p) => p.isDefault)?.name || 'None'}
                </span>
                <span>Usage: {model.usage || 0}</span>
                <span className="flex items-center gap-1">
                  <BookOpen size={14} />
                  Observations: {model.observationalNoteCount || 0}
                </span>
              </div>

              <div className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {model.providers.map((provider, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs
                        ${
                          provider.isDefault
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      {provider.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {models.length === 0 && !loading
              ? 'No models found. Click "New Model" to create one.'
              : 'No models match your search criteria.'}
          </div>
        )}
      </div>

      {/* Propose Experimental Modal */}
      {selectedModel && (
        <ProposeExperimentalModal
          isOpen={showProposeModal}
          onClose={() => {
            setShowProposeModal(false)
            setSelectedModel(null)
          }}
          onSubmit={submitProposalAction}
          isSubmitting={isSubmitting}
          availableExperimentalStates={availableExperimentalStates}
        />
      )}
    </div>
  )
}

export default ModelList
