import { useGLTF } from '@react-three/drei'
import { GroupProps } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    cube: THREE.Mesh
  }
  materials: {
    cube: THREE.MeshStandardMaterial
  }
}

export function Cube(props: GroupProps) {
  const { nodes, materials } = useGLTF('/cube.gltf') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.cube.geometry} material={materials.cube} />
    </group>
  )
}

useGLTF.preload('/cube.gltf')
