import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FLOOR_COUNT = 5;
const BASE_Y_SPACING = 1.2;
const HOVER_Y_SPACING = 3.0; // The exploded view distance

function BuildingFloor({ index, totalFloors, targetSpacingObj }: { index: number, totalFloors: number, targetSpacingObj: { current: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const isTopFloor = index === totalFloors - 1;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Calculate target Y position for this floor
    const targetY = index * targetSpacingObj.current - (totalFloors * BASE_Y_SPACING) / 2;
    // Smoothly interpolate current Y to target Y using Spring-like dampening
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 6, delta);
  });

  return (
    <group ref={groupRef}>
      {/* Concrete/Metal Floor Plate */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[4, 0.1, 4]} />
        <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* Glowing Inner Core Platform (represents AI databanks) */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2, 0.15, 2]} />
        <meshStandardMaterial color="#0D9488" emissive="#14B8A6" emissiveIntensity={0.6} />
      </mesh>

      {/* Internal Support Columns */}
      <mesh position={[-1.5, 0.5, -1.5]}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[1.5, 0.5, -1.5]}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[-1.5, 0.5, 1.5]}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[1.5, 0.5, 1.5]}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Frost Glass Façade (Outer Walls) */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3.9, 1, 3.9]} />
        <meshPhysicalMaterial 
          color="#38bdf8" 
          transparent={true} 
          opacity={0.3} 
          roughness={0.1} 
          metalness={0.1}
          transmission={0.9} 
          thickness={0.5} 
        />
      </mesh>

      {/* Roof cap for the top floor */}
      {isTopFloor && (
         <mesh position={[0, 1.05, 0]}>
           <boxGeometry args={[4, 0.1, 4]} />
           <meshStandardMaterial color="#1e293b" roughness={0.9} />
         </mesh>
      )}
    </group>
  );
}

export default function ArchitecturalModel() {
  const [hovered, setHovered] = useState(false);
  const targetSpacingObj = useRef({ current: BASE_Y_SPACING });
  const entireBuildingRef = useRef<THREE.Group>(null);
  const wireframeRingRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    // Determine the target spacing based on hover state
    const targetSpacing = hovered ? HOVER_Y_SPACING : BASE_Y_SPACING;
    targetSpacingObj.current.current = THREE.MathUtils.damp(targetSpacingObj.current.current, targetSpacing, 6, delta);
    
    if (entireBuildingRef.current) {
        // Slowly rotate the entire masterpiece
        entireBuildingRef.current.rotation.y += delta * 0.2;
        // Add a slight tilt idle animation
        entireBuildingRef.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.05;
        entireBuildingRef.current.rotation.x = Math.max(0.1, Math.sin(state.clock.getElapsedTime() * 0.3) * 0.05 + 0.2); // Keep it isometric
    }

    if (wireframeRingRef.current) {
        wireframeRingRef.current.rotation.y -= delta * 0.3;
        wireframeRingRef.current.rotation.x += delta * 0.1;
    }
  });

  // Array of floors to render
  const floors = useMemo(() => Array.from({ length: FLOOR_COUNT }, (_, i) => i), []);

  return (
    <group 
      ref={entireBuildingRef} 
      position={[0, -0.5, 0]} 
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
    >
      {/* Centerpiece Architecture */}
      {floors.map((index) => (
        <BuildingFloor 
          key={index} 
          index={index} 
          totalFloors={FLOOR_COUNT} 
          targetSpacingObj={targetSpacingObj} 
        />
      ))}

      {/* Decorative Outer Data Rings representing AI Analysis */}
      <mesh ref={wireframeRingRef} position={[0, 0, 0]}>
         <torusGeometry args={[4.5, 0.02, 16, 100]} />
         <meshBasicMaterial color="#eab308" wireframe={true} transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
         <torusGeometry args={[4.5, 0.04, 16, 100]} />
         <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
