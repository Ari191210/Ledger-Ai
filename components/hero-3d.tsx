"use client";
import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function Crystal() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.14 + state.mouse.y * 0.12;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.09 + state.mouse.x * 0.12;
  });

  return (
    <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh ref={meshRef} scale={1.5}>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color="#c44b2a"
          distort={0.12}
          speed={2.5}
          roughness={0.05}
          metalness={0.85}
          transparent
          opacity={0.9}
        />
      </mesh>
    </Float>
  );
}

function Orbiter({ phase, radius, size, color }: { phase: number; radius: number; size: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.35 + phase;
    ref.current.position.set(
      Math.cos(t) * radius,
      Math.sin(t * 0.7) * radius * 0.4,
      Math.sin(t) * radius * 0.6,
    );
    ref.current.rotation.x = t * 0.6;
    ref.current.rotation.z = t * 0.4;
  });

  return (
    <mesh ref={ref} scale={size}>
      <octahedronGeometry args={[1]} />
      <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 6, 4]}   intensity={2.2} color="#ff5520" />
      <pointLight position={[-6, -4, -4]} intensity={1.2} color="#3344ff" />
      <pointLight position={[0, -6, 6]}   intensity={0.7} color="#ffffff" />

      <Crystal />
      <Orbiter phase={0}    radius={2.1} size={0.28} color="#e07030" />
      <Orbiter phase={2.09} radius={1.8} size={0.22} color="#c0a040" />
      <Orbiter phase={4.19} radius={2.4} size={0.18} color="#8855ff" />

      <Sparkles count={30} scale={5} size={0.8} speed={0.25} color="#ff7744" opacity={0.5} />
    </>
  );
}

export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
