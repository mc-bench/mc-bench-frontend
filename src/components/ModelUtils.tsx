import React, { useEffect, useRef, useState } from 'react'

import { OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Cache maps for models to prevent duplicate loading - scoped by cache key
export const modelLoadingCache = new Map<string, Map<string, Promise<GLTF>>>() // cacheKey -> modelPath -> Promise
export const modelPathCache = new Map<string, Map<string, string>>() // cacheKey -> sampleId -> modelPath
export const gltfCache = new Map<string, Map<string, GLTF>>() // cacheKey -> modelPath -> GLTF
// Track URLs that have been requested to prevent duplicate fetches, scoped by cache key
export const requestedUrls = new Map<string, Set<string>>() // cacheKey -> Set<url>

// Cache for instanced meshes - aligns with backend's element_cache concept - scoped by cache key
export const instanceCache = new Map<string, Map<string, THREE.Mesh>>() // cacheKey -> meshKey -> Mesh
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

export const cleanupModel = (cacheKey: string, modelPath: string) => {
  console.log('Cleaning up model:', modelPath, 'for cache key:', cacheKey)

  // Get the cache key-specific cache
  const keyGltfCache = gltfCache.get(cacheKey)
  const gltf = keyGltfCache?.get(modelPath)

  if (gltf) {
    // Reset model position to avoid influencing next comparison
    // This is important because Three.js scene objects persist between renders
    gltf.scene.position.set(0, 0, 0)
    
    // Traverse and dispose all objects
    gltf.scene.traverse((obj) => {
      // For meshes, we need to handle instanced meshes carefully
      if (obj instanceof THREE.Mesh) {
        const key = generateMeshInstanceKey(obj)
        const keyInstanceCache = instanceCache.get(cacheKey)

        // Only dispose the geometry if this is the primary instance
        // (the one stored in our instance cache)
        const cachedMesh = keyInstanceCache?.get(key)

        if (cachedMesh === obj) {
          // This is the primary instance - remove it from the cache
          keyInstanceCache?.delete(key)
        }

        // Now dispose the object
        disposeObject(obj)
      } else {
        // For non-mesh objects, just dispose normally
        disposeObject(obj)
      }
    })

    // Remove from our cache key-specific caches
    const keyLoadingCache = modelLoadingCache.get(cacheKey)
    if (keyLoadingCache) {
      keyLoadingCache.delete(modelPath)
    }

    const keyPathCache = modelPathCache.get(cacheKey)
    if (keyPathCache) {
      // Remove all sample IDs that point to this model path
      for (const [sampleId, path] of keyPathCache.entries()) {
        if (path === modelPath) {
          keyPathCache.delete(sampleId)
        }
      }
    }

    keyGltfCache?.delete(modelPath)

    // Also remove from drei's cache to force a fresh load next time
    useGLTF.clear(modelPath)
    
    // Clear model metadata to ensure fresh centering calculation on next load
    modelMetadataCache.delete(modelPath)
  }
}

// Function to cleanup all resources for a specific cache key
export const cleanupComparison = (cacheKey: string) => {
  console.log('Cleaning up all resources for cache key:', cacheKey)

  // Get all model paths for this cache key
  const keyGltfCache = gltfCache.get(cacheKey)
  if (keyGltfCache) {
    // Clean up each model
    for (const modelPath of keyGltfCache.keys()) {
      cleanupModel(cacheKey, modelPath)
      
      // IMPORTANT: For cached models, we need to ensure they're properly
      // recentered next time they're used, so don't keep the metadata
      // This prevents position issues when a model is reused across comparisons
      modelMetadataCache.delete(modelPath)
    }

    // Clear this cache key's caches
    gltfCache.delete(cacheKey)
  }

  // Clear other cache key-specific caches
  modelLoadingCache.delete(cacheKey)
  modelPathCache.delete(cacheKey)
  instanceCache.delete(cacheKey)
  requestedUrls.delete(cacheKey)
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
  onRender?: () => void
}

// We use the bounding box center for model positioning
// The bounding box center is more stable and predictable than other metrics

// Process a loaded GLTF model to implement instancing
const processModelInstancing = (cacheKey: string, gltf: GLTF): void => {
  // Reset stats for this model
  instanceStats.totalMeshes = 0
  instanceStats.uniqueMeshes = 0
  instanceStats.instancedMeshes = 0

  // Initialize cache key-specific instance cache if needed
  if (!instanceCache.has(cacheKey)) {
    instanceCache.set(cacheKey, new Map<string, THREE.Mesh>())
  }
  const keyInstanceCache = instanceCache.get(cacheKey)!

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

    // If we haven't seen this mesh before with this cache key, add it to our instance cache
    if (!keyInstanceCache.has(key)) {
      keyInstanceCache.set(key, mesh)
      instanceStats.uniqueMeshes++
    }
  })

  // Second pass - replace duplicate meshes with instances of cached ones
  meshes.forEach((mesh) => {
    // Skip if this mesh is already in our cache (i.e., it's a primary instance)
    const key = generateMeshInstanceKey(mesh)
    const cachedMesh = keyInstanceCache.get(key)

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
  console.log('Model instancing stats for cache key', cacheKey, ':', {
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

// Update the ModelProps interface to include cacheKey
interface ModelProps {
  path: string
  cacheKey: string
  onMetadataCalculated?: (metadata: ModelMetadata) => void
  enableInstancing?: boolean
  onRender?: () => void
}

export const Model = ({
  path,
  cacheKey,
  onMetadataCalculated,
  enableInstancing = true,
  onRender,
}: ModelProps) => {
  // Use preload before using the model
  useEffect(() => {
    // Make sure the model is in the cache
    const keyGltfCache = gltfCache.get(cacheKey)
    const keyLoadingCache = modelLoadingCache.get(cacheKey)

    const isInGltfCache = keyGltfCache?.has(path)
    const isLoading = keyLoadingCache?.has(path)

    if (!isInGltfCache && !isLoading) {
      preloadModel(cacheKey, path, enableInstancing).catch((err) =>
        console.error('Error preloading in Model component:', err)
      )
    }
  }, [path, cacheKey, enableInstancing])

  // Get the model from cache or load it
  const gltf = useGLTF(path) as unknown as GLTF
  const { scene } = useThree()

  useEffect(() => {
    // Only proceed if we haven't already calculated metadata for this model
    if (!modelMetadataCache.has(path)) {
      // Make sure the cache key's cache is initialized
      if (!gltfCache.has(cacheKey)) {
        gltfCache.set(cacheKey, new Map<string, GLTF>())
      }
      const keyGltfCache = gltfCache.get(cacheKey)!

      // Store in our cache key-specific cache
      keyGltfCache.set(path, gltf)

      // Apply instancing optimization if enabled
      if (enableInstancing) {
        processModelInstancing(cacheKey, gltf)
      }

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

      // Simplified approach: just use the bounding box center for everything
      // No more separate centerOfMass calculation - only using the bounding box center
      
      // Store model metadata
      const metadata = {
        boundingBox,
        boundingSphere,
        center,
        centerOfMass: center, // For compatibility, center and centerOfMass are now the same
        dimensions,
        maxDimension,
      }

      modelMetadataCache.set(path, metadata)

      // Store metadata in scene userData for other components to access
      scene.userData.modelMetadata = metadata

      if (onMetadataCalculated) {
        onMetadataCalculated(metadata)
      }

      // Center the model using the bounding box center
      gltf.scene.position.set(-center.x, -center.y, -center.z)

      // Log model dimensions and center for debugging
      console.log(`Model ${path} dimensions:`, dimensions, 'Max:', maxDimension)
      console.log(`Model ${path} center:`, center)
      
      // Call the onRender callback if provided
      if (onRender) {
        onRender()
      }
    } else {
      // If metadata already exists, still need to ensure model is positioned correctly
      const metadata = modelMetadataCache.get(path)!
      scene.userData.modelMetadata = metadata
      
      // CRITICAL: Apply positioning even when loading from cache
      // Models from cache still need to be positioned at the origin
      gltf.scene.position.set(
        -metadata.center.x,
        -metadata.center.y,
        -metadata.center.z
      )
      
      // Log repositioning of cached model
      console.log(`Repositioning cached model ${path} to center:`, metadata.center)

      if (onMetadataCalculated) {
        onMetadataCalculated(metadata)
      }
      
      // Call the onRender callback if provided
      if (onRender) {
        onRender()
      }
    }

    // Cleanup when component unmounts - nothing to do here as cleanup is managed at cache key level
    return () => {}
  }, [path, cacheKey, gltf, onMetadataCalculated, onRender, scene, enableInstancing])

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

        // Look at the center of the model (which is at origin)
        // The model is positioned so that its bounding box center is at the origin
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
        // We look at the origin (0,0,0) because we've repositioned the model
        // so that its bounding box center is at the origin
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
  cacheKey: string
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
  onRender?: () => void
}

export const ModelViewContainer = ({
  modelPath,
  cacheKey,
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
  onRender,
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
          cacheKey={cacheKey}
          onMetadataCalculated={handleMetadataCalculated}
          enableInstancing={enableInstancing}
          onRender={onRender}
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
  cacheKey: string,
  modelPath: string,
  enableInstancing = true
): Promise<void> => {
  console.log('Preloading model:', modelPath, 'for cache key:', cacheKey)

  // Initialize cache key-specific caches if they don't exist
  if (!gltfCache.has(cacheKey)) {
    gltfCache.set(cacheKey, new Map<string, GLTF>())
  }
  if (!modelLoadingCache.has(cacheKey)) {
    modelLoadingCache.set(cacheKey, new Map<string, Promise<GLTF>>())
  }
  if (!requestedUrls.has(cacheKey)) {
    requestedUrls.set(cacheKey, new Set<string>())
  }

  const keyGltfCache = gltfCache.get(cacheKey)!
  const keyLoadingCache = modelLoadingCache.get(cacheKey)!
  const keyRequestedUrls = requestedUrls.get(cacheKey)!

  // If already loaded in gltfCache for this cache key, don't reload
  if (keyGltfCache.has(modelPath)) {
    console.log(
      'Model already in cache:',
      modelPath,
      'for cache key:',
      cacheKey
    )
    return Promise.resolve()
  }

  // If currently loading for this cache key, wait for that promise
  if (keyLoadingCache.has(modelPath)) {
    console.log(
      'Model currently loading:',
      modelPath,
      'for cache key:',
      cacheKey
    )
    return keyLoadingCache.get(modelPath)!.then(() => {})
  }

  // Check if we've already requested this URL for this cache key to prevent blob duplicates
  if (keyRequestedUrls.has(modelPath)) {
    console.log(
      'URL already requested for this cache key, using cached results:',
      modelPath
    )
    return Promise.resolve()
  }

  // Mark this URL as requested for this cache key
  keyRequestedUrls.add(modelPath)

  console.log(
    'Starting new load for model:',
    modelPath,
    'for cache key:',
    cacheKey
  )
  const loadPromise = new Promise<GLTF>((resolve, reject) => {
    // Use browser cache for textures and resources
    // Meshopt decoder is not enabled by default, so no need to disable it

    loader.load(
      modelPath,
      (gltf) => {
        console.log(
          'Model loaded successfully:',
          modelPath,
          'for cache key:',
          cacheKey
        )

        // Apply instancing optimization if enabled
        if (enableInstancing) {
          processModelInstancing(cacheKey, gltf)
        }

        // Store the loaded model in our cache key-specific cache
        keyGltfCache.set(modelPath, gltf)
        resolve(gltf)
      },
      (progress) => {
        if (progress.lengthComputable) {
          const percentComplete = Math.round(
            (progress.loaded / progress.total) * 100
          )
          console.log(
            `Loading progress: ${percentComplete}%`,
            modelPath,
            'for cache key:',
            cacheKey
          )
        }
      },
      (error) => {
        console.error(
          'Error loading model:',
          modelPath,
          'for cache key:',
          cacheKey,
          error
        )
        // Remove from the requested URLs so it can be tried again
        keyRequestedUrls.delete(modelPath)
        reject(error)
      }
    )
  }) as Promise<GLTF>

  keyLoadingCache.set(modelPath, loadPromise)

  try {
    await loadPromise
    console.log('Preload complete:', modelPath, 'for cache key:', cacheKey)
    return Promise.resolve()
  } catch (error) {
    console.error(
      'Preload failed:',
      modelPath,
      'for cache key:',
      cacheKey,
      error
    )
    keyLoadingCache.delete(modelPath)
    throw error
  }
}
