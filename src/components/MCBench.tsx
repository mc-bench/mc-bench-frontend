import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Camera, Loader2, Share2 } from 'lucide-react'
import * as THREE from 'three'

import { api } from '../api/client'
import settings from '../config/settings'
import { useAuth } from '../hooks/useAuth'
import {
  AssetFile,
  BuildPair,
  ComparisonBatchResponse,
  ComparisonResponse,
  ComparisonResultResponse,
  MetricResponse,
  NewComparisonBatchRequest,
  QueuedComparison,
  UserComparisonRequest,
} from '../types/comparisons'
import AuthModal from './AuthModal'
import {
  ModelViewContainer,
  cleanupComparison,
  modelPathCache,
  preloadModel,
} from './ModelUtils'
import Background from './background'
import ScreenshotShare from './ui/ScreenshotShare'
import ShareComparisonModal from './ui/ShareComparisonModal'

const getArtifactUrl = (artifact: AssetFile) => {
  // TODO: Make this better to detect whether the root url already
  //  encodes the bucket information
  if (settings.external_object_cdn_root_url.includes('mcbench.ai')) {
    return `${settings.external_object_cdn_root_url}/${artifact.key}`
  }

  return `${settings.external_object_cdn_root_url}/${artifact.bucket}/${artifact.key}`
}

const COMPARISON_EXPIRY = 50 * 60 * 1000 // 50 minutes in milliseconds
const TARGET_QUEUE_SIZE = 10
const REFILL_THRESHOLD = 4

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768) // You can adjust this breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

interface WASDControlsProps {
  isActive: boolean
}

const WASDControls = ({ isActive }: WASDControlsProps) => {
  const { camera } = useThree()
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false,
    q: false,
  })
  const mouseDown = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))

  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys.current) {
        keys.current[e.key as keyof typeof keys.current] = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys.current) {
        keys.current[e.key as keyof typeof keys.current] = false
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      mouseDown.current = true
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      mouseDown.current = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseDown.current) {
        const deltaX = e.clientX - lastMousePos.current.x
        const deltaY = e.clientY - lastMousePos.current.y

        euler.current.y -= deltaX * 0.004
        euler.current.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, euler.current.x - deltaY * 0.004)
        )

        camera.quaternion.setFromEuler(euler.current)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
      }
    }

    const resetControls = () => {
      mouseDown.current = false
      Object.keys(keys.current).forEach((key) => {
        keys.current[key as keyof typeof keys.current] = false
      })
    }

    const handleMouseLeave = () => {
      resetControls()
    }

    const canvas = document.querySelector('canvas')
    canvas?.addEventListener('mouseleave', handleMouseLeave)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      canvas?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [camera, isActive])

  useFrame(() => {
    if (!isActive) return

    const moveSpeed = 0.7
    if (keys.current.w) camera.translateZ(-moveSpeed)
    if (keys.current.s) camera.translateZ(moveSpeed)
    if (keys.current.a) camera.translateX(-moveSpeed)
    if (keys.current.d) camera.translateX(moveSpeed)
    if (keys.current[' ']) camera.position.y += moveSpeed // Space to go up
    if (keys.current.q) camera.position.y -= moveSpeed // Q to go down
  })

  return null
}

let cachedMetricId: string | null = null

const fetchMetricId = async (): Promise<string> => {
  if (cachedMetricId) return cachedMetricId

  const { data } = await api.get<MetricResponse[]>('/metric')
  const metric = data.find((m) => m.name === 'UNQUALIFIED_BETTER')
  if (!metric) throw new Error('Required metric not found')

  cachedMetricId = metric.id
  return metric.id
}

const getModelPath = (
  comparison: ComparisonResponse,
  sampleId: string
): string => {
  const asset = comparison.assets.find((a) => a.sampleId === sampleId)
  const gltfFile = asset?.files.find((f) => f.kind === 'gltf_scene')

  if (gltfFile?.bucket && gltfFile?.key) {
    return getArtifactUrl(gltfFile)
  }

  if (!gltfFile?.url) {
    console.error('Missing GLTF file for sample:', sampleId)
    throw new Error(`Missing GLTF file for sample: ${sampleId}`)
  }

  return gltfFile.url
}

// Now using ModelViewContainer which has its own camera controls

const MCBench = () => {
  const isMobile = useIsMobile()
  const { isAuthenticated } = useAuth()

  const [metricId, setMetricId] = useState<string | null>(null)
  const [comparisons, setComparisons] = useState<QueuedComparison[]>([])
  const [currentComparison, setCurrentComparison] =
    useState<QueuedComparison | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [voted, setVoted] = useState(false)
  const viewerRefA = useRef<HTMLDivElement>(null)
  const viewerRefB = useRef<HTMLDivElement>(null)
  const dimensionsRefA = useRef<{ width: number; height: number }>()
  const dimensionsRefB = useRef<{ width: number; height: number }>()
  const [error, setError] = useState<string | null>(null)
  const [preloadStatus, setPreloadStatus] = useState<Record<string, boolean>>(
    {}
  )
  const [renderStatus, setRenderStatus] = useState<Record<string, boolean>>({})
  const [activeViewer, setActiveViewer] = useState<'A' | 'B' | null>(null)
  const [noComparisonsAvailable, setNoComparisonsAvailable] = useState(false)
  const [modelNames, setModelNames] = useState<{
    modelA: string
    modelB: string
  }>({ modelA: '', modelB: '' })
  const lastClickTime = useRef<{ [key: string]: number }>({ A: 0, B: 0 })
  const [viewMode, setViewMode] = useState<{
    A: string | null
    B: string | null
  }>({
    A: null,
    B: null,
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<
    'signup' | 'login' | 'prompt'
  >('signup')
  const [showShareModal, setShowShareModal] = useState(false)
  const [userVote, setUserVote] = useState<'A' | 'B' | 'tie' | null>(null)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const [screenshotViewer, setScreenshotViewer] = useState<'A' | 'B' | null>(null)

  // Initialize vote count from localStorage
  useEffect(() => {
    fetchMetricId()
      .then(setMetricId)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to fetch metric')
      )
  }, [])

  // Handle authentication state changes
  useEffect(() => {
    // Clear the vote count in localStorage when user becomes authenticated
    if (isAuthenticated) {
      localStorage.removeItem('mcbench_vote_count')
    }

    // Clear existing comparisons and fetch new ones appropriate for current auth state
    const oldComparisons = [...comparisons]
    const oldCurrentComparison = currentComparison

    setComparisons([])
    setCurrentComparison(null)
    setPreloadStatus({})

    // Clean up any loaded models from previous comparisons
    if (oldCurrentComparison) {
      cleanupComparison(oldCurrentComparison.token)
    }

    oldComparisons.forEach((comparison) => {
      cleanupComparison(comparison.token)
    })

    // Set loading to trigger a new fetch
    setIsLoading(true)

    // Fetch new comparisons will happen via the existing effect that watches for an empty comparison queue
  }, [isAuthenticated])

  // Check if we should prompt for authentication based on vote count
  const checkAndPromptForAuth = useCallback(() => {
    if (isAuthenticated) return

    // Get current vote count from localStorage
    const voteCount = parseInt(
      localStorage.getItem('mcbench_vote_count') || '0',
      10
    )
    const newCount = voteCount + 1

    // Store updated count
    localStorage.setItem('mcbench_vote_count', newCount.toString())

    // Show auth modal at specific thresholds: 10, 30, 50, 70, etc.
    if (newCount === 10 || (newCount > 10 && (newCount - 10) % 15 === 0)) {
      setAuthModalMode('prompt')
      setShowAuthModal(true)
    }
  }, [isAuthenticated])

  useEffect(() => {
    return () => {
      // Cleanup all models when component unmounts
      comparisons.forEach((comparison) => {
        cleanupComparison(comparison.token)
      })

      if (currentComparison) {
        cleanupComparison(currentComparison.token)
      }
    }
  }, [comparisons, currentComparison])

  const fetchComparisons = useCallback(async () => {
    if (!metricId) return

    try {
      const batchSize = TARGET_QUEUE_SIZE - comparisons.length
      if (batchSize <= 0) return

      const request: NewComparisonBatchRequest = {
        batchSize: batchSize,
        metricId: metricId,
      }

      // The /comparison/batch endpoint will receive our session and identification headers
      // through our axios interceptors. The backend will use these to determine which
      // comparisons to send to this specific user.
      const { data } = await api.post<ComparisonBatchResponse>(
        '/comparison/batch',
        request
      )

      if (data.comparisons.length === 0) {
        setNoComparisonsAvailable(true)
        setIsLoading(false)
        return
      }

      const newComparisons: QueuedComparison[] = data.comparisons.map(
        (comp) => ({
          ...comp,
          fetchedAt: Date.now(),
        })
      )

      setComparisons((prev) => [...prev, ...newComparisons])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch comparisons'
      )
    }
  }, [comparisons.length, metricId])

  const handleVote = async (choice: 'A' | 'B' | 'tie') => {
    if (!currentComparison || voted) return
    setVoted(true)
    setUserVote(choice)

    // Construct the orderedSampleIds with the new nested array format
    let orderedSampleIds: string[][]

    if (choice === 'tie') {
      // For a tie, both samples go in the same array: [[sample1, sample2]]
      orderedSampleIds = [currentComparison.samples]
    } else if (choice === 'A') {
      // For A wins: [[sampleA], [sampleB]]
      orderedSampleIds = [
        [currentComparison.samples[0]], // Winner (A)
        [currentComparison.samples[1]], // Loser (B)
      ]
    } else {
      // For B wins: [[sampleB], [sampleA]]
      orderedSampleIds = [
        [currentComparison.samples[1]], // Winner (B)
        [currentComparison.samples[0]], // Loser (A)
      ]
    }

    const payload: UserComparisonRequest = {
      comparisonDetails: {
        token: currentComparison.token,
        samples: currentComparison.samples,
      },
      orderedSampleIds,
    }

    try {
      // The /comparison/result endpoint will receive our session and identification headers
      // through our axios interceptors. The backend will associate this vote with
      // the session and identification headers.
      const { data } = await api.post<ComparisonResultResponse>(
        '/comparison/result',
        payload
      )

      setModelNames({
        modelA: data.sample_1_model,
        modelB: data.sample_2_model,
      })

      // Check if we should prompt for authentication
      if (!isAuthenticated) {
        checkAndPromptForAuth()
      }
    } catch (err) {
      console.error('Failed to submit comparison:', err)
    }
  }

  useEffect(() => {
    const now = Date.now()

    const validComparisons = comparisons.filter(
      (comp) => now - comp.fetchedAt < COMPARISON_EXPIRY
    )

    if (validComparisons.length !== comparisons.length) {
      setComparisons(validComparisons)
      console.log('Valid Comparisons Remaining', validComparisons.length)
    }

    if (validComparisons.length <= REFILL_THRESHOLD) {
      fetchComparisons()
    }

    if (!currentComparison && validComparisons.length > 0) {
      setCurrentComparison(validComparisons[0])
      setComparisons(validComparisons.slice(1))
      setVoted(false)
      setIsLoading(false)
    }
  }, [comparisons, currentComparison, fetchComparisons])

  // useEffect(() => {
  //   const handleKeyPress = (event: KeyboardEvent) => {
  //     if (event.key === 'Enter' && voted) {
  //       handleNext()
  //     }

  //     // Ensure both models are rendered before allowing keyboard voting
  //     if (
  //       voted ||
  //       !currentComparison ||
  //       !renderStatus[currentComparison.samples[0]] ||
  //       !renderStatus[currentComparison.samples[1]]
  //     )
  //       return

  //     if (event.key === 'ArrowLeft') {
  //       handleVote('A')
  //     } else if (event.key === 'ArrowRight') {
  //       handleVote('B')
  //     } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
  //       handleVote('tie')
  //     }
  //   }

  //   window.addEventListener('keydown', handleKeyPress)
  //   return () => window.removeEventListener('keydown', handleKeyPress)
  // }, [voted, currentComparison, renderStatus])

  const handleNext = () => {
    // Store comparison details for cleanup
    const modelsToClear = currentComparison ? [
      getModelPath(currentComparison, currentComparison.samples[0]),
      getModelPath(currentComparison, currentComparison.samples[1])
    ] : []
    const cacheKeyToCleanup = currentComparison?.token

    // First update UI state to show loading indicator
    setCurrentComparison(null)
    setVoted(false)
    setUserVote(null)
    setModelNames({ modelA: '', modelB: '' })
    
    // Reset view modes for both viewers
    setViewMode({ A: null, B: null })
    
    // Reset preload status
    setPreloadStatus({})

    // Immediately clear THREE.js cache to prevent position reuse
    // This is critical for preventing the model from rotating around the wrong center
    modelsToClear.forEach(path => {
      console.log('Clearing model from useGLTF cache:', path)
      // We're using the already imported useGLTF from drei
      useGLTF.clear(path)
    })

    // Only clean up after UI has updated and next model is being prepared
    if (cacheKeyToCleanup) {
      // Longer delay for cleanup to ensure complete transition
      setTimeout(() => {
        console.log(
          'Starting cleanup for previous comparison with cache key:',
          cacheKeyToCleanup
        )
        cleanupComparison(cacheKeyToCleanup)
      }, 500) // Increased delay to ensure smooth transition between comparisons
    }
  }

  const handleOpenShareModal = () => {
    setShowShareModal(true)
  }

  const handleOpenScreenshotModal = (viewer: 'A' | 'B') => {
    // Prevent event bubbling
    const targetViewerRef = viewer === 'A' ? viewerRefA : viewerRefB
    if (!targetViewerRef.current) return

    // Store which viewer needs to be captured
    setScreenshotViewer(viewer)

    // Open the screenshot modal - the ScreenshotShare component will handle fullscreen exit if needed
    setShowScreenshotModal(true)
  }

  // Preload models for current and upcoming comparisons
  const preloadUpcomingModels = useCallback(async () => {
    if (!currentComparison) return

    console.log('Starting preload for models')

    // Get paths and preload current comparison models
    const modelAPath = getModelPath(
      currentComparison,
      currentComparison.samples[0]
    )
    const modelBPath = getModelPath(
      currentComparison,
      currentComparison.samples[1]
    )

    // Initialize cache key-specific path cache if needed
    if (!modelPathCache.has(currentComparison.token)) {
      modelPathCache.set(currentComparison.token, new Map<string, string>())
    }
    const cacheKeyPathCache = modelPathCache.get(currentComparison.token)!

    // Store the paths in the cache key-specific path cache
    cacheKeyPathCache.set(currentComparison.samples[0], modelAPath)
    cacheKeyPathCache.set(currentComparison.samples[1], modelBPath)

    try {
      await Promise.all([
        preloadModel(currentComparison.token, modelAPath),
        preloadModel(currentComparison.token, modelBPath),
      ])

      // Immediately update preload status like in production
      setPreloadStatus((prev) => ({
        ...prev,
        [currentComparison.samples[0]]: true,
        [currentComparison.samples[1]]: true,
      }))

      console.log('Preload complete for current models')

      // Also preload next comparison if available, with a delay
      if (comparisons.length > 0) {
        const nextComparison = comparisons[0]
        const nextPaths = nextComparison.samples.map((sampleId) => {
          const path = getModelPath(nextComparison, sampleId)

          // Initialize cache key-specific path cache if needed
          if (!modelPathCache.has(nextComparison.token)) {
            modelPathCache.set(nextComparison.token, new Map<string, string>())
          }
          const nextCacheKeyPathCache = modelPathCache.get(
            nextComparison.token
          )!

          // Store the path in the cache key-specific path cache
          nextCacheKeyPathCache.set(sampleId, path)

          return path
        })

        // Preload next models in background immediately
        console.log('Starting preload for next comparison models')
        
        Promise.all(
          nextPaths.map((path) => preloadModel(nextComparison.token, path))
        ).then(() => {
          setPreloadStatus((prev) => ({
            ...prev,
            [nextComparison.samples[0]]: true,
            [nextComparison.samples[1]]: true,
          }))
          console.log('Preload complete for next models')
        })
      }
    } catch (error) {
      console.error('Error preloading models:', error)
    }
  }, [currentComparison, comparisons])

  useEffect(() => {
    // Immediately preload models without delay
    preloadUpcomingModels()
  }, [currentComparison, preloadUpcomingModels])

  const handleViewerClick = (viewer: 'A' | 'B') => {
    const now = Date.now()
    const lastClick = lastClickTime.current[viewer]

    // Check if it's a double click (within 300ms)
    if (now - lastClick < 300) {
      handleFullscreen(
        viewer === 'A' ? viewerRefA : viewerRefB,
        viewer === 'A' ? dimensionsRefA : dimensionsRefB
      )
    }

    lastClickTime.current[viewer] = now
  }

  const handleViewChange = (viewer: 'A' | 'B', position: string) => {
    console.log('Setting view for viewer:', viewer, 'position:', position)

    // Special case for reset
    if (position === 'reset-view-from-button') {
      setViewMode((prev) => ({
        ...prev,
        [viewer]: 'reset-view-from-button', // Don't add timestamp for reset
      }))
      return
    }

    // Regular case - add timestamp to force re-render
    setViewMode((prev) => ({
      ...prev,
      [viewer]: `${position}-${Date.now()}`, // Add timestamp to force state change
    }))
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[400px] text-red-600">
        {error}
      </div>
    )
  }

  // Add loading indicator while models are preloading
  if (
    isLoading ||
    (currentComparison &&
      !preloadStatus[currentComparison.samples[0]] &&
      !preloadStatus[currentComparison.samples[1]])
  ) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-300" />
      </div>
    )
  }

  if (noComparisonsAvailable) {
    return (
      <div className="flex justify-center items-center h-[400px] text-gray-600 dark:text-gray-300">
        No comparisons available at this time. Please check back later.
      </div>
    )
  }

  if (!currentComparison) {
    return (
      <div className="flex justify-center items-center h-[400px] text-gray-600 dark:text-gray-300">
        Loading next comparison...
      </div>
    )
  }

  // Remove just the loading spinner but keep the preload status check as a guard
  if (
    !preloadStatus[currentComparison.samples[0]] ||
    !preloadStatus[currentComparison.samples[1]]
  ) {
    return null // or return to the previous state
  }

  // Get the paths directly since we know preload is complete
  const modelAPath = getModelPath(
    currentComparison,
    currentComparison.samples[0]
  )
  const modelBPath = getModelPath(
    currentComparison,
    currentComparison.samples[1]
  )

  const buildPair: BuildPair = {
    prompt: currentComparison.buildDescription,
    modelA: {
      modelPath: modelAPath,
      sampleId: currentComparison.samples[0],
      name: modelNames.modelA,
    },
    modelB: {
      modelPath: modelBPath,
      sampleId: currentComparison.samples[1],
      name: modelNames.modelB,
    },
  }

  const handleFullscreen = (
    ref: React.RefObject<HTMLDivElement>,
    dimensionsRef: React.MutableRefObject<
      { width: number; height: number } | undefined
    >
  ) => {
    if (!ref.current) return

    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        if (ref.current && dimensionsRef.current) {
          ref.current.style.width = `${dimensionsRef.current.width}px`
          ref.current.style.height = `${dimensionsRef.current.height}px`
        }
      })
    } else {
      dimensionsRef.current = {
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
      }
      ref.current.requestFullscreen()
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-6 font-mono dark:text-gray-100">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold uppercase tracking-wider dark:text-white">
          MC-Bench
        </h1>
        <p className="text-gray-600 dark:text-gray-300 font-mono">
          Which AI generated this Minecraft build better?
        </p>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-900 dark:border-gray-600 p-4 text-center">
        <p className="text-lg font-mono dark:text-gray-200">
          {buildPair.prompt}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-4">
          {/* First model (A) */}
          <div
            ref={viewerRefA}
            className="relative w-full md:flex-1 h-[400px] overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-900 dark:border-gray-600"
            onMouseEnter={() => !isMobile && setActiveViewer('A')}
            onMouseLeave={() => !isMobile && setActiveViewer(null)}
            onClick={() => handleViewerClick('A')}
          >
            <div className="absolute bottom-2 left-2 z-10 flex items-center space-x-2">
              <div className="bg-white/10 text-white p-2 rounded-md text-sm w-8 h-8 flex items-center justify-center">
                A
              </div>
              {renderStatus[currentComparison.samples[0]] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenScreenshotModal('A');
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-md flex items-center justify-center"
                  title="Take Screenshot"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>

            <ModelViewContainer
              modelPath={buildPair.modelA.modelPath}
              cacheKey={currentComparison.token}
              initialCameraPosition={[30, 5, 30]}
              initialViewMode={viewMode['A']}
              onViewChange={(position: string) =>
                handleViewChange('A', position)
              }
              onFullscreen={(e?: React.MouseEvent) => {
                if (e) e.stopPropagation()
                handleFullscreen(viewerRefA, dimensionsRefA)
              }}
              showFullscreenButton={true}
              className="h-full w-full"
              onRender={() => setRenderStatus(prev => ({
                ...prev,
                [currentComparison.samples[0]]: true
              }))}
            >
              <Background />
              <Suspense fallback={null}>
                {false && <WASDControls isActive={activeViewer === 'A'} />}
              </Suspense>
            </ModelViewContainer>
            {voted && modelNames.modelA && (
              <div className="absolute top-2 left-2">
                <div className="bg-white/10 text-white p-3 py-1 rounded-md text-sm">
                  {modelNames.modelA}
                </div>
              </div>
            )}
          </div>

          {/* Mobile spacing between models with conditional share button */}
          <div className="h-12 flex items-center justify-center md:hidden px-4 gap-2">
            {isMobile && voted && (
              <>
                <button
                  onClick={handleOpenShareModal}
                  className="p-2 px-4 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-md flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm">Share</span>
                </button>

                {userVote && userVote !== 'tie' && renderStatus[currentComparison.samples[userVote === 'A' ? 0 : 1]] && (
                  <button
                    onClick={() => handleOpenScreenshotModal(userVote as 'A' | 'B')}
                    className="p-2 px-4 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="text-sm">Screenshot</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Second model (B) */}
          <div
            ref={viewerRefB}
            className="relative w-full md:flex-1 h-[400px] overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-900 dark:border-gray-600"
            onMouseEnter={() => !isMobile && setActiveViewer('B')}
            onMouseLeave={() => !isMobile && setActiveViewer(null)}
            onClick={() => handleViewerClick('B')}
          >
            <div className="absolute bottom-2 left-2 z-10 flex items-center space-x-2">
              <div className="bg-white/10 text-white p-2 rounded-md text-sm w-8 h-8 flex items-center justify-center">
                B
              </div>
              {renderStatus[currentComparison.samples[1]] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenScreenshotModal('B');
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-md flex items-center justify-center"
                  title="Take Screenshot"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>

            <ModelViewContainer
              modelPath={buildPair.modelB.modelPath}
              cacheKey={currentComparison.token}
              initialCameraPosition={[30, 5, 30]}
              initialViewMode={viewMode['B']}
              onViewChange={(position: string) =>
                handleViewChange('B', position)
              }
              onFullscreen={(e?: React.MouseEvent) => {
                if (e) e.stopPropagation()
                handleFullscreen(viewerRefB, dimensionsRefB)
              }}
              showFullscreenButton={true}
              className="h-full w-full"
              onRender={() => setRenderStatus(prev => ({
                ...prev,
                [currentComparison.samples[1]]: true
              }))}
            >
              <Background />
              <Suspense fallback={null}>
                {false && <WASDControls isActive={activeViewer === 'B'} />}
              </Suspense>
            </ModelViewContainer>
            {voted && modelNames.modelB && (
              <div className="absolute top-2 left-2">
                <div className="bg-white/10 text-white p-3 py-1 rounded-md text-sm">
                  {modelNames.modelB}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!voted ? (
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleVote('A')}
                disabled={
                  !renderStatus[currentComparison.samples[0]] ||
                  !renderStatus[currentComparison.samples[1]]
                }
                className={`w-full py-3 font-mono uppercase tracking-wider border transition-transform ${renderStatus[currentComparison.samples[0]] &&
                  renderStatus[currentComparison.samples[1]]
                  ? 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white border-gray-900 dark:border-gray-600 hover:translate-y-[-2px]'
                  : 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 border-gray-400 dark:border-gray-500 cursor-not-allowed'
                  }`}
              >
                Vote A
              </button>
              <button
                onClick={() => handleVote('tie')}
                disabled={
                  !renderStatus[currentComparison.samples[0]] ||
                  !renderStatus[currentComparison.samples[1]]
                }
                className={`w-full py-3 font-mono uppercase tracking-wider border transition-transform ${renderStatus[currentComparison.samples[0]] &&
                  renderStatus[currentComparison.samples[1]]
                  ? 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white border-gray-900 dark:border-gray-600 hover:translate-y-[-2px]'
                  : 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 border-gray-400 dark:border-gray-500 cursor-not-allowed'
                  }`}
              >
                Tie
              </button>
              <button
                onClick={() => handleVote('B')}
                disabled={
                  !renderStatus[currentComparison.samples[0]] ||
                  !renderStatus[currentComparison.samples[1]]
                }
                className={`w-full py-3 font-mono uppercase tracking-wider border transition-transform ${renderStatus[currentComparison.samples[0]] &&
                  renderStatus[currentComparison.samples[1]]
                  ? 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white border-gray-900 dark:border-gray-600 hover:translate-y-[-2px]'
                  : 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 border-gray-400 dark:border-gray-500 cursor-not-allowed'
                  }`}
              >
                Vote B
              </button>
            </div>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white py-3 font-mono uppercase tracking-wider border border-green-800 dark:border-green-600 transition-transform hover:translate-y-[-2px]"
            >
              Next Comparison
            </button>
          )}

          {/* Space for layout consistency */}
          <div className="h-2"></div>
        </div>

        {voted && (
          <div className="hidden md:flex justify-center gap-2 pt-4">
            <button
              onClick={handleOpenShareModal}
              className="p-2 px-4 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-md flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </button>

            {userVote === 'A' && renderStatus[currentComparison.samples[0]] && (
              <button
                onClick={() => handleOpenScreenshotModal('A')}
                className="p-2 px-4 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                <span className="text-sm">Screenshot Winner</span>
              </button>
            )}

            {userVote === 'B' && renderStatus[currentComparison.samples[1]] && (
              <button
                onClick={() => handleOpenScreenshotModal('B')}
                className="p-2 px-4 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                <span className="text-sm">Screenshot Winner</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {currentComparison && (
        <ShareComparisonModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          sampleAId={currentComparison.samples[0]}
          sampleBId={currentComparison.samples[1]}
          prompt={currentComparison.buildDescription}
          modelA={modelNames.modelA || 'Model A'}
          modelB={modelNames.modelB || 'Model B'}
          winningModel={
            voted && userVote && userVote !== 'tie'
              ? userVote === 'A'
                ? modelNames.modelA
                : modelNames.modelB
              : undefined
          }
          losingModel={
            voted && userVote && userVote !== 'tie'
              ? userVote === 'A'
                ? modelNames.modelB
                : modelNames.modelA
              : undefined
          }
          winningSampleId={
            voted && userVote && userVote !== 'tie'
              ? userVote === 'A'
                ? currentComparison.samples[0]
                : currentComparison.samples[1]
              : undefined
          }
          losingSampleId={
            voted && userVote && userVote !== 'tie'
              ? userVote === 'A'
                ? currentComparison.samples[1]
                : currentComparison.samples[0]
              : undefined
          }
        />
      )}

      {/* Auth Modal - only show when user clicked Sign Up or Login */}
      {showAuthModal &&
        (authModalMode === 'signup' || authModalMode === 'login') && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            isLoading={false}
            mode={authModalMode}
          />
        )}

      {/* Screenshot Share Modal */}
      {showScreenshotModal && screenshotViewer && currentComparison && (
        <ScreenshotShare
          isOpen={showScreenshotModal}
          onClose={() => setShowScreenshotModal(false)}
          modelName={screenshotViewer === 'A' ? modelNames.modelA || 'Model A' : modelNames.modelB || 'Model B'}
          prompt={currentComparison.buildDescription}
          modelViewerRef={screenshotViewer === 'A' ? viewerRefA : viewerRefB}
        />
      )}

      {/* Custom prompt modal - show first to decide what to do */}
      {showAuthModal && authModalMode === 'prompt' && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 bg-opacity-75"></div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg z-10 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 dark:text-white text-center">
              Create an account
            </h3>
            <div className="mb-6 space-y-3">
              <p className="text-gray-800 dark:text-gray-200 font-medium text-left italic">
                unlock <span className="font-bold">more builds</span>
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-medium text-right italic">
                track <span className="font-bold">favorites</span> and voting{' '}
                <span className="font-bold">history</span>
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-medium text-left italic">
                contribute to the{' '}
                <span className="font-bold">official benchmark</span>
              </p>
            </div>
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  setShowAuthModal(false)
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 flex items-center gap-1"
              >
                <span>Keep Voting</span> <span className="text-xl">🤷</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('signup')
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('login')
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Log In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MCBench
