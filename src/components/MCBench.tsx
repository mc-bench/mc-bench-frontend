import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  BookOpen,
  Code2,
  Flag,
  Loader2,
  Maximize2,
  Share2,
  Trophy,
} from 'lucide-react'
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
import { Model, cleanupModel, modelPathCache, preloadModel } from './ModelUtils'
import Background from './background'

const getArtifactUrl = (artifact: AssetFile) => {
  // TODO: Make this better to detect whether the root url already
  //  encodes the bucket information
  if (settings.external_object_cdn_root_url.includes('mcbench.ai')) {
    return `${settings.external_object_cdn_root_url}/${artifact.key}`
  }

  return `${settings.external_object_cdn_root_url}/${artifact.bucket}/${artifact.key}`
}

const UnauthenticatedView = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold dark:text-white">
          Minecraft Benchmark
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Help advance AI research by comparing and rating Minecraft builds
          generated by different AI models
        </p>

        <div className="max-w-xl mx-auto bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Join Our Research Community
          </h3>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            Login to start rating builds and contribute to AI research in
            creative generation
          </p>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center mb-4">
            <Trophy className="h-10 w-10 text-yellow-500 mb-3" />
            <h3 className="text-xl font-semibold dark:text-gray-200">
              Rate & Compare
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-200 text-center">
            Compare AI-generated builds and help determine which models perform
            best
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center mb-4">
            <Code2 className="h-10 w-10 text-blue-500 mb-3" />
            <h3 className="text-xl font-semibold dark:text-gray-200">
              Advance Research
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-200 text-center">
            Contribute to cutting-edge AI research in creative generation
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center mb-4">
            <BookOpen className="h-10 w-10 text-green-500 mb-3" />
            <h3 className="text-xl font-semibold dark:text-gray-200">
              Track Impact
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-200 text-center">
            See your contribution impact on our research leaderboard
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-4 dark:text-white">
            How It Works
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">1.</span>
              <span>View two AI-generated Minecraft builds side by side</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">2.</span>
              <span>Choose which build better matches the given prompt</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">3.</span>
              <span>Help improve AI models through your feedback</span>
            </li>
          </ol>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-4 dark:text-white">
            Why Participate?
          </h3>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span>🔬</span>
              <span>Contribute to cutting-edge AI research</span>
            </li>
            <li className="flex gap-3">
              <span>🎮</span>
              <span>Help improve AI generation for Minecraft</span>
            </li>
            <li className="flex gap-3">
              <span>🏆</span>
              <span>Track your contribution impact on the leaderboard</span>
            </li>
          </ul>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isLoading={false}
        mode="login"
      />
    </div>
  )
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

// First, let's create a simple component that will handle the camera controls
interface CameraControlsProps {
  viewMode: string | null
}

const CameraControls = ({ viewMode }: CameraControlsProps) => {
  const { camera } = useThree()

  useEffect(() => {
    if (viewMode?.startsWith('front')) {
      camera.position.set(0, 0, -30)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('back')) {
      camera.position.set(0, 0, 30)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('left')) {
      camera.position.set(30, 0, 0)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('right')) {
      camera.position.set(-30, 0, 0)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('top')) {
      camera.position.set(0, 30, 0)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('bottom')) {
      camera.position.set(0, -30, 0)
      camera.lookAt(0, 0, 0)
    }
  }, [viewMode, camera])

  return null
}

const MCBench = () => {
  const { isAuthenticated } = useAuth()

  // If not authenticated, show the landing page
  if (!isAuthenticated) {
    return <UnauthenticatedView />
  }
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

    const orderedSampleIds =
      choice === 'A'
        ? currentComparison.samples
        : choice === 'B'
          ? currentComparison.samples.slice().reverse()
          : currentComparison.samples // For tie, keep the original order

    const payload: UserComparisonRequest = {
      comparisonDetails: {
        token: currentComparison.token,
        samples: currentComparison.samples,
      },
      orderedSampleIds,
    }

    if (choice === 'tie') {
      // Add a tie flag to the payload.
      // The backend should check for this flag to register a tie vote.
      ;(payload as any).tie = true
    }

    console.log('Submitting vote: ', payload)

    try {
      const { data } = await api.post<ComparisonResultResponse>(
        '/comparison/result',
        payload
      )
      setModelNames({
        modelA: data.sample_1_model,
        modelB: data.sample_2_model,
      })
      console.log('Set model names:', modelNames)
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
              <div className="absolute top-2 right-2 z-10">
                <div className="flex flex-col items-center gap-1">
                  {/* Top row with fullscreen and Top view */}
                  <div className="flex gap-1 justify-end w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewChange(idx === 0 ? 'A' : 'B', 'top')
                      }}
                      className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/70 dark:hover:bg-white/20"
                    >
                      T
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFullscreen(
                          idx === 0 ? viewerRefA : viewerRefB,
                          idx === 0 ? dimensionsRefA : dimensionsRefB
                        )
                      }}
                      className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/70 dark:hover:bg-white/20"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Middle row buttons */}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewChange(idx === 0 ? 'A' : 'B', 'left')
                      }}
                      className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/70 dark:hover:bg-white/20"
                    >
                      L
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewChange(idx === 0 ? 'A' : 'B', 'front')
                      }}
                      className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/70 dark:hover:bg-white/20"
                    >
                      F
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewChange(idx === 0 ? 'A' : 'B', 'right')
                      }}
                      className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/70 dark:hover:bg-white/20"
                    >
                      R
                    </button>
                  </div>

                  {/* Bottom button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewChange(idx === 0 ? 'A' : 'B', 'bottom')
                    }}
                    className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/70 dark:hover:bg-white/20"
                  >
                    B
                  </button>

                  {/* Back button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewChange(idx === 0 ? 'A' : 'B', 'back')
                    }}
                    className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/70 dark:hover:bg-white/20"
                  >
                    K
                  </button>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 z-10">
                <div className="bg-black/25 dark:bg-white/10 text-white p-2 rounded-md text-sm w-8 h-8 flex items-center justify-center">
                  {idx === 0 ? 'A' : 'B'}
                </div>
              </div>
              <Canvas
                camera={{
                  position: [30, 5, 30],
                  fov: 60,
                }}
              >
                <Background />
                <Suspense fallback={null}>
                  <Model path={model.modelPath} />
                  <CameraControls viewMode={viewMode[idx === 0 ? 'A' : 'B']} />
                  {true ? (
                    <OrbitControls
                      enableZoom={true}
                      minDistance={1}
                      maxDistance={100}
                      target={[0, 0, 0]}
                    />
                  ) : (
                    <WASDControls
                      isActive={activeViewer === (idx === 0 ? 'A' : 'B')}
                    />
                  )}
                </Suspense>
              </Canvas>
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
