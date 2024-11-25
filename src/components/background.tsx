import * as THREE from 'three'
import { useEffect, useState } from 'react'

const Background = () => {
  const [textures, setTextures] = useState<{
    grass: THREE.Texture | null
    side: THREE.Texture | null
    dirt: THREE.Texture | null
  }>({
    grass: null,
    side: null,
    dirt: null,
  })

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader()
    const grassTexture = textureLoader.load('/grass_block_top.png')
    const sideTexture = textureLoader.load('/grass_block_side.png')
    const dirtTexture = textureLoader.load('/dirt.png')

    // Make textures pixelated
    grassTexture.magFilter = THREE.NearestFilter
    grassTexture.minFilter = THREE.NearestFilter
    sideTexture.magFilter = THREE.NearestFilter
    sideTexture.minFilter = THREE.NearestFilter
    dirtTexture.magFilter = THREE.NearestFilter
    dirtTexture.minFilter = THREE.NearestFilter

    // Repeat textures
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
    sideTexture.wrapS = sideTexture.wrapT = THREE.RepeatWrapping
    dirtTexture.wrapS = dirtTexture.wrapT = THREE.RepeatWrapping

    grassTexture.repeat.set(8, 8)
    sideTexture.repeat.set(8, 1)
    dirtTexture.repeat.set(8, 1)

    setTextures({
      grass: grassTexture,
      side: sideTexture,
      dirt: dirtTexture,
    })
  }, [])

  if (!textures.grass || !textures.side || !textures.dirt) {
    return null
  }

  // Create an array of dirt layers
  const dirtLayers = Array.from({ length: 5 }).map((_, index) => {
    const yPosition = -20 - index * 10 // Start 10 units below the stone layer
    return (
      <mesh key={`dirt-layer-${index}`} position={[0, yPosition, 0]}>
        <boxGeometry args={[100, 10, 100]} />
        <meshStandardMaterial attach="material-0" map={textures.dirt} />
        <meshStandardMaterial attach="material-1" map={textures.dirt} />
        <meshStandardMaterial attach="material-2" map={textures.dirt} />
        <meshStandardMaterial attach="material-3" map={textures.dirt} />
        <meshStandardMaterial attach="material-4" map={textures.dirt} />
        <meshStandardMaterial attach="material-5" map={textures.dirt} />
      </mesh>
    )
  })

  return (
    <>
      {/* Top ground layer with stone and grass */}
      <mesh position={[0, -10, 0]}>
        <boxGeometry args={[100, 10, 100]} />
        {/* Right */}
        <meshStandardMaterial attach="material-0" map={textures.side} />
        {/* Left */}
        <meshStandardMaterial attach="material-1" map={textures.side} />
        {/* Top */}
        <meshStandardMaterial attach="material-2" map={textures.grass} />
        {/* Bottom */}
        <meshStandardMaterial attach="material-3" map={textures.dirt} />
        {/* Front */}
        <meshStandardMaterial attach="material-4" map={textures.side} />
        {/* Back */}
        <meshStandardMaterial attach="material-5" map={textures.side} />
      </mesh>

      {/* Render dirt layers */}
      {dirtLayers}

      <color attach="background" args={['#87CEEB']} />
      <fog attach="fog" args={['#87CEEB', 70, 120]} />

      <directionalLight position={[12, 8, 4]} intensity={2} />
      <ambientLight>intensity={5}</ambientLight>

      <directionalLight
        position={[-8, 6, -4]}
        intensity={2}
      />
    </>
  )
}

export default Background
