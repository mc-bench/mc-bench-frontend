import { PerspectiveCamera, useGLTF } from '@react-three/drei'
import { GroupProps } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial } from 'three'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    LOD3spShape: Mesh
  }
  materials: {
    'blinn3-fx': MeshStandardMaterial
  }
}

export function Duck(props: GroupProps) {
  const { nodes, materials } = useGLTF('/duck.gltf') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <group scale={0.01}>
        <PerspectiveCamera
          makeDefault={false}
          far={100}
          near={1}
          fov={37.849}
          position={[400.113, 463.264, -431.078]}
          rotation={[-2.314, 0.566, 2.614]}
        />
        <mesh
          geometry={nodes.LOD3spShape.geometry}
          material={materials['blinn3-fx']}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/duck.gltf')
