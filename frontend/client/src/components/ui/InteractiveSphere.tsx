import * as THREE from "three";
import { useRef, useMemo, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const COUNT = 1000;
const RADIUS = 3.5;

export default function InteractiveSphere() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { pointer, camera } = useThree();

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const basePosition = useMemo(() => new THREE.Vector3(), []);
  const mouse = useMemo(() => new THREE.Vector3(), []);

  // Pre-calculate positions on the sphere surface using Fibonacci lattice
  const positions = useMemo(() => {
    const pos = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      pos.push(new THREE.Vector3(x * RADIUS, y * RADIUS, z * RADIUS));
    }
    return pos;
  }, []);

  const stateRef = useRef<{ currents: THREE.Vector3[]; velocities: THREE.Vector3[] }>({
    currents: positions.map((p) => p.clone()),
    velocities: positions.map(() => new THREE.Vector3()),
  });

  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < COUNT; i++) {
        dummy.position.copy(positions[i]);
        // Orient spheres outward
        dummy.lookAt(positions[i].clone().multiplyScalar(2));
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [dummy, positions]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Auto-rotate the whole clump
    meshRef.current.rotation.y += delta * 0.15;
    meshRef.current.rotation.x += delta * 0.05;

    // Smoothly convert pointer to 3D space
    mouse.set(pointer.x, pointer.y, 0.5);
    mouse.unproject(camera);
    mouse.sub(camera.position).normalize();
    
    // Project mouse onto a plane exactly at the sphere's Z position
    // First, update world matrix of the sphere group
    meshRef.current.updateMatrixWorld();
    const sphereWorldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(sphereWorldPos);

    // Find intersection of mouse ray with plane Z = sphereWorldPos.z
    const planeZ = sphereWorldPos.z;
    const distanceToPlane = (planeZ - camera.position.z) / mouse.z;
    const targetMousePos = camera.position.clone().add(mouse.multiplyScalar(distanceToPlane));

    // Transform mouse intersection into local space of the mesh
    meshRef.current.worldToLocal(targetMousePos);

    const { currents, velocities } = stateRef.current;
    
    const repulsionRadius = 2.5; 
    const repulsionStrength = 2.0;

    for (let i = 0; i < COUNT; i++) {
      basePosition.copy(positions[i]);
      const current = currents[i];
      const vel = velocities[i];

      // Vector from mouse to base position
      const mouseToBase = basePosition.clone().sub(targetMousePos);
      const distToMouse = mouseToBase.length();

      const targetPos = basePosition.clone();

      // If mouse is close, push it outward relative to mouse and base center
      if (distToMouse < repulsionRadius) {
        // Stronger push when closer
        const pushIntensity = Math.pow((repulsionRadius - distToMouse) / repulsionRadius, 2) * repulsionStrength;
        // Direction to push: mix of outward from center and outward from mouse
        const pushDir = basePosition.clone().normalize().add(mouseToBase.normalize()).normalize();
        targetPos.add(pushDir.multiplyScalar(pushIntensity));
      }

      // Spring physics
      const spring = 8.0; 
      const friction = 0.75; 

      const accel = targetPos.sub(current).multiplyScalar(spring * delta);
      vel.add(accel);
      vel.multiplyScalar(friction);
      current.add(vel);

      dummy.position.copy(current);
      // Ensure orientation follows position
      const lookAtDir = current.clone().normalize();
      dummy.lookAt(current.clone().add(lookAtDir));
      
      // Calculate scale - spheres scale down a bit when flying outward
      // If velocity is high, it shrinks slightly
      const speed = vel.length();
      const targetScale = Math.max(0.2, 1 - speed * 1.5);
      dummy.scale.setScalar(targetScale);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      {/* 0.15 is the radius of individual tiny spheres, higher segments for smoothness */}
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color="#14B8A6" // Teal/cyan tint for spheres
        emissive="#0D9488"
        emissiveIntensity={0.6}
        roughness={0.2}
        metalness={0.8}
      />
    </instancedMesh>
  );
}
