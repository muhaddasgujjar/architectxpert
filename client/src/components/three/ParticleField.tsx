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

function WireframeGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.x = time * 0.05 + state.pointer.y * 0.1;
    meshRef.current.rotation.y = time * 0.08 + state.pointer.x * 0.1;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <icosahedronGeometry args={[3, 2]} />
      <meshBasicMaterial
        wireframe
        color="#3b82f6"
        transparent
        opacity={0.08}
      />
    </mesh>
  );
}

function FloatingRings() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.getElapsedTime();
    group.current.rotation.z = time * 0.03;
    group.current.children.forEach((child, i) => {
      child.rotation.x = time * 0.05 * (i + 1) * 0.3;
      child.rotation.y = time * 0.03 * (i + 1) * 0.2;
    });
  });

  return (
    <group ref={group} position={[0, 0, -3]}>
      {[2, 3.5, 5].map((radius, i) => (
        <mesh key={i}>
          <torusGeometry args={[radius, 0.005, 16, 100]} />
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.12 - i * 0.03}
          />
        </mesh>
      ))}
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
        <Particles count={600} />
        <WireframeGlobe />
        <FloatingRings />
      </Canvas>
    </div>
  );
}
