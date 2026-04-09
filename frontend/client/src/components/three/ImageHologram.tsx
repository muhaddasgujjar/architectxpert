import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export default function ImageHologram() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, '/blueprint-hero.png');

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smooth, slow levitation effect simulating zero gravity
    meshRef.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.15;
    
    // Parallax mouse tilt simulating actual 3D space tracking
    const targetX = (state.pointer.x * Math.PI) / 12;
    const targetY = (state.pointer.y * Math.PI) / 12;
    
    // Dampen the rotations for ultra-smooth physical weight
    meshRef.current.rotation.y = THREE.MathUtils.damp(meshRef.current.rotation.y, targetX, 5, delta);
    meshRef.current.rotation.x = THREE.MathUtils.damp(meshRef.current.rotation.x, -targetY, 5, delta);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      {/* 1:1 image aspect ratio approx since generation leans square or 16:9. Let's use 16:9 */}
      <planeGeometry args={[16, 9]} />
      <meshBasicMaterial 
        map={texture} 
        transparent={true} 
        opacity={0.9} // Slight transparency so it blends mysteriously with the dark void background
        depthWrite={false}
      />
    </mesh>
  );
}
