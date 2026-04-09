import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const COLS = 16;
const ROWS = 9;
const TOTAL = COLS * ROWS;
const PLANE_W = 16;
const PLANE_H = 9;
const BLOCK_W = PLANE_W / COLS;
const BLOCK_H = PLANE_H / ROWS;

function Shard({ index, originalTexture }: { index: number, originalTexture: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const c = index % COLS;
  const r = Math.floor(index / COLS);
  
  // Final target position to form the centralized perfect image puzzle
  const targetX = (c * BLOCK_W) - (PLANE_W / 2) + (BLOCK_W / 2);
  const targetY = (r * BLOCK_H) - (PLANE_H / 2) + (BLOCK_H / 2);
  const targetZ = 0;
  
  // Starting chaotic spatial position (The 'data scatter' effect)
  const startX = targetX + (Math.random() - 0.5) * 40;
  const startY = targetY + (Math.random() - 0.5) * 40;
  const startZ = Math.random() * 30 + 10; // pushed towards the camera violently

  // Chaotic starting rotation for dramatic flying
  const startRotX = Math.random() * Math.PI * 4;
  const startRotY = Math.random() * Math.PI * 4;
  const startRotZ = Math.random() * Math.PI * 4;

  const initialRenderPos = useMemo(() => new THREE.Vector3(startX, startY, startZ), [startX, startY, startZ]);
  const initialRenderRot = useMemo(() => new THREE.Euler(startRotX, startRotY, startRotZ), [startRotX, startRotY, startRotZ]);

  // Clone the material/texture exclusively for this shard so we can map just a tiny grid segment of the HD image
  const material = useMemo(() => {
    const tex = originalTexture.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1 / COLS, 1 / ROWS);
    tex.offset.set(c / COLS, r / ROWS);
    return new THREE.MeshBasicMaterial({ 
      map: tex, 
      transparent: true, 
      opacity: 0.9, 
      depthWrite: false 
    });
  }, [c, r, originalTexture]);

  // Add random speed variation so the assembly feels organic and not rigidly uniform
  const speed = useMemo(() => 1.5 + Math.random() * 2, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Magnetic gravity snapping back into place piece-by-piece!
    meshRef.current.position.x = THREE.MathUtils.damp(meshRef.current.position.x, targetX, speed, delta);
    meshRef.current.position.y = THREE.MathUtils.damp(meshRef.current.position.y, targetY, speed, delta);
    meshRef.current.position.z = THREE.MathUtils.damp(meshRef.current.position.z, targetZ, speed, delta);
    
    meshRef.current.rotation.x = THREE.MathUtils.damp(meshRef.current.rotation.x, 0, speed, delta);
    meshRef.current.rotation.y = THREE.MathUtils.damp(meshRef.current.rotation.y, 0, speed, delta);
    meshRef.current.rotation.z = THREE.MathUtils.damp(meshRef.current.rotation.z, 0, speed, delta);
  });

  return (
    <mesh 
      ref={meshRef} 
      position={initialRenderPos} 
      rotation={initialRenderRot}
      material={material}
    >
      <planeGeometry args={[BLOCK_W, BLOCK_H]} />
    </mesh>
  );
}

export default function ImageAssembly() {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, '/blueprint-hero.png');

  // Interactive Physics for the Entire Board once assembled
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Ambient floating 
    groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.8) * 0.15;
    
    // Parallax physical tilts tracking mouse pointer
    const targetX = (state.pointer.x * Math.PI) / 10;
    const targetY = (state.pointer.y * Math.PI) / 10;
    
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetX, 3, delta);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, -targetY, 3, delta);
  });

  const shards = useMemo(() => Array.from({ length: TOTAL }, (_, i) => i), []);

  return (
    <group ref={groupRef} position={[0, 0, -2]}>
      {shards.map((index) => (
        <Shard key={index} index={index} originalTexture={texture} />
      ))}
    </group>
  );
}
