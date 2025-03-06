import { useThree } from '@react-three/fiber'

const Background = () => {
  const { scene } = useThree()

  // Check if metadata is available through scene userData
  const modelMetadata = scene.userData.modelMetadata
  const maxDimension = modelMetadata?.maxDimension || 10

  // Scale light positions based on model size
  // Use normalized positions for directional lights (they're infinitely far away anyway)
  // But scale intensity based on the model size
  const scaleFactor = Math.max(1, maxDimension / 10)

  return (
    <>
      <color attach="background" args={['#78A7FF']} />
      {/* Fog removed to improve model visibility */}

      {/* Main key light */}
      <directionalLight position={[1, 0.8, 0.5]} intensity={2.5} />

      {/* Ambient fill light - less intensity for larger models to avoid washing out */}
      <ambientLight intensity={1.0 / Math.sqrt(scaleFactor)} />

      {/* Fill light from opposite side */}
      <directionalLight position={[-0.8, 0.6, -0.4]} intensity={1.5} />
    </>
  )
}

export default Background
