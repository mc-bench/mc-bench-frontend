import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism'

import { Check, Copy, Share2 } from 'lucide-react'

import { getSample } from '../../api/leaderboard'
import { SampleResponse } from '../../types/leaderboard'
import { getArtifactUrl, getDisplayFileName } from '../../utils/artifacts'
import {
  ModelViewContainer,
  cleanupComparison,
  preloadModel,
} from '../ModelUtils'
import Background from '../background'
import Carousel from '../ui/Carousel'
import Modal from '../ui/Modal'

// Using SampleResponse from the types/leaderboard.ts

const CAPTURE_PATTERNS = [
  '-northside-capture.png',
  '-eastside-capture.png',
  '-southside-capture.png',
  '-west-capture.png',
]

const ShareSample = () => {
  const { id } = useParams()
  const [sample, setSample] = useState<SampleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGltf, setSelectedGltf] = useState<string | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [viewMode, setViewMode] = useState<string | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const lastClickTime = useRef<number>(0)
  const modelViewerRef = useRef<HTMLDivElement>(null)
  const dimensionsRef = useRef<{ width: number; height: number }>()

  useEffect(() => {
    const fetchSample = async () => {
      setLoading(true)
      try {
        const data = await getSample(id || '')
        setSample(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sample')
      } finally {
        setLoading(false)
      }
    }

    fetchSample()
  }, [id])

  // Add effect to listen for dark mode changes
  useEffect(() => {
    // Check for dark mode by looking at document class list (for Tailwind dark mode)
    const checkDarkMode = () => {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(isDark)
    }

    // Initial check
    checkDarkMode()

    // Set up event listeners for system preference changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      checkDarkMode()
    }

    // Set up a MutationObserver to detect class changes on html element (for theme toggles)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode()
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    darkModeMediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleMediaChange)
      observer.disconnect()
    }
  }, [])

  // Debug dark mode state when it changes
  useEffect(() => {
    console.log('Dark mode state changed:', isDarkMode)
  }, [isDarkMode])

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

        preloadModel(`share-${sample.id}`, gltfUrl)
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
        cleanupComparison(`share-${sample.id}`)
      }
    }
  }, [sample, selectedGltf])

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

  // Handle share functionality
  const handleShare = () => {
    setIsShareModalOpen(true)
  }

  // Handle copy to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  if (loading)
    return (
      <div className="flex justify-center p-8 text-gray-700 dark:text-gray-300">
        Loading sample...
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
      {/* SEO metadata */}
      <Helmet>
        <title>
          {sample.run?.prompt?.name ? `${sample.run.prompt.name} - ` : ''}
          Minecraft Build Sample
        </title>
        <meta
          name="description"
          content={
            sample.resultDescriptionText?.substring(0, 160) ||
            'Minecraft build created by an AI model'
          }
        />
        <meta
          property="og:title"
          content={`${sample.run?.prompt?.name || 'Minecraft Build'} - MC-Bench`}
        />
        <meta
          property="og:description"
          content={
            sample.resultDescriptionText?.substring(0, 160) ||
            'Minecraft build created by an AI model'
          }
        />
        {captureArtifacts.length > 0 && (
          <meta
            property="og:image"
            content={getArtifactUrl(captureArtifacts[0])}
          />
        )}
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Header with model info */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {sample.run.model.name}
            </h1>
          </div>
          <button
            onClick={handleShare}
            className="ml-4 flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-md transition"
            aria-label="Share this sample"
          >
            <Share2 size={16} className="mr-1" />
            Share
          </button>
        </div>

        <div className="mt-3 mb-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Prompt Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {sample.run.prompt.tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-2 py-1 rounded-md text-xs"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        {sample.stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 mb-4">
            {sample.stats.eloScore !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Sample ELO
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {Math.round(sample.stats.eloScore)}
                </div>
              </div>
            )}

            {sample.stats.winRate !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Sample Win Rate
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {(sample.stats.winRate * 100).toFixed(1)}%
                </div>
              </div>
            )}

            {sample.stats.voteCount !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Sample Vote Count
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {sample.stats.voteCount}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-gray-700 dark:text-gray-300 text-sm mb-2">
          <span className="font-medium">Prompt:</span>{' '}
          {sample.run.prompt.buildSpecification}
        </div>
        <div className="text-gray-700 dark:text-gray-300 text-sm mb-2">
          <span className="font-medium">Template:</span>{' '}
          {sample.run.templateName}
        </div>

        {sample.experimentalState &&
          sample.experimentalState !== 'RELEASED' && (
            <div className="mt-3">
              <span className="bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-100 px-2 py-1 rounded-md text-xs">
                {sample.experimentalState}
              </span>
            </div>
          )}
      </div>

      {/* GLTF Viewer */}
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
                    setIsModelLoading(true)
                    setModelError(null)
                    preloadModel(`share-${sample.id}`, newModelUrl)
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
              className="h-[500px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden relative"
              onClick={handleViewerClick}
            >
              {isModelLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-2"></div>
                    <div className="text-white">Loading 3D model...</div>
                  </div>
                </div>
              )}
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
              {selectedGltf && (
                <div
                  key={`model-viewer-${sample.id}`}
                  className="w-full h-full"
                >
                  <ModelViewContainer
                    modelPath={selectedGltf}
                    cacheKey={`share-${sample.id}`}
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

      {/* AI-Generated Content Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              AI-Generated Content
            </h2>
          </div>

          <div className="mb-4 text-gray-600 dark:text-gray-400 text-sm italic">
            The following content was generated by the AI model in response to
            the prompt above.
          </div>

          <div className="space-y-6">
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
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Build Code
                  </label>
                </div>
                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <SyntaxHighlighter
                    language="javascript"
                    style={isDarkMode ? oneDark : oneLight}
                    showLineNumbers={true}
                    wrapLines
                    customStyle={{
                      background: isDarkMode
                        ? '#1e293b'
                        : '#ffffff' /* bg-slate-800 */,
                      margin: 0,
                      padding: '1rem',
                      fontSize: '0.875rem',
                      borderRadius: 0,
                      overflow: 'auto',
                    }}
                    codeTagProps={{
                      className: isDarkMode ? 'dark-code' : 'light-code',
                    }}
                  >
                    {sample.resultCodeText}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Capture Images Carousel */}
      {captureArtifacts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <h3 className="text-lg font-medium dark:text-white mb-4">
              Build Captures
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
        </div>
      )}

      {/* Video Players */}
      {videoArtifacts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <h3 className="text-lg font-medium dark:text-white mb-4">
              Video Preview
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
                      autoPlay={false}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8 mb-4">
        <p>Build created on {new Date(sample.created).toLocaleDateString()}</p>
      </div>

      {/* Share Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share this Sample"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Share this sample with others by copying the link below:
          </p>

          <div className="flex items-center mt-2">
            <input
              type="text"
              readOnly
              value={window.location.href}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md flex items-center transition-colors"
            >
              {copied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="text-gray-600 dark:text-gray-400 text-sm mt-4">
            {sample.stats && (
              <div className="mt-3">
                <p className="font-medium mb-1">Sample Statistics:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {sample.stats.eloScore !== undefined && (
                    <li>ELO Score: {Math.round(sample.stats.eloScore)}</li>
                  )}
                  {sample.stats.winRate !== undefined && (
                    <li>
                      Win Rate: {(sample.stats.winRate * 100).toFixed(1)}%
                    </li>
                  )}
                  {sample.stats.voteCount !== undefined && (
                    <li>Total Votes: {sample.stats.voteCount}</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ShareSample
