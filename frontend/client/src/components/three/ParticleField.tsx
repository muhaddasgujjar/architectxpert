import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 800 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  const basePositions = useMemo(() => new Float32Array(positions), [positions]);

  useFrame((state) => {
    if (!mesh.current) return;
    const time = state.clock.getElapsedTime();
    mouse.current.x = state.pointer.x * viewport.width * 0.3;
    mouse.current.y = state.pointer.y * viewport.height * 0.3;

    mesh.current.rotation.x = Math.sin(time * 0.05) * 0.1 + mouse.current.y * 0.02;
    mesh.current.rotation.y = Math.cos(time * 0.08) * 0.1 + mouse.current.x * 0.02;
    mesh.current.rotation.z = time * 0.02;

    const posArray = mesh.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3 + 1] = basePositions[i3 + 1] + Math.sin(time * 0.3 + i * 0.1) * 0.3;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#3b82f6"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function ArchitecturalGrid() {
  const meshRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(35, 35, 70, 70), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Rotate very slowly
    meshRef.current.rotation.z = time * 0.05;
    
    const positions = (geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    
    // Map mouse to local space (approximate)
    const targetX = state.pointer.x * 15;
    const targetY = state.pointer.y * 15;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      const dist = Math.sqrt((x - targetX)**2 + (y - targetY)**2);
      
      // Base structural wave simulating data
      let z = Math.sin(x * 0.5 + time * 0.5) * Math.cos(y * 0.5 + time * 0.5) * 0.3;
      
      // Interactive architectural "skyscrapers" rising on hover
      if (dist < 4) {
        z += (4 - dist) * 1.5;
      }
      
      positions[i + 2] = z;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group rotation={[-Math.PI / 2 + 0.4, 0, 0]} position={[0, -5, -8]}>
      {/* Blueprint Wireframe Surface */}
      <mesh geometry={geometry}>
        <meshBasicMaterial 
          color="#14B8A6" 
          wireframe={true} 
          transparent={true} 
          opacity={0.15} 
        />
      </mesh>
      {/* Glowing Architectural Nodes */}
      <points ref={meshRef} geometry={geometry}>
        <pointsMaterial 
          size={0.06} 
          color="#eab308" 
          transparent={true} 
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function FallbackBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 via-transparent to-gold/3" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-accent-blue/10 animate-pulse-glow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-accent-blue/5" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full border border-accent-blue/5" />
    </div>
  );
}

function hasWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") || canvas.getContext("webgl2")
    );
  } catch {
    return false;
  }
}

export default function ParticleField() {
  const webglSupported = useMemo(() => hasWebGLSupport(), []);

  if (!webglSupported) {
    return <FallbackBackground />;
  }

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.1} />
        <Particles count={400} />
        <ArchitecturalGrid />
      </Canvas>
    </div>
  );
}
