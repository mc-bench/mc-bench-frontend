import React, { useEffect, useRef, useState, useMemo } from 'react' // Added useMemo just in case, though likely not needed now

import { OrbitControls, useGLTF } from '@react-three/drei' // Removed Html, useFrame as Model component structure reverts to original
import { Canvas, useThree } from '@react-three/fiber' // Removed useFrame
import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Cache maps for models to prevent duplicate loading - scoped by cache key
export const modelLoadingCache = new Map<string, Map<string, Promise<GLTF>>>() // cacheKey -> modelPath -> Promise
export const modelPathCache = new Map<string, Map<string, string>>() // cacheKey -> sampleId -> modelPath
export const gltfCache = new Map<string, Map<string, GLTF>>() // cacheKey -> modelPath -> GLTF
// Track URLs that have been requested to prevent duplicate fetches, scoped by cache key
export const requestedUrls = new Map<string, Set<string>>() // cacheKey -> Set<url>

// Cache for instanced meshes - aligns with backend's element_cache concept - scoped by cache key
// NOTE: This cache is NOT actively used by the NEW processModelInstancing logic, but kept for structure consistency.
// The new logic creates THREE.InstancedMesh directly.
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
  if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
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

// --- START: Render Improvement Helpers from MergeConflict ---

// Helper function to create a detailed material key for batching/instancing
const createMaterialKey = (material: THREE.Material): string => {
    // Using UUID primarily, but adding essential visual properties might be needed for stricter matching
    // Keeping it simple for now, relying on UUID and basic type info.
    let key = `${material.uuid}|${material.type}|${material.side}`
    if (material.transparent) key += `|transparent|${material.opacity}`;
    if ((material as any).color) key += `|color:${(material as any).color.getHexString()}`;
    // Add other properties if needed (e.g., map UUIDs)
    if ((material as any).map) key += `|map:${(material as any).map.uuid}`;
    return key;
  };

// Helper function to create a detailed geometry key for instancing
const createGeometryKey = (geometry: THREE.BufferGeometry): string => {
  const posAttr = geometry.attributes.position;
  const indexAttr = geometry.index;
  let hash = 0;

  // Simple hash based on vertex/index count and first few vertices
  // Avoid hashing the entire buffer for performance.
  hash = ((hash << 5) - hash) + (posAttr?.count || 0);
  hash = ((hash << 5) - hash) + (indexAttr?.count || 0);
  hash |= 0; // Convert to 32bit integer

  // Optional: Include a few vertex positions in the hash for more uniqueness
  if (posAttr && posAttr.array.length > 9) {
      for (let i = 0; i < 9; i++) {
          hash = ((hash << 5) - hash) + posAttr.array[i];
          hash |= 0;
      }
  }

  return `verts:${posAttr?.count || 0}:indices:${indexAttr?.count || 0}:hash:${hash}`;
};


// Apply polygon offset to a material to prevent z-fighting
const applyPolygonOffset = (material: THREE.Material): void => {
  // Enable polygon offset
  material.polygonOffset = true;
  // Adjust these values based on visual testing; negative values push polygons back
  material.polygonOffsetFactor = -1.0; // Steeper offset
  material.polygonOffsetUnits = -1.0; // Constant offset

  // Ensure depth test/write are enabled for opaque materials
  if (!material.transparent) {
      material.depthWrite = true;
      material.depthTest = true;
  } else {
       // For transparent materials, depth write is often false, but depth test should be true
       material.depthWrite = false;
       material.depthTest = true;
  }
};

// Helper to determine if a material is glass-like or leaf-like (for separation during processing)
const isGlassMaterial = (material: THREE.Material): boolean => {
    // Check for transparency and low opacity or transmission properties typical of glass/leaves
    return material.transparent &&
           (material.opacity < 0.6 ||
            ((material as any).transmission && (material as any).transmission > 0.5) ||
            // Check for leaf/foliage materials by name
            (material.name && (
                material.name.toLowerCase().includes('leaf') ||
                material.name.toLowerCase().includes('leaves') ||
                material.name.toLowerCase().includes('foliage') ||
                material.name.toLowerCase().includes('tree') ||
                material.name.toLowerCase().includes('branch') ||
                material.name.toLowerCase().includes('glass')
            ))
           );
};


// --- END: Render Improvement Helpers from MergeConflict ---


// Generate a unique key for a mesh based on its geometry and materials.
// Uses the new helper functions for more detailed keys.
const generateMeshInstanceKey = (mesh: THREE.Mesh): string => {
  if (!mesh.geometry) return 'no-geometry';

  const geometryKey = createGeometryKey(mesh.geometry); // Use new geometry key function

  let materialKey = '';
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      // Handle multi-materials (less common for instancing)
      materialKey = mesh.material.map(createMaterialKey).join('|');
    } else {
      materialKey = createMaterialKey(mesh.material); // Use new material key function
    }
  } else {
    materialKey = 'no-material';
  }

  // Combine keys - Hash the final combined string for a compact key
  return String(hash(`${geometryKey}|${materialKey}`));
}


// Simple string hash function for creating shorter unique keys
const hash = (str: string): number => {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    h = (h << 5) - h + char
    h = h & h // Convert to 32bit integer
  }
  return h
}


// --- START: New processModelInstancing from MergeConflict (Adapted) ---
// Process model with optimized instancing: separates glass, uses InstancedMesh
const processModelInstancing = (cacheKey: string, gltf: GLTF): void => {
    if (!gltf || !gltf.scene) {
      console.warn("processModelInstancing: GLTF scene not found for", cacheKey);
      return;
    }

    const scene = gltf.scene;
    console.log(`Starting optimization process for cache key: ${cacheKey}`);

    // Stats for optimization reporting
    let originalMeshCount = 0;
    let optimizedMeshCount = 0;
    let instancedCount = 0; // Specifically count meshes turned into InstancedMesh instances

    // Get all meshes from the scene
    const originalMeshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        originalMeshCount++;
        if (mesh.visible && mesh.geometry && mesh.material) {
            originalMeshes.push(mesh);
        }
      }
    });

    console.log(`Found ${originalMeshCount} original meshes.`);
    if (originalMeshes.length === 0) return; // Nothing to process

    const glassMeshes: THREE.Mesh[] = [];
    const nonGlassMeshes: THREE.Mesh[] = [];

    // Separate glass meshes
    originalMeshes.forEach(mesh => {
        // Material check is crucial here
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material; // Basic handling for multi-material
        if (material && isGlassMaterial(material)) {
            glassMeshes.push(mesh);
        } else if (material) {
            nonGlassMeshes.push(mesh);
        }
        // meshes without material or visibility are ignored implicitly now
    });

    console.log(`Sorted meshes: ${glassMeshes.length} glass, ${nonGlassMeshes.length} non-glass`);

    // Group non-glass meshes by material and geometry for instancing/batching
    const processGroups = new Map<string, {
        material: THREE.Material,
        geometry: THREE.BufferGeometry,
        worldMatrices: THREE.Matrix4[]
    }>();

    nonGlassMeshes.forEach(mesh => {
        // Ensure world matrix is up-to-date before cloning
        mesh.updateWorldMatrix(true, false);
        const worldMatrix = mesh.matrixWorld.clone();

        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const geometry = mesh.geometry;

        // Generate a combined key for grouping
        const groupKey = generateMeshInstanceKey(mesh); // Use the detailed key generator

        if (!processGroups.has(groupKey)) {
            // Clone material and geometry for the first instance in the group
            // Cloning ensures we don't modify the original source materials/geometries
            // which might be shared across different GLTFs if not careful
            const clonedMaterial = material.clone();
            applyPolygonOffset(clonedMaterial); // Apply offset to the cloned material

            // Geometry can often be shared, cloning might be optional if source isn't modified
            // Let's clone geometry too for safety, though sharing might be more performant if possible
            const clonedGeometry = geometry.clone();

            processGroups.set(groupKey, {
                material: clonedMaterial,
                geometry: clonedGeometry,
                worldMatrices: [worldMatrix]
            });
        } else {
            processGroups.get(groupKey)!.worldMatrices.push(worldMatrix);
        }
    });

    // Container for newly created meshes (Instanced or regular)
    const newMeshes: (THREE.Mesh | THREE.InstancedMesh)[] = [];

    // Create InstancedMesh or regular Mesh based on groups
    processGroups.forEach((group) => {
        if (group.worldMatrices.length > 1) {
            // Create InstancedMesh
            const instancedMesh = new THREE.InstancedMesh(
                group.geometry,
                group.material,
                group.worldMatrices.length
            );
            group.worldMatrices.forEach((matrix, index) => {
                instancedMesh.setMatrixAt(index, matrix);
            });
            instancedMesh.instanceMatrix.needsUpdate = true;
            // Copy other relevant properties if needed (e.g., name, userData)
            // instancedMesh.name = `Instanced_${group.geometry.uuid.substring(0, 4)}`;
            newMeshes.push(instancedMesh);
            optimizedMeshCount++;
            instancedCount += group.worldMatrices.length; // Count how many original meshes this replaced
        } else {
            // Create regular Mesh
            const mesh = new THREE.Mesh(group.geometry, group.material);
            mesh.applyMatrix4(group.worldMatrices[0]);
            // mesh.name = `Single_${group.geometry.uuid.substring(0, 4)}`;
            newMeshes.push(mesh);
            optimizedMeshCount++;
        }
    });

    // Remove original non-glass meshes from the scene
    nonGlassMeshes.forEach(mesh => {
        mesh.parent?.remove(mesh);
        // Optionally dispose original geometry/material here IF they are truly unused elsewhere
        // disposeObject(mesh); // Be careful with this if originals might be cached/reused
    });

    // Add the new optimized meshes and original glass meshes back to the scene
    newMeshes.forEach(mesh => scene.add(mesh));
    glassMeshes.forEach(mesh => {
        // Glass meshes were not removed, just ensure they are counted
        optimizedMeshCount++;
        // Optionally apply polygon offset to glass too if z-fighting occurs
        // if (mesh.material) {
        //     const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        //     applyPolygonOffset(mat);
        // }
    });

    // Update stats
    instanceStats.totalMeshes = originalMeshCount;
    // uniqueMeshes in this context means the number of draw calls (InstancedMesh or Mesh)
    instanceStats.uniqueMeshes = optimizedMeshCount;
    // instancedMeshes is the number of original meshes that were replaced by instances within an InstancedMesh
    instanceStats.instancedMeshes = instancedCount > 0 ? (instancedCount - processGroups.size) : 0; // Approximation

    console.log(`Optimization complete for ${cacheKey}: ${originalMeshCount} meshes -> ${optimizedMeshCount} draw calls.`);
    console.log('Instancing stats:', { ...instanceStats });
}
// --- END: New processModelInstancing ---


export const cleanupModel = (cacheKey: string, modelPath: string) => {
  console.log('Cleaning up model:', modelPath, 'for cache key:', cacheKey)

  // Get the cache key-specific cache
  const keyGltfCache = gltfCache.get(cacheKey)
  const gltf = keyGltfCache?.get(modelPath)

  if (gltf) {
    // Reset model position/scale/rotation to avoid influencing next use
    gltf.scene.position.set(0, 0, 0)
    gltf.scene.rotation.set(0, 0, 0)
    gltf.scene.scale.set(1, 1, 1)
    gltf.scene.updateMatrixWorld(true); // Ensure transforms are reset

    // Traverse and dispose all objects *currently* in the scene graph
    // This will include the meshes generated by the new processModelInstancing
    gltf.scene.traverse((obj) => {
      disposeObject(obj); // Use the helper to dispose geometry/material
    })

    // We might also want to clear children array if objects were added/removed
    // but traverse should handle the current state. Let's clear it for safety.
    while(gltf.scene.children.length > 0){
        gltf.scene.remove(gltf.scene.children[0]);
    }

    // Remove from our cache key-specific caches
    const keyLoadingCache = modelLoadingCache.get(cacheKey)
    keyLoadingCache?.delete(modelPath)


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

    // The instanceCache is not directly populated by the new method,
    // but clear any potential stale entries for this key if it was used before.
    const keyInstanceCache = instanceCache.get(cacheKey);
    keyInstanceCache?.clear(); // Clear all entries for this cache key

    // Also remove from drei's cache to force a fresh load next time
    useGLTF.clear(modelPath)

    // Clear model metadata to ensure fresh centering calculation on next load
    modelMetadataCache.delete(modelPath)

    console.log("Cleanup finished for:", modelPath, "CacheKey:", cacheKey);

  } else {
     console.log("Cleanup skipped, model not found in cache:", modelPath, "CacheKey:", cacheKey);
  }
}

// Function to cleanup all resources for a specific cache key
export const cleanupComparison = (cacheKey: string) => {
  console.log('Cleaning up all resources for cache key:', cacheKey)

  // Get all model paths for this cache key from the GLTF cache
  const keyGltfCache = gltfCache.get(cacheKey)
  const modelPathsToClean = keyGltfCache ? Array.from(keyGltfCache.keys()) : [];

  if (modelPathsToClean.length > 0) {
      console.log(`Found ${modelPathsToClean.length} models to clean for cache key: ${cacheKey}`);
      // Clean up each model associated with this cache key
      for (const modelPath of modelPathsToClean) {
          cleanupModel(cacheKey, modelPath)
          // Metadata is deleted within cleanupModel now
      }
  } else {
       console.log(`No models found in gltfCache for cache key: ${cacheKey}, cleaning other caches.`);
  }

  // Clear this cache key's caches definitively
  gltfCache.delete(cacheKey)
  modelLoadingCache.delete(cacheKey)
  modelPathCache.delete(cacheKey)
  instanceCache.delete(cacheKey) // Clear instancing map for the key
  requestedUrls.delete(cacheKey)

  console.log(`Finished cleaning all resources for cache key: ${cacheKey}`);
}

// Global store for model metadata
export interface ModelMetadata {
  boundingBox: THREE.Box3
  boundingSphere: THREE.Sphere
  center: THREE.Vector3 // Geometric center
  // centerOfMass: THREE.Vector3 // Weighted center - Removed for simplicity, using bbox center like original
  dimensions: THREE.Vector3
  maxDimension: number
}

export const modelMetadataCache = new Map<string, ModelMetadata>()

// Model component with built-in cleanup
// Interface remains the same as original
interface ModelProps {
  path: string
  cacheKey: string
  onMetadataCalculated?: (metadata: ModelMetadata) => void
  enableInstancing?: boolean
  onRender?: () => void
}

// We use the bounding box center for model positioning
// The bounding box center is more stable and predictable than other metrics


// Model Component - Reverted to Original Structure, but calls new processModelInstancing
export const Model = ({
  path,
  cacheKey,
  onMetadataCalculated,
  enableInstancing = true,
  onRender,
}: ModelProps) => {
  // Use preload before using the model (Original logic)
  useEffect(() => {
    const keyGltfCache = gltfCache.get(cacheKey)
    const keyLoadingCache = modelLoadingCache.get(cacheKey)
    const isInGltfCache = keyGltfCache?.has(path)
    const isLoading = keyLoadingCache?.has(path)

    if (!isInGltfCache && !isLoading) {
      preloadModel(cacheKey, path, enableInstancing).catch((err) =>
        console.error('Error preloading in Model component:', err, path, cacheKey)
      )
    }
  }, [path, cacheKey, enableInstancing])

  // Get the model from cache or load it (Original logic)
  // IMPORTANT: useGLTF loads and caches. Our preload adds to our custom cache.
  // Subsequent calls to useGLTF *should* hit its internal cache if path is identical.
  const gltf = useGLTF(path) as unknown as GLTF
  const { scene: r3fSceneHook } = useThree() // Rename to avoid conflict with gltf.scene

  useEffect(() => {
    // Check if GLTF and scene are ready
    if (!gltf || !gltf.scene) {
        console.warn("Model effect: GLTF or scene not ready for", path);
        return;
    }

    // Check if metadata is already calculated and cached for this model path
    let metadata: ModelMetadata | undefined = modelMetadataCache.get(path);
    let sceneNeedsProcessing = !metadata; // Process if no metadata exists

    if (sceneNeedsProcessing) {
        console.log("Processing scene and calculating metadata for:", path);

        // Initialize cache key-specific GLTF cache if needed (Original logic)
        if (!gltfCache.has(cacheKey)) {
            gltfCache.set(cacheKey, new Map<string, GLTF>());
        }
        const keyGltfCache = gltfCache.get(cacheKey)!;

        // Store the raw loaded GLTF in our cache before processing
        // This ensures cleanup can find the original GLTF structure if needed
        if (!keyGltfCache.has(path)) {
           keyGltfCache.set(path, gltf);
           console.log("Stored raw GLTF in custom cache for:", path, cacheKey);
        } else {
           console.log("GLTF already in custom cache for:", path, cacheKey);
        }


        // Apply the NEW instancing optimization if enabled
        if (enableInstancing) {
            try {
                 console.time(`processModelInstancing-${path}`);
                 processModelInstancing(cacheKey, gltf); // Call the new instancing function
                 console.timeEnd(`processModelInstancing-${path}`);
            } catch (error) {
                 console.error("Error during processModelInstancing:", error, path, cacheKey);
                 // Proceed without instancing if it fails? Or throw?
            }
        }

        // Calculate model bounding box AFTER potential processing
        // Ensure scene transforms are updated before calculating bounds
        gltf.scene.updateMatrixWorld(true);
        const boundingBox = new THREE.Box3().setFromObject(gltf.scene);

        // Check for invalid bounding box (e.g., empty scene or failed load)
        if (boundingBox.isEmpty()) {
            console.error("Failed to calculate valid bounding box for model:", path, ". Using default values.");
            // Provide default metadata to avoid errors downstream
            metadata = {
                boundingBox: new THREE.Box3(new THREE.Vector3(-1,-1,-1), new THREE.Vector3(1,1,1)),
                boundingSphere: new THREE.Sphere(new THREE.Vector3(0,0,0), 1),
                center: new THREE.Vector3(0,0,0),
                dimensions: new THREE.Vector3(2,2,2),
                maxDimension: 2,
            };
        } else {
            const center = new THREE.Vector3()
            boundingBox.getCenter(center)
            const dimensions = new THREE.Vector3()
            boundingBox.getSize(dimensions)
            const boundingSphere = new THREE.Sphere()
            boundingBox.getBoundingSphere(boundingSphere) // Calculate sphere from box
            const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z)

            // Store calculated metadata (Original logic, using bbox center)
            metadata = {
                boundingBox,
                boundingSphere,
                center,
                // centerOfMass: center, // Keep consistent with original - only bbox center
                dimensions,
                maxDimension,
            }
        }

        modelMetadataCache.set(path, metadata);
        console.log(`Model ${path} dimensions:`, metadata.dimensions, 'Max:', metadata.maxDimension);
        console.log(`Model ${path} calculated center:`, metadata.center);

    } else {
        console.log("Using cached metadata for:", path);
        // Metadata already exists, no need to reprocess or recalculate
    }

    // Ensure metadata is available before proceeding
    if (!metadata) {
        console.error("Metadata is unexpectedly null for", path);
        return; // Should not happen if logic above is correct
    }


    // Store metadata in r3f scene's userData for other components (like AutoCamera)
    // Ensure this happens regardless of whether metadata was cached or newly calculated
    r3fSceneHook.userData.modelMetadata = metadata;


    // CRITICAL: Center the model using the calculated bounding box center
    // Apply this positioning regardless of whether it was loaded from cache or freshly processed
    // This ensures the model is always centered at the origin for consistent camera setup.
    gltf.scene.position.set(-metadata.center.x, -metadata.center.y, -metadata.center.z);
    // Log the final position set
    // console.log(`Model ${path} positioned at:`, gltf.scene.position);


    // Call callbacks AFTER processing and positioning
    if (sceneNeedsProcessing && onMetadataCalculated) {
        onMetadataCalculated(metadata);
    } else if (!sceneNeedsProcessing && onMetadataCalculated){
        // Call even if using cache, so parent component knows metadata is ready
         onMetadataCalculated(metadata);
    }

    if (onRender) {
        onRender(); // Call onRender after setup is complete
    }

    // No explicit cleanup needed here in useEffect return,
    // as cleanup is managed globally by cleanupModel/cleanupComparison based on cacheKey.
    return () => {
        // Optional: Log when the component using the model unmounts
        // console.log("Model component unmounted for:", path);
    };
  }, [
    path,
    cacheKey,
    gltf, // Dependency on the loaded gltf object
    onMetadataCalculated,
    onRender,
    r3fSceneHook, // R3F scene hook
    enableInstancing,
  ]); // Dependencies based on original logic + cacheKey/instancing


  // Render the primitive (Original logic)
  // Ensure gltf.scene is valid before rendering
  return gltf && gltf.scene ? <primitive object={gltf.scene} /> : null;
}


// Auto camera adjustment component (Identical to Original)
export interface AutoCameraProps {
  modelPath: string
  fitOffset?: number // Multiplier to adjust camera distance (default: 1.8)
}

export const AutoCamera = ({ modelPath, fitOffset = 1.8 }: AutoCameraProps) => {
  const { camera, scene } = useThree() // Get scene to access userData
  const isInitializedRef = useRef(false)

  useEffect(() => {
    // Check if already initialized or if metadata isn't in scene userData yet
    if (isInitializedRef.current || !scene.userData.modelMetadata) return

    const metadata = scene.userData.modelMetadata as ModelMetadata | undefined;

    // Double check the metadata path matches the expected model path
    // This guards against race conditions if multiple models load quickly
    // Note: This check assumes modelMetadataCache key matches modelPath, which it should.
    const cachedMetadata = modelMetadataCache.get(modelPath);
    if (!metadata || metadata !== cachedMetadata) {
        console.warn("AutoCamera waiting: Scene metadata not ready or mismatched for", modelPath);
        // Use setTimeout to retry after a short delay, allowing Model component effect to run
        const timeoutId = setTimeout(() => {
             // Trigger a re-render or state change to re-run the effect
             // A simple state update could work, or just let the next render cycle handle it.
             // For simplicity, we'll rely on the next render triggered by other state changes.
             // If issues persist, add a state variable here to force re-check.
             console.log("Retrying AutoCamera setup for", modelPath);
        }, 150); // Increased delay slightly
        return () => clearTimeout(timeoutId); // Cleanup timeout
    }


    console.log("AutoCamera: Setting up camera for", modelPath);
    const { maxDimension } = metadata

    // Calculate optimal distance based on model size and camera FOV
    const isPerspectiveCamera = 'fov' in camera
    let distance: number

    if (isPerspectiveCamera) {
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
      const effectiveMaxDim = Math.max(maxDimension, 0.1); // Ensure maxDimension is not zero
      const standardDistance = (effectiveMaxDim / 2 / Math.tan(fov / 2)) * fitOffset
      // Add a minimum distance based on maxDimension to prevent clipping into large models
      const minSafeDistance = effectiveMaxDim * 1.2; // 20% buffer
      distance = Math.max(standardDistance, minSafeDistance);
    } else {
      // For orthographic camera
      distance = maxDimension * 2.0 * fitOffset
    }

     // Clamp distance to reasonable values
     distance = Math.max(0.1, distance); // Ensure distance is positive


    // Use a 30° elevation angle for a top-down perspective
    const elevationAngle = 30 * (Math.PI / 180); // 30 degrees in radians
    const horizontalDistance = distance * Math.cos(elevationAngle);
    const elevationHeight = distance * Math.sin(elevationAngle);

    // Position camera at 45° horizontal angle (diagonal view)
    const horizontalAngle = 45 * (Math.PI / 180); // 45 degrees in radians
    camera.position.set(
      horizontalDistance * Math.cos(horizontalAngle),
      elevationHeight,
      horizontalDistance * Math.sin(horizontalAngle)
    )

    // Look at the center of the model (which is positioned at the world origin 0,0,0)
    camera.lookAt(0, 0, 0)

    // Update near and far planes for optimal rendering based on distance
    camera.near = Math.max(0.01, distance / 1000); // Smaller near plane relative to distance
    camera.far = distance * 10; // Far plane further out
    camera.updateProjectionMatrix()

    console.log(
      `AutoCamera: Positioned for ${modelPath} at distance ${distance.toFixed(1)} (MaxDim: ${maxDimension.toFixed(1)}, Offset: ${fitOffset})`
    )
    isInitializedRef.current = true; // Mark as initialized for this modelPath

    // No cleanup needed here, camera position persists until changed again

  }, [camera, modelPath, fitOffset, scene.userData.modelMetadata]) // Depend on metadata in scene userData


   // Reset initialization flag if modelPath changes, so camera re-adjusts
   useEffect(() => {
       isInitializedRef.current = false;
       console.log("AutoCamera: Resetting initialization flag due to modelPath change to", modelPath);
   }, [modelPath]);


  return null
}


// Create a singleton loader instance with caching enabled (Identical to Original)
const loader = new GLTFLoader()
loader.setCrossOrigin('use-credentials') // Enable CORS with credentials


// Camera Controls component for orthogonal views (Identical to Original)
export interface CameraControlsProps {
  viewMode: string | null
  modelPath?: string // Now used to access cached metadata for distance
}

export const CameraControls = ({
  viewMode,
  modelPath,
}: CameraControlsProps) => {
  const { camera, gl } = useThree()
  const { scene } = useThree() // Access scene to get metadata if needed

  useEffect(() => {
    if (!viewMode) return; // Don't do anything if viewMode is null

    // Get model metadata from cache using modelPath
    let distanceFactor = 30 // Default distance if no metadata found
    if (modelPath && modelMetadataCache.has(modelPath)) {
      const metadata = modelMetadataCache.get(modelPath)!
      // Calculate distance based on model size - use a larger multiplier for ortho views
      distanceFactor = metadata.maxDimension > 0 ? metadata.maxDimension * 2.5 : 30;
      distanceFactor = Math.max(1, distanceFactor); // Ensure minimum distance
      console.log(`CameraControls: Using distance factor ${distanceFactor.toFixed(1)} for ${modelPath}`);
    } else if (scene.userData.modelMetadata) {
        // Fallback to scene userData if direct cache access fails
        const metadata = scene.userData.modelMetadata as ModelMetadata;
        distanceFactor = metadata.maxDimension > 0 ? metadata.maxDimension * 2.5 : 30;
        distanceFactor = Math.max(1, distanceFactor);
        console.log(`CameraControls: Using distance factor ${distanceFactor.toFixed(1)} from scene userData`);
    } else {
         console.log(`CameraControls: Using default distance factor ${distanceFactor}`);
    }


    // Simple unique ID from timestamp for the current view mode action
    const viewModeAction = viewMode; // Use the timestamped viewMode directly
    const baseViewMode = viewModeAction.split('-')[0]; // Get 'front', 'back', etc.

    console.log("CameraControls applying view:", baseViewMode, "with distance:", distanceFactor);

    // Apply camera positioning based on view mode
    switch (baseViewMode) {
        case 'front':
            camera.position.set(0, 0, distanceFactor);
            camera.up.set(0, 1, 0); // Ensure 'up' is correct
            break;
        case 'back':
            camera.position.set(0, 0, -distanceFactor);
            camera.up.set(0, 1, 0);
            break;
        case 'left':
            camera.position.set(-distanceFactor, 0, 0);
             camera.up.set(0, 1, 0);
            break;
        case 'right':
            camera.position.set(distanceFactor, 0, 0);
             camera.up.set(0, 1, 0);
            break;
        case 'top':
            camera.position.set(0, distanceFactor, 0);
            camera.up.set(0, 0, -1); // Looking down, Z is backwards
            break;
        case 'bottom':
            camera.position.set(0, -distanceFactor, 0);
            camera.up.set(0, 0, 1); // Looking up, Z is forwards
            break;
        case 'reset':
            // Reset to initial perspective view (mimics AutoCamera logic)
            if (modelPath && modelMetadataCache.has(modelPath)) {
                 const metadata = modelMetadataCache.get(modelPath)!;
                 const { maxDimension } = metadata;
                 const fitOffset = 1.8; // Use the same default offset as AutoCamera

                 const isPerspectiveCamera = 'fov' in camera;
                 let distance: number;

                 if (isPerspectiveCamera) {
                     const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
                     const effectiveMaxDim = Math.max(maxDimension, 0.1);
                     const standardDistance = (effectiveMaxDim / 2 / Math.tan(fov / 2)) * fitOffset;
                     const minSafeDistance = effectiveMaxDim * 1.2;
                     distance = Math.max(standardDistance, minSafeDistance);
                 } else {
                     distance = maxDimension * 2.0 * fitOffset;
                 }
                 distance = Math.max(0.1, distance);

                 const elevationAngle = 30 * (Math.PI / 180);
                 const horizontalDistance = distance * Math.cos(elevationAngle);
                 const elevationHeight = distance * Math.sin(elevationAngle);
                 const horizontalAngle = 45 * (Math.PI / 180);

                 camera.position.set(
                    horizontalDistance * Math.cos(horizontalAngle),
                    elevationHeight,
                    horizontalDistance * Math.sin(horizontalAngle)
                 );
                 camera.up.set(0, 1, 0); // Reset up vector for perspective view

                 // Dispatch event to restart auto-rotation in controls
                 document.dispatchEvent(new CustomEvent('reset-auto-rotate'));
                 console.log("CameraControls: Reset view triggered.");
            } else {
                 console.warn("CameraControls: Cannot reset view, model metadata not found for", modelPath);
                 // Optionally fallback to a default position
                 // camera.position.set(30, 5, 30);
            }
            break;
        default:
             // Don't change camera for unknown view modes
             console.warn("CameraControls: Unknown viewMode:", baseViewMode);
             return;
    }

    // Always look at the origin (where the centered model is)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix() // Ensure changes take effect

  }, [viewMode, camera, modelPath, gl, scene.userData.modelMetadata]) // Add scene metadata as dependency

  return null
}


// Orthogonal View Controls component (Identical to Original)
export interface OrthogonalViewControlsProps {
  onViewChange: (position: string) => void
  className?: string
  onFullscreen?: (e?: React.MouseEvent) => void
  showFullscreenButton?: boolean
  containerBackgroundClass?: string
  buttonBackgroundClass?: string
  viewerId?: string // Added for multi-viewer scenarios
}

export const OrthogonalViewControls = ({
  onViewChange,
  className = '',
  onFullscreen,
  containerBackgroundClass = 'bg-gray-800/50 p-1 rounded-md', // Default background
  buttonBackgroundClass = 'bg-white/10 hover:bg-white/20',
  viewerId, // Use if provided
}: OrthogonalViewControlsProps) => {
  const handleViewClick = (position: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    // Use timestamp to ensure state update even if clicking the same button
    const viewModeWithTimestamp = `${position}-${Date.now()}`;

    // Prefix with viewerId if provided (for multi-viewer differentiation)
    const finalViewMode = viewerId ? `${viewerId}-${viewModeWithTimestamp}` : viewModeWithTimestamp;

    onViewChange(finalViewMode)
  }

  const handleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (onFullscreen) onFullscreen(e)
  }

  return (
    <div className={`${containerBackgroundClass} ${className}`}>
      {/* Grid layout for controls */}
      <div className="grid grid-cols-3 gap-1 w-auto"> {/* Adjust width as needed */}
        {/* Row 1 */}
        <div className="w-8 h-8"></div> {/* Spacer */}
        <button
          onClick={(e) => handleViewClick('top', e)}
          className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} // Ensure square buttons
          title="Top View"
        > T </button>
        {onFullscreen ? (
          <button
            onClick={handleFullscreen}
            className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`}
            title="Toggle Fullscreen"
          >
             {/* Fullscreen Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/> </svg>
          </button>
        ) : (
          <div className="w-8 h-8"></div> // Spacer if no fullscreen
        )}

        {/* Row 2 */}
        <button onClick={(e) => handleViewClick('left', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Left View"> L </button>
        <button onClick={(e) => handleViewClick('front', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Front View"> F </button>
        <button onClick={(e) => handleViewClick('right', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Right View"> R </button>

        {/* Row 3 */}
         <button onClick={(e) => handleViewClick('back', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Back View"> K </button> {/* Using K for Back */}
        <button onClick={(e) => handleViewClick('bottom', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Bottom View"> B </button>
        <button onClick={(e) => handleViewClick('reset', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Reset View">
            {/* Reset Icon */}
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/> </svg>
        </button>

      </div>
    </div>
  )
}


// Auto-rotating orbit controls (Dummy Component - functionality in ControlsWithInteractionDetection)
// Interface identical to Original
export interface AutoRotateProps {
  speed?: number
  enabled?: boolean
  modelPath?: string // Not directly used here, but could be for context
}
// Dummy component that does nothing - we use built-in OrbitControls autoRotate
export const AutoRotate = (_props: AutoRotateProps) => {
  return null
}


// OrbitControls that stops auto-rotation after user interaction (Identical to Original)
interface ControlsWithInteractionDetectionProps
  extends Omit<React.ComponentProps<typeof OrbitControls>, 'autoRotate'> {
  initialAutoRotate?: boolean
}

const ControlsWithInteractionDetection = ({
  initialAutoRotate = true,
  autoRotateSpeed = 2.5, // Base speed
  ...props
}: ControlsWithInteractionDetectionProps) => {
  const { gl, scene } = useThree() // Get scene to access metadata
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate)
  const controlsRef = useRef<any>(null) // Ref for OrbitControls instance

  // Effect to handle user interaction stopping auto-rotate
  useEffect(() => {
    const canvas = gl.domElement
    let interactionTimeout: number | null = null;

    // Stop auto-rotation immediately on interaction start
    const handleInteractionStart = () => {
      // console.log("Interaction detected, stopping auto-rotate.");
      setAutoRotate(false);
      // Remove listeners only after interaction *ends* or after a timeout
    };

    // // Optional: Re-enable auto-rotate after a period of inactivity (if desired)
    // const handleInteractionEnd = () => {
    //     if (interactionTimeout) clearTimeout(interactionTimeout);
    //     interactionTimeout = window.setTimeout(() => {
    //         console.log("Inactivity detected, restarting auto-rotate.");
    //         setAutoRotate(true); // Re-enable auto-rotate
    //     }, 5000); // Restart after 5 seconds of inactivity
    // };

    // Function to restart auto-rotation (triggered by reset button via custom event)
    const handleResetAutoRotate = () => {
      console.log("Reset event received, restarting auto-rotate.");
      setAutoRotate(true);
    }

    // Add listeners if auto-rotation is currently desired
    if (initialAutoRotate) { // Check initial prop to decide if listeners should be added at mount
        canvas.addEventListener('pointerdown', handleInteractionStart); // Use pointerdown for wider device support
        canvas.addEventListener('wheel', handleInteractionStart); // Also stop on scroll wheel
        // Optional: Add listeners for interaction end if re-enabling rotation
        // canvas.addEventListener('pointerup', handleInteractionEnd);
        // canvas.addEventListener('pointercancel', handleInteractionEnd);
    }

    // Listen for the global reset event
    document.addEventListener('reset-auto-rotate', handleResetAutoRotate)

    // Cleanup function
    return () => {
      canvas.removeEventListener('pointerdown', handleInteractionStart);
      canvas.removeEventListener('wheel', handleInteractionStart);
      // canvas.removeEventListener('pointerup', handleInteractionEnd);
      // canvas.removeEventListener('pointercancel', handleInteractionEnd);
      document.removeEventListener('reset-auto-rotate', handleResetAutoRotate);
      if (interactionTimeout) clearTimeout(interactionTimeout);
    }
  }, [gl, initialAutoRotate]) // Depend on initialAutoRotate to setup listeners correctly


  // Update controlsRef target and potentially other properties when scene/metadata changes
  useEffect(() => {
    if (controlsRef.current) {
        // Ensure the target is always the origin (where the model is centered)
        if (!controlsRef.current.target.equals(new THREE.Vector3(0, 0, 0))) {
            // console.log("Updating OrbitControls target to origin.");
            controlsRef.current.target.set(0, 0, 0);
        }

      // Ensure damping is enabled after initial setup
      controlsRef.current.enableDamping = props.enableDamping !== false;
      controlsRef.current.dampingFactor = props.dampingFactor ?? 0.05;


      // Force update if needed, e.g., after target change
      controlsRef.current.update()
    }
  }, [scene.userData.modelMetadata, props.enableDamping, props.dampingFactor]) // Re-check target if metadata changes


  // Calculate optimal rotation speed based on model size from scene metadata
  let adjustedRotateSpeed = autoRotateSpeed
  const metadata = scene.userData.modelMetadata as ModelMetadata | undefined;

  if (metadata && metadata.maxDimension > 0) {
    const maxDim = metadata.maxDimension;
    // Scale speed: Smaller objects rotate faster, larger objects slower (inverse relation)
    // Let's try an inverse square root relationship, clamped. Assume 10 is "normal".
    const scaleFactor = Math.sqrt(10 / Math.max(0.1, maxDim)); // Avoid division by zero
    adjustedRotateSpeed = autoRotateSpeed * scaleFactor;

    // Clamp the rotation speed to reasonable bounds
    adjustedRotateSpeed = Math.max(0.5, Math.min(adjustedRotateSpeed, 8.0)); // Allow slightly faster rotation for small items
    // console.log(`Adjusted autoRotateSpeed: ${adjustedRotateSpeed.toFixed(2)} (MaxDim: ${maxDim.toFixed(1)})`);
  }

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={props.enableZoom !== false}
      enablePan={props.enablePan !== false}
      enableRotate={props.enableRotate !== false}
      enableDamping={props.enableDamping !== false}
      dampingFactor={props.dampingFactor ?? 0.05}
      rotateSpeed={props.rotateSpeed ?? 0.5}
      zoomSpeed={props.zoomSpeed ?? 1.0}
      panSpeed={props.panSpeed ?? 0.8}
      target={props.target ?? new THREE.Vector3(0, 0, 0)} // Default target to origin
      maxDistance={props.maxDistance ?? (metadata ? metadata.maxDimension * 10 : 1000)} // Adjust max distance based on model size
      minDistance={props.minDistance ?? 0.1}
      autoRotate={autoRotate} // Controlled by state
      autoRotateSpeed={adjustedRotateSpeed} // Use adjusted speed
      // Pass through any other props
      {...props}
    />
  )
}


// A reusable component for model viewing with all features (Structure identical to Original)
export interface ModelViewContainerProps {
  modelPath: string
  cacheKey: string
  initialCameraPosition?: [number, number, number] // Kept for potential override, but AutoCamera usually handles it
  initialViewMode?: string | null
  autoRotate?: boolean
  autoRotateSpeed?: number
  onViewChange?: (position: string) => void // Callback when orthogonal view changes
  children?: React.ReactNode // For adding lights, environment, etc.
  className?: string
  onFullscreen?: (e?: React.MouseEvent) => void // Fullscreen callback
  showFullscreenButton?: boolean
  enableInstancing?: boolean // Propagate instancing flag
  onRender?: () => void // Callback after model is rendered/set up
  viewerId?: string // Optional ID for multi-viewer coordination
}

export const ModelViewContainer = ({
  modelPath,
  cacheKey,
  // initialCameraPosition is less relevant now with AutoCamera, but keep for potential overrides
  initialCameraPosition = [50, 50, 50], // Default further out, AutoCamera will adjust
  initialViewMode = null,
  autoRotate = true,
  autoRotateSpeed = 2.5, // Base speed, will be adjusted by Controls
  onViewChange,
  children,
  className,
  onFullscreen,
  showFullscreenButton = false,
  enableInstancing = true,
  onRender,
  viewerId, // Pass down to controls
}: ModelViewContainerProps) => {
  const [viewMode, setViewMode] = useState<string | null>(initialViewMode)
  // Metadata state is removed, rely on cache and scene.userData

  // Handle view changes internally (triggered by OrthogonalViewControls)
  const handleViewChange = (viewIdentifier: string) => {
    // The viewIdentifier already includes timestamp and potentially viewerId
    setViewMode(viewIdentifier);

    // Extract base position ('front', 'back', etc.) if parent needs it
    if (onViewChange) {
        const parts = viewIdentifier.split('-');
        const basePosition = viewerId ? parts[1] : parts[0]; // Adjust index based on viewerId presence
        onViewChange(basePosition);
    }
  }


   // Reset viewMode when modelPath or cacheKey changes to avoid applying old view to new model
   useEffect(() => {
     setViewMode(null); // Reset to default perspective view
     console.log("ModelViewContainer: Resetting viewMode due to path/key change.");
   }, [modelPath, cacheKey]);


  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}>
      {/* Controls Overlay */}
      <div className="absolute top-2 right-2 z-10">
        <OrthogonalViewControls
          onViewChange={handleViewChange}
          onFullscreen={onFullscreen}
          showFullscreenButton={showFullscreenButton}
          viewerId={viewerId} // Pass down viewerId
        />
      </div>

      {/* Canvas Setup */}
      <Canvas
         // Set camera initial position far away; AutoCamera will correct it
         camera={{ position: initialCameraPosition, fov: 50, near: 0.1, far: 2000 }}
         gl={{ preserveDrawingBuffer: true, antialias: true }} // Enable antialiasing, preserve buffer for screenshots
         // Optional: Add shadows, performance settings
         shadows // Enable shadows if lights cast them
         // performance={{ min: 0.5, max: 1 }} // Adjust performance limits if needed
         className="w-full h-full"
      >
        {/* Ambient Light */}
        <ambientLight intensity={0.6} />
        {/* Directional Lights for better definition */}
        <directionalLight position={[5, 10, 7]} intensity={1.0} castShadow />
        <directionalLight position={[-5, -5, -5]} intensity={0.4} />

        {/* The Model itself */}
        <Model
          path={modelPath}
          cacheKey={cacheKey}
          // No onMetadataCalculated needed here, AutoCamera reads from scene
          enableInstancing={enableInstancing}
          onRender={onRender}
        />

        {/* Automatic Camera Positioning */}
        <AutoCamera modelPath={modelPath} fitOffset={1.8} />

        {/* Orthogonal Camera View Controller */}
        <CameraControls viewMode={viewMode} modelPath={modelPath} />

        {/* Interactive Orbit Controls */}
        <ControlsWithInteractionDetection
          enableZoom={true}
          // Max distance set dynamically in Controls component based on metadata
          target={new THREE.Vector3(0, 0, 0)} // Target the origin
          enableDamping={true}
          dampingFactor={0.05}
          initialAutoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed} // Pass base speed
          rotateSpeed={0.5}
          enablePan={true}
          panSpeed={0.8}
          zoomSpeed={1.0}
        />

        {/* Allow adding custom elements like environments, helpers, etc. */}
        {children}

        {/* Optional: Axes Helper for debugging */}
        {/* <axesHelper args={[10]} /> */}

      </Canvas>
    </div>
  )
}


// Preload Model Function (Adapted to call new processModelInstancing)
export const preloadModel = async (
  cacheKey: string,
  modelPath: string,
  enableInstancing = true
): Promise<void> => {
  console.log('Preloading model:', modelPath, 'for cache key:', cacheKey);

  // Initialize cache key-specific maps if they don't exist
  if (!gltfCache.has(cacheKey)) gltfCache.set(cacheKey, new Map<string, GLTF>());
  if (!modelLoadingCache.has(cacheKey)) modelLoadingCache.set(cacheKey, new Map<string, Promise<GLTF>>());
  if (!requestedUrls.has(cacheKey)) requestedUrls.set(cacheKey, new Set<string>());

  const keyGltfCache = gltfCache.get(cacheKey)!;
  const keyLoadingCache = modelLoadingCache.get(cacheKey)!;
  const keyRequestedUrls = requestedUrls.get(cacheKey)!;

  // --- Cache Check Logic (Identical to Original) ---
  // If already fully loaded and processed in gltfCache for this cache key, resolve immediately
  if (keyGltfCache.has(modelPath)) {
    console.log(`Model already preloaded and cached: ${modelPath} for cache key: ${cacheKey}`);
    return Promise.resolve();
  }

  // If currently being loaded (promise exists in loading cache), await that promise
  if (keyLoadingCache.has(modelPath)) {
    console.log(`Model currently preloading: ${modelPath} for cache key: ${cacheKey}. Waiting...`);
    try {
        await keyLoadingCache.get(modelPath)!;
        console.log(`Finished waiting for existing preload: ${modelPath}`);
        return Promise.resolve();
    } catch (error) {
         console.error(`Existing preload failed for ${modelPath}:`, error);
         // Remove the failed promise so retry can happen
         keyLoadingCache.delete(modelPath);
         keyRequestedUrls.delete(modelPath); // Also allow URL request again
         throw error; // Rethrow the error
    }
  }

  // Check if the URL itself has been requested to prevent duplicate fetches (Original logic)
  if (keyRequestedUrls.has(modelPath)) {
    // This state is less likely now with the loadingCache check, but kept as a safeguard
    console.log(`URL already requested (but not loaded?): ${modelPath} for cache key: ${cacheKey}. Preventing duplicate fetch.`);
    // It might be better to return the existing promise here if possible, or wait?
    // For now, just resolve, assuming another process will handle it.
    return Promise.resolve(); // Or potentially await keyLoadingCache if it exists? Risky.
  }
  // --- End Cache Check Logic ---


  // Mark this URL as requested *before* starting the load
  keyRequestedUrls.add(modelPath);
  console.log(`Starting new preload request for model: ${modelPath} for cache key: ${cacheKey}`);

  const loadPromise = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      modelPath,
      (gltf) => {
        // --- Success Callback ---
        console.log(`Model loaded via GLTFLoader: ${modelPath} for cache key: ${cacheKey}`);

        // Apply the NEW instancing optimization if enabled, right after loading
        if (enableInstancing) {
           try {
                console.time(`preload-processModelInstancing-${modelPath}`);
                processModelInstancing(cacheKey, gltf); // Use the new function
                console.timeEnd(`preload-processModelInstancing-${modelPath}`);
           } catch (error) {
                console.error("Error during preload processModelInstancing:", error, modelPath, cacheKey);
                // Decide whether to reject or resolve without instancing
                // Let's resolve anyway, but log the error prominently
           }
        }

        // Store the potentially processed model in our cache key-specific GLTF cache
        keyGltfCache.set(modelPath, gltf);
        console.log(`Stored processed model in gltfCache: ${modelPath} for cache key: ${cacheKey}`);

        resolve(gltf); // Resolve the promise with the loaded (and possibly processed) GLTF
      },
      (progress) => {
        // --- Progress Callback ---
        // Optional: More detailed progress logging
        // if (progress.lengthComputable) {
        //   const percentComplete = Math.round((progress.loaded / progress.total) * 100);
        //   console.log(`Loading progress: ${percentComplete}%`, modelPath, cacheKey);
        // }
      },
      (error) => {
        // --- Error Callback ---
        console.error(`Error preloading model: ${modelPath} for cache key: ${cacheKey}`, error);
        // Remove from requested URLs so it can be tried again later if needed
        keyRequestedUrls.delete(modelPath);
        // Reject the promise
        reject(error);
      }
    )
  });

  // Store the promise in the loading cache immediately
  keyLoadingCache.set(modelPath, loadPromise as Promise<GLTF>);

  // Await the promise and handle final cleanup on success/failure
  try {
    await loadPromise;
    console.log(`Preload successful and processed: ${modelPath} for cache key: ${cacheKey}`);
    // Remove from loading cache *after* successful load and processing
    keyLoadingCache.delete(modelPath);
  } catch (error) {
    console.error(`Preload ultimately failed for: ${modelPath} for cache key: ${cacheKey}`);
    // Ensure it's removed from loading cache on failure too
    keyLoadingCache.delete(modelPath);
    // Keep it removed from requestedUrls (done in error callback)
    throw error; // Re-throw error to signal failure to caller
  }
};
