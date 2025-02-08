const Background = () => {
  return (
    <>
      <color attach="background" args={['#78A7FF']} />
      <fog attach="fog" args={['#78A7FF', 70, 120]} />

      <directionalLight position={[12, 8, 4]} intensity={2} />
      <ambientLight>intensity={5}</ambientLight>

      <directionalLight position={[-8, 6, -4]} intensity={2} />
    </>
  )
}

export default Background
