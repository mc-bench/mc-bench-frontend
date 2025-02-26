import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Terminal,
  User,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { Artifact, RunData } from '../../types/runs'
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
import Background from '../background'
import Carousel from '../ui/Carousel'
import { RunResources } from '../ui/RunResources'

interface SampleDetailResponse {
  id: string
  created: string
  createdBy: string
  resultInspirationText: string | null
  resultDescriptionText: string | null
  resultCodeText: string | null
  raw: string | null
  lastModified: string | null
  lastModifiedBy: string | null
  isPending: boolean
  isComplete: boolean
  approvalState: 'APPROVED' | 'REJECTED' | null
  run: Omit<RunData, 'samples' | 'artifacts'>
  artifacts: Artifact[]
  logs: {
    id: string
    kind: string
    note: string
    created: string
    createdBy: string
    action: string
  }[]
  experimentalState: keyof typeof EXPERIMENTAL_STATES | null
}

const CAPTURE_PATTERNS = [
  '-northside-capture.png',
  '-eastside-capture.png',
  '-southside-capture.png',
  '-west-capture.png',
]

const EXPERIMENTAL_STATES = {
  RELEASED: 'RELEASED',
  EXPERIMENTAL: 'EXPERIMENTAL',
  DEPRECATED: 'DEPRECATED',
  REJECTED: 'REJECTED',
} as const

const Model = ({ path }: { path: string }) => {
  const gltf = useGLTF(path)

  useEffect(() => {
    return () => {
      if (gltf) {
        // Cleanup code...
      }
    }
  }, [path, gltf])

  return <primitive object={gltf.scene} />
}

const ViewSample = () => {
  const { id } = useParams()
  const [sample, setSample] = useState<SampleDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [expandedResources, setExpandedResources] = useState(false)
  const [selectedGltf, setSelectedGltf] = useState<string | null>(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [currentAction, setCurrentAction] = useState<
    'APPROVE' | 'REJECT' | 'OBSERVE' | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showJustificationModal, setShowJustificationModal] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState(false)
  const { user } = useAuth()

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

  useEffect(() => {
    const loadSample = async () => {
      setLoading(true)
      await fetchSample()
      setLoading(false)
    }
    loadSample()
  }, [fetchSample])

  useEffect(() => {
    if (sample?.artifacts && sample.artifacts.length > 0 && !selectedGltf) {
      const firstGltf = sample.artifacts.find(
        (a) =>
          (a.key.endsWith('.gltf') || a.key.endsWith('.glb')) &&
          a.kind === 'RENDERED_MODEL_GLB'
      )
      if (firstGltf) {
        setSelectedGltf(getArtifactUrl(firstGltf))
      }
    }
  }, [sample, selectedGltf])

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

  const handleAction = (
    type: 'APPROVE' | 'REJECT' | 'OBSERVE',
    requireJustification: boolean
  ) => {
    setIsActionsOpen(false)

    if (requireJustification || type === 'OBSERVE') {
      setCurrentAction(type)
      setShowJustificationModal(true)
    } else {
      submitAction(type)
    }
  }

  const submitAction = async (
    type: 'APPROVE' | 'REJECT' | 'OBSERVE',
    justificationText?: string
  ) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const endpoint = type.toLowerCase()
      await adminAPI.post(`/sample/${id}/${endpoint}`, {
        note: justificationText || 'Approved for voting',
      })

      await fetchSample()
      setShowJustificationModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sample')
    } finally {
      setIsSubmitting(false)
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
    return <div className="flex justify-center p-8">Loading sample...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!sample) return <div className="text-gray-500 p-4">Sample not found</div>

  const getApprovalStateStyles = (state: 'APPROVED' | 'REJECTED' | null) => {
    // If sample is not complete or is pending, show ineligible state
    if (!sample?.isComplete || sample?.isPending) {
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

  const getParsingStatus = (sample: SampleDetailResponse | null) => {
    if (!sample) return false
    return sample.resultCodeText !== null
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with metadata */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Sample Details</h1>
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
                  sample.experimentalState !== EXPERIMENTAL_STATES.RELEASED && (
                    <div
                      className="px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-700 border border-amber-200 tooltip-container"
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Actions
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isActionsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu">
                      {sample?.isComplete &&
                        !sample?.isPending &&
                        canShowVotingActions(sample) && (
                          <>
                            {canManageVoting && (
                              <>
                                {/* Only show "Approve for Voting" without justification if not rejected */}
                                {sample.approvalState !== 'REJECTED' && (
                                  <button
                                    onClick={() =>
                                      handleAction('APPROVE', false)
                                    }
                                    disabled={isSubmitting}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
                                    role="menuitem"
                                  >
                                    Approve for Voting
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction('APPROVE', true)}
                                  disabled={isSubmitting}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
                                  role="menuitem"
                                >
                                  Approve for Voting (with Justification)
                                </button>
                                <button
                                  onClick={() => handleAction('REJECT', true)}
                                  disabled={isSubmitting}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
                                  role="menuitem"
                                >
                                  Reject from Voting
                                </button>
                              </>
                            )}

                            {/* Only show divider if there are voting admin actions AND review actions */}
                            {canManageVoting && canReviewSamples && (
                              <div className="border-t border-gray-100 my-1"></div>
                            )}
                          </>
                        )}

                      {/* Always show the observation option if user has review permissions */}
                      {canReviewSamples && (
                        <button
                          onClick={() => handleAction('OBSERVE', true)}
                          disabled={isSubmitting}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-sm divide-x divide-gray-200">
            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 text-center mb-2">
                Created
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{new Date(sample.created).toLocaleString()}</span>
              </div>
            </div>

            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 text-center mb-2">
                Created by
              </div>
              <div className="flex items-center gap-2 justify-center">
                <User className="h-4 w-4 text-gray-400" />
                <span>{sample.createdBy}</span>
              </div>
            </div>

            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 text-center mb-2">
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
            </div>

            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 text-center mb-2">
                Links
              </div>
              <div className="flex flex-col gap-2">
                {canViewRuns && (
                  <Link
                    to={`/runs/${sample.run.id}`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Run
                  </Link>
                )}

                {canViewGenerations && (
                  <Link
                    to={`/generations/${sample.run.generationId}`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
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

      {/* Sample Log Section */}
      {sample.logs && sample.logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <button
            onClick={() => setExpandedLogs(!expandedLogs)}
            className="w-full p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Sample Log</h2>
              <span className="text-sm text-gray-500">
                ({sample.logs.length}{' '}
                {sample.logs.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                expandedLogs ? 'transform rotate-180' : ''
              }`}
            />
          </button>

          {expandedLogs && (
            <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div
                          className="flex items-center gap-1 tooltip-container"
                          data-tooltip="Justification notes are provided for approvals/rejections. Observations are general notes."
                        >
                          <span>Note</span>
                          <span className="text-xs text-gray-400">
                            (justification/observation)
                          </span>
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sample.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
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
                            <span className="text-sm text-gray-900 text-left">
                              {log.action === 'SAMPLE_APPROVAL' && 'Approval'}
                              {log.action === 'SAMPLE_REJECTION' && 'Rejection'}
                              {log.action === 'SAMPLE_OBSERVATION' &&
                                'Observation'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-left align-top">
                          {log.action === 'SAMPLE_APPROVAL' &&
                            'Approved for voting'}
                          {log.action === 'SAMPLE_REJECTION' &&
                            'Rejected from voting'}
                          {log.action === 'SAMPLE_OBSERVATION' &&
                            'Added observation'}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-gray-900 text-left whitespace-pre-line">
                            {log.note}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-left align-top">
                          {log.createdBy}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-left align-top">
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

      {/* Add the Justification Modal */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              submitAction(
                currentAction!,
                formData.get('justification') as string
              )
            }}
          >
            <h3 className="text-lg font-medium mb-4">
              {currentAction === 'APPROVE' && 'Approval Justification'}
              {currentAction === 'REJECT' && 'Rejection Justification'}
              {currentAction === 'OBSERVE' && 'Add Observation'}
            </h3>
            <textarea
              name="justification"
              className="w-full h-32 p-2 border rounded-md mb-4"
              placeholder={
                currentAction === 'OBSERVE'
                  ? 'Enter your observation...'
                  : 'Enter your justification...'
              }
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJustificationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">3D Model Viewer</h3>
              {gltfArtifacts.length > 1 && (
                <select
                  value={selectedGltf || ''}
                  onChange={(e) => setSelectedGltf(e.target.value)}
                  className="border rounded-md px-3 py-1"
                >
                  {gltfArtifacts.map((artifact, index) => (
                    <option key={index} value={getArtifactUrl(artifact)}>
                      {getDisplayFileName(artifact)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedGltf && (
              <div className="h-[400px] bg-gray-50 rounded-lg overflow-hidden">
                <Canvas camera={{ position: [30, 5, 30], fov: 60 }}>
                  <Background />
                  <Model path={selectedGltf} />
                  <OrbitControls
                    enableZoom={true}
                    minDistance={1}
                    maxDistance={100}
                    target={[0, 0, 0]}
                  />
                  <Environment preset="sunset" />
                </Canvas>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Content</h2>
              {getParsingStatus(sample) ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {getParsingStatus(sample)
                  ? 'Parsed successfully'
                  : 'Parsing failed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show Raw</label>
              <button
                onClick={() => setShowRaw(!showRaw)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out 
                  ${showRaw ? 'bg-blue-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow 
                    ring-0 transition duration-200 ease-in-out
                    ${showRaw ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {showRaw ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Raw Response
                </label>
                <div className="rounded-md border overflow-hidden">
                  <SyntaxHighlighter
                    language="json"
                    style={oneLight}
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
                    <label className="block text-sm font-medium text-gray-700">
                      Inspiration
                    </label>
                    <div className="bg-gray-50 rounded-md p-4 border text-left">
                      <p className="whitespace-pre-wrap text-left">
                        {sample.resultInspirationText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description Text */}
                {sample.resultDescriptionText && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <div className="bg-gray-50 rounded-md p-4 border text-left">
                      <p className="whitespace-pre-wrap text-left">
                        {sample.resultDescriptionText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Code */}
                {sample.resultCodeText && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Code
                    </label>
                    <div className="rounded-md border overflow-hidden">
                      <SyntaxHighlighter
                        language="javascript"
                        style={oneLight}
                        customStyle={{
                          margin: 0,
                          borderRadius: 0,
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                        }}
                        showLineNumbers={true}
                        wrapLines={true}
                      >
                        {sample.resultCodeText}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Artifacts section */}
      {sample.artifacts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Artifacts</h2>

            {/* Artifact list */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-md border">
                <table className="w-full">
                  <tbody className="divide-y">
                    {sample.artifacts.map((artifact, index) => (
                      <tr key={index}>
                        <td className="p-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-gray-600 text-sm mb-1 text-left">
                              {getDisplayArtifactKind(artifact.kind)}
                            </span>
                            <a
                              href={getArtifactUrl(artifact)}
                              download
                              className="text-blue-600 hover:text-blue-800 text-left inline-flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
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
                <h3 className="text-lg font-medium">Captures</h3>
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
                <h3 className="text-lg font-medium">Video Previews</h3>
                <div className="grid grid-cols-1 gap-6">
                  {videoArtifacts.map((artifact, index) => (
                    <div key={index} className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
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
    </div>
  )
}

export default ViewSample
