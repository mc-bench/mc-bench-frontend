import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { useFrame, useThree } from '@react-three/fiber'
import { Flag, Loader2, Share2 } from 'lucide-react'
import * as THREE from 'three'

import { api } from '../api/client'
import settings from '../config/settings'
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
import {
  ModelViewContainer,
  cleanupModel,
  modelPathCache,
  preloadModel,
} from './ModelUtils'
import Background from './background'

const getArtifactUrl = (artifact: AssetFile) => {
  // TODO: Make this better to detect whether the root url already
  //  encodes the bucket information
  if (settings.external_object_cdn_root_url.includes('mcbench.ai')) {
    return `${settings.external_object_cdn_root_url}/${artifact.key}`
  }

  return `${settings.external_object_cdn_root_url}/${artifact.bucket}/${artifact.key}`
}

const COMPARISON_EXPIRY = 50 * 60 * 1000 // 50 minutes in milliseconds
const TARGET_QUEUE_SIZE = 5
const REFILL_THRESHOLD = 2

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

  useEffect(() => {
    fetchMetricId()
      .then(setMetricId)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to fetch metric')
      )
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup all models when component unmounts
      comparisons.forEach((comparison) => {
        comparison.samples.forEach((sampleId) => {
          const modelPath = modelPathCache.get(sampleId)
          if (modelPath) {
            cleanupModel(modelPath)
          }
        })
      })

      if (currentComparison) {
        currentComparison.samples.forEach((sampleId) => {
          const modelPath = modelPathCache.get(sampleId)
          if (modelPath) {
            cleanupModel(modelPath)
          }
        })
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

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (voted || !currentComparison) return

      if (event.key === 'ArrowLeft') {
        handleVote('A')
      } else if (event.key === 'ArrowRight') {
        handleVote('B')
      } else if (event.key === 'ArrowDown') {
        handleVote('tie')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [voted, currentComparison])

  const handleNext = () => {
    if (currentComparison) {
      console.log('Starting cleanup for next comparison')
      currentComparison.samples.forEach((sampleId) => {
        const modelPath = modelPathCache.get(sampleId)
        if (modelPath) {
          console.log(
            'Cleaning up model for sampleId:',
            sampleId,
            'path:',
            modelPath
          )
          cleanupModel(modelPath)
        }
      })
    }
    setCurrentComparison(null)
    setVoted(false)
    setModelNames({ modelA: '', modelB: '' })
    // Reset view modes for both viewers
    setViewMode({ A: null, B: null })
  }

  // In MCBench.tsx
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

    try {
      await Promise.all([preloadModel(modelAPath), preloadModel(modelBPath)])

      // Only update preload status after successful load
      setPreloadStatus((prev) => ({
        ...prev,
        [currentComparison.samples[0]]: true,
        [currentComparison.samples[1]]: true,
      }))

      console.log('Preload complete for current models')

      // Also preload next comparison if available
      if (comparisons.length > 0) {
        const nextComparison = comparisons[0]
        const nextPaths = nextComparison.samples.map((sampleId) =>
          getModelPath(nextComparison, sampleId)
        )

        // Preload next models in background
        Promise.all(nextPaths.map(preloadModel)).then(() => {
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
      stats: {
        blocksUsed: 123,
        timeTaken: '12.3s',
      },
    },
    modelB: {
      modelPath: modelBPath,
      sampleId: currentComparison.samples[1],
      name: modelNames.modelB,
      stats: {
        blocksUsed: 135,
        timeTaken: '13.5s',
      },
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
    <div className="max-w-6xl mx-auto p-4 space-y-6 font-mono dark:text-gray-100">
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
          Prompt: {buildPair.prompt}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-0 md:gap-4">
          {[buildPair.modelA, buildPair.modelB].map((model, idx) => (
            <div
              key={idx}
              ref={idx === 0 ? viewerRefA : viewerRefB}
              className={`relative w-full md:flex-1 h-[400px] overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-900 dark:border-gray-600 ${
                idx === 0 ? 'mb-12 md:mb-0' : ''
              }`}
              onMouseEnter={() =>
                !isMobile && setActiveViewer(idx === 0 ? 'A' : 'B')
              }
              onMouseLeave={() => !isMobile && setActiveViewer(null)}
              onClick={() => handleViewerClick(idx === 0 ? 'A' : 'B')}
            >
              <div className="absolute bottom-2 left-2 z-10">
                <div className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md text-sm w-8 h-8 flex items-center justify-center">
                  {idx === 0 ? 'A' : 'B'}
                </div>
              </div>

              <ModelViewContainer
                modelPath={model.modelPath}
                initialCameraPosition={[30, 5, 30]}
                initialViewMode={viewMode[idx === 0 ? 'A' : 'B']}
                onViewChange={(position: string) =>
                  handleViewChange(idx === 0 ? 'A' : 'B', position)
                }
                onFullscreen={(e?: React.MouseEvent) => {
                  if (e) e.stopPropagation()
                  handleFullscreen(
                    idx === 0 ? viewerRefA : viewerRefB,
                    idx === 0 ? dimensionsRefA : dimensionsRefB
                  )
                }}
                showFullscreenButton={true}
                className="h-full w-full"
              >
                <Background />
                <Suspense fallback={null}>
                  {false && (
                    <WASDControls
                      isActive={activeViewer === (idx === 0 ? 'A' : 'B')}
                    />
                  )}
                </Suspense>
              </ModelViewContainer>
              {voted && modelNames.modelA && modelNames.modelB && (
                <div className="absolute top-2 left-2">
                  <div className="bg-black/25 dark:bg-white/10 text-white p-3 py-1 rounded-md text-sm">
                    {idx == 0 ? modelNames.modelA : modelNames.modelB}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!voted ? (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handleVote('A')}
              className="w-full bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white py-3 font-mono uppercase tracking-wider border border-gray-900 dark:border-gray-600 transition-transform hover:translate-y-[-2px]"
            >
              Vote A
            </button>
            <button
              onClick={() => handleVote('tie')}
              className="w-full bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white py-3 font-mono uppercase tracking-wider border border-gray-900 dark:border-gray-600 transition-transform hover:translate-y-[-2px]"
            >
              Tie
            </button>
            <button
              onClick={() => handleVote('B')}
              className="w-full bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white py-3 font-mono uppercase tracking-wider border border-gray-900 dark:border-gray-600 transition-transform hover:translate-y-[-2px]"
            >
              Vote B
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {[buildPair.modelA, buildPair.modelB].map((model, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-900 dark:border-gray-600 p-4 font-mono"
                >
                  <div className="grid grid-cols-2 gap-4 text-sm dark:text-gray-200">
                    <div className="text-center">
                      <div className="font-bold uppercase">Blocks</div>
                      <div>{model.stats.blocksUsed}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold uppercase">Time</div>
                      <div>{model.stats.timeTaken}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white py-3 font-mono uppercase tracking-wider border border-green-800 dark:border-green-600 transition-transform hover:translate-y-[-2px]"
            >
              Next Comparison
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2 pt-4">
          <button className="p-2 border border-gray-900 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="p-2 border border-gray-900 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200">
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MCBench
