import * as THREE from 'three'
import { useState, Suspense, useRef, useEffect } from 'react'
import { Share2, Flag, Maximize2 } from 'lucide-react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import Background from './background'

interface ModelProps {
  path: string
}

type GLTFResult = {
  nodes: Record<string, THREE.Mesh>
  materials: Record<string, THREE.Material>
  scene: THREE.Group
}

const Model = ({ path }: ModelProps) => {
  const gltf = useGLTF(path) as unknown as GLTFResult
  return <primitive object={gltf.scene} />
}

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
  isActive: boolean;
}

const WASDControls = ({ isActive }: WASDControlsProps) => {
  const { camera } = useThree()
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false,
    q: false
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

        euler.current.y -= deltaX * 0.01
        euler.current.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2,
            euler.current.x - deltaY * 0.008)
        )

        camera.quaternion.setFromEuler(euler.current)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
      }
    }

    const resetControls = () => {
      mouseDown.current = false;
      Object.keys(keys.current).forEach(key => {
        keys.current[key as keyof typeof keys.current] = false;
      });
    };

    const handleMouseLeave = () => {
      resetControls();
    };

    const canvas = document.querySelector('canvas');
    canvas?.addEventListener('mouseleave', handleMouseLeave);

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

    const moveSpeed = 0.5
    if (keys.current.w) camera.translateZ(-moveSpeed)
    if (keys.current.s) camera.translateZ(moveSpeed)
    if (keys.current.a) camera.translateX(-moveSpeed)
    if (keys.current.d) camera.translateX(moveSpeed)
    if (keys.current[' ']) camera.translateY(moveSpeed)    // Space to go up
    if (keys.current.q) camera.translateY(-moveSpeed)      // Q to go down
  })

  return null
}

const MCBench = () => {
  const isMobile = useIsMobile()
  const [voted, setVoted] = useState(false)
  const viewerRefA = useRef<HTMLDivElement>(null)
  const viewerRefB = useRef<HTMLDivElement>(null)
  const dimensionsRefA = useRef<{ width: number; height: number }>()
  const dimensionsRefB = useRef<{ width: number; height: number }>()
  const [activeViewer, setActiveViewer] = useState<'A' | 'B' | null>(null)

  const buildPair = {
    prompt: 'Build a house',
    model_a: {
      name: 'Claude Sonnet 3.5',
      modelPath: '/my_awesome_house.gltf',
      stats: {
        blocks_used: 123,
        time_taken: '12.3s',
      },
    },
    model_b: {
      name: 'GPT-4o',
      modelPath: '/my_cool_house.gltf',
      stats: {
        blocks_used: 135,
        time_taken: '13.5s',
      },
    },
  }

  const handleVote = (choice: 'A' | 'B') => {
    const chosenModel = choice === 'A' ? buildPair.model_a : buildPair.model_b
    console.log(`Voted for ${chosenModel.name}`)
    setVoted(true)
  }

  const handleFullscreen = (
    ref: React.RefObject<HTMLDivElement>,
    dimensionsRef: React.MutableRefObject<{ width: number; height: number } | undefined>
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
        height: ref.current.offsetHeight
      }
      ref.current.requestFullscreen()
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">MC-Bench</h1>
        <p className="text-gray-600">
          Which AI generated this Minecraft build better?
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Prompt</span>
        </div>
        <div className="mt-2">
          <div className="bg-blue-50 text-blue-900 p-3 rounded-md text-center text-lg">
            {buildPair.prompt}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 bg-white">
          {[buildPair.model_a, buildPair.model_b].map((model, idx) => (
            <div
              key={idx}
              ref={idx === 0 ? viewerRefA : viewerRefB}
              className="relative w-full md:flex-1 h-[400px] overflow-hidden bg-green-50 rounded-lg"
              onMouseEnter={() => !isMobile && setActiveViewer(idx === 0 ? 'A' : 'B')}
              onMouseLeave={() => !isMobile && setActiveViewer(null)}
            >
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => handleFullscreen(
                    idx === 0 ? viewerRefA : viewerRefB,
                    idx === 0 ? dimensionsRefA : dimensionsRefB
                  )}
                  className="bg-black/75 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center hover:bg-black/90"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute bottom-2 left-2 z-10">
                <div className="bg-black/75 text-white px-2 py-2 rounded-md text-sm w-8 h-8 flex items-center justify-center">
                  {idx === 0 ? 'A' : 'B'}
                </div>
              </div>
              <Canvas camera={{ position: [30, 5, 30], fov: 60 }}>
                <Background />
                <Suspense fallback={null}>
                  <Model path={model.modelPath} />
                  {isMobile ? (
                    <OrbitControls
                      enableZoom={true}
                      minDistance={1}
                      maxDistance={100}
                      target={[0, 0, 0]}
                    />
                  ) : (
                    <WASDControls isActive={activeViewer === (idx === 0 ? 'A' : 'B')} />
                  )}
                </Suspense>
              </Canvas>
              {voted && (
                <div className="absolute top-2 left-2">
                  <div className="bg-black/75 text-white px-3 py-1 rounded-md text-sm">
                    {model.name}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!voted ? (
          <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
            <button
              onClick={() => handleVote('A')}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-md"
            >
              Vote A
            </button>
            <button
              onClick={() => handleVote('B')}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-md"
            >
              Vote B
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            {[buildPair.model_a, buildPair.model_b].map((model, idx) => (
              <div
                key={idx}
                className="flex-1 bg-white rounded-lg shadow-sm border p-4"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">Blocks</div>
                    <div>{model.stats.blocks_used}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Time</div>
                    <div>{model.stats.time_taken}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2 pt-4">
          <button className="p-2 rounded-full border hover:bg-gray-100">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-full border hover:bg-gray-100">
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MCBench
