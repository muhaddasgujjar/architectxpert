import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 300 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

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
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#3b82f6" transparent opacity={0.5} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export default function PageParticles({ count = 300 }: { count?: number }) {
  const webglSupported = useMemo(() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl") || canvas.getContext("webgl2"));
    } catch {
      return false;
    }
  }, []);

  if (!webglSupported) {
    return (
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 via-transparent to-accent-gold/3" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      >
        <ambientLight intensity={0.1} />
        <Particles count={count} />
      </Canvas>
    </div>
  );
}
