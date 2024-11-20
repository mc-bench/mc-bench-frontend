import * as THREE from 'three'
import { useState, Suspense } from 'react'
import { Share2, Flag } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF} from '@react-three/drei'

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

const MCBench = () => {
  const [voted, setVoted] = useState(false)

  const buildPair = {
    prompt: "Build a house",
    model_a: {
      name: "Claude Sonnet 3.5",
      modelPath: "/my_awesome_house.gltf",
      stats: {
        blocks_used: '',
        time_taken: ""
      }
    },
    model_b: {
      name: "GPT-4o",
      modelPath: "/my_cool_house.gltf",
      stats: {
        blocks_used: '',
        time_taken: ""
      }
    }
  };

  const handleVote = (choice: 'A' | 'B') => {
    const chosenModel = choice === 'A' ? buildPair.model_a : buildPair.model_b
    console.log(`Voted for ${chosenModel.name}`)
    setVoted(true);
  };

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
        <div className="grid grid-cols-2 gap-4">
          {[buildPair.model_a, buildPair.model_b].map((model, idx) => (
            <div key={idx} className="relative h-[400px] overflow-hidden">
              <Canvas camera={{ position: [30, 5, 30], fov: 60 }}>
                <ambientLight intensity={0.5}/>
                <pointLight position={[12, 50, 10]} />
                <Suspense fallback={null}>
                <Model path={model.modelPath} />
                  <OrbitControls
                    enableZoom={true}
                    minDistance={1}
                    maxDistance={100}
                    target={[0, 0, 0]}
                  />
                </Suspense>
                <Environment preset = 'sunset'>
                </Environment>
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
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleVote('A')}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-md"
            >
              Vote Left
            </button>
            <button
              onClick={() => handleVote('B')}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-md"
            >
              Vote Right
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[buildPair.model_a, buildPair.model_b].map((model, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
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
  );
};

export default MCBench;