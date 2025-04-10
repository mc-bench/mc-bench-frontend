// ModelUtils.tsx (Combined Version)
import React, { useEffect, useRef, useState, useMemo } from 'react'; // Added useMemo just in case, though likely not needed now

import { OrbitControls, useGLTF } from '@react-three/drei'; // Removed Html, useFrame as Model component structure reverts to original
import { Canvas, useThree } from '@react-three/fiber'; // Removed useFrame
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// --- START: Caches and Stats (From ModelUtils.tsx) ---
// Cache maps for models to prevent duplicate loading - scoped by cache key
export const modelLoadingCache = new Map<string, Map<string, Promise<GLTF>>>(); // cacheKey -> modelPath -> Promise
export const modelPathCache = new Map<string, Map<string, string>>(); // cacheKey -> sampleId -> modelPath
export const gltfCache = new Map<string, Map<string, GLTF>>(); // cacheKey -> modelPath -> GLTF
// Track URLs that have been requested to prevent duplicate fetches, scoped by cache key
export const requestedUrls = new Map<string, Set<string>>(); // cacheKey -> Set<url>

// Cache for instanced meshes - aligns with backend's element_cache concept - scoped by cache key
// NOTE: This cache is NOT actively used by the NEW processModelInstancing logic, but kept for structure consistency.
// The new logic creates THREE.InstancedMesh directly.
export const instanceCache = new Map<string, Map<string, THREE.Mesh>>(); // cacheKey -> meshKey -> Mesh
// Track mesh instance count for debugging
export const instanceStats = {
  totalMeshes: 0,
  uniqueMeshes: 0,
  instancedMeshes: 0,
};
// Global store for model metadata
export interface ModelMetadata {
  boundingBox: THREE.Box3;
  boundingSphere: THREE.Sphere;
  center: THREE.Vector3; // Geometric center (bounding box center)
  dimensions: THREE.Vector3;
  maxDimension: number;
}
export const modelMetadataCache = new Map<string, ModelMetadata>();
// --- END: Caches and Stats ---


// --- START: Disposal Helpers (From ModelUtils.tsx) ---
const disposeMaterial = (material: THREE.Material) => {
  material.dispose();

  // Check if material has these properties before trying to dispose
  if ('map' in material && material.map instanceof THREE.Texture) {
    material.map.dispose();
  }
  if ('normalMap' in material && material.normalMap instanceof THREE.Texture) {
    material.normalMap.dispose();
  }
  if (
    'specularMap' in material &&
    material.specularMap instanceof THREE.Texture
  ) {
    material.specularMap.dispose();
  }
  if ('envMap' in material && material.envMap instanceof THREE.Texture) {
    material.envMap.dispose();
  }
};

const disposeObject = (obj: THREE.Object3D) => {
  if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
    if (obj.geometry) {
      obj.geometry.dispose();
    }

    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material) => disposeMaterial(material));
      } else {
        disposeMaterial(obj.material);
      }
    }
  }
};
// --- END: Disposal Helpers ---


// --- START: Render Improvement Helpers (From ModelUtils.tsx) ---
const createMaterialKey = (material: THREE.Material): string => {
    let key = `${material.uuid}|${material.type}|${material.side}`;
    if (material.transparent) key += `|transparent|${material.opacity}`;
    if ((material as any).color) key += `|color:${(material as any).color.getHexString()}`;
    if ((material as any).map) key += `|map:${(material as any).map.uuid}`;
    return key;
};

const createGeometryKey = (geometry: THREE.BufferGeometry): string => {
  const posAttr = geometry.attributes.position;
  const indexAttr = geometry.index;
  let hash = 0;
  hash = ((hash << 5) - hash) + (posAttr?.count || 0);
  hash = ((hash << 5) - hash) + (indexAttr?.count || 0);
  hash |= 0; // Convert to 32bit integer
  if (posAttr && posAttr.array.length > 9) {
      for (let i = 0; i < 9; i++) {
          hash = ((hash << 5) - hash) + posAttr.array[i];
          hash |= 0;
      }
  }
  return `verts:${posAttr?.count || 0}:indices:${indexAttr?.count || 0}:hash:${hash}`;
};

const applyPolygonOffset = (material: THREE.Material): void => {
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1.0;
  material.polygonOffsetUnits = -1.0;
  if (!material.transparent) {
      material.depthWrite = true;
      material.depthTest = true;
  } else {
       material.depthWrite = false;
       material.depthTest = true;
  }
};

const isGlassMaterial = (material: THREE.Material): boolean => {
    return material.transparent &&
           (material.opacity < 0.6 ||
            ((material as any).transmission && (material as any).transmission > 0.5) ||
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

const hash = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h = (h << 5) - h + char;
    h = h & h; // Convert to 32bit integer
  }
  return h;
};

const generateMeshInstanceKey = (mesh: THREE.Mesh): string => {
  if (!mesh.geometry) return 'no-geometry';
  const geometryKey = createGeometryKey(mesh.geometry);
  let materialKey = '';
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      materialKey = mesh.material.map(createMaterialKey).join('|');
    } else {
      materialKey = createMaterialKey(mesh.material);
    }
  } else {
    materialKey = 'no-material';
  }
  return String(hash(`${geometryKey}|${materialKey}`));
};
// --- END: Render Improvement Helpers ---


// --- START: Instancing Logic (From ModelUtils.tsx) ---
const processModelInstancing = (cacheKey: string, gltf: GLTF): void => {
    if (!gltf || !gltf.scene) {
      console.warn("processModelInstancing: GLTF scene not found for", cacheKey);
      return;
    }
    const scene = gltf.scene;
    console.log(`Starting optimization process for cache key: ${cacheKey}`);

    let originalMeshCount = 0;
    let optimizedMeshCount = 0;
    let instancedCount = 0;

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
    if (originalMeshes.length === 0) return;

    const glassMeshes: THREE.Mesh[] = [];
    const nonGlassMeshes: THREE.Mesh[] = [];

    originalMeshes.forEach(mesh => {
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (material && isGlassMaterial(material)) {
            glassMeshes.push(mesh);
        } else if (material) {
            nonGlassMeshes.push(mesh);
        }
    });
    console.log(`Sorted meshes: ${glassMeshes.length} glass, ${nonGlassMeshes.length} non-glass`);

    const processGroups = new Map<string, {
        material: THREE.Material,
        geometry: THREE.BufferGeometry,
        worldMatrices: THREE.Matrix4[]
    }>();

    nonGlassMeshes.forEach(mesh => {
        mesh.updateWorldMatrix(true, false);
        const worldMatrix = mesh.matrixWorld.clone();
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const geometry = mesh.geometry;
        const groupKey = generateMeshInstanceKey(mesh);

        if (!processGroups.has(groupKey)) {
            const clonedMaterial = material.clone();
            applyPolygonOffset(clonedMaterial);
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

    const newMeshes: (THREE.Mesh | THREE.InstancedMesh)[] = [];
    processGroups.forEach((group) => {
        if (group.worldMatrices.length > 1) {
            const instancedMesh = new THREE.InstancedMesh(
                group.geometry,
                group.material,
                group.worldMatrices.length
            );
            group.worldMatrices.forEach((matrix, index) => {
                instancedMesh.setMatrixAt(index, matrix);
            });
            instancedMesh.instanceMatrix.needsUpdate = true;
            newMeshes.push(instancedMesh);
            optimizedMeshCount++;
            instancedCount += group.worldMatrices.length;
        } else {
            const mesh = new THREE.Mesh(group.geometry, group.material);
            mesh.applyMatrix4(group.worldMatrices[0]);
            newMeshes.push(mesh);
            optimizedMeshCount++;
        }
    });

    nonGlassMeshes.forEach(mesh => {
        mesh.parent?.remove(mesh);
        // disposeObject(mesh); // Be cautious with disposing originals if shared
    });

    newMeshes.forEach(mesh => scene.add(mesh));
    glassMeshes.forEach(mesh => {
        optimizedMeshCount++;
        // Apply offset to glass if needed
        // if (mesh.material) {
        //     const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        //     applyPolygonOffset(mat);
        // }
    });

    instanceStats.totalMeshes = originalMeshCount;
    instanceStats.uniqueMeshes = optimizedMeshCount;
    instanceStats.instancedMeshes = instancedCount > 0 ? (instancedCount - newMeshes.length) : 0; // Correct calculation

    console.log(`Optimization complete for ${cacheKey}: ${originalMeshCount} meshes -> ${optimizedMeshCount} draw calls.`);
    console.log('Instancing stats:', { ...instanceStats });
};
// --- END: Instancing Logic ---


// --- START: Cleanup Logic (From ModelUtils.tsx) ---
export const cleanupModel = (cacheKey: string, modelPath: string) => {
  console.log('Cleaning up model:', modelPath, 'for cache key:', cacheKey);
  const keyGltfCache = gltfCache.get(cacheKey);
  const gltf = keyGltfCache?.get(modelPath);

  if (gltf) {
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.rotation.set(0, 0, 0);
    gltf.scene.scale.set(1, 1, 1);
    gltf.scene.updateMatrixWorld(true);

    gltf.scene.traverse(disposeObject);

    while(gltf.scene.children.length > 0){
        gltf.scene.remove(gltf.scene.children[0]);
    }

    const keyLoadingCache = modelLoadingCache.get(cacheKey);
    keyLoadingCache?.delete(modelPath);

    const keyPathCache = modelPathCache.get(cacheKey);
    if (keyPathCache) {
      for (const [sampleId, path] of keyPathCache.entries()) {
        if (path === modelPath) {
          keyPathCache.delete(sampleId);
        }
      }
    }

    keyGltfCache?.delete(modelPath);

    const keyInstanceCache = instanceCache.get(cacheKey);
    keyInstanceCache?.clear(); // Clear potentially stale instancing data

    useGLTF.clear(modelPath);
    modelMetadataCache.delete(modelPath);
    console.log("Cleanup finished for:", modelPath, "CacheKey:", cacheKey);
  } else {
     console.log("Cleanup skipped, model not found in cache:", modelPath, "CacheKey:", cacheKey);
  }
};

export const cleanupComparison = (cacheKey: string) => {
  console.log('Cleaning up all resources for cache key:', cacheKey);
  const keyGltfCache = gltfCache.get(cacheKey);
  const modelPathsToClean = keyGltfCache ? Array.from(keyGltfCache.keys()) : [];

  if (modelPathsToClean.length > 0) {
      console.log(`Found ${modelPathsToClean.length} models to clean for cache key: ${cacheKey}`);
      for (const modelPath of modelPathsToClean) {
          cleanupModel(cacheKey, modelPath);
      }
  } else {
       console.log(`No models found in gltfCache for cache key: ${cacheKey}, cleaning other caches.`);
  }

  gltfCache.delete(cacheKey);
  modelLoadingCache.delete(cacheKey);
  modelPathCache.delete(cacheKey);
  instanceCache.delete(cacheKey);
  requestedUrls.delete(cacheKey);
  console.log(`Finished cleaning all resources for cache key: ${cacheKey}`);
};
// --- END: Cleanup Logic ---


// --- START: Model Component (Structure from ModelUtils.tsx) ---
interface ModelProps {
  path: string;
  cacheKey: string;
  onMetadataCalculated?: (metadata: ModelMetadata) => void;
  enableInstancing?: boolean;
  onRender?: () => void;
}

export const Model = ({
  path,
  cacheKey,
  onMetadataCalculated,
  enableInstancing = true,
  onRender,
}: ModelProps) => {
  // Preload logic (From ModelUtils.tsx)
  useEffect(() => {
    const keyGltfCache = gltfCache.get(cacheKey);
    const keyLoadingCache = modelLoadingCache.get(cacheKey);
    const isInGltfCache = keyGltfCache?.has(path);
    const isLoading = keyLoadingCache?.has(path);

    if (!isInGltfCache && !isLoading) {
      preloadModel(cacheKey, path, enableInstancing).catch((err) =>
        console.error('Error preloading in Model component:', err, path, cacheKey)
      );
    }
  }, [path, cacheKey, enableInstancing]);

  const gltf = useGLTF(path) as unknown as GLTF;
  const { scene: r3fSceneHook } = useThree();

  useEffect(() => {
    if (!gltf || !gltf.scene) {
        console.warn("Model effect: GLTF or scene not ready for", path);
        return;
    }

    let metadata: ModelMetadata | undefined = modelMetadataCache.get(path);
    let sceneNeedsProcessing = !metadata;

    if (sceneNeedsProcessing) {
        console.log("Processing scene and calculating metadata for:", path);

        if (!gltfCache.has(cacheKey)) {
            gltfCache.set(cacheKey, new Map<string, GLTF>());
        }
        const keyGltfCache = gltfCache.get(cacheKey)!;

        if (!keyGltfCache.has(path)) {
           keyGltfCache.set(path, gltf);
           console.log("Stored raw GLTF in custom cache for:", path, cacheKey);
        } else {
           console.log("GLTF already in custom cache for:", path, cacheKey);
        }

        if (enableInstancing) {
            try {
                 console.time(`processModelInstancing-${path}`);
                 processModelInstancing(cacheKey, gltf); // Use the good instancing logic
                 console.timeEnd(`processModelInstancing-${path}`);
            } catch (error) {
                 console.error("Error during processModelInstancing:", error, path, cacheKey);
            }
        }

        gltf.scene.updateMatrixWorld(true);
        const boundingBox = new THREE.Box3().setFromObject(gltf.scene);

        if (boundingBox.isEmpty()) {
            console.error("Failed to calculate valid bounding box for model:", path, ". Using default values.");
            metadata = {
                boundingBox: new THREE.Box3(new THREE.Vector3(-1,-1,-1), new THREE.Vector3(1,1,1)),
                boundingSphere: new THREE.Sphere(new THREE.Vector3(0,0,0), 1),
                center: new THREE.Vector3(0,0,0),
                dimensions: new THREE.Vector3(2,2,2),
                maxDimension: 2,
            };
        } else {
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            const dimensions = new THREE.Vector3();
            boundingBox.getSize(dimensions);
            const boundingSphere = new THREE.Sphere();
            boundingBox.getBoundingSphere(boundingSphere);
            const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);

            metadata = { // Use bbox center
                boundingBox,
                boundingSphere,
                center,
                dimensions,
                maxDimension,
            };
        }

        modelMetadataCache.set(path, metadata);
        console.log(`Model ${path} dimensions:`, metadata.dimensions, 'Max:', metadata.maxDimension);
        console.log(`Model ${path} calculated center:`, metadata.center);

    } else {
        console.log("Using cached metadata for:", path);
    }

    if (!metadata) {
        console.error("Metadata is unexpectedly null for", path);
        return;
    }

    r3fSceneHook.userData.modelMetadata = metadata;

    // Center model using bounding box center (CRITICAL FOR BOTH NEW/CACHED)
    gltf.scene.position.set(-metadata.center.x, -metadata.center.y, -metadata.center.z);
    // console.log(`Model ${path} positioned at:`, gltf.scene.position);


    // Call callbacks
    if (onMetadataCalculated) { // Call always when metadata is ready
         onMetadataCalculated(metadata);
    }
    if (onRender) {
        onRender();
    }

    return () => {};
  }, [
    path,
    cacheKey,
    gltf,
    onMetadataCalculated,
    onRender,
    r3fSceneHook,
    enableInstancing,
  ]);

  return gltf && gltf.scene ? <primitive object={gltf.scene} /> : null;
};
// --- END: Model Component ---


// --- START: AutoCamera Component (Merged Logic) ---
export interface AutoCameraProps {
  modelPath: string;
  fitOffset?: number; // Default: 1.8
}

export const AutoCamera = ({ modelPath, fitOffset = 1.8 }: AutoCameraProps) => {
  const { camera, scene } = useThree();
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Wait for metadata
    if (isInitializedRef.current || !scene.userData.modelMetadata) {
        // Use setTimeout retry logic from ModelUtils.tsx
        if (!isInitializedRef.current) {
            const timeoutId = setTimeout(() => {
                console.log("Retrying AutoCamera setup for", modelPath);
                // Trigger effect re-run implicitly by dependency change or next render cycle
            }, 150); // Use 150ms delay from ModelUtils.tsx
            return () => clearTimeout(timeoutId);
        }
        return; // Already initialized or retry scheduled
    }

    const metadata = scene.userData.modelMetadata as ModelMetadata | undefined;

    // Verify metadata matches expected path (from ModelUtils.tsx)
    const cachedMetadata = modelMetadataCache.get(modelPath);
    if (!metadata || metadata !== cachedMetadata) {
        console.warn("AutoCamera waiting: Scene metadata not ready or mismatched for", modelPath);
        // Retry logic is handled above
        return;
    }

    console.log("AutoCamera: Setting up camera for", modelPath);
    const { maxDimension } = metadata;
    const effectiveMaxDim = Math.max(maxDimension, 0.1); // Ensure positive dimension

    // Calculate optimal distance (using ModelUtils2.tsx logic)
    const isPerspectiveCamera = 'fov' in camera;
    let distance: number;

    if (isPerspectiveCamera) {
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      // Min safe distance to avoid clipping (from ModelUtils2.tsx)
      const minSafeDistance = effectiveMaxDim * 1.2; // 20% buffer
      const standardDistance = (effectiveMaxDim / 2 / Math.tan(fov / 2)) * fitOffset;
      distance = Math.max(standardDistance, minSafeDistance);
    } else {
      // Orthographic camera distance
      distance = effectiveMaxDim * 2.0 * fitOffset;
    }
    distance = Math.max(0.1, distance); // Ensure positive distance

    // Position camera using 30° elevation and 45° horizontal angle (from ModelUtils2.tsx)
    const elevationAngle = 30 * (Math.PI / 180); // 30 degrees
    const horizontalAngle = 45 * (Math.PI / 180); // 45 degrees
    const horizontalDistance = distance * Math.cos(elevationAngle);
    const elevationHeight = distance * Math.sin(elevationAngle);

    camera.position.set(
      horizontalDistance * Math.cos(horizontalAngle),
      elevationHeight,
      horizontalDistance * Math.sin(horizontalAngle)
    );

    // Look at origin (where centered model is)
    camera.lookAt(0, 0, 0);

    // Update near/far planes based on distance (using ModelUtils2.tsx logic)
    camera.near = Math.max(0.01, distance / 100); // Adjusted near plane
    camera.far = distance * 100;                 // Adjusted far plane
    camera.updateProjectionMatrix();

    console.log(
      `AutoCamera: Positioned for ${modelPath} at distance ${distance.toFixed(1)} (MaxDim: ${effectiveMaxDim.toFixed(1)}, Offset: ${fitOffset}, SafeMin: ${(effectiveMaxDim * 1.2).toFixed(1)})`
    );
    isInitializedRef.current = true;

  }, [camera, modelPath, fitOffset, scene.userData.modelMetadata]); // Dependency from ModelUtils.tsx

   // Reset flag if modelPath changes (from ModelUtils.tsx)
   useEffect(() => {
       isInitializedRef.current = false;
       console.log("AutoCamera: Resetting initialization flag due to modelPath change to", modelPath);
   }, [modelPath]);

  return null;
};
// --- END: AutoCamera Component ---


// --- START: Loader Instance (From ModelUtils.tsx / ModelUtils2.tsx - Identical) ---
const loader = new GLTFLoader();
loader.setCrossOrigin('use-credentials');
// --- END: Loader Instance ---


// --- START: CameraControls Component (Merged Logic) ---
export interface CameraControlsProps {
  viewMode: string | null;
  modelPath?: string; // Used to get metadata for distance
}

export const CameraControls = ({
  viewMode,
  modelPath,
}: CameraControlsProps) => {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    if (!viewMode) return;

    // Get metadata (using ModelUtils.tsx logic: cache -> scene.userData)
    let distanceFactor = 30; // Default distance
    let metadata: ModelMetadata | undefined | null = modelPath ? modelMetadataCache.get(modelPath) : null;
    if (!metadata && scene.userData.modelMetadata) {
        metadata = scene.userData.modelMetadata as ModelMetadata;
    }

    if (metadata && metadata.maxDimension > 0) {
      // Calculate distanceFactor using ModelUtils2.tsx logic
      distanceFactor = metadata.maxDimension * 2.5;
      distanceFactor = Math.max(1, distanceFactor); // Ensure minimum distance
      console.log(`CameraControls: Using distance factor ${distanceFactor.toFixed(1)} for ${modelPath || 'current model'}`);
    } else {
         console.log(`CameraControls: Using default distance factor ${distanceFactor}`);
    }

    // Get base view mode from timestamped identifier (ModelUtils.tsx logic)
    const baseViewMode = viewMode.split('-')[0]; // Assumes format "view-timestamp" or "viewerId-view-timestamp"
    const actualViewMode = baseViewMode.includes('front') || baseViewMode.includes('back') || baseViewMode.includes('left') || baseViewMode.includes('right') || baseViewMode.includes('top') || baseViewMode.includes('bottom') || baseViewMode.includes('reset')
      ? baseViewMode // If it's a simple view
      : viewMode.split('-')[1]; // Otherwise assume viewerId-view-timestamp

    console.log("CameraControls applying view:", actualViewMode, "with distance:", distanceFactor.toFixed(1));

    // Apply camera positioning
    switch (actualViewMode) {
        case 'front':
            camera.position.set(0, 0, distanceFactor);
            camera.up.set(0, 1, 0); // Keep up vector correction from ModelUtils.tsx
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
            camera.up.set(0, 0, -1); // Keep up vector correction from ModelUtils.tsx
            break;
        case 'bottom':
            camera.position.set(0, -distanceFactor, 0);
            camera.up.set(0, 0, 1); // Keep up vector correction from ModelUtils.tsx
            break;
        case 'reset':
            // Reset to initial perspective view using merged AutoCamera logic (from ModelUtils2.tsx)
            if (metadata) { // Use already fetched metadata
                 const { maxDimension } = metadata;
                 const effectiveMaxDim = Math.max(maxDimension, 0.1);
                 const fitOffset = 1.8; // Standard offset

                 const isPerspectiveCamera = 'fov' in camera;
                 let distance: number;

                 if (isPerspectiveCamera) {
                     const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
                     const minSafeDistance = effectiveMaxDim * 1.2; // Safe distance
                     const standardDistance = (effectiveMaxDim / 2 / Math.tan(fov / 2)) * fitOffset;
                     distance = Math.max(standardDistance, minSafeDistance);
                 } else {
                     distance = effectiveMaxDim * 2.0 * fitOffset;
                 }
                 distance = Math.max(0.1, distance);

                 // Use 30/45 angles (from ModelUtils2.tsx / merged AutoCamera)
                 const elevationAngle = 30 * (Math.PI / 180);
                 const horizontalAngle = 45 * (Math.PI / 180);
                 const horizontalDistance = distance * Math.cos(elevationAngle);
                 const elevationHeight = distance * Math.sin(elevationAngle);

                 camera.position.set(
                    horizontalDistance * Math.cos(horizontalAngle),
                    elevationHeight,
                    horizontalDistance * Math.sin(horizontalAngle)
                 );
                 camera.up.set(0, 1, 0); // Reset up vector for perspective

                 // Dispatch event to restart auto-rotation (From ModelUtils.tsx / ModelUtils2.tsx)
                 document.dispatchEvent(new CustomEvent('reset-auto-rotate'));
                 console.log("CameraControls: Reset view triggered.");
            } else {
                 console.warn("CameraControls: Cannot reset view, model metadata not found for", modelPath);
                 // Optional fallback position if metadata fails
                 // camera.position.set(30, 30, 30); camera.up.set(0, 1, 0);
            }
            break;
        default:
             console.warn("CameraControls: Unknown viewMode:", actualViewMode);
             return;
    }

    camera.lookAt(0, 0, 0); // Always look at origin
    camera.updateProjectionMatrix();

  }, [viewMode, camera, modelPath, gl, scene.userData.modelMetadata]); // Keep dependency from ModelUtils.tsx

  return null;
};
// --- END: CameraControls Component ---


// --- START: OrthogonalViewControls Component (From ModelUtils.tsx - Preferable layout/event handling) ---
export interface OrthogonalViewControlsProps {
  onViewChange: (viewIdentifier: string) => void; // Use identifier including timestamp/viewerId
  className?: string;
  onFullscreen?: (e?: React.MouseEvent) => void;
  showFullscreenButton?: boolean;
  containerBackgroundClass?: string;
  buttonBackgroundClass?: string;
  viewerId?: string; // Added for multi-viewer scenarios
}

export const OrthogonalViewControls = ({
  onViewChange,
  className = '',
  onFullscreen,
  containerBackgroundClass = 'bg-gray-800/50 p-1 rounded-md',
  buttonBackgroundClass = 'bg-white/10 hover:bg-white/20',
  viewerId,
}: OrthogonalViewControlsProps) => {
  const handleViewClick = (position: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const viewModeWithTimestamp = `${position}-${Date.now()}`;
    const finalViewMode = viewerId ? `${viewerId}-${viewModeWithTimestamp}` : viewModeWithTimestamp;
    onViewChange(finalViewMode);
  };

  const handleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onFullscreen) onFullscreen(e);
  };

  return (
    <div className={`${containerBackgroundClass} ${className}`}>
      <div className="grid grid-cols-3 gap-1 w-auto"> {/* Use ModelUtils.tsx layout */}
        {/* Row 1 */}
        <div className="w-8 h-8"></div> {/* Spacer */}
        <button
          onClick={(e) => handleViewClick('top', e)}
          className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`}
          title="Top View"
        > T </button>
        {onFullscreen ? (
          <button
            onClick={handleFullscreen}
            className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`}
            title="Toggle Fullscreen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/> </svg>
          </button>
        ) : (
          <div className="w-8 h-8"></div>
        )}

        {/* Row 2 */}
        <button onClick={(e) => handleViewClick('left', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Left View"> L </button>
        <button onClick={(e) => handleViewClick('front', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Front View"> F </button>
        <button onClick={(e) => handleViewClick('right', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Right View"> R </button>

        {/* Row 3 */}
        <button onClick={(e) => handleViewClick('back', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Back View"> K </button> {/* Use K for Back */}
        <button onClick={(e) => handleViewClick('bottom', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Bottom View"> B </button>
        <button onClick={(e) => handleViewClick('reset', e)} className={`${buttonBackgroundClass} text-white p-1 rounded-md w-8 h-8 flex items-center justify-center aspect-square`} title="Reset View">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/> </svg>
        </button>
      </div>
    </div>
  );
};
// --- END: OrthogonalViewControls Component ---


// --- START: ControlsWithInteractionDetection (From ModelUtils.tsx - Preferable interaction logic) ---
interface ControlsWithInteractionDetectionProps
  extends Omit<React.ComponentProps<typeof OrbitControls>, 'autoRotate'> {
  initialAutoRotate?: boolean;
  autoRotateSpeed?: number; // Keep prop for base speed
}

const ControlsWithInteractionDetection = ({
  initialAutoRotate = true,
  autoRotateSpeed = 2.5, // Base speed
  ...props
}: ControlsWithInteractionDetectionProps) => {
  const { gl, scene } = useThree();
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const controlsRef = useRef<any>(null);

  // Interaction handling logic with auto-resume after inactivity
  useEffect(() => {
    const canvas = gl.domElement;
    let interactionTimeout: number | null = null;
    const inactivityResumeTime = 5000; // 5 seconds of inactivity before resuming rotation

    const handleInteractionStart = () => {
      // Clear any existing timeout
      if (interactionTimeout) {
        window.clearTimeout(interactionTimeout);
        interactionTimeout = null;
      }

      // Stop rotation
      setAutoRotate(false);

      // Set a timeout to resume rotation after inactivity
      if (initialAutoRotate) {
        interactionTimeout = window.setTimeout(() => {
          console.log("Inactivity detected, resuming auto-rotation");
          setAutoRotate(true);
        }, inactivityResumeTime);
      }
    };

    const handleInteractionMove = () => {
      // Reset the inactivity timer on movement
      if (interactionTimeout) {
        window.clearTimeout(interactionTimeout);
      }

      if (!autoRotate && initialAutoRotate) {
        interactionTimeout = window.setTimeout(() => {
          console.log("Inactivity detected, resuming auto-rotation");
          setAutoRotate(true);
        }, inactivityResumeTime);
      }
    };

    const handleResetAutoRotate = () => {
      console.log("Reset event received, restarting auto-rotate.");
      if (interactionTimeout) {
        window.clearTimeout(interactionTimeout);
        interactionTimeout = null;
      }
      setAutoRotate(true);
    };

    if (initialAutoRotate) {
        // Listen for interaction start events
        canvas.addEventListener('pointerdown', handleInteractionStart);
        canvas.addEventListener('wheel', handleInteractionStart);

        // Listen for movement to reset the inactivity timer
        canvas.addEventListener('pointermove', handleInteractionMove);
    }

    document.addEventListener('reset-auto-rotate', handleResetAutoRotate);

    return () => {
      // Clean up all event listeners
      canvas.removeEventListener('pointerdown', handleInteractionStart);
      canvas.removeEventListener('wheel', handleInteractionStart);
      canvas.removeEventListener('pointermove', handleInteractionMove);
      document.removeEventListener('reset-auto-rotate', handleResetAutoRotate);

      // Clear any pending timeouts
      if (interactionTimeout) {
        window.clearTimeout(interactionTimeout);
        interactionTimeout = null;
      }
    };
  }, [gl, initialAutoRotate, autoRotate]);

  // Controls update logic (From ModelUtils.tsx)
  useEffect(() => {
    if (controlsRef.current) {
        if (!controlsRef.current.target.equals(new THREE.Vector3(0, 0, 0))) {
            controlsRef.current.target.set(0, 0, 0);
        }
        controlsRef.current.enableDamping = props.enableDamping !== false;
        controlsRef.current.dampingFactor = props.dampingFactor ?? 0.05;
        controlsRef.current.update();
    }
  }, [scene.userData.modelMetadata, props.enableDamping, props.dampingFactor]);

  // Improved rotation speed calculation for smoother rotation
  let adjustedRotateSpeed = autoRotateSpeed;
  const metadata = scene.userData.modelMetadata as ModelMetadata | undefined;
  if (metadata && metadata.maxDimension > 0) {
    const maxDim = metadata.maxDimension;

    // Use a more gradual scaling function for smoother rotation
    // This provides a more consistent rotation speed across different model sizes
    const normalizedSize = maxDim / 10; // 10 units is considered "normal" size
    const scaleFactor = 1 / (0.5 + 0.5 * normalizedSize); // Smoother scaling function

    adjustedRotateSpeed = autoRotateSpeed * scaleFactor;

    // Use narrower clamping range for more consistent rotation
    adjustedRotateSpeed = Math.max(1.0, Math.min(adjustedRotateSpeed, 4.0)); // Clamp between 1.0 and 4.0

    // console.log(`Adjusted autoRotateSpeed: ${adjustedRotateSpeed.toFixed(2)} (MaxDim: ${maxDim.toFixed(1)})`);
  }

  // Max distance logic (From ModelUtils.tsx - * 10)
  const maxDistance = metadata ? metadata.maxDimension * 10 : 1000;

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
      target={props.target ?? new THREE.Vector3(0, 0, 0)} // Default target origin
      maxDistance={props.maxDistance ?? maxDistance} // Use calculated max distance
      minDistance={props.minDistance ?? 0.1}
      autoRotate={autoRotate} // Controlled state
      autoRotateSpeed={adjustedRotateSpeed} // Adjusted speed
      {...props} // Pass other props
    />
  );
};
// --- END: ControlsWithInteractionDetection ---


// --- START: ModelViewContainer (From ModelUtils.tsx - Uses scene.userData, better structure) ---
export interface ModelViewContainerProps {
  modelPath: string;
  cacheKey: string;
  initialCameraPosition?: [number, number, number]; // Less relevant now but kept
  initialViewMode?: string | null;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  onViewChange?: (basePosition: string) => void; // Callback with base view name
  children?: React.ReactNode;
  className?: string;
  onFullscreen?: (e?: React.MouseEvent) => void;
  showFullscreenButton?: boolean;
  enableInstancing?: boolean;
  onRender?: () => void;
  viewerId?: string;
}

export const ModelViewContainer = ({
  modelPath,
  cacheKey,
  initialCameraPosition = [50, 50, 50], // Default far out, AutoCamera corrects
  initialViewMode = null,
  autoRotate = true,
  autoRotateSpeed = 2.5, // Base speed for Controls component
  onViewChange,
  children,
  className,
  onFullscreen,
  showFullscreenButton = false,
  enableInstancing = true,
  onRender,
  viewerId,
}: ModelViewContainerProps) => {
  const [viewMode, setViewMode] = useState<string | null>(initialViewMode);
  // No local metadata state - rely on cache/scene.userData

  // Handle view changes (ModelUtils.tsx logic)
  const handleViewChange = (viewIdentifier: string) => {
    setViewMode(viewIdentifier);
    if (onViewChange) {
        const parts = viewIdentifier.split('-');
        // Extract base position robustly, considering optional viewerId prefix
        const basePosition = (parts.length === 3 && viewerId) // e.g., viewerId-front-12345
            ? parts[1]
            : parts[0]; // e.g., front-12345 or just front if no timestamp somehow
        onViewChange(basePosition);
    }
  };

  // Reset viewMode on path/key change (ModelUtils.tsx logic)
  useEffect(() => {
     setViewMode(null);
     console.log("ModelViewContainer: Resetting viewMode due to path/key change.");
   }, [modelPath, cacheKey]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}>
      <div className="absolute top-2 right-2 z-10">
        <OrthogonalViewControls
          onViewChange={handleViewChange} // Pass the internal handler
          onFullscreen={onFullscreen}
          showFullscreenButton={showFullscreenButton}
          viewerId={viewerId} // Pass down ID
        />
      </div>

      <Canvas
         camera={{ position: initialCameraPosition, fov: 50, near: 0.1, far: 2000 }} // Initial far pos, AutoCamera overrides near/far too
         gl={{ preserveDrawingBuffer: true, antialias: true }}
         shadows
         className="w-full h-full"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7]} intensity={1.0} castShadow />
        <directionalLight position={[-5, -5, -5]} intensity={0.4} />

        <Model
          path={modelPath}
          cacheKey={cacheKey}
          // onMetadataCalculated not needed here as AutoCamera/Controls use scene.userData
          enableInstancing={enableInstancing}
          onRender={onRender} // Propagate render callback
        />

        {/* Use the Merged AutoCamera */}
        <AutoCamera modelPath={modelPath} fitOffset={1.8} />

        {/* Use the Merged CameraControls */}
        <CameraControls viewMode={viewMode} modelPath={modelPath} />

        {/* Use the Merged ControlsWithInteractionDetection */}
        <ControlsWithInteractionDetection
          enableZoom={true}
          // Max distance is now set internally based on metadata
          target={new THREE.Vector3(0, 0, 0)} // Target origin
          enableDamping={true}
          dampingFactor={0.05}
          initialAutoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed} // Pass base speed
          rotateSpeed={0.5}
          enablePan={true}
          panSpeed={0.8}
          zoomSpeed={1.0}
        />

        {children}
        {/* <axesHelper args={[10]} /> */}
      </Canvas>
    </div>
  );
};
// --- END: ModelViewContainer ---


// --- START: preloadModel Function (From ModelUtils.tsx - calls good instancing logic) ---
export const preloadModel = async (
  cacheKey: string,
  modelPath: string,
  enableInstancing = true
): Promise<void> => {
  console.log('Preloading model:', modelPath, 'for cache key:', cacheKey);

  if (!gltfCache.has(cacheKey)) gltfCache.set(cacheKey, new Map<string, GLTF>());
  if (!modelLoadingCache.has(cacheKey)) modelLoadingCache.set(cacheKey, new Map<string, Promise<GLTF>>());
  if (!requestedUrls.has(cacheKey)) requestedUrls.set(cacheKey, new Set<string>());

  const keyGltfCache = gltfCache.get(cacheKey)!;
  const keyLoadingCache = modelLoadingCache.get(cacheKey)!;
  const keyRequestedUrls = requestedUrls.get(cacheKey)!;

  // Cache checks (from ModelUtils.tsx)
  if (keyGltfCache.has(modelPath)) {
    console.log(`Model already preloaded and cached: ${modelPath} for cache key: ${cacheKey}`);
    return Promise.resolve();
  }
  if (keyLoadingCache.has(modelPath)) {
    console.log(`Model currently preloading: ${modelPath} for cache key: ${cacheKey}. Waiting...`);
    try {
        await keyLoadingCache.get(modelPath)!;
        console.log(`Finished waiting for existing preload: ${modelPath}`);
        return Promise.resolve();
    } catch (error) {
         console.error(`Existing preload failed for ${modelPath}:`, error);
         keyLoadingCache.delete(modelPath);
         keyRequestedUrls.delete(modelPath);
         throw error;
    }
  }
  if (keyRequestedUrls.has(modelPath)) {
    console.log(`URL already requested (but not loaded?): ${modelPath} for cache key: ${cacheKey}. Preventing duplicate fetch.`);
    // May need to wait for loading promise here if it exists, otherwise resolve
    return keyLoadingCache.has(modelPath) ? keyLoadingCache.get(modelPath)!.then(() => {}) : Promise.resolve();
  }

  keyRequestedUrls.add(modelPath);
  console.log(`Starting new preload request for model: ${modelPath} for cache key: ${cacheKey}`);

  const loadPromise = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      modelPath,
      (gltf) => {
        console.log(`Model loaded via GLTFLoader: ${modelPath} for cache key: ${cacheKey}`);
        if (enableInstancing) {
           try {
                console.time(`preload-processModelInstancing-${modelPath}`);
                processModelInstancing(cacheKey, gltf); // Use good instancing logic
                console.timeEnd(`preload-processModelInstancing-${modelPath}`);
           } catch (error) {
                console.error("Error during preload processModelInstancing:", error, modelPath, cacheKey);
           }
        }
        keyGltfCache.set(modelPath, gltf);
        console.log(`Stored processed model in gltfCache: ${modelPath} for cache key: ${cacheKey}`);
        resolve(gltf);
      },
      undefined, // Optional progress callback removed for brevity
      (error) => {
        console.error(`Error preloading model: ${modelPath} for cache key: ${cacheKey}`, error);
        keyRequestedUrls.delete(modelPath);
        reject(error);
      }
    );
  });

  keyLoadingCache.set(modelPath, loadPromise as Promise<GLTF>);

  try {
    await loadPromise;
    console.log(`Preload successful and processed: ${modelPath} for cache key: ${cacheKey}`);
    keyLoadingCache.delete(modelPath); // Remove from loading only on success
  } catch (error) {
    console.error(`Preload ultimately failed for: ${modelPath} for cache key: ${cacheKey}`);
    keyLoadingCache.delete(modelPath); // Ensure removal on failure
    throw error;
  }
};
// --- END: preloadModel Function ---
