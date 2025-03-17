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
  Clock,
  Download,
  ExternalLink,
  Loader2,
  User,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { RunData } from '../../types/runs'
import {
  getArtifactUrl,
  getDisplayArtifactKind,
  getDisplayFileName,
} from '../../utils/artifacts'
import { hasSampleAccess } from '../../utils/permissions'
import { ModelViewContainer, cleanupComparison } from '../ModelUtils'
import Background from '../background.tsx'
import Carousel from '../ui/Carousel'
import RunControls from '../ui/RunControls.tsx'
import { RunResources } from '../ui/RunResources'
import ScreenshotShare from '../ui/ScreenshotShare'

const CAPTURE_PATTERNS = [
  '-northside-capture.png',
  '-eastside-capture.png',
  '-southside-capture.png',
  '-west-capture.png',
]

const isInProgress = (status: string) => {
  return !status.includes('FAILED') && status !== 'COMPLETED'
}

const POLLING_INTERVAL = 5000 // 5 seconds

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    case 'FAILED':
    case 'PROMPT_PROCESSING_FAILED':
    case 'BUILD_FAILED':
    case 'POST_PROCESSING_FAILED':
    case 'SAMPLE_PREP_FAILED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    case 'CREATED':
    case 'IN_PROGRESS':
    case 'IN_RETRY':
    case 'PROMPT_ENQUEUED':
    case 'PROMPT_COMPLETED':
    case 'PROMPT_PROCESSING_ENQUEUED':
    case 'PROMPT_PROCESSING_COMPLETED':
    case 'BUILD_ENQUEUED':
    case 'BUILD_COMPLETED':
    case 'POST_PROCESSING_ENQUEUED':
    case 'POST_PROCESSING_COMPLETED':
    case 'SAMPLE_PREP_ENQUEUED':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

const getStatusIcon = (status: string) => {
  if (status === 'COMPLETED') {
    return <CheckCircle className="h-4 w-4" />
  }
  if (status.includes('FAILED')) {
    return <AlertCircle className="h-4 w-4" />
  } else {
    return <Loader2 className="h-4 w-4 animate-spin" />
  }
  return null
}

const getParsingStatus = (sample: any) => {
  if (!sample) return false
  return sample.resultCodeText !== null
}

// Using Model component from ModelUtils instead

const ViewRun = () => {
  const { id } = useParams()
  const [run, setRun] = useState<RunData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSample, setSelectedSample] = useState<number>(-1)
  const [selectedGltf, setSelectedGltf] = useState<string | null>(null)
  const [expandedResources, setExpandedResources] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [viewMode, setViewMode] = useState<string | null>(null)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const modelViewerRef = useRef<HTMLDivElement>(null)
  const dimensionsRef = useRef<{ width: number; height: number }>()
  const { user } = useAuth()
  const userScopes = user?.scopes || []
  const canViewSamples = hasSampleAccess(userScopes)
  const lastClickTime = useRef<number>(0)

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

  // Cleanup when component unmounts or run changes
  useEffect(() => {
    return () => {
      if (run?.id) {
        cleanupComparison(`run-${run.id}`)
      }
    }
  }, [run?.id])

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

  const fetchRun = useCallback(async () => {
    try {
      const { data } = await adminAPI.get(`/run/${id}`)
      setRun(data)

      // Update GLTF selection if needed
      if (data.artifacts?.length > 0 && !selectedGltf) {
        const firstGltf = data.artifacts.find(
          (a: any) =>
            (a.key.endsWith('.gltf') || a.key.endsWith('.glb')) &&
            a.kind === 'RENDERED_MODEL_GLB'
        )
        if (firstGltf) {
          setSelectedGltf(getArtifactUrl(firstGltf))
        }
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch run')
      return null
    }
  }, [id, selectedGltf])

  useEffect(() => {
    let pollInterval: number | null = null
    let isComponentMounted = true

    const startPolling = async () => {
      if (!isComponentMounted) return

      setLoading(true)
      const initialData = await fetchRun()

      if (!isComponentMounted) return
      setLoading(false)

      if (initialData && isInProgress(initialData.status)) {
        pollInterval = window.setInterval(async () => {
          if (!isComponentMounted) {
            if (pollInterval) {
              window.clearInterval(pollInterval)
            }
            return
          }

          const updatedData = await fetchRun()
          if (updatedData && !isInProgress(updatedData.status)) {
            if (pollInterval) {
              window.clearInterval(pollInterval)
              pollInterval = null
            }
          }
        }, POLLING_INTERVAL)
      }
    }

    startPolling()

    return () => {
      isComponentMounted = false
      if (pollInterval) {
        window.clearInterval(pollInterval)
        pollInterval = null
      }
    }
  }, [fetchRun])

  // Update the effect to set the most recent sample when run data is loaded
  useEffect(() => {
    if (run && run.samples.length > 0 && selectedSample === -1) {
      setSelectedSample(run.samples.length - 1)
    }
  }, [run, selectedSample])

  // Update the effect to only set showRaw to true if parsing failed
  useEffect(() => {
    if (run?.samples[selectedSample]) {
      const currentSample = run.samples[selectedSample]
      if (!currentSample.resultCodeText) {
        setShowRaw(true)
      } else {
        setShowRaw(false) // Reset to false if we have parsed code
      }
    }
  }, [run, selectedSample])

  const handleRetryComplete = useCallback(() => {
    fetchRun() // Reload the run data
  }, [fetchRun])

  if (loading)
    return (
      <div className="flex justify-center p-8 text-gray-700 dark:text-gray-300">
        Loading run...
      </div>
    )
  if (error)
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>
  if (!run)
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4">Run not found</div>
    )

  const gltfArtifacts =
    run.artifacts?.filter(
      (a: any) =>
        (a.key.endsWith('.gltf') || a.key.endsWith('.glb')) &&
        a.kind === 'RENDERED_MODEL_GLB'
    ) || []

  const videoArtifacts =
    run.artifacts?.filter((a: any) => a.key.endsWith('.mp4')) || []

  const captureArtifacts =
    run.artifacts?.filter((a: any) =>
      CAPTURE_PATTERNS.some((pattern) => a.key.endsWith(pattern))
    ) || []

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Run Details
              </h1>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusStyles(run.status)}`}
              >
                {getStatusIcon(run.status)}
                {run.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-gray-200 dark:divide-gray-700">
              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Created
                </div>
                <div className="flex items-center gap-2 justify-center text-gray-900 dark:text-gray-200">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span>{new Date(run.created).toLocaleString()}</span>
                </div>
              </div>

              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Created by
                </div>
                <div className="flex items-center gap-2 justify-center text-gray-900 dark:text-gray-200">
                  <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span>{run.createdBy}</span>
                </div>
              </div>

              {run.generationId && (
                <div className="px-4 first:pl-0 last:pr-0">
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                    Generation
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <Link
                      to={`/generations/${run.generationId}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View Generation</span>
                    </Link>
                  </div>
                </div>
              )}

              {canViewSamples && run.samples.length > 0 && (
                <div className="px-4 first:pl-0 last:pr-0">
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                    Samples
                  </div>
                  <div className="flex flex-col gap-1">
                    {run.samples.map((sample, index) => (
                      <Link
                        key={index}
                        to={`/samples/${sample.id}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Sample {index + 1}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <RunControls
        runId={id}
        startExpanded={true}
        run={run}
        onRetryComplete={handleRetryComplete}
      ></RunControls>

      {/* Resources Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <RunResources
            model={run.model}
            template={run.template}
            prompt={run.prompt}
            isExpanded={expandedResources}
            onToggle={() => setExpandedResources(!expandedResources)}
          />
        </div>
      </div>

      {/* Samples section */}
      {run.samples.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            {selectedSample === -1 ? (
              <div className="flex justify-center p-4 text-gray-700 dark:text-gray-300">
                Loading samples...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Content
                    </h2>
                    {getParsingStatus(run.samples[selectedSample]) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getParsingStatus(run.samples[selectedSample])
                        ? 'Parsed successfully'
                        : 'Parsing failed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {run.samples.length > 0 && (
                      <select
                        value={selectedSample}
                        onChange={(e) =>
                          setSelectedSample(Number(e.target.value))
                        }
                        className="border rounded-md px-3 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      >
                        {run.samples.map((_, index) => (
                          <option key={index} value={index}>
                            Sample {index + 1}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">
                        Show Raw
                      </label>
                      <button
                        onClick={() => setShowRaw(!showRaw)}
                        className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out 
                  ${showRaw ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}
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
                </div>

                <div className="space-y-6">
                  {showRaw ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Raw Response
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 border dark:border-gray-700">
                        <pre className="text-left whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                          {run.samples[selectedSample].raw}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Inspiration */}
                      {run.samples[selectedSample].resultInspirationText && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Inspiration
                          </label>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 border dark:border-gray-700 text-left">
                            <p className="whitespace-pre-wrap text-left text-gray-800 dark:text-gray-200">
                              {
                                run.samples[selectedSample]
                                  .resultInspirationText
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {run.samples[selectedSample].resultDescriptionText && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Description
                          </label>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 border dark:border-gray-700 text-left">
                            <p className="whitespace-pre-wrap text-left text-gray-800 dark:text-gray-200">
                              {
                                run.samples[selectedSample]
                                  .resultDescriptionText
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Code */}
                      {run.samples[selectedSample].resultCodeText && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Code
                          </label>
                          <div className="rounded-md border dark:border-gray-700 overflow-hidden">
                            <SyntaxHighlighter
                              language="javascript"
                              style={isDarkMode ? oneDark : oneLight}
                              customStyle={{
                                margin: 0,
                                borderRadius: 0,
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                              }}
                              showLineNumbers={true}
                              wrapLines={true}
                            >
                              {run.samples[selectedSample].resultCodeText}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Artifacts section */}
      {run.artifacts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Artifacts
            </h2>

            {/* Artifact list */}
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {run.artifacts.map((artifact, index) => (
                      <tr key={index}>
                        <td className="p-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-gray-600 dark:text-gray-400 text-sm mb-1 text-left">
                              {getDisplayArtifactKind(artifact.kind)}
                            </span>
                            <a
                              href={getArtifactUrl(artifact)}
                              download
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 text-left inline-flex items-center gap-1"
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
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

            {/* GLTF Viewer */}
            {gltfArtifacts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    3D Model Viewer
                  </h3>
                  {gltfArtifacts.length > 1 && (
                    <select
                      value={selectedGltf || ''}
                      onChange={(e) => setSelectedGltf(e.target.value)}
                      className="border rounded-md px-3 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
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
                  <div
                    ref={modelViewerRef}
                    className="h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden relative"
                    onClick={handleViewerClick}
                  >
                    {/* Controls for screenshot */}
                    <div className="absolute bottom-2 left-2 z-10 flex items-center space-x-2">
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
                    </div>
                    <ModelViewContainer
                      modelPath={selectedGltf}
                      cacheKey={`run-${run.id}`}
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

                {/* Screenshot Modal */}
                {showScreenshotModal && (
                  <ScreenshotShare
                    isOpen={showScreenshotModal}
                    onClose={() => setShowScreenshotModal(false)}
                    modelName={run.model.name}
                    prompt={run.prompt?.buildSpecification || ''}
                    modelViewerRef={modelViewerRef}
                    alertMessage={
                      run.samples[selectedSample] &&
                      selectedSample >= 0 &&
                      run.samples[selectedSample].experimentalState ===
                        'EXPERIMENTAL'
                        ? 'EXPERIMENTAL'
                        : undefined
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewRun
