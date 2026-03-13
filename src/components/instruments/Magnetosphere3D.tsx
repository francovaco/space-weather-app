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

import { useLoader } from '@react-three/fiber'

function Earth() {
  const earthRef = useRef<THREE.Group>(null!)
  
  // Cargamos una textura simple de la Tierra para ver la rotación
  // Usamos una URL confiable de assets de Three.js o similar
  const colorMap = useLoader(THREE.TextureLoader, 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg')
  
  useFrame((state, delta) => {
    earthRef.current.rotation.y += delta * 0.1
  })

  return (
    <group ref={earthRef}>
      {/* Planeta Tierra con textura */}
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial 
          map={colorMap}
          roughness={0.7}
          metalness={0.2}
        />
      </Sphere>
      {/* Brillo Atmosférico */}
      <Sphere args={[1.05, 32, 32]}>
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.15} />
      </Sphere>
    </group>
  )
}

function Shield({ pressure }: { pressure: number }) {
  // Mapeamos la presión a la distorsión y escala
  // Presión normal: ~1-3 nPa. Tormenta: >10 nPa.
  const distortion = useMemo(() => {
    return Math.min(0.2 + (pressure / 20), 0.8)
  }, [pressure])

  const scale = useMemo(() => {
    // A mayor presión, el escudo se comprime hacia la Tierra
    return Math.max(2.5 - (pressure / 15), 1.5)
  }, [pressure])

  return (
    <mesh scale={[scale * 1.5, scale, scale]}>
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
  )
}

function Sun() {
  return (
    <group position={[25, 0, 0]}>
      {/* El Sol */}
      <Sphere args={[2, 32, 32]}>
        <meshBasicMaterial color="#fde047" />
      </Sphere>
      {/* Resplandor solar */}
      <Sphere args={[2.5, 32, 32]}>
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
      </Sphere>
      <pointLight intensity={5} distance={100} color="#fff7ed" />
      
      <Html position={[0, 3, 0]} center>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-amber bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-accent-amber/20">
          Sol
        </div>
      </Html>
    </group>
  )
}

function SolarWindParticles({ speed }: { speed: number }) {
  const count = 100
  const points = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = Math.random() * 40 - 10     // X: de -10 a 30
      p[i * 3 + 1] = (Math.random() - 0.5) * 10 // Y: +/- 5
      p[i * 3 + 2] = (Math.random() - 0.5) * 10 // Z: +/- 5
    }
    return p
  }, [])

  const ref = useRef<THREE.Points>(null!)
  useFrame((state, delta) => {
    const positions = ref.current.geometry.attributes.position.array as Float32Array
    const moveSpeed = (speed / 400) * delta * 20 // Ajustado para visualización

    for (let i = 0; i < count; i++) {
      positions[i * 3] -= moveSpeed // Viajan del Sol (+X) a la Tierra (0)
      if (positions[i * 3] < -10) {
        positions[i * 3] = 30 // Reinician en el lado del Sol
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#60a5fa" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

function OrientationLabels() {
  return (
    <group>
      {/* Lado Diurno */}
      <Html position={[2, 0, 0]} center>
        <div className="text-[8px] font-black uppercase text-white/40 select-none">Lado Diurno</div>
      </Html>
      {/* Lado Nocturno */}
      <Html position={[-5, 0, 0]} center>
        <div className="text-[8px] font-black uppercase text-white/40 select-none">Cola Magnética</div>
      </Html>
    </group>
  )
}

export function Magnetosphere3D({ pressure, speed }: Magnetosphere3DProps) {
  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden cursor-move">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 5, 12]} />
        <OrbitControls 
          enablePan={false} 
          minDistance={5} 
          maxDistance={30} 
          autoRotate={false}
        />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <ambientLight intensity={0.3} />
        <spotLight position={[20, 10, 10]} angle={0.15} penumbra={1} intensity={1} color="#fff7ed" />

        <Earth />
        <Sun />
        <SolarWindParticles speed={speed} />
        <Shield pressure={pressure} />
        <OrientationLabels />

        <Html position={[-6, 4, 0]}>
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
