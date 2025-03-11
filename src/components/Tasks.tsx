import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  ListOrdered,
  Loader2,
  RefreshCw,
  Search,
  Server,
  X,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import {
  ConfirmationAction,
  InfraStatus,
  SortDirection,
  SortField,
} from '../types/infra'
import { hasInfraAccess } from '../utils/permissions'

const Tasks = () => {
  const [infraStatus, setInfraStatus] = useState<InfraStatus | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
  const [expandedWorkers, setExpandedWorkers] = useState<Set<string>>(new Set())
  const [actionInProgress, setActionInProgress] = useState<boolean>(false)
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction | null>(null)
  const [sortField, setSortField] = useState<SortField>('hostname')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [concurrencyChanges, setConcurrencyChanges] = useState<
    Record<string, number>
  >({})
  const [activeTab, setActiveTab] = useState<'workers' | 'queues'>('workers')
  const { user } = useAuth()
  const navigate = useNavigate()
  const canManage = user && hasInfraAccess(user.scopes || [])

  const fetchInfraStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminAPI.get('/infra/status')
      setInfraStatus(response.data)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Failed to fetch infrastructure status'
      )
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    let isComponentMounted = true

    const fetchData = async () => {
      if (!isComponentMounted) return
      await fetchInfraStatus()
    }

    fetchData()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (isComponentMounted) {
        fetchData()
      }
    }, 30000)

    return () => {
      isComponentMounted = false
      clearInterval(interval)
    }
  }, [])

  // Handle tab changes - fetch data when switching tabs if needed
  useEffect(() => {
    if (!infraStatus) {
      fetchInfraStatus()
    }
  }, [activeTab])

  const openConfirmation = (action: ConfirmationAction) => {
    setConfirmationAction(action)
  }

  const closeConfirmation = () => {
    setConfirmationAction(null)
  }

  const handleWorkerAction = async (workerId: string, action: string) => {
    if (!canManage) return

    setActionInProgress(true)
    try {
      await adminAPI.post(`/infra/workers/${workerId}/action`, {
        action,
      })
      // Refresh status after action
      fetchInfraStatus()
    } catch (err: any) {
      setError(
        err.response?.data?.detail || `Failed to perform ${action} on worker`
      )
    } finally {
      setActionInProgress(false)
      closeConfirmation()
    }
  }

  const handleCancelConsumer = async (workerId: string, queue: string) => {
    if (!canManage) return

    setActionInProgress(true)
    try {
      await adminAPI.post(`/infra/workers/${workerId}/cancel-consumer`, {
        queue,
      })
      // Refresh status after action
      fetchInfraStatus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel consumer')
    } finally {
      setActionInProgress(false)
      closeConfirmation()
    }
  }

  const handleConcurrencyChange = async (workerId: string, change: number) => {
    if (!canManage) return

    const worker = infraStatus?.workers.find((w) => w.id === workerId)
    if (!worker) return

    const newConcurrency = worker.concurrency + change
    if (newConcurrency <= 0) return

    setActionInProgress(true)
    try {
      const action = change > 0 ? 'pool_grow' : 'pool_shrink'
      await adminAPI.post(`/infra/workers/${workerId}/action`, {
        action,
        option: Math.abs(change),
      })
      // Refresh status after action
      fetchInfraStatus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change concurrency')
    } finally {
      setActionInProgress(false)
      closeConfirmation()
    }
  }

  const handleConcurrencyInputChange = (workerId: string, value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue)) {
      setConcurrencyChanges((prev) => ({
        ...prev,
        [workerId]: numValue,
      }))
    } else if (value === '') {
      setConcurrencyChanges((prev) => ({
        ...prev,
        [workerId]: 0,
      }))
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field and default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 inline ml-1" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 inline ml-1" />
    )
  }

  // Filter and sort workers based on search query and sorting preferences
  const filteredAndSortedWorkers = useMemo(() => {
    if (!infraStatus?.workers) return []

    // First filter based on search query
    let result = infraStatus.workers

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = infraStatus.workers.filter((worker) => {
        // Check hostname and displayName
        if (worker.hostname.toLowerCase().includes(query)) return true
        if (
          worker.displayName &&
          worker.displayName.toLowerCase().includes(query)
        )
          return true

        // Check node and container name
        if (worker.nodeName && worker.nodeName.toLowerCase().includes(query))
          return true
        if (
          worker.containerName &&
          worker.containerName.toLowerCase().includes(query)
        )
          return true

        // Check queues
        if (worker.queues.some((q) => q.toLowerCase().includes(query)))
          return true

        // Check tasks
        if (
          worker.tasks.some(
            (task) =>
              task.id.toLowerCase().includes(query) ||
              task.name.toLowerCase().includes(query) ||
              task.status.toLowerCase().includes(query)
          )
        )
          return true

        return false
      })
    }

    // Then sort
    return [...result].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'hostname':
          comparison = a.hostname.localeCompare(b.hostname)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'queues':
          comparison = a.queues.length - b.queues.length
          break
        case 'concurrency':
          comparison = a.concurrency - b.concurrency
          break
        case 'tasks':
          comparison = a.tasks.length - b.tasks.length
          break
        case 'node':
          comparison = (a.nodeName || '').localeCompare(b.nodeName || '')
          break
        case 'container':
          comparison = (a.containerName || '').localeCompare(
            b.containerName || ''
          )
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [infraStatus, searchQuery, sortField, sortDirection])

  // We no longer block the entire page with a loading state
  // Instead, each tab will handle its loading state independently

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Server className="h-6 w-6 mr-2 text-blue-500 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Task Management
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/admin/scheduler"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <Clock className="h-4 w-4" />
            <span>Scheduler Settings</span>
          </a>
          <button
            onClick={fetchInfraStatus}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
            disabled={loading || actionInProgress}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {infraStatus?.warnings && infraStatus.warnings.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium">Infrastructure Warnings</h3>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {infraStatus.warnings.map((warning, index) => (
              <li key={index} className="text-sm">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {confirmationAction.type === 'shutdown'
                    ? 'Shutdown Worker'
                    : confirmationAction.type === 'cancelConsumer'
                      ? 'Cancel Queue Consumer'
                      : 'Change Workers'}
                </h3>
              </div>
              <button
                onClick={closeConfirmation}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {confirmationAction.type === 'shutdown'
                  ? 'Are you sure you want to shutdown this worker? This will stop all processing on this worker.'
                  : confirmationAction.type === 'cancelConsumer'
                    ? 'Are you sure you want to cancel this queue consumer? The worker will stop processing tasks from this queue.'
                    : `Are you sure you want to ${confirmationAction.concurrencyChange && confirmationAction.concurrencyChange > 0 ? 'increase' : 'decrease'} the worker pool size? The new pool size will be ${confirmationAction.newConcurrency}.`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(() => {
                  const worker = infraStatus?.workers.find(
                    (w) => w.id === confirmationAction.workerId
                  )
                  const displayName = worker?.displayName || worker?.hostname

                  return confirmationAction.type === 'cancelConsumer'
                    ? `Worker: ${displayName}, Queue: ${confirmationAction.queue}`
                    : `Worker: ${displayName}`
                })()}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirmation}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (
                    confirmationAction.type === 'cancelConsumer' &&
                    confirmationAction.queue
                  ) {
                    handleCancelConsumer(
                      confirmationAction.workerId,
                      confirmationAction.queue
                    )
                  } else if (confirmationAction.type === 'shutdown') {
                    handleWorkerAction(
                      confirmationAction.workerId,
                      confirmationAction.type
                    )
                  } else if (
                    confirmationAction.type === 'changeConcurrency' &&
                    confirmationAction.concurrencyChange !== undefined
                  ) {
                    handleConcurrencyChange(
                      confirmationAction.workerId,
                      confirmationAction.concurrencyChange
                    )
                  }
                }}
                className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                  confirmationAction.type === 'changeConcurrency'
                    ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                    : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                }`}
                disabled={actionInProgress}
              >
                {actionInProgress ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {infraStatus && (
        <div>
          {/* Status Overview */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-blue-500 dark:text-blue-300">
                    Workers
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-100">
                    {infraStatus.workers.length}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                  <p className="text-sm text-purple-500 dark:text-purple-300">
                    Active Tasks
                  </p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-100">
                    {infraStatus.totalActiveTasks}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                  <p className="text-sm text-amber-500 dark:text-amber-300">
                    Queued Tasks
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-100">
                    {infraStatus.totalQueuedTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  className={`py-4 px-6 inline-flex items-center ${
                    activeTab === 'workers'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('workers')}
                >
                  <Server className="mr-2 h-5 w-5" />
                  Worker Tasks
                </button>
                <button
                  className={`py-4 px-6 inline-flex items-center ${
                    activeTab === 'queues'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('queues')}
                >
                  <ListOrdered className="mr-2 h-5 w-5" />
                  Task Queues
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Workers Tab Content */}
              {activeTab === 'workers' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                      Workers
                    </h2>

                    {/* Search Input */}
                    <div className="relative max-w-xs w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Search workers, tasks, queues..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {loading && !infraStatus ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Loading worker data...
                        </p>
                      </div>
                    </div>
                  ) : infraStatus?.workers?.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No active workers found
                    </p>
                  ) : filteredAndSortedWorkers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No workers match your search
                    </p>
                  ) : (
                    <div className="overflow-x-auto relative min-h-[100px]">
                      {actionInProgress && !confirmationAction && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                      )}
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                              onClick={() => handleSort('node')}
                            >
                              <div className="flex items-center">
                                Node {getSortIcon('node')}
                              </div>
                            </th>
                            <th
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                              onClick={() => handleSort('container')}
                            >
                              <div className="flex items-center">
                                Container {getSortIcon('container')}
                              </div>
                            </th>
                            <th
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center">
                                Status {getSortIcon('status')}
                              </div>
                            </th>
                            <th
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                              onClick={() => handleSort('queues')}
                            >
                              <div className="flex items-center">
                                Queues {getSortIcon('queues')}
                              </div>
                            </th>
                            <th
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                              onClick={() => handleSort('concurrency')}
                            >
                              <div className="flex items-center">
                                Workers {getSortIcon('concurrency')}
                              </div>
                            </th>
                            <th
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                              onClick={() => handleSort('tasks')}
                            >
                              <div className="flex items-center">
                                Tasks {getSortIcon('tasks')}
                              </div>
                            </th>
                            {canManage && (
                              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                          {filteredAndSortedWorkers.map((worker) => (
                            <>
                              <tr
                                key={worker.id}
                                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedWorker === worker.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                onClick={() =>
                                  setSelectedWorker(
                                    selectedWorker === worker.id
                                      ? null
                                      : worker.id
                                  )
                                }
                              >
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  <div className="flex items-center">
                                    <button
                                      className="mr-2"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedWorkers((prev) => {
                                          const next = new Set(prev)
                                          if (next.has(worker.id)) {
                                            next.delete(worker.id)
                                          } else {
                                            next.add(worker.id)
                                          }
                                          return next
                                        })
                                      }}
                                    >
                                      {expandedWorkers.has(worker.id) ? (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                      )}
                                    </button>
                                    {worker.nodeName || '-'}
                                  </div>
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {worker.containerName || '-'}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      worker.status === 'online'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    }`}
                                  >
                                    {worker.status}
                                  </span>
                                </td>
                                <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                                    {worker.queues.length > 0 ? (
                                      worker.queues.map((queue) => (
                                        <span
                                          key={queue}
                                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full"
                                        >
                                          {queue}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-gray-400 italic text-xs">
                                        None
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {worker.poolSize}{' '}
                                  <span className="text-xs text-gray-400">
                                    ({worker.concurrency} max)
                                  </span>
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {worker.tasks.length}
                                </td>
                                {canManage && (
                                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                      <button
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openConfirmation({
                                            type: 'shutdown',
                                            workerId: worker.id,
                                          })
                                        }}
                                        disabled={actionInProgress}
                                      >
                                        Shutdown
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                              {expandedWorkers.has(worker.id) && (
                                <tr className="bg-gray-50 dark:bg-gray-700/50">
                                  <td
                                    colSpan={canManage ? 7 : 6}
                                    className="px-3 py-4"
                                  >
                                    <div className="ml-7 space-y-4">
                                      {/* Worker info */}
                                      {worker.nodeName &&
                                        worker.containerName && (
                                          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                              Worker Info
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                              <div>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                  Container:
                                                </span>{' '}
                                                <span className="text-gray-700 dark:text-gray-300">
                                                  {worker.containerName}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                  Node:
                                                </span>{' '}
                                                <span className="text-gray-700 dark:text-gray-300">
                                                  {worker.nodeName}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Active Tasks
                                          </h4>
                                          {worker.tasks.length === 0 ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                              No active tasks
                                            </p>
                                          ) : (
                                            <div className="space-y-2">
                                              {worker.tasks.map((task) => (
                                                <div
                                                  key={task.id}
                                                  className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-600"
                                                >
                                                  <div className="text-sm">
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                      {task.name}
                                                    </div>
                                                    <div className="text-gray-500 dark:text-gray-400">
                                                      ID: {task.id}
                                                    </div>
                                                    <div className="text-gray-500 dark:text-gray-400">
                                                      Status: {task.status}
                                                    </div>
                                                    {task.runId && (
                                                      <div className="mt-2">
                                                        <button
                                                          onClick={() =>
                                                            navigate(
                                                              `/runs/${task.runId}`
                                                            )
                                                          }
                                                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 text-xs"
                                                        >
                                                          <ExternalLink className="h-3 w-3" />
                                                          <span>View Run</span>
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                              Queue Consumers
                                            </h4>
                                            {worker.queues.length === 0 ? (
                                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                                No active queue consumers
                                              </p>
                                            ) : (
                                              <div className="space-y-2">
                                                {worker.queues.map((queue) => (
                                                  <div
                                                    key={queue}
                                                    className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-600"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      {canManage && (
                                                        <button
                                                          onClick={() =>
                                                            openConfirmation({
                                                              type: 'cancelConsumer',
                                                              workerId:
                                                                worker.id,
                                                              queue: queue,
                                                            })
                                                          }
                                                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                          disabled={
                                                            actionInProgress
                                                          }
                                                        >
                                                          <XCircle className="h-4 w-4" />
                                                        </button>
                                                      )}
                                                      <span className="text-sm text-gray-900 dark:text-white">
                                                        {queue}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {canManage && (
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Adjust Workers
                                              </h4>
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                                  Current: {worker.poolSize}{' '}
                                                  <span className="text-xs text-gray-400">
                                                    ({worker.concurrency} max)
                                                  </span>
                                                </span>
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                                    onClick={() => {
                                                      const change =
                                                        concurrencyChanges[
                                                          worker.id
                                                        ] || 1
                                                      if (
                                                        worker.poolSize -
                                                          change <=
                                                        0
                                                      )
                                                        return
                                                      openConfirmation({
                                                        type: 'changeConcurrency',
                                                        workerId: worker.id,
                                                        concurrencyChange:
                                                          -change,
                                                        newConcurrency:
                                                          worker.poolSize -
                                                          change,
                                                      })
                                                    }}
                                                    disabled={actionInProgress}
                                                  >
                                                    -
                                                  </button>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    value={
                                                      concurrencyChanges[
                                                        worker.id
                                                      ] || 1
                                                    }
                                                    onChange={(e) =>
                                                      handleConcurrencyInputChange(
                                                        worker.id,
                                                        e.target.value
                                                      )
                                                    }
                                                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                  />
                                                  <button
                                                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                                    onClick={() => {
                                                      const change =
                                                        concurrencyChanges[
                                                          worker.id
                                                        ] || 1
                                                      openConfirmation({
                                                        type: 'changeConcurrency',
                                                        workerId: worker.id,
                                                        concurrencyChange:
                                                          change,
                                                        newConcurrency:
                                                          worker.poolSize +
                                                          change,
                                                      })
                                                    }}
                                                    disabled={actionInProgress}
                                                  >
                                                    +
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Queues Tab Content */}
              {activeTab === 'queues' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                    Queues
                  </h2>

                  {loading && !infraStatus ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Loading queue data...
                        </p>
                      </div>
                    </div>
                  ) : infraStatus?.queues?.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No active queues found
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {infraStatus.queues.map((queue) => (
                        <div
                          key={queue.name}
                          className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-md font-medium text-gray-800 dark:text-gray-200">
                                {queue.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {queue.count} task{queue.count !== 1 ? 's' : ''}{' '}
                                | {queue.workerCount} worker
                                {queue.workerCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          {queue.tasks.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No queued tasks
                            </p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Queued Tasks
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Task Name
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ID
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Queued At
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Priority
                                      </th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                    {queue.tasks.map((task) => (
                                      <tr
                                        key={task.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                      >
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                          {task.name}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                          {task.id}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                          {task.queuedAt
                                            ? new Date(
                                                task.queuedAt
                                              ).toLocaleString()
                                            : '-'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                          {task.priority || '-'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                          {task.runId && (
                                            <button
                                              onClick={() =>
                                                navigate(`/runs/${task.runId}`)
                                              }
                                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400"
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                              <span>View Run</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tasks
