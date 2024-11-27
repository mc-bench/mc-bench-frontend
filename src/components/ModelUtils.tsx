import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Cache maps
export const modelLoadingCache = new Map<string, Promise<GLTF>>()
export const modelPathCache = new Map<string, string>()
export const gltfCache = new Map<string, GLTF>()

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

    // Also remove from drei's cache
    useGLTF.clear(modelPath)
  }
}

// Model component with built-in cleanup
interface ModelProps {
  path: string
}

export const Model = ({ path }: ModelProps) => {
  const gltf = useGLTF(path) as unknown as GLTF

  useEffect(() => {
    // Store in our cache
    gltfCache.set(path, gltf)

    // Cleanup when component unmounts
    return () => {
      cleanupModel(path)
    }
  }, [path, gltf])

  return <primitive object={gltf.scene} />
}

// Create a singleton loader instance
const loader = new GLTFLoader()

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

  console.log('Starting new load for model:', modelPath)
  const loadPromise = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      modelPath,
      (gltf) => {
        console.log('Model loaded successfully:', modelPath)
        gltfCache.set(modelPath, gltf)
        resolve(gltf)
      },
      (progress) => {
        console.log('Loading progress:', modelPath, progress)
      },
      (error) => {
        console.error('Error loading model:', modelPath, error)
        reject(error)
      }
    )
  })

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
