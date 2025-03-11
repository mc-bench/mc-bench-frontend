import React, { useEffect, useState } from 'react'

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'

import {
  SchedulerControl,
  getSchedulerControls,
  updateSchedulerControl,
} from '../../api/scheduler'

const SchedulerControls: React.FC = () => {
  const [controls, setControls] = useState<SchedulerControl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)
  const [editDescription, setEditDescription] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [showConfirmation, setShowConfirmation] = useState<{
    isOpen: boolean
    key: string
    newValue: any
    description: string | null
    isModeToggle: boolean
  }>({
    isOpen: false,
    key: '',
    newValue: null,
    description: null,
    isModeToggle: false,
  })

  // Load controls on component mount
  useEffect(() => {
    let isComponentMounted = true

    const fetchData = async () => {
      if (!isComponentMounted) return
      await loadControls(true)
    }

    fetchData()

    // Set up auto-refresh every 30 seconds
    const intervalId = window.setInterval(() => {
      if (isComponentMounted) {
        loadControls(false) // silent refresh
      }
    }, 30000)

    // Clean up interval on unmount
    return () => {
      isComponentMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const loadControls = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
      setError(null)
    }

    try {
      const data = await getSchedulerControls()

      // Sort controls - put SCHEDULER_MODE first, then alphabetically
      const sortedControls = data.controls.sort((a, b) => {
        if (a.key === 'SCHEDULER_MODE') return -1
        if (b.key === 'SCHEDULER_MODE') return 1
        return a.key.localeCompare(b.key)
      })

      setControls(sortedControls)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Failed to load scheduler controls:', error)
      if (showLoading) {
        setError('Failed to load scheduler controls. Please try again.')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const startEditing = (control: SchedulerControl) => {
    setEditingKey(control.key)
    setEditValue(control.value)
    setEditDescription(control.description)
  }

  const cancelEditing = () => {
    setEditingKey(null)
    setEditValue(null)
    setEditDescription(null)
  }

  const saveChanges = async (key: string) => {
    try {
      // Validate JSON if the editValue is a string but the original value was an object
      const originalControl = controls.find((c) => c.key === key)
      let parsedValue = editValue

      if (
        typeof editValue === 'string' &&
        typeof originalControl?.value === 'object'
      ) {
        try {
          parsedValue = JSON.parse(editValue)
        } catch (e) {
          setError(`Invalid JSON format for ${key}`)
          return
        }
      }

      // For SCHEDULER_MODE, show confirmation regardless of value
      // For other critical settings, also show confirmation
      if (
        key === 'SCHEDULER_MODE' ||
        key.includes('MAX_TASKS') ||
        key.includes('RATE_LIMIT')
      ) {
        setShowConfirmation({
          isOpen: true,
          key: key,
          newValue: parsedValue,
          description: editDescription,
          isModeToggle: key === 'SCHEDULER_MODE',
        })

        // Exit edit mode but wait for confirmation
        setEditingKey(null)
        return
      }

      // For non-critical settings, proceed directly
      await updateSchedulerControl(key, {
        value: parsedValue,
        description: editDescription,
      })

      // Update the local state with optimistic UI update
      setControls(
        controls.map((control) =>
          control.key === key
            ? {
                ...control,
                value: parsedValue,
                description: editDescription,
                last_modified: new Date().toISOString(),
              }
            : control
        )
      )

      setEditingKey(null)
      setEditValue(null)
      setEditDescription(null)

      // Show success message and clear it after 3 seconds
      setSuccessMessage(`Successfully updated ${key}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to update control:', error)
      setError(`Failed to update ${key}. Please try again.`)
    }
  }

  // Handle SCHEDULER_MODE toggle specifically - this just opens the confirmation modal
  const handleSchedulerModeToggle = (isOn: boolean) => {
    setShowConfirmation({
      isOpen: true,
      key: 'SCHEDULER_MODE',
      newValue: isOn ? 'on' : 'off',
      description: 'Global scheduler on/off switch',
      isModeToggle: true,
    })
  }

  // This function is called when the confirmation is accepted
  const confirmSchedulerChange = async (
    key: string,
    newValue: any,
    description: string | null
  ) => {
    try {
      await updateSchedulerControl(key, {
        value: newValue,
        description: description,
      })

      // Update local state
      setControls(
        controls.map((control) =>
          control.key === key
            ? {
                ...control,
                value: newValue,
                description: description,
                last_modified: new Date().toISOString(),
              }
            : control
        )
      )

      // Close confirmation modal
      setShowConfirmation({
        isOpen: false,
        key: '',
        newValue: null,
        description: null,
        isModeToggle: false,
      })

      const isModeToggle = key === 'SCHEDULER_MODE'
      if (isModeToggle) {
        setSuccessMessage(
          `Scheduler ${newValue === 'on' ? 'enabled' : 'disabled'} successfully`
        )
      } else {
        setSuccessMessage(`Successfully updated ${key}`)
      }
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to update scheduler control:', error)
      setError(`Failed to update ${key}. Please try again.`)

      // Close confirmation modal on error too
      setShowConfirmation({
        isOpen: false,
        key: '',
        newValue: null,
        description: null,
        isModeToggle: false,
      })
    }
  }

  // Helper to render the appropriate input based on value type
  const renderValueInput = (control: SchedulerControl) => {
    if (editingKey !== control.key) {
      // For viewing (not editing)
      if (control.key === 'SCHEDULER_MODE') {
        return (
          <div
            className={`inline-flex px-2 py-1 rounded-md text-sm font-medium ${
              control.value === 'on'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {control.value}
          </div>
        )
      }

      if (typeof control.value === 'boolean') {
        return (
          <span
            className={
              control.value
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }
          >
            {control.value ? 'true' : 'false'}
          </span>
        )
      }

      if (typeof control.value === 'object') {
        return (
          <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded-md overflow-x-auto">
            {JSON.stringify(control.value, null, 2)}
          </pre>
        )
      }

      return String(control.value)
    }

    // For editing
    if (control.key === 'SCHEDULER_MODE') {
      return (
        <div className="flex items-center space-x-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={editValue === 'on'}
              onChange={(e) => setEditValue(e.target.checked ? 'on' : 'off')}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
            {editValue === 'on' ? 'On' : 'Off'}
          </span>
        </div>
      )
    }

    if (typeof control.value === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={editValue}
              onChange={(e) => setEditValue(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
            {editValue ? 'True' : 'False'}
          </span>
        </div>
      )
    }

    if (typeof control.value === 'number') {
      return (
        <input
          type="number"
          className="block w-full p-2 text-gray-900 border border-gray-300 rounded-md bg-gray-50 sm:text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          value={editValue}
          onChange={(e) => setEditValue(Number(e.target.value))}
        />
      )
    }

    if (typeof control.value === 'string') {
      return (
        <input
          type="text"
          className="block w-full p-2 text-gray-900 border border-gray-300 rounded-md bg-gray-50 sm:text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
      )
    }

    if (typeof control.value === 'object') {
      return (
        <textarea
          className="block w-full p-2 text-gray-900 border border-gray-300 rounded-md bg-gray-50 sm:text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          value={JSON.stringify(editValue, null, 2)}
          rows={4}
          onChange={(e) => {
            try {
              setEditValue(JSON.parse(e.target.value))
              setError(null)
            } catch (err) {
              // Allow invalid JSON while typing, but set error state
              setEditValue(e.target.value)
              setError('Invalid JSON format. Fix before saving.')
            }
          }}
        />
      )
    }

    return (
      <input
        type="text"
        className="block w-full p-2 text-gray-900 border border-gray-300 rounded-md bg-gray-50 sm:text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        value={String(editValue)}
        onChange={(e) => setEditValue(e.target.value)}
      />
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Get scheduler mode control if it exists
  const schedulerModeControl = controls.find((c) => c.key === 'SCHEDULER_MODE')

  // Get scheduler mode control if it exists for the warning banner
  const schedulerStatus = controls.find(
    (c) => c.key === 'SCHEDULER_MODE'
  )?.value
  const isSchedulerOff = schedulerStatus === 'off'

  return (
    <div className="space-y-6">
      {/* Persistent warning banner when scheduler is off */}
      {isSchedulerOff && (
        <div
          className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 border-l-4 border-red-600 flex items-center"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
          <div>
            <span className="font-bold block mb-1">SCHEDULER IS DISABLED</span>
            <span>
              The task scheduler is currently turned off. No new tasks will be
              processed until it is re-enabled.
            </span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {showConfirmation.isModeToggle
                    ? `${showConfirmation.newValue === 'on' ? 'Enable' : 'Disable'} Scheduler`
                    : `Update ${showConfirmation.key}`}
                </h3>
              </div>
              <button
                onClick={() =>
                  setShowConfirmation({
                    isOpen: false,
                    key: '',
                    newValue: null,
                    description: null,
                    isModeToggle: false,
                  })
                }
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              {showConfirmation.isModeToggle ? (
                showConfirmation.newValue === 'on' ? (
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Are you sure you want to{' '}
                    <span className="font-bold text-green-600 dark:text-green-400">
                      enable
                    </span>{' '}
                    the task scheduler? This will allow all queued tasks to be
                    processed.
                  </p>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    <span className="font-bold text-red-600 dark:text-red-400 block mb-2">
                      WARNING: This is a system-wide action!
                    </span>
                    Are you sure you want to{' '}
                    <span className="font-bold text-red-600 dark:text-red-400">
                      disable
                    </span>{' '}
                    the task scheduler? This will prevent all new tasks from
                    being processed until re-enabled.
                  </p>
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Are you sure you want to update{' '}
                  <span className="font-semibold">{showConfirmation.key}</span>{' '}
                  to
                  <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 mx-1 rounded">
                    {JSON.stringify(showConfirmation.newValue)}
                  </span>
                  ? This may affect task scheduling behavior.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setShowConfirmation({
                    isOpen: false,
                    key: '',
                    newValue: null,
                    description: null,
                    isModeToggle: false,
                  })
                }
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  confirmSchedulerChange(
                    showConfirmation.key,
                    showConfirmation.newValue,
                    showConfirmation.description
                  )
                }
                className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                  showConfirmation.isModeToggle &&
                  showConfirmation.newValue === 'off'
                    ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                    : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {successMessage && (
        <div
          className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 flex items-center"
          role="alert"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 flex items-center"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Last refreshed indicator */}
      <div className="flex justify-between items-center">
        {lastRefreshed && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={() => loadControls()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Scheduler Toggle - with loading skeleton */}
      {loading && !schedulerModeControl ? (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md animate-pulse">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="mb-4 md:mb-0">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ) : (
        schedulerModeControl && (
          <div
            className={`p-4 rounded-lg border ${
              schedulerModeControl.value === 'on'
                ? 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-600 shadow-md'
                : 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-600 shadow-md'
            }`}
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center mb-2">
                  {schedulerModeControl.value === 'on' ? (
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                  )}
                  <h2
                    className={`text-lg font-bold ${
                      schedulerModeControl.value === 'on'
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    Task Scheduler{' '}
                    {schedulerModeControl.value === 'on'
                      ? 'ENABLED'
                      : 'DISABLED'}
                  </h2>
                </div>
                <p
                  className={`text-sm ${
                    schedulerModeControl.value === 'on'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {schedulerModeControl.value === 'on'
                    ? 'The task scheduler is currently processing tasks from all queues'
                    : 'The task scheduler is currently not processing any tasks - All queues are paused'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`text-sm font-bold ${
                    schedulerModeControl.value === 'on'
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {schedulerModeControl.value === 'on' ? 'ON' : 'OFF'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={schedulerModeControl.value === 'on'}
                    onChange={(e) =>
                      handleSchedulerModeToggle(e.target.checked)
                    }
                  />
                  <div
                    className={`w-14 h-7 peer-focus:outline-none peer-focus:ring-4 rounded-full peer after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${
                      schedulerModeControl.value === 'on'
                        ? 'bg-green-400 peer-focus:ring-green-300 dark:bg-green-600 peer-checked:after:translate-x-full dark:peer-focus:ring-green-800 after:border-white'
                        : 'bg-red-400 peer-focus:ring-red-300 dark:bg-red-600 dark:peer-focus:ring-red-800 after:border-white'
                    }`}
                  ></div>
                </label>
              </div>
            </div>
          </div>
        )
      )}

      {/* Table of all scheduler controls */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Key
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Value
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Last Modified
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {loading && !controls.length
                ? // Skeleton loading state
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={`skeleton-${i}`} className="animate-pulse">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"></div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto"></div>
                        </td>
                      </tr>
                    ))
                : controls.map((control) => (
                    <tr
                      key={control.key}
                      className={
                        control.key === 'SCHEDULER_MODE'
                          ? 'bg-gray-50 dark:bg-gray-700/50'
                          : ''
                      }
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {control.key}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300">
                        {renderValueInput(control)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300">
                        {editingKey === control.key ? (
                          <input
                            type="text"
                            className="block w-full p-2 text-gray-900 border border-gray-300 rounded-md bg-gray-50 sm:text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            value={editDescription || ''}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="No description"
                          />
                        ) : (
                          control.description || (
                            <span className="text-gray-400 dark:text-gray-500 italic">
                              No description
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(control.last_modified || control.created)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {control.key !== 'SCHEDULER_MODE' &&
                          (editingKey === control.key ? (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => saveChanges(control.key)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                disabled={error?.includes('Invalid JSON')}
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(control)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Edit
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {controls.length === 0 && !loading && (
          <div className="py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No scheduler controls found.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SchedulerControls
