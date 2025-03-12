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

// Cache for instanced meshes - aligns with backend's element_cache concept
export const instanceCache = new Map<string, THREE.Mesh>()
// Track mesh instance count for debugging
export const instanceStats = {
  totalMeshes: 0,
  uniqueMeshes: 0,
  instancedMeshes: 0,
}

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

// Generate a unique key for a mesh based on its geometry, materials, and UVs
// This matches the backend's approach to determining element equivalence
const generateMeshInstanceKey = (mesh: THREE.Mesh): string => {
  if (!mesh.geometry) return 'no-geometry'

  // Get hashable representation of the geometry
  const position = mesh.geometry.getAttribute('position')
  const normal = mesh.geometry.getAttribute('normal')
  const uv = mesh.geometry.getAttribute('uv')
  const index = mesh.geometry.index

  // Create a key from geometry data
  let geometryKey = ''

  // Add position data
  if (position) {
    geometryKey += 'pos:' + Array.from(position.array).join(',')
  }

  // Add normal data
  if (normal) {
    geometryKey += '|nrm:' + Array.from(normal.array).join(',')
  }

  // Add UV data
  if (uv) {
    geometryKey += '|uv:' + Array.from(uv.array).join(',')
  }

  // Add index data
  if (index) {
    geometryKey += '|idx:' + Array.from(index.array).join(',')
  }

  // Add material data
  let materialKey = ''
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      materialKey = mesh.material
        .map((mat) => {
          // Extract essential material properties
          return `${mat.uuid}|${mat.type}|${(mat as THREE.MeshStandardMaterial).map?.uuid || 'no-map'}`
        })
        .join('|')
    } else {
      const mat = mesh.material as THREE.MeshStandardMaterial
      materialKey = `${mat.uuid}|${mat.type}|${mat.map?.uuid || 'no-map'}`
    }
  }

  // Combine all aspects to create a final key
  const finalKey = `${geometryKey}|${materialKey}`
  // Use hash function to create a more compact key
  return String(hash(finalKey))
}

// Simple string hash function for creating shorter unique keys
const hash = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

export const cleanupModel = (modelPath: string) => {
  console.log('Cleaning up model:', modelPath)
  const gltf = gltfCache.get(modelPath)

  if (gltf) {
    // Traverse and dispose all objects
    gltf.scene.traverse((obj) => {
      // For meshes, we need to handle instanced meshes carefully
      if (obj instanceof THREE.Mesh) {
        const key = generateMeshInstanceKey(obj)

        // Only dispose the geometry if this is the primary instance
        // (the one stored in our instance cache)
        const cachedMesh = instanceCache.get(key)

        if (cachedMesh === obj) {
          // This is the primary instance - remove it from the cache
          instanceCache.delete(key)
        }

        // Now dispose the object
        disposeObject(obj)
      } else {
        // For non-mesh objects, just dispose normally
        disposeObject(obj)
      }
    })

    // Remove from our caches
    modelLoadingCache.delete(modelPath)
    modelPathCache.forEach((path, key) => {
      if (path === modelPath) modelPathCache.delete(key)
    })
    gltfCache.delete(modelPath)

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
  enableInstancing?: boolean
}

// Calculate a simple geometric center using bounding box
// This provides a more consistent center point that works better with instancing
const calculateModelCenter = (scene: THREE.Object3D): THREE.Vector3 => {
  // Calculate the bounding box for the entire model
  const boundingBox = new THREE.Box3().setFromObject(scene)
  const center = new THREE.Vector3()
  boundingBox.getCenter(center)

  // For Minecraft-like builds, it's often better to bias the center point
  // slightly toward the bottom (ground level) for more natural rotation
  const size = new THREE.Vector3()
  boundingBox.getSize(size)

  // Adjust the center down by 20% of the model's height
  // This puts the center of rotation closer to the ground/base of the model
  const groundBiasAmount = 0.2 * size.y
  center.y -= groundBiasAmount

  console.log(
    'Calculated model center:',
    center,
    'with ground bias:',
    groundBiasAmount
  )

  return center
}

// Process a loaded GLTF model to implement instancing
const processModelInstancing = (gltf: GLTF): void => {
  // Reset stats for this model
  instanceStats.totalMeshes = 0
  instanceStats.uniqueMeshes = 0
  instanceStats.instancedMeshes = 0

  // Gather all meshes from the scene
  const meshes: THREE.Mesh[] = []
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object)
      instanceStats.totalMeshes++
    }
  })

  // First pass - gather all unique meshes and cache them
  meshes.forEach((mesh) => {
    // Generate a unique key for this mesh
    const key = generateMeshInstanceKey(mesh)

    // If we haven't seen this mesh before, add it to our instance cache
    if (!instanceCache.has(key)) {
      instanceCache.set(key, mesh)
      instanceStats.uniqueMeshes++
    }
  })

  // Second pass - replace duplicate meshes with instances of cached ones
  meshes.forEach((mesh) => {
    // Skip if this mesh is already in our cache (i.e., it's a primary instance)
    const key = generateMeshInstanceKey(mesh)
    const cachedMesh = instanceCache.get(key)

    if (cachedMesh && mesh !== cachedMesh) {
      // This is a duplicate mesh - replace its geometry with the cached one
      const oldGeometry = mesh.geometry

      // Share geometry with the cached instance
      mesh.geometry = cachedMesh.geometry

      // Dispose of the old geometry to free memory
      if (oldGeometry) {
        oldGeometry.dispose()
      }

      // Count this as an instanced mesh
      instanceStats.instancedMeshes++
    }
  })

  // Log instancing statistics
  console.log('Model instancing stats:', {
    totalMeshes: instanceStats.totalMeshes,
    uniqueMeshes: instanceStats.uniqueMeshes,
    instancedMeshes: instanceStats.instancedMeshes,
    savingsPercent:
      instanceStats.instancedMeshes > 0
        ? Math.round(
            (instanceStats.instancedMeshes / instanceStats.totalMeshes) * 100
          )
        : 0,
  })
}

export const Model = ({
  path,
  onMetadataCalculated,
  enableInstancing = true,
}: ModelProps) => {
  // Use preload before using the model
  useEffect(() => {
    // Make sure the model is in the cache
    if (!gltfCache.has(path) && !modelLoadingCache.has(path)) {
      preloadModel(path, enableInstancing).catch((err) =>
        console.error('Error preloading in Model component:', err)
      )
    }
  }, [path, enableInstancing])

  // Get the model from cache or load it
  const gltf = useGLTF(path) as unknown as GLTF
  const { scene } = useThree()

  useEffect(() => {
    // Only proceed if we haven't already calculated metadata for this model
    if (!modelMetadataCache.has(path)) {
      // Store in our cache
      gltfCache.set(path, gltf)

      // First, calculate model bounding box BEFORE instancing
      // This ensures our center calculation is accurate
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

      // Apply instancing optimization AFTER calculating the bounding box
      if (enableInstancing) {
        processModelInstancing(gltf)
      }

      // Calculate the model center (simpler approach that works better with instancing)
      const modelCenter = calculateModelCenter(gltf.scene)

      // Store model metadata
      const metadata = {
        boundingBox,
        boundingSphere,
        center, // Keep original geometric center for reference
        centerOfMass: modelCenter, // Store our calculated center as centerOfMass for compatibility
        dimensions,
        maxDimension,
      }

      modelMetadataCache.set(path, metadata)

      // Store metadata in scene userData for other components to access
      scene.userData.modelMetadata = metadata

      if (onMetadataCalculated) {
        onMetadataCalculated(metadata)
      }

      // Center the model using our calculated center
      gltf.scene.position.set(-modelCenter.x, -modelCenter.y, -modelCenter.z)

      // Log model dimensions and centers for debugging
      console.log(`Model ${path} dimensions:`, dimensions, 'Max:', maxDimension)
      console.log(`Model ${path} centers:`, {
        geometric: center,
        adjusted: modelCenter,
      })
    } else {
      // If metadata already exists, store it in scene userData and call the callback
      const metadata = modelMetadataCache.get(path)!
      scene.userData.modelMetadata = metadata

      if (onMetadataCalculated) {
        onMetadataCalculated(metadata)
      }
    }

    // Cleanup when component unmounts
    return () => {
      // We don't want to clean up the model on every unmount anymore
      // because we want to keep it in cache between views
      // cleanupModel(path);
    }
  }, [path, gltf, onMetadataCalculated, scene, enableInstancing])

  return <primitive object={gltf.scene} />
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
  enableInstancing?: boolean
  onLoaded?: () => void
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
  enableInstancing = true,
  onLoaded,
}: ModelViewContainerProps) => {
  const [viewMode, setViewMode] = useState<string | null>(initialViewMode)
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null)

  // Optional callback to get model metadata when it's calculated
  const handleMetadataCalculated = (metadata: ModelMetadata) => {
    setModelMetadata(metadata)

    // Call onLoaded callback once metadata is calculated, which means the model is fully loaded
    if (onLoaded) {
      onLoaded()
    }
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
          enableInstancing={enableInstancing}
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

export const preloadModel = async (
  modelPath: string,
  enableInstancing = true
): Promise<void> => {
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

        // First calculate bounding box, then apply instancing
        // This matches the order in the Model component for consistency
        // Store the loaded model in our cache first
        gltfCache.set(modelPath, gltf)

        // Apply instancing optimization if enabled
        // We do this here as a preprocessing step, the actual center calculation
        // happens in the Model component when it's first rendered
        if (enableInstancing) {
          processModelInstancing(gltf)
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
