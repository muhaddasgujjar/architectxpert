import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Procedurally generate a classic generic house fragmented into smaller bricks for an intricate assembly animation
function generateHouse() {
  const parts = [];
  
  // 1. Foundation Base (Fragmented into 4 concrete slabs)
  parts.push({ x: -2, y: -2, z: -2, w: 4, h: 0.3, d: 4, color: '#94a3b8' });
  parts.push({ x: 2, y: -2, z: -2, w: 4, h: 0.3, d: 4, color: '#94a3b8' });
  parts.push({ x: -2, y: -2, z: 2, w: 4, h: 0.3, d: 4, color: '#94a3b8' });
  parts.push({ x: 2, y: -2, z: 2, w: 4, h: 0.3, d: 4, color: '#94a3b8' });

  // 2. Wooden Floor
  parts.push({ x: 0, y: -1.8, z: 0, w: 7.6, h: 0.1, d: 7.6, color: '#d97706' });

  // 3. Fragmented Walls (Built brick by brick)
  // Left and Right Walls
  for (let wy = -1.6; wy <= 1.4; wy += 0.6) {
    for (let wz = -3.5; wz <= 3.5; wz += 1.4) {
      parts.push({ x: -3.8, y: wy, z: wz, w: 0.2, h: 0.58, d: 1.38, color: '#f8fafc' }); // Left wall piece
      parts.push({ x: 3.8, y: wy, z: wz, w: 0.2, h: 0.58, d: 1.38, color: '#f8fafc' });  // Right wall piece
    }
  }

  // Back Wall
  for (let wy = -1.6; wy <= 1.4; wy += 0.6) {
    for (let wx = -3.5; wx <= 3.5; wx += 1.4) {
      parts.push({ x: wx, y: wy, z: -3.8, w: 1.38, h: 0.58, d: 0.2, color: '#f8fafc' });
    }
  }

  // Front Wall (With gaps for windows and a door)
  for (let wy = -1.6; wy <= 1.4; wy += 0.6) {
    for (let wx = -3.5; wx <= 3.5; wx += 1.4) {
      // Create a door gap at the bottom center
      if (wy < 0 && Math.abs(wx) < 1.0) continue; 
      
      // Create window gaps midway up on the left and right
      if (wy > -1.0 && wy < 1.0 && Math.abs(wx) > 1.5 && Math.abs(wx) < 3.0) {
        // Add Glass Windows into the gap!
        if (wy === -0.4) {
           parts.push({ x: wx, y: 0, z: 3.8, w: 1.38, h: 1.18, d: 0.1, color: '#38bdf8', glass: true });
        }
        continue;
      }
      
      parts.push({ x: wx, y: wy, z: 3.8, w: 1.38, h: 0.58, d: 0.2, color: '#f8fafc' });
    }
  }

  // A solid front wooden door
  parts.push({ x: 0, y: -0.7, z: 3.8, w: 1.4, h: 2.2, d: 0.1, color: '#8b5cf6' });

  // 4. Ceiling
  parts.push({ x: 0, y: 1.8, z: 0, w: 8.2, h: 0.2, d: 8.2, color: '#e2e8f0' });

  // 5. Classic Slanted Roof (A-Frame built from tiles)
  // Left Roof Panel (slanted)
  for (let rz = -4; rz <= 4; rz += 1) {
    parts.push({ 
      x: -2.3, y: 2.8, z: rz, 
      w: 4.8, h: 0.1, d: 0.95, 
      rotZ: Math.PI / 4, // Slanted 45 degrees
      color: '#ef4444' 
    });
  }
  // Right Roof Panel (slanted opposite)
  for (let rz = -4; rz <= 4; rz += 1) {
    parts.push({ 
      x: 2.3, y: 2.8, z: rz, 
      w: 4.8, h: 0.1, d: 0.95, 
      rotZ: -Math.PI / 4, // Slanted -45 degrees
      color: '#ef4444' 
    });
  }

  // Floating AI structural Data Core inside the house
  parts.push({ x: 0, y: -0.5, z: 0, w: 1.5, h: 1.5, d: 1.5, color: '#0d9488', emissive: '#14b8a6' });

  return parts;
}

const BUILDING_PARTS = generateHouse();

function ObjectShard({ part }: { part: any }) {
  const meshRef = useRef<THREE.Group>(null);
  
  const { x: tX, y: tY, z: tZ, w, h, d, rotZ: tRotZ } = part;
  const finalRotZ = tRotZ || 0;
  
  // Initial chaotic scatter positions, scattered high in the sky and around
  const startX = tX + (Math.random() - 0.5) * 60;
  const startY = tY + Math.random() * 40 + 20;
  const startZ = tZ + (Math.random() - 0.5) * 60;

  // Chaotic starting rotation for dramatic flying assembly
  const startRotX = Math.random() * Math.PI * 4;
  const startRotY = Math.random() * Math.PI * 4;
  const startRotZ = Math.random() * Math.PI * 4;

  const initialRenderPos = useMemo(() => new THREE.Vector3(startX, startY, startZ), [startX, startY, startZ]);
  const initialRenderRot = useMemo(() => new THREE.Euler(startRotX, startRotY, startRotZ), [startRotX, startRotY, startRotZ]);

  // Different math speeds for different pieces so it looks wildly organic
  const speed = useMemo(() => 1.5 + Math.random() * 2, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // The magic physics assembling the building geometrically
    meshRef.current.position.x = THREE.MathUtils.damp(meshRef.current.position.x, tX, speed, delta);
    meshRef.current.position.y = THREE.MathUtils.damp(meshRef.current.position.y, tY, speed, delta);
    meshRef.current.position.z = THREE.MathUtils.damp(meshRef.current.position.z, tZ, speed, delta);
    
    meshRef.current.rotation.x = THREE.MathUtils.damp(meshRef.current.rotation.x, 0, speed, delta);
    meshRef.current.rotation.y = THREE.MathUtils.damp(meshRef.current.rotation.y, 0, speed, delta);
    meshRef.current.rotation.z = THREE.MathUtils.damp(meshRef.current.rotation.z, finalRotZ, speed, delta);
  });

  return (
    <group ref={meshRef} position={initialRenderPos} rotation={initialRenderRot}>
      {/* Core Transparent Blueprint Glass */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color="#1e3a8a" transparent={true} opacity={0.4} depthWrite={false} />
      </mesh>
      {/* Glowing Neon Blue Blueprint Wireframe Edges */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color="#38bdf8" wireframe={true} transparent={true} opacity={0.9} />
      </mesh>
    </group>
  );
}

export default function ObjectAssembly() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Constant slow rotation of the whole architectural masterpiece
    groupRef.current.rotation.y += delta * 0.15;
    
    // Gentle floating
    groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2;
    
    // Slight isometric downward tilt
    groupRef.current.rotation.x = Math.max(0.1, Math.sin(state.clock.getElapsedTime() * 0.3) * 0.05 + 0.15);
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* The White Wireframe Grid Floor seen in the video */}
      <gridHelper args={[20, 20, '#ffffff', '#ffffff']} position={[0, -3.5, 0]} material-opacity={0.3} material-transparent={true} />
      
      {BUILDING_PARTS.map((part, index) => (
        <ObjectShard key={index} part={part} />
      ))}
    </group>
  );
}
