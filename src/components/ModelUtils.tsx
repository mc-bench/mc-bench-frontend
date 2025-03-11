import React, { useEffect, useRef, useState } from 'react'

import { OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Cache maps for models to prevent duplicate loading
export const modelLoadingCache = new Map<string, Promise<GLTF>>()
export const modelPathCache = new Map<string, string>()
export const gltfCache = new Map<string, GLTF>()
// Track URLs that have been requested to prevent duplicate fetches
export const requestedUrls = new Set<string>()
// Cache for optimized models
export const optimizedModelCache = new Map<string, THREE.Group>()

// Helper to dispose of materials
const disposeMaterial = (material: THREE.Material) => {
  material.dispose()

  // Check if material has these properties before trying to dispose
  if ('map' in material && material.map instanceof THREE.Texture) {
    material.map.dispose()
  }
  if ('normalMap' in material && material.normalMap instanceof THREE.Texture) {
    material.normalMap.dispose()
  }
  if (
    'specularMap' in material &&
    material.specularMap instanceof THREE.Texture
  ) {
    material.specularMap.dispose()
  }
  if ('envMap' in material && material.envMap instanceof THREE.Texture) {
    material.envMap.dispose()
  }
}

// Helper to dispose of all objects
const disposeObject = (obj: THREE.Object3D) => {
  if (obj instanceof THREE.Mesh) {
    if (obj.geometry) {
      obj.geometry.dispose()
    }

    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material) => disposeMaterial(material))
      } else {
        disposeMaterial(obj.material)
      }
    }
  }
}

export const cleanupModel = (modelPath: string) => {
  console.log('Cleaning up model:', modelPath)
  const gltf = gltfCache.get(modelPath)

  if (gltf) {
    // Traverse and dispose all objects
    gltf.scene.traverse(disposeObject)

    // Remove from our caches
    modelLoadingCache.delete(modelPath)
    modelPathCache.forEach((path, key) => {
      if (path === modelPath) modelPathCache.delete(key)
    })
    gltfCache.delete(modelPath)

    // Clean up optimized model if it exists
    if (optimizedModelCache.has(modelPath)) {
      const optimizedModel = optimizedModelCache.get(modelPath)!
      const optimizer = new ModelOptimizer()
      optimizer.dispose(optimizedModel)
      optimizedModelCache.delete(modelPath)
      console.log('Cleaned up optimized model:', modelPath)
    }

    // Also remove from drei's cache
    useGLTF.clear(modelPath)
  }
}

// Global store for model metadata
export interface ModelMetadata {
  boundingBox: THREE.Box3
  boundingSphere: THREE.Sphere
  center: THREE.Vector3 // Geometric center
  centerOfMass: THREE.Vector3 // Weighted center
  dimensions: THREE.Vector3
  maxDimension: number
}

export const modelMetadataCache = new Map<string, ModelMetadata>()

// Model component with built-in cleanup
interface ModelProps {
  path: string
  onMetadataCalculated?: (metadata: ModelMetadata) => void
}

// Calculate a weighted center of mass for a 3D model
// This takes into account the volume distribution, giving more weight to dense areas
const calculateCenterOfMass = (scene: THREE.Object3D): THREE.Vector3 => {
  const centerOfMass = new THREE.Vector3()
  let totalVolume = 0

  // Collect all meshes and their bounding box data
  const meshData: {
    mesh: THREE.Mesh
    volume: number
    center: THREE.Vector3
  }[] = []

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      // For each mesh, calculate its volume and center
      const meshBoundingBox = new THREE.Box3().setFromObject(object)
      const meshCenter = new THREE.Vector3()
      meshBoundingBox.getCenter(meshCenter)

      // Calculate volume - for Minecraft-like structures, we add a height bias
      // This gives more weight to lower parts, which is visually appealing for structures
      const size = new THREE.Vector3()
      meshBoundingBox.getSize(size)

      // Base volume calculation
      let volume = size.x * size.y * size.z

      // Apply a bias that gives more weight to lower parts (y is height in standard coordinate system)
      // This uses a basic formula that multiplies volume by (1 + bias_factor * (max_height - current_height) / max_height)
      // Lower parts get more weight, upper parts get less
      const heightPosition = (meshCenter.y - meshBoundingBox.min.y) / size.y // 0 = bottom, 1 = top
      const heightBias = 1 + (1 - heightPosition) // 2 at bottom, 1 at top
      volume *= heightBias

      meshData.push({
        mesh: object,
        volume,
        center: meshCenter,
      })

      totalVolume += volume
    }
  })

  // Calculate the weighted center of mass
  meshData.forEach(({ center, volume }) => {
    // Add contribution of this mesh to the center of mass
    centerOfMass.x += center.x * volume
    centerOfMass.y += center.y * volume
    centerOfMass.z += center.z * volume
  })

  // Normalize
  if (totalVolume > 0) {
    centerOfMass.divideScalar(totalVolume)
  }

  return centerOfMass
}

export const Model = ({ path, onMetadataCalculated }: ModelProps) => {
  // Use preload before using the model
  useEffect(() => {
    // Make sure the model is in the cache
    if (!gltfCache.has(path) && !modelLoadingCache.has(path)) {
      preloadModel(path).catch((err) =>
        console.error('Error preloading in Model component:', err)
      )
    }
  }, [path])

  // Get the model from cache or load it
  const gltf = useGLTF(path) as unknown as GLTF
  const { scene } = useThree()
  const [useOptimized, setUseOptimized] = useState(false)
  const [optimizedModel, setOptimizedModel] = useState<THREE.Group | null>(null)

  useEffect(() => {
    // Only proceed if we haven't already calculated metadata for this model
    if (!modelMetadataCache.has(path)) {
      // Store in our cache
      gltfCache.set(path, gltf)

      // Calculate model bounding box
      const boundingBox = new THREE.Box3().setFromObject(gltf.scene)
      const center = new THREE.Vector3()
      boundingBox.getCenter(center)

      const dimensions = new THREE.Vector3()
      boundingBox.getSize(dimensions)

      // Calculate the bounding sphere
      const boundingSphere = new THREE.Sphere()
      boundingBox.getBoundingSphere(boundingSphere)

      // Find the maximum dimension for camera positioning
      const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z)

      // Calculate the center of mass (weighted center)
      const centerOfMass = calculateCenterOfMass(gltf.scene)

      // If the calculation failed or produced NaN values, fall back to geometric center
      if (
        isNaN(centerOfMass.x) ||
        isNaN(centerOfMass.y) ||
        isNaN(centerOfMass.z)
      ) {
        centerOfMass.copy(center)
      }

      // Store model metadata
      const metadata = {
        boundingBox,
        boundingSphere,
        center,
        centerOfMass,
        dimensions,
        maxDimension,
      }

      modelMetadataCache.set(path, metadata)

      // Store metadata in scene userData for other components to access
      scene.userData.modelMetadata = metadata

      if (onMetadataCalculated) {
        onMetadataCalculated(metadata)
      }

      // Check if we have an optimized version of this model
      if (optimizedModelCache.has(path)) {
        console.log(`Using optimized model for ${path}`)
        const optimized = optimizedModelCache.get(path)!
        setOptimizedModel(optimized)
        setUseOptimized(true)

        // Center the optimized model using the center of mass
        optimized.position.set(
          -centerOfMass.x,
          -centerOfMass.y,
          -centerOfMass.z
        )
      } else {
        // Center the original model using the center of mass instead of geometric center
        gltf.scene.position.set(
          -centerOfMass.x,
          -centerOfMass.y,
          -centerOfMass.z
        )
      }

      // Log model dimensions and centers for debugging
      console.log(`Model ${path} dimensions:`, dimensions, 'Max:', maxDimension)
      console.log(`Model ${path} centers:`, { geometric: center, centerOfMass })
    } else {
      // If metadata already exists, store it in scene userData and call the callback
      const metadata = modelMetadataCache.get(path)!
      scene.userData.modelMetadata = metadata

      if (onMetadataCalculated) {
        onMetadataCalculated(metadata)
      }

      // Check if we have an optimized version of this model
      if (optimizedModelCache.has(path)) {
        console.log(`Using optimized model for ${path}`)
        const optimized = optimizedModelCache.get(path)!
        setOptimizedModel(optimized)
        setUseOptimized(true)

        // Center the optimized model using the center of mass
        optimized.position.set(
          -metadata.centerOfMass.x,
          -metadata.centerOfMass.y,
          -metadata.centerOfMass.z
        )
      } else {
        // Center the original model using the center of mass
        gltf.scene.position.set(
          -metadata.centerOfMass.x,
          -metadata.centerOfMass.y,
          -metadata.centerOfMass.z
        )
      }
    }

    // Cleanup when component unmounts
    return () => {
      // We don't want to clean up the model on every unmount anymore
      // because we want to keep it in cache between views
      // cleanupModel(path);
    }
  }, [path, gltf, onMetadataCalculated, scene])

  // Render the optimized model if available, otherwise render the original
  return useOptimized && optimizedModel ? (
    <primitive object={optimizedModel} />
  ) : (
    <primitive object={gltf.scene} />
  )
}

// Auto camera adjustment component
export interface AutoCameraProps {
  modelPath: string
  fitOffset?: number // Multiplier to adjust camera distance (default: 1.8)
}

export const AutoCamera = ({ modelPath, fitOffset = 1.8 }: AutoCameraProps) => {
  const { camera } = useThree()
  const isInitializedRef = useRef(false)

  // Run once on mount to set up the camera based on model size
  useEffect(() => {
    if (isInitializedRef.current) return

    // Check if model metadata is available
    const checkMetadata = () => {
      if (modelMetadataCache.has(modelPath)) {
        const metadata = modelMetadataCache.get(modelPath)!
        const { maxDimension } = metadata

        // Calculate optimal distance based on model size and camera FOV
        const isPerspectiveCamera = 'fov' in camera
        let distance: number

        if (isPerspectiveCamera) {
          const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
          // Calculate minimum distance to ensure we're outside the bounding box
          // We need a minimum safe distance of maxDimension to ensure we're outside the model
          const minSafeDistance = maxDimension * 1.2 // 20% buffer beyond max dimension

          // Standard distance calculation based on FOV
          const standardDistance =
            (maxDimension / 2 / Math.tan(fov / 2)) * fitOffset

          // Use the larger of the two distances to ensure we're outside the model
          distance = Math.max(standardDistance, minSafeDistance)
        } else {
          // For orthographic camera
          distance = maxDimension * 2.0 * fitOffset
        }

        // Use a 30° elevation angle for a top-down perspective
        // Set camera directly above the model at specified elevation
        const horizontalDistance = distance * Math.cos(Math.PI / 6) // 30° elevation
        const elevationHeight = distance * Math.sin(Math.PI / 6)

        // Position camera at 45° angle (diagonal view)
        camera.position.set(
          horizontalDistance * Math.cos(Math.PI / 4),
          elevationHeight,
          horizontalDistance * Math.sin(Math.PI / 4)
        )

        // Look at the center of the model
        // Note: We still look at origin because we reposition the model to center the center of mass at origin
        camera.lookAt(0, 0, 0)

        // Update near and far planes for optimal rendering
        camera.near = Math.max(0.1, distance / 100)
        camera.far = distance * 100
        camera.updateProjectionMatrix()

        console.log(
          `Camera positioned at distance ${distance.toFixed(1)} from model with 30° elevation (safe distance: ${(maxDimension * 1.2).toFixed(1)})`
        )
        isInitializedRef.current = true
      } else {
        // If metadata isn't available yet, try again in 100ms
        setTimeout(checkMetadata, 100)
      }
    }

    checkMetadata()

    return () => {
      isInitializedRef.current = false
    }
  }, [camera, modelPath, fitOffset])

  return null
}

// Create a singleton loader instance with caching enabled
const loader = new GLTFLoader()
loader.setCrossOrigin('use-credentials') // Enable CORS with credentials

// Camera Controls component for orthogonal views
export interface CameraControlsProps {
  viewMode: string | null
  modelPath?: string
}

export const CameraControls = ({
  viewMode,
  modelPath,
}: CameraControlsProps) => {
  const { camera, gl } = useThree()

  useEffect(() => {
    // Get model metadata if available
    let distanceFactor = 30 // Default distance

    if (modelPath && modelMetadataCache.has(modelPath)) {
      const metadata = modelMetadataCache.get(modelPath)!
      // Calculate optimal distance based on model size
      distanceFactor = metadata.maxDimension * 2.5
    }

    // Apply camera positioning based on view mode with dynamic distance
    if (viewMode?.startsWith('front')) {
      camera.position.set(0, 0, distanceFactor)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('back')) {
      camera.position.set(0, 0, -distanceFactor)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('left')) {
      camera.position.set(-distanceFactor, 0, 0)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('right')) {
      camera.position.set(distanceFactor, 0, 0)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('top')) {
      camera.position.set(0, distanceFactor, 0)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('bottom')) {
      camera.position.set(0, -distanceFactor, 0)
      camera.lookAt(0, 0, 0)
    } else if (viewMode?.startsWith('reset')) {
      // Reset position to initial view - recreate the initial camera position
      if (modelPath && modelMetadataCache.has(modelPath)) {
        const metadata = modelMetadataCache.get(modelPath)!
        const { maxDimension } = metadata

        // Calculate optimal distance based on model size and camera FOV
        const isPerspectiveCamera = 'fov' in camera
        let distance: number

        if (isPerspectiveCamera) {
          const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
          // Calculate minimum distance to ensure we're outside the bounding box
          const minSafeDistance = maxDimension * 1.2 // 20% buffer beyond max dimension

          // Standard distance calculation based on FOV
          const standardDistance = (maxDimension / 2 / Math.tan(fov / 2)) * 1.8

          // Use the larger of the two distances to ensure we're outside the model
          distance = Math.max(standardDistance, minSafeDistance)
        } else {
          distance = maxDimension * 2.0 * 1.8
        }

        // Use a 30° elevation angle for a top-down perspective
        const horizontalDistance = distance * Math.cos(Math.PI / 6) // 30° elevation
        const elevationHeight = distance * Math.sin(Math.PI / 6)

        // Position camera at 45° angle (diagonal view)
        camera.position.set(
          horizontalDistance * Math.cos(Math.PI / 4),
          elevationHeight,
          horizontalDistance * Math.sin(Math.PI / 4)
        )

        // Look at the center of the model
        // Note: We still look at origin because we reposition the model to center the center of mass at origin
        camera.lookAt(0, 0, 0)

        // Signal to restart rotation - this will be picked up by the controls component
        document.dispatchEvent(new CustomEvent('reset-auto-rotate'))
      }
    }
  }, [viewMode, camera, modelPath, gl])

  return null
}

// Orthogonal View Controls component
export interface OrthogonalViewControlsProps {
  onViewChange: (position: string) => void
  className?: string
  onFullscreen?: (e?: React.MouseEvent) => void
  showFullscreenButton?: boolean
  containerBackgroundClass?: string
  buttonBackgroundClass?: string
  viewerId?: string
}

export const OrthogonalViewControls = ({
  onViewChange,
  className = '',
  onFullscreen,
  containerBackgroundClass = '',
  buttonBackgroundClass = 'bg-white/10 hover:bg-white/20',
  viewerId,
}: OrthogonalViewControlsProps) => {
  const handleViewClick = (position: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    // If viewerId is provided, we're in a multi-viewer setup like MCBench
    if (viewerId) {
      onViewChange(`${viewerId}-${position}`)
    } else {
      onViewChange(position)
    }
  }

  const handleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (onFullscreen) onFullscreen(e)
  }

  return (
    <div className={`${containerBackgroundClass} ${className}`}>
      {/* 3x3 grid layout for controls */}
      <div className="grid grid-cols-3 gap-1 w-28">
        {/* Top row: empty | Top | Fullscreen */}
        <div className="w-8 h-8"></div>
        <button
          onClick={(e) => handleViewClick('top', e)}
          className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
        >
          T
        </button>
        {onFullscreen ? (
          <button
            onClick={handleFullscreen}
            className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
            title="Fullscreen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
        ) : (
          <div className="w-8 h-8"></div>
        )}

        {/* Middle row: Left | Front | Right */}
        <button
          onClick={(e) => handleViewClick('left', e)}
          className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
        >
          L
        </button>
        <button
          onClick={(e) => handleViewClick('front', e)}
          className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
        >
          F
        </button>
        <button
          onClick={(e) => handleViewClick('right', e)}
          className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
        >
          R
        </button>

        {/* Bottom row: empty | Bottom | Reset */}
        <div className="w-8 h-8"></div>
        <button
          onClick={(e) => handleViewClick('bottom', e)}
          className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
        >
          B
        </button>
        <button
          onClick={(e) => handleViewClick('reset', e)}
          className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
          title="Reset View"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>

        {/* Extra row: empty | Back | empty */}
        <div className="w-8 h-8"></div>
        <button
          onClick={(e) => handleViewClick('back', e)}
          className={`${buttonBackgroundClass} text-white p-2 rounded-md w-8 h-8 flex items-center justify-center`}
        >
          K
        </button>
        <div className="w-8 h-8"></div>
      </div>
    </div>
  )
}

// Auto-rotating orbit controls
export interface AutoRotateProps {
  speed?: number
  enabled?: boolean
  modelPath?: string
}

// Dummy component that does nothing - we'll use built-in OrbitControls autoRotate
export const AutoRotate = (_props: AutoRotateProps) => {
  return null
}

// OrbitControls that stops auto-rotation after user interaction
interface ControlsWithInteractionDetectionProps
  extends Omit<React.ComponentProps<typeof OrbitControls>, 'autoRotate'> {
  initialAutoRotate?: boolean
}

const ControlsWithInteractionDetection = ({
  initialAutoRotate = true,
  autoRotateSpeed = 2.5,
  ...props
}: ControlsWithInteractionDetectionProps) => {
  const { gl } = useThree()
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate)
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const canvas = gl.domElement

    // Function to stop auto-rotation on user interaction
    const stopAutoRotate = () => {
      setAutoRotate(false)

      // After stopping, remove event listeners
      canvas.removeEventListener('mousedown', stopAutoRotate)
      canvas.removeEventListener('touchstart', stopAutoRotate)
    }

    // Function to restart auto-rotation (triggered by reset button)
    const resetAutoRotate = () => {
      setAutoRotate(true)
    }

    // Only add listeners if auto-rotation is active
    if (autoRotate) {
      canvas.addEventListener('mousedown', stopAutoRotate)
      canvas.addEventListener('touchstart', stopAutoRotate)
    }

    // Listen for reset event
    document.addEventListener('reset-auto-rotate', resetAutoRotate)

    return () => {
      // Cleanup event listeners
      canvas.removeEventListener('mousedown', stopAutoRotate)
      canvas.removeEventListener('touchstart', stopAutoRotate)
      document.removeEventListener('reset-auto-rotate', resetAutoRotate)
    }
  }, [gl, autoRotate])

  const { scene } = useThree()

  // Update orbit controls if reference changes
  useEffect(() => {
    if (controlsRef.current) {
      // Ensure the controls are properly configured
      controlsRef.current.update()
    }
  }, [autoRotate, autoRotateSpeed, scene.userData.modelMetadata])

  // Calculate optimal rotation speed based on model size
  let adjustedRotateSpeed = autoRotateSpeed

  // Check if there's metadata in context through scene userData to scale rotation speed
  if (
    scene.userData.modelMetadata &&
    scene.userData.modelMetadata.maxDimension
  ) {
    const maxDim = scene.userData.modelMetadata.maxDimension
    // Use square root scaling (faster rotation for larger objects, slower for smaller)
    // Assuming 10 units is "normal" sized, scale from there
    const normalizedSize = maxDim / 10
    adjustedRotateSpeed = autoRotateSpeed * Math.sqrt(normalizedSize)

    // Clamp the rotation speed to reasonable bounds (not too fast or too slow)
    adjustedRotateSpeed = Math.max(0.5, Math.min(adjustedRotateSpeed, 5))
  }

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={autoRotate}
      autoRotateSpeed={adjustedRotateSpeed}
      {...props}
    />
  )
}

// A reusable component for model viewing with all features
export interface ModelViewContainerProps {
  modelPath: string
  initialCameraPosition?: [number, number, number]
  initialViewMode?: string | null
  autoRotate?: boolean
  autoRotateSpeed?: number
  onViewChange?: (position: string) => void
  children?: React.ReactNode
  className?: string
  onFullscreen?: (e?: React.MouseEvent) => void
  showFullscreenButton?: boolean
}

export const ModelViewContainer = ({
  modelPath,
  initialCameraPosition = [30, 5, 30],
  initialViewMode = null,
  autoRotate = true,
  autoRotateSpeed = 2.5,
  onViewChange,
  children,
  className,
  onFullscreen,
  showFullscreenButton = false,
}: ModelViewContainerProps) => {
  const [viewMode, setViewMode] = useState<string | null>(initialViewMode)
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null)

  // Optional callback to get model metadata when it's calculated
  const handleMetadataCalculated = (metadata: ModelMetadata) => {
    setModelMetadata(metadata)
  }

  // Handle view changes internally and propagate to parent if needed
  const handleViewChange = (position: string) => {
    // Add timestamp to force state change
    const viewModeWithTimestamp = `${position}-${Date.now()}`
    setViewMode(viewModeWithTimestamp)

    if (onViewChange) {
      onViewChange(position)
    }
  }

  // Set initial camera position dynamically based on model size
  let cameraPosition = new THREE.Vector3(...initialCameraPosition)
  if (modelMetadata) {
    const distanceFactor = modelMetadata.maxDimension * 1.5
    // Scale the initial position to maintain same view angle but adjust distance
    const length = Math.sqrt(
      initialCameraPosition[0] ** 2 +
        initialCameraPosition[1] ** 2 +
        initialCameraPosition[2] ** 2
    )
    const scaleFactor = distanceFactor / length
    cameraPosition = new THREE.Vector3(
      initialCameraPosition[0] * scaleFactor,
      initialCameraPosition[1] * scaleFactor,
      initialCameraPosition[2] * scaleFactor
    )
  }

  return (
    <div className={`relative ${className || ''}`}>
      <div className="absolute top-2 right-2 z-10">
        <OrthogonalViewControls
          onViewChange={handleViewChange}
          onFullscreen={onFullscreen}
          showFullscreenButton={showFullscreenButton}
        />
      </div>

      <Canvas camera={{ position: cameraPosition, fov: 60 }}>
        <Model
          path={modelPath}
          onMetadataCalculated={handleMetadataCalculated}
        />
        <AutoCamera modelPath={modelPath} fitOffset={1.8} />
        <CameraControls viewMode={viewMode} modelPath={modelPath} />
        <ControlsWithInteractionDetection
          enableZoom={true}
          maxDistance={modelMetadata ? modelMetadata.maxDimension * 5 : 100}
          target={new THREE.Vector3(0, 0, 0)}
          enableDamping={true}
          dampingFactor={0.05}
          initialAutoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          position0={new THREE.Vector3(...initialCameraPosition)}
          rotateSpeed={0.5}
          enablePan={true}
        />
        {children}
      </Canvas>
    </div>
  )
}

// Model optimization classes and interfaces
interface OptimizationStats {
  originalMeshCount: number
  optimizedMeshCount: number
  originalTriangles: number
  optimizedTriangles: number
  drawCalls: number
}

export class ModelOptimizer {
  private stats: OptimizationStats = {
    originalMeshCount: 0,
    optimizedMeshCount: 0,
    originalTriangles: 0,
    optimizedTriangles: 0,
    drawCalls: 0,
  }

  /**
   * Optimizes a Three.js scene by combining meshes and using instancing
   * @param scene The scene to optimize
   * @returns Object containing the optimized model and optimization statistics
   */
  public optimize(scene: THREE.Scene | THREE.Group): {
    optimizedModel: THREE.Group
    stats: OptimizationStats
  } {
    // Create result group to hold optimized meshes
    const resultGroup = new THREE.Group()
    resultGroup.name = 'OptimizedModel'

    // Track statistics
    let originalMeshCount = 0
    let originalTriangles = 0

    // Create material groups map
    const materialGroups = new Map<
      string,
      {
        material: THREE.Material
        geometries: THREE.BufferGeometry[]
        worldPositions: THREE.Matrix4[]
      }
    >()

    // First pass: Group by materials
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh
        originalMeshCount++

        // Count original triangles
        const triangleCount = mesh.geometry.index
          ? mesh.geometry.index.count / 3
          : mesh.geometry.attributes.position.count / 3
        originalTriangles += triangleCount

        if (!mesh.visible) return

        const material = mesh.material as THREE.Material
        if (!material) return

        // Use material UUID as key
        const key = material.uuid

        // Create new material group if needed
        if (!materialGroups.has(key)) {
          materialGroups.set(key, {
            material: material.clone(),
            geometries: [],
            worldPositions: [],
          })
        }

        // Store geometry and world matrix
        mesh.updateWorldMatrix(true, false)
        materialGroups.get(key)!.worldPositions.push(mesh.matrixWorld.clone())
        materialGroups.get(key)!.geometries.push(mesh.geometry.clone())
      }
    })

    let optimizedMeshCount = 0
    let optimizedTriangles = 0

    // Process each material group
    materialGroups.forEach((group) => {
      // Create map for unique geometries
      const uniqueGeometries = new Map<
        string,
        {
          geometry: THREE.BufferGeometry
          count: number
          matrices: THREE.Matrix4[]
        }
      >()

      // Find repeated geometries
      for (let i = 0; i < group.geometries.length; i++) {
        const geometry = group.geometries[i]
        const vertexCount = geometry.attributes.position.count
        const indexCount = geometry.index?.count || 0

        // Create geometry hash
        const geometryKey = `vertices:${vertexCount}:indices:${indexCount}`

        if (!uniqueGeometries.has(geometryKey)) {
          uniqueGeometries.set(geometryKey, {
            geometry,
            count: 1,
            matrices: [group.worldPositions[i]],
          })
        } else {
          uniqueGeometries.get(geometryKey)!.count++
          uniqueGeometries
            .get(geometryKey)!
            .matrices.push(group.worldPositions[i])
        }
      }

      // Create optimized meshes
      uniqueGeometries.forEach((uniqueGeom) => {
        // Count triangles for this geometry
        const triangleCount = uniqueGeom.geometry.index
          ? uniqueGeom.geometry.index.count / 3
          : uniqueGeom.geometry.attributes.position.count / 3

        if (uniqueGeom.count > 1) {
          // Create instanced mesh for repeated geometries
          const instancedMesh = new THREE.InstancedMesh(
            uniqueGeom.geometry,
            group.material,
            uniqueGeom.count
          )

          // Set matrix for each instance
          uniqueGeom.matrices.forEach((matrix, index) => {
            instancedMesh.setMatrixAt(index, matrix)
          })

          instancedMesh.instanceMatrix.needsUpdate = true
          resultGroup.add(instancedMesh)
          optimizedMeshCount++
          optimizedTriangles += triangleCount
        } else {
          // Create regular mesh for single occurrences
          const mesh = new THREE.Mesh(uniqueGeom.geometry, group.material)
          mesh.applyMatrix4(uniqueGeom.matrices[0])
          resultGroup.add(mesh)
          optimizedMeshCount++
          optimizedTriangles += triangleCount
        }
      })
    })

    // Update statistics
    this.stats = {
      originalMeshCount,
      optimizedMeshCount,
      originalTriangles,
      optimizedTriangles,
      drawCalls: optimizedMeshCount, // Each mesh or instanced mesh is one draw call
    }

    return {
      optimizedModel: resultGroup,
      stats: this.stats,
    }
  }

  /**
   * Clean up resources used during optimization
   * @param model The optimized model to dispose
   */
  public dispose(model: THREE.Group): void {
    model.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose())
        } else {
          mesh.material.dispose()
        }
      }
    })
  }
}

export const preloadModel = async (modelPath: string): Promise<void> => {
  console.log('Preloading model:', modelPath)

  // If already loaded in gltfCache, don't reload
  if (gltfCache.has(modelPath)) {
    console.log('Model already in cache:', modelPath)
    return Promise.resolve()
  }

  // If currently loading, wait for that promise
  if (modelLoadingCache.has(modelPath)) {
    console.log('Model currently loading:', modelPath)
    return modelLoadingCache.get(modelPath)!.then(() => {})
  }

  // Check if we've already requested this URL to prevent blob duplicates
  if (requestedUrls.has(modelPath)) {
    console.log('URL already requested, using cached results:', modelPath)
    return Promise.resolve()
  }

  // Mark this URL as requested
  requestedUrls.add(modelPath)

  console.log('Starting new load for model:', modelPath)
  const loadPromise = new Promise<GLTF>((resolve, reject) => {
    // Use browser cache for textures and resources
    // Meshopt decoder is not enabled by default, so no need to disable it

    loader.load(
      modelPath,
      (gltf) => {
        console.log('Model loaded successfully:', modelPath)
        // Store the loaded model in our cache
        gltfCache.set(modelPath, gltf)

        // Optimize the model if it's large (more than 1000 meshes as a threshold)
        let meshCount = 0
        gltf.scene.traverse((child) => {
          if ((child as any).isMesh) meshCount++
        })

        // Only optimize if there are many meshes (indicating a complex model)
        if (meshCount > 100) {
          console.log(
            `Model ${modelPath} has ${meshCount} meshes - optimizing...`
          )
          try {
            const optimizer = new ModelOptimizer()
            const { optimizedModel, stats } = optimizer.optimize(gltf.scene)

            // Store the optimized model in our cache
            optimizedModelCache.set(modelPath, optimizedModel)

            // Log optimization results
            console.log(`Model optimization complete for ${modelPath}:`, {
              originalMeshes: stats.originalMeshCount,
              optimizedMeshes: stats.optimizedMeshCount,
              drawCallReduction: `${Math.round((1 - stats.drawCalls / stats.originalMeshCount) * 100)}%`,
              triangles: `${stats.optimizedTriangles.toLocaleString()} (${Math.round((stats.optimizedTriangles / stats.originalTriangles) * 100)}% of original)`,
            })
          } catch (err) {
            console.warn('Model optimization failed:', err)
            // If optimization fails, we still have the original model
          }
        }

        resolve(gltf)
      },
      (progress) => {
        if (progress.lengthComputable) {
          const percentComplete = Math.round(
            (progress.loaded / progress.total) * 100
          )
          console.log(`Loading progress: ${percentComplete}%`, modelPath)
        }
      },
      (error) => {
        console.error('Error loading model:', modelPath, error)
        // Remove from the requested URLs so it can be tried again
        requestedUrls.delete(modelPath)
        reject(error)
      }
    )
  }) as Promise<GLTF>

  modelLoadingCache.set(modelPath, loadPromise)

  try {
    await loadPromise
    console.log('Preload complete:', modelPath)
    return Promise.resolve()
  } catch (error) {
    console.error('Preload failed:', modelPath, error)
    modelLoadingCache.delete(modelPath)
    throw error
  }
}
