'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  OrbitControls, 
  Sphere, 
  MeshDistortMaterial, 
  Stars, 
  Float, 
  PerspectiveCamera,
  Text,
  Html
} from '@react-three/drei'
import * as THREE from 'three'

interface Magnetosphere3DProps {
  pressure: number // Presión del viento solar (nPa)
  speed: number    // Velocidad (km/s)
}

function Earth() {
  return (
    <group>
      {/* Planeta Tierra (Simplificado) */}
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial 
          color="#1e40af" 
          emissive="#1e3a8a" 
          emissiveIntensity={0.2} 
          roughness={0.5} 
        />
      </Sphere>
      {/* Brillo Atmosférico */}
      <Sphere args={[1.05, 32, 32]}>
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.1} />
      </Sphere>
    </group>
  )
}

function Shield({ pressure }: { pressure: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  // Mapeamos la presión a la distorsión y escala
  // Presión normal: ~1-3 nPa. Tormenta: >10 nPa.
  const distortion = useMemo(() => {
    return Math.min(0.2 + (pressure / 20), 0.8)
  }, [pressure])

  const scale = useMemo(() => {
    // A mayor presión, el escudo se comprime hacia la Tierra
    return Math.max(2.5 - (pressure / 15), 1.5)
  }, [pressure])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    // Animación suave de "respiración"
    meshRef.current.rotation.y = time * 0.1
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} scale={[scale * 1.5, scale, scale]}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#22d3ee"
          speed={distortion * 5}
          distort={distortion}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    </Float>
  )
}

export function Magnetosphere3D({ pressure, speed }: Magnetosphere3DProps) {
  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden cursor-move">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 3, 8]} />
        <OrbitControls 
          enablePan={false} 
          minDistance={4} 
          maxDistance={15} 
          autoRotate 
          autoRotateSpeed={0.5} 
        />
        
        {/* Espacio */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Iluminación (Sol a la derecha) */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 5, 10]} intensity={1.5} color="#fff7ed" />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />

        {/* Elementos 3D */}
        <Earth />
        <Shield pressure={pressure} />

        {/* Datos en pantalla */}
        <Html position={[-4, 3, 0]}>
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white w-48 pointer-events-none select-none">
            <p className="text-[10px] uppercase font-bold text-accent-cyan tracking-widest mb-1">Estado de Escudo</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-data font-black">{pressure.toFixed(2)}</p>
                <p className="text-[9px] text-text-dim uppercase">Presión (nPa)</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-data text-accent-amber">{speed.toFixed(0)}</p>
                <p className="text-[9px] text-text-dim uppercase">km/s</p>
              </div>
            </div>
            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-cyan transition-all duration-1000" 
                style={{ width: `${Math.min((pressure/15)*100, 100)}%` }} 
              />
            </div>
          </div>
        </Html>
      </Canvas>
    </div>
  )
}
