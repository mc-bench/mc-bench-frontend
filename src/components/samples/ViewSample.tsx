import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism'

import {
  AlertCircle,
  Camera,
  CheckCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  Plus,
  Share2,
  Terminal,
  User,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { EXPERIMENTAL_STATES } from '../../types/common'
import { SampleDetailResponse, TestSet } from '../../types/sample'
import {
  getArtifactUrl,
  getDisplayArtifactKind,
  getDisplayFileName,
} from '../../utils/artifacts'
import {
  hasGenerationAccess,
  hasRunAccess,
  hasSampleReviewAccess,
  hasVotingAdminAccess,
} from '../../utils/permissions'
import {
  ModelViewContainer,
  cleanupComparison,
  preloadModel,
} from '../ModelUtils'
import Background from '../background'
import Carousel from '../ui/Carousel'
import { RunResources } from '../ui/RunResources'
import ScreenshotShare from '../ui/ScreenshotShare'

// Using SampleDetailResponse from types/sample

const CAPTURE_PATTERNS = [
  '-northside-capture.png',
  '-eastside-capture.png',
  '-southside-capture.png',
  '-west-capture.png',
]

// Using EXPERIMENTAL_STATES from common types

// Using Model component from ModelUtils instead

const ViewSample = () => {
  const { id } = useParams()
  const [sample, setSample] = useState<SampleDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [expandedResources, setExpandedResources] = useState(true)
  const [selectedGltf, setSelectedGltf] = useState<string | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [viewMode, setViewMode] = useState<string | null>(null)
  const [currentAction, setCurrentAction] = useState<
    'APPROVE' | 'REJECT' | 'OBSERVE' | null
  >(null)
  const [showJustificationModal, setShowJustificationModal] = useState(false)
  const [showTestSetModal, setShowTestSetModal] = useState(false)
  const [justificationText, setJustificationText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const shareUrlRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const [testSets, setTestSets] = useState<TestSet[]>([])
  const [selectedTestSetId, setSelectedTestSetId] = useState<string>('')
  const [loadingTestSets, setLoadingTestSets] = useState(false)
  const lastClickTime = useRef<number>(0)

  // Permission checks consolidated at component level
  const userScopes = user?.scopes || []
  const canReviewSamples = hasSampleReviewAccess(userScopes)
  const canManageVoting = hasVotingAdminAccess(userScopes)
  const canViewRuns = hasRunAccess(userScopes)
  const canViewGenerations = hasGenerationAccess(userScopes)
  const canPerformAnyActions = canReviewSamples || canManageVoting

  const fetchSample = useCallback(async () => {
    try {
      const { data } = await adminAPI.get(`/sample/${id}`)
      setSample(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sample')
      return null
    }
  }, [id])

  const fetchTestSets = useCallback(async () => {
    setLoadingTestSets(true)
    try {
      const { data } = await adminAPI.get('/test-set')
      setTestSets(data)
    } catch (err) {
      console.error('Error fetching test sets:', err)
    } finally {
      setLoadingTestSets(false)
    }
  }, [])

  useEffect(() => {
    const loadSample = async () => {
      setLoading(true)
      const sampleData = await fetchSample()

      // Fetch test sets either way in case we need them, but prioritize if there's a testSetId
      if (sampleData?.testSetId) {
        await fetchTestSets()
      } else {
        // Still fetch the test sets, but don't wait for the result
        fetchTestSets()
      }
      setLoading(false)
    }
    loadSample()
  }, [fetchSample, fetchTestSets])

  useEffect(() => {
    if (sample?.artifacts && sample.artifacts.length > 0 && !selectedGltf) {
      const firstGltf = sample.artifacts.find(
        (a) =>
          (a.key.endsWith('.gltf') || a.key.endsWith('.glb')) &&
          a.kind === 'RENDERED_MODEL_GLB'
      )
      if (firstGltf) {
        const gltfUrl = getArtifactUrl(firstGltf)
        setSelectedGltf(gltfUrl)

        // Preload the model to prevent flickering
        setIsModelLoading(true)
        setModelError(null)

        // Use sample ID as the cache key for single sample views
        preloadModel(`sample-${sample.id}`, gltfUrl)
          .then(() => {
            setIsModelLoading(false)
          })
          .catch((err) => {
            console.error('Error preloading model:', err)
            setModelError('Failed to load 3D model')
            setIsModelLoading(false)
          })
      }
    }

    // Cleanup when component unmounts or sample changes
    return () => {
      if (sample) {
        // Clean up any loaded models
        cleanupComparison(`sample-${sample.id}`)
      }
    }
  }, [sample, selectedGltf])

  const modelViewerRef = useRef<HTMLDivElement>(null)
  const dimensionsRef = useRef<{ width: number; height: number }>()

  // Handle model viewer clicks for double-click detection
  const handleViewerClick = () => {
    const now = Date.now()
    const lastClick = lastClickTime.current || 0

    // Check if it's a double click (within 300ms)
    if (now - lastClick < 300) {
      handleFullscreen()
    }

    lastClickTime.current = now
  }

  const handleFullscreen = () => {
    if (!modelViewerRef.current) return

    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        if (modelViewerRef.current && dimensionsRef.current) {
          modelViewerRef.current.style.width = `${dimensionsRef.current.width}px`
          modelViewerRef.current.style.height = `${dimensionsRef.current.height}px`
        }
      })
    } else {
      dimensionsRef.current = {
        width: modelViewerRef.current.offsetWidth,
        height: modelViewerRef.current.offsetHeight,
      }
      modelViewerRef.current.requestFullscreen()
    }
  }

  // Add this useEffect for handling click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isActionsOpen && !target.closest('[data-dropdown-actions]')) {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isActionsOpen])

  // Add effect to listen for dark mode changes
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches)
    }

    darkModeMediaQuery.addEventListener('change', handleChange)
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Handle orthogonal view changes
  const handleViewChange = (position: string) => {
    // Special case for reset
    if (position === 'reset-view-from-button') {
      // Don't add timestamp to reset view - just pass it through
      setViewMode('reset-view-from-button')
      return
    }

    // For all other positions, add timestamp to force state change
    setViewMode(`${position}-${Date.now()}`)
  }

  const handleAction = (
    type: 'APPROVE' | 'REJECT' | 'OBSERVE',
    requireJustification: boolean
  ) => {
    // Early return if sample is somehow null
    if (!sample) return

    setCurrentAction(type)
    setIsActionsOpen(false)

    if (type === 'APPROVE') {
      setJustificationText('') // Reset justification text

      // Check if sample already has a test set assigned
      if (sample.testSetId) {
        // If test set is already assigned, skip selection and use existing test set
        setSelectedTestSetId(sample.testSetId)
        // Show justification modal instead
        setShowJustificationModal(true)
      } else {
        // Otherwise, show the test set selection modal
        fetchTestSets() // Load test sets
        setShowTestSetModal(true)
      }
    } else if (requireJustification) {
      setJustificationText('') // Reset justification text
      setShowJustificationModal(true)
    } else {
      submitAction(type)
    }
  }

  const submitAction = async (
    type: 'APPROVE' | 'REJECT' | 'OBSERVE',
    justification?: string,
    testSetId?: string
  ) => {
    if (!sample) return

    setIsSubmitting(true)
    try {
      let endpoint = ''
      const payload: { note?: string; testSetId?: string } = {}

      if (type === 'APPROVE') {
        endpoint = `/sample/${sample.id}/approve`
        // Always include a note, use default if none provided
        payload.note = justification || 'Sample Approved'
        if (testSetId) {
          payload.testSetId = testSetId
        }
      } else if (type === 'REJECT') {
        endpoint = `/sample/${sample.id}/reject`
        payload.note = justification || 'Rejected from voting'
      } else if (type === 'OBSERVE') {
        endpoint = `/sample/${sample.id}/observe`
        payload.note = justification || ''
      }

      await adminAPI.post(endpoint, payload)

      // Reload the sample data after action
      await fetchSample()
    } catch (err) {
      console.error('Error performing action:', err)
      // Handle error
    } finally {
      setIsSubmitting(false)
      setCurrentAction(null)
    }
  }

  useEffect(() => {
    if (sample) {
      if (!sample.resultCodeText) {
        setShowRaw(true)
      } else {
        setShowRaw(false)
      }
    }
  }, [sample])

  const canShowVotingActions = (sample: SampleDetailResponse | null) => {
    if (!sample) return false
    return sample.experimentalState === EXPERIMENTAL_STATES.RELEASED
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

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <span className="text-gray-700 dark:text-gray-300">
            Loading sample...
          </span>
        </div>
      </div>
    )
  if (error)
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>
  if (!sample)
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4">
        Sample not found
      </div>
    )

  const getApprovalStateStyles = (state: 'APPROVED' | 'REJECTED' | null) => {
    if (state === 'APPROVED') {
      return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800'
    }
    if (state === 'REJECTED') {
      return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800'
    }
    return 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
  }

  const gltfArtifacts =
    sample.artifacts?.filter(
      (a) =>
        (a.key.endsWith('.gltf') || a.key.endsWith('.glb')) &&
        a.kind === 'RENDERED_MODEL_GLB'
    ) || []

  const videoArtifacts =
    sample.artifacts?.filter((a) => a.key.endsWith('.mp4')) || []

  const captureArtifacts =
    sample.artifacts?.filter((a) =>
      CAPTURE_PATTERNS.some((pattern) => a.key.endsWith(pattern))
    ) || []

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Sample Detail
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </button>
            <Link
              to="/samples"
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Back to Samples
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Sample Details
                </h1>
                <div className="flex items-center gap-2">
                  <div
                    className={`px-3 py-1 rounded-full text-sm border tooltip-container ${getApprovalStateStyles(sample.approvalState)}`}
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
                      sample.isPending,
                      sample.experimentalState
                    )}
                  </div>
                  {/* Add experimental state badge if not RELEASED */}
                  {sample?.experimentalState &&
                    sample.experimentalState !==
                      EXPERIMENTAL_STATES.RELEASED && (
                      <div
                        className="px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-800 tooltip-container"
                        data-tooltip="Indicates that one or more of the model, prompt, or template are in experimental state"
                      >
                        {sample.experimentalState}
                      </div>
                    )}
                </div>
              </div>

              {/* Only show Actions button if user has permissions AND sample is in RELEASED state */}
              {canPerformAnyActions && (
                <div className="relative" data-dropdown-actions>
                  <button
                    onClick={() => setIsActionsOpen(!isActionsOpen)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Actions
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {isActionsOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-10">
                      <div className="py-1" role="menu">
                        {sample?.isComplete &&
                          !sample?.isPending &&
                          canShowVotingActions(sample) && (
                            <>
                              {canManageVoting && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleAction('APPROVE', false)
                                    }
                                    disabled={isSubmitting}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                                    role="menuitem"
                                  >
                                    Approve for Voting
                                  </button>
                                  <button
                                    onClick={() => handleAction('REJECT', true)}
                                    disabled={isSubmitting}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                                    role="menuitem"
                                  >
                                    Reject from Voting
                                  </button>
                                </>
                              )}

                              {/* Only show divider if there are voting admin actions AND review actions */}
                              {canManageVoting && canReviewSamples && (
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                              )}
                            </>
                          )}

                        {/* Always show the observation option if user has review permissions */}
                        {canReviewSamples && (
                          <button
                            onClick={() => handleAction('OBSERVE', true)}
                            disabled={isSubmitting}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                            role="menuitem"
                          >
                            Make Observation
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-sm divide-x divide-gray-200 dark:divide-gray-700">
              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Created
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(sample.created).toLocaleDateString()}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {new Date(sample.created).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Created by
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-100">
                    {sample.createdBy}
                  </span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Status
                </div>
                <div className="flex flex-col gap-2">
                  <div
                    className="flex items-center gap-1 tooltip-container"
                    data-tooltip="Indicates whether the generation process is still running"
                  >
                    {sample.isPending ? (
                      <>
                        <Clock size={16} className="text-yellow-500" />
                        <span className="text-gray-900 dark:text-gray-100">
                          Generating
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} className="text-green-500" />
                        <span className="text-gray-900 dark:text-gray-100">
                          Generation Finished
                        </span>
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
                        <span className="text-gray-900 dark:text-gray-100">
                          Sample Ready
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-gray-900 dark:text-gray-100">
                          Sample Incomplete
                        </span>
                      </>
                    )}
                  </div>

                  {sample.testSetId && (
                    <div
                      className="flex items-center gap-1 tooltip-container mt-2"
                      data-tooltip="Test set this sample is assigned to"
                    >
                      <CheckCircle size={16} className="text-blue-500" />
                      <span className="text-gray-900 dark:text-gray-100">
                        {testSets.find((t) => t.id === sample.testSetId)
                          ?.name || sample.testSetId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Links
                </div>
                <div className="flex flex-col gap-2">
                  {canViewRuns && (
                    <Link
                      to={`/runs/${sample.run.id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Run
                    </Link>
                  )}

                  {canViewGenerations && (
                    <Link
                      to={`/generations/${sample.run.generationId}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Generation
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Log Section */}
      {sample.logs && sample.logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setExpandedLogs(!expandedLogs)}
            className="w-full p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium dark:text-white">
                Sample Log
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({sample.logs.length}{' '}
                {sample.logs.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                expandedLogs ? 'transform rotate-180' : ''
              }`}
            />
          </button>

          {expandedLogs && (
            <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        <div
                          className="flex items-center gap-1 tooltip-container"
                          data-tooltip="Justification notes are provided for approvals/rejections. Observations are general notes."
                        >
                          <span>Note</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            (justification/observation)
                          </span>
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sample.logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0">
                              {log.action === 'SAMPLE_APPROVAL' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {log.action === 'SAMPLE_REJECTION' && (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              {log.action === 'SAMPLE_OBSERVATION' && (
                                <Terminal className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                              {log.action === 'SAMPLE_APPROVAL' && 'Approval'}
                              {log.action === 'SAMPLE_REJECTION' && 'Rejection'}
                              {log.action === 'SAMPLE_OBSERVATION' &&
                                'Observation'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-left align-top">
                          {log.action === 'SAMPLE_APPROVAL' &&
                            'Approved for voting'}
                          {log.action === 'SAMPLE_REJECTION' &&
                            'Rejected from voting'}
                          {log.action === 'SAMPLE_OBSERVATION' &&
                            'Added observation'}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-gray-900 dark:text-gray-100 text-left whitespace-pre-line">
                            {log.note}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-left align-top">
                          {log.createdBy}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-left align-top">
                          {new Date(log.created).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Set Selection Modal */}
      {showTestSetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
              Approve Sample for Voting
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Test Set
              </label>
              {loadingTestSets ? (
                <div className="text-center py-2">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Loading test sets...
                    </span>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedTestSetId}
                  onChange={(e) => setSelectedTestSetId(e.target.value)}
                  required
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a test set</option>
                  {testSets.map((testSet) => (
                    <option key={testSet.id} value={testSet.id}>
                      {testSet.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Clickable area to show justification */}
            <button
              type="button"
              onClick={() => setShowJustificationModal(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mb-4"
            >
              <Plus size={16} />
              Add Justification (Optional)
            </button>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTestSetModal(false)
                  setSelectedTestSetId('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedTestSetId) {
                    setShowTestSetModal(false)
                    submitAction(
                      'APPROVE',
                      justificationText,
                      selectedTestSetId
                    )
                  }
                }}
                disabled={!selectedTestSetId || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Justification Modal */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
              {currentAction === 'APPROVE' && 'Add Justification for Approval'}
              {currentAction === 'REJECT' && 'Reject Sample from Voting'}
              {currentAction === 'OBSERVE' && 'Add Observation'}
            </h3>

            {/* Show test set information when approving with pre-assigned test set */}
            {currentAction === 'APPROVE' && sample.testSetId && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Pre-assigned Test Set
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md font-medium">
                    {testSets.find((t) => t.id === sample.testSetId)?.name ||
                      'Loading...'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  This sample already has a test set assigned and will be added
                  to it when approved.
                </p>
              </div>
            )}

            <textarea
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
              placeholder={
                currentAction === 'APPROVE'
                  ? 'Why is this sample approved for voting?'
                  : currentAction === 'REJECT'
                    ? 'Why is this sample rejected from voting?'
                    : 'What did you observe in this sample?'
              }
              required={currentAction !== 'APPROVE'}
              className="w-full h-32 p-2 border dark:border-gray-600 rounded-md mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowJustificationModal(false)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {currentAction === 'APPROVE' && !sample.testSetId
                  ? 'Done'
                  : 'Cancel'}
              </button>
              {/* Show submit button for reject/observe or for approve with pre-assigned test set */}
              {(currentAction !== 'APPROVE' ||
                (currentAction === 'APPROVE' && sample.testSetId)) && (
                <button
                  onClick={() => {
                    if (
                      currentAction === 'APPROVE' ||
                      justificationText.trim()
                    ) {
                      setShowJustificationModal(false)
                      if (currentAction === 'APPROVE') {
                        submitAction(
                          'APPROVE',
                          justificationText,
                          selectedTestSetId
                        )
                      } else {
                        submitAction(
                          currentAction as 'REJECT' | 'OBSERVE',
                          justificationText
                        )
                      }
                    }
                  }}
                  disabled={
                    (currentAction !== 'APPROVE' &&
                      !justificationText.trim()) ||
                    isSubmitting
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resources Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <RunResources
            model={sample.run.model}
            template={sample.run.template}
            prompt={sample.run.prompt}
            isExpanded={expandedResources}
            onToggle={() => setExpandedResources(!expandedResources)}
          />
        </div>
      </div>

      {/* GLTF Viewer - Moved here */}
      {gltfArtifacts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium dark:text-white">
                3D Model Viewer
              </h3>
              {gltfArtifacts.length > 1 && (
                <select
                  value={selectedGltf || ''}
                  onChange={(e) => {
                    const newModelUrl = e.target.value

                    // Start loading the new model
                    setIsModelLoading(true)
                    setModelError(null)

                    // Preload the model before showing it
                    preloadModel(`sample-${sample.id}`, newModelUrl)
                      .then(() => {
                        setSelectedGltf(newModelUrl)
                        setIsModelLoading(false)
                      })
                      .catch((err) => {
                        console.error('Error preloading model:', err)
                        setModelError('Failed to load 3D model')
                        setIsModelLoading(false)
                      })
                  }}
                  className="border rounded-md px-3 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  disabled={isModelLoading}
                >
                  {gltfArtifacts.map((artifact, index) => (
                    <option key={index} value={getArtifactUrl(artifact)}>
                      {getDisplayFileName(artifact)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div
              ref={modelViewerRef}
              className="h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden relative"
              onClick={handleViewerClick}
            >
              {/* Controls for screenshot */}
              <div className="absolute bottom-2 left-2 z-10 flex items-center space-x-2">
                {!isModelLoading && !modelError && selectedGltf && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowScreenshotModal(true)
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-md flex items-center justify-center"
                    title="Take Screenshot"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Show loading indicator when loading model */}
              {isModelLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10 backdrop-blur-[1px]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-8 w-8 border-4 border-white rounded-full border-t-transparent"></div>
                    <span className="text-white">Loading 3D model...</span>
                  </div>
                </div>
              )}

              {/* Show error message if model failed to load */}
              {modelError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-800 bg-opacity-20 z-10">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-xs text-center">
                    <div className="text-red-500 mb-2">Error</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {modelError}
                    </div>
                  </div>
                </div>
              )}

              {/* Only render model if we have a selected GLTF */}
              {selectedGltf && (
                <div
                  key={`model-viewer-${sample.id}`}
                  className="w-full h-full"
                >
                  <ModelViewContainer
                    modelPath={selectedGltf}
                    cacheKey={`sample-${sample.id}`}
                    initialCameraPosition={[30, 5, 30]}
                    initialViewMode={viewMode}
                    onViewChange={handleViewChange}
                    onFullscreen={handleFullscreen}
                    showFullscreenButton={true}
                    className="h-full w-full"
                  >
                    <Background />
                  </ModelViewContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sample content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Sample Content
            </h2>
            <div className="flex gap-2">
              <div
                className={`flex items-center px-3 py-1 rounded-full text-sm ${getApprovalStateStyles(
                  sample.approvalState
                )}`}
              >
                {getApprovalStateText(
                  sample.approvalState,
                  sample.isComplete,
                  sample.isPending,
                  sample.experimentalState
                )}
              </div>
              {/* Add experimental state badge if not RELEASED */}
              {sample?.experimentalState &&
                sample.experimentalState !== EXPERIMENTAL_STATES.RELEASED && (
                  <div
                    className="px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-800 tooltip-container"
                    data-tooltip="Indicates that one or more of the model, prompt, or template are in experimental state"
                  >
                    {sample.experimentalState}
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-6">
            {showRaw ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Raw Response
                </label>
                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <SyntaxHighlighter
                    language="json"
                    style={isDarkMode ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                    }}
                  >
                    {sample.raw || ''}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <>
                {/* Inspiration Text */}
                {sample.resultInspirationText && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Inspiration
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 border border-gray-200 dark:border-gray-700 text-left text-gray-900 dark:text-gray-100">
                      <p className="whitespace-pre-wrap text-left">
                        {sample.resultInspirationText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description Text */}
                {sample.resultDescriptionText && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 border border-gray-200 dark:border-gray-700 text-left text-gray-900 dark:text-gray-100">
                      <p className="whitespace-pre-wrap text-left">
                        {sample.resultDescriptionText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Code */}
                {sample.resultCodeText && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Generated Code
                      </h3>
                      <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="text-sm text-blue-500 dark:text-blue-400"
                      >
                        {showRaw ? 'Show Formatted' : 'Show Raw'}
                      </button>
                    </div>
                    {showRaw ? (
                      <div className="whitespace-pre-wrap font-mono text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                        {sample.resultCodeText}
                      </div>
                    ) : (
                      <SyntaxHighlighter
                        language="javascript"
                        style={isDarkMode ? oneDark : oneLight}
                        className="rounded-md border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        {sample.resultCodeText}
                      </SyntaxHighlighter>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Artifacts section */}
      {sample.artifacts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Artifacts
            </h2>

            {/* Artifact list */}
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sample.artifacts.map((artifact, index) => (
                      <tr key={index}>
                        <td className="p-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-gray-600 dark:text-gray-400 text-sm mb-1 text-left">
                              {getDisplayArtifactKind(artifact.kind)}
                            </span>
                            <a
                              href={getArtifactUrl(artifact)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {getDisplayFileName(artifact)}
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Capture Images Carousel */}
            {captureArtifacts.length > 0 && (
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-medium dark:text-white">
                  Captures
                </h3>
                <Carousel
                  images={captureArtifacts.map((artifact) => ({
                    url: getArtifactUrl(artifact),
                    caption:
                      artifact.key
                        .split('/')
                        .pop()
                        ?.replace(/^.*?-(\w+)-capture\.png$/, '$1') + ' View',
                  }))}
                />
              </div>
            )}

            {/* Video Players */}
            {videoArtifacts.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium dark:text-white">
                  Video Previews
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  {videoArtifacts.map((artifact, index) => (
                    <div key={index} className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getDisplayFileName(artifact)}
                      </p>
                      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          className="w-full h-full"
                          controls
                          src={getArtifactUrl(artifact)}
                          loop={true}
                          autoPlay={true}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
              Share Sample
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Share this link to let others view this sample without requiring
              an account.
            </p>

            <div className="relative mb-6">
              <input
                ref={shareUrlRef}
                type="text"
                readOnly
                value={`${window.location.origin}/share/samples/${sample.id}`}
                className="w-full p-2 pr-20 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={() => {
                  if (shareUrlRef.current) {
                    shareUrlRef.current.select()
                    document.execCommand('copy')
                    setCopySuccess(true)
                    setTimeout(() => setCopySuccess(false), 2000)
                  }
                }}
                className="absolute right-1 top-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshotModal && (
        <ScreenshotShare
          isOpen={showScreenshotModal}
          onClose={() => setShowScreenshotModal(false)}
          modelName={sample.run.model.name}
          prompt={sample.run.prompt.buildSpecification}
          modelViewerRef={modelViewerRef}
          alertMessage={
            sample.experimentalState !== EXPERIMENTAL_STATES.RELEASED
              ? 'EXPERIMENTAL'
              : undefined
          }
        />
      )}
    </div>
  )
}

export default ViewSample
