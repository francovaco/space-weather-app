'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { 
  OrbitControls, 
  Sphere, 
  Stars, 
  PerspectiveCamera,
  Html
} from '@react-three/drei'
import * as THREE from 'three'

interface Magnetosphere3DProps {
  pressure: number 
  speed: number    
}

function Earth() {
  const earthRef = useRef<THREE.Group>(null!)
  const colorMap = useLoader(THREE.TextureLoader, 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg')
  
  useFrame((state, delta) => {
    earthRef.current.rotation.y += delta * 0.1
  })

  return (
    <group ref={earthRef}>
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial map={colorMap} roughness={0.7} metalness={0.2} />
      </Sphere>
      <Sphere args={[1.05, 32, 32]}>
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.15} />
      </Sphere>
    </group>
  )
}

function Shield({ pressure }: { pressure: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const scale = useMemo(() => Math.max(2.5 - (pressure / 15), 1.5), [pressure])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(t * 2) * 0.05
      meshRef.current.position.x = Math.sin(t * 10) * (pressure / 100)
    }
  })

  return (
    <mesh ref={meshRef} scale={[scale * 1.6, scale, scale]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#22d3ee"
        wireframe
        transparent
        opacity={0.15}
        emissive="#22d3ee"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

function SolarWind({ speed, pressure }: { speed: number, pressure: number }) {
  const count = 400
  const shieldScale = Math.max(2.5 - (pressure / 15), 1.5)
  const particles = useRef<any[]>([])
  const pointsRef = useRef<THREE.Points>(null!)

  const [coords, colors] = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = Math.random() * 50 - 10
      p[i * 3 + 1] = (Math.random() - 0.5) * 25
      p[i * 3 + 2] = (Math.random() - 0.5) * 25
      
      c[i * 3] = 1; c[i * 3 + 1] = 1; c[i * 3 + 2] = 1;

      particles.current.push({
        vx: -(speed / 400) * 0.3,
        vy: (Math.random() - 0.5) * 0.02,
        vz: (Math.random() - 0.5) * 0.02,
        baseColor: new THREE.Color(0x60a5fa)
      })
    }
    return [p, c]
  }, [])

  useFrame((state, delta) => {
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const col = pointsRef.current.geometry.attributes.color.array as Float32Array
    const boundary = shieldScale * 1.5

    for (let i = 0; i < count; i++) {
      const idx = i * 3
      const p = particles.current[i]

      pos[idx] += p.vx * delta * 60
      pos[idx+1] += p.vy * delta * 60
      pos[idx+2] += p.vz * delta * 60

      // Lógica de Impacto y Deflexión
      const distFront = pos[idx]
      const distY = pos[idx+1]
      const distZ = pos[idx+2]

      if (distFront > 0 && distFront < boundary && Math.abs(distY) < shieldScale * 1.2 && Math.abs(distZ) < shieldScale * 1.2) {
        // EFECTO EXPLOSIÓN: Flash blanco y desvío violento
        col[idx] = 1; col[idx+1] = 1; col[idx+2] = 1;
        p.vy += distY > 0 ? 0.05 : -0.05
        p.vz += distZ > 0 ? 0.05 : -0.05
        p.vx = -0.02 
      } else {
        // Color normal
        col[idx] = 0.37; col[idx+1] = 0.64; col[idx+2] = 0.98;
        // Si ya pasaron el escudo, vuelven a ganar velocidad hacia atrás
        if (distFront < 0) {
          p.vx = -(speed / 400) * 0.4
        }
      }

      if (pos[idx] < -20) {
        pos[idx] = 30
        pos[idx+1] = (Math.random() - 0.5) * 25
        pos[idx+2] = (Math.random() - 0.5) * 25
        p.vx = -(speed / 400) * 0.3
        p.vy = (Math.random() - 0.5) * 0.02
        p.vz = (Math.random() - 0.5) * 0.02
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.color.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={coords} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.12} vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

function Sun() {
  return (
    <group position={[35, 0, 0]}>
      <Sphere args={[3, 32, 32]}>
        <meshBasicMaterial color="#fde047" />
      </Sphere>
      <Sphere args={[4, 32, 32]}>
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
      </Sphere>
      <pointLight intensity={10} distance={100} color="#fff7ed" />
      <Html position={[0, 5, 0]} center>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-amber bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-accent-amber/20">Sol</div>
      </Html>
    </group>
  )
}

export function Magnetosphere3D({ pressure, speed }: Magnetosphere3DProps) {
  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden cursor-move">
      <Canvas shadows camera={{ position: [20, 10, 20], fov: 40 }}>
        <OrbitControls enablePan={false} minDistance={10} maxDistance={50} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.5} />
        <Earth />
        <Sun />
        <SolarWind speed={speed} pressure={pressure} />
        <Shield pressure={pressure} />
        
        <Html position={[-10, 8, 0]}>
          <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white w-56 pointer-events-none select-none shadow-2xl">
            <p className="text-[10px] uppercase font-bold text-accent-cyan tracking-widest mb-2">Escudo Planetario</p>
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-3xl font-data font-black">{pressure.toFixed(2)}</p>
                <p className="text-[9px] text-text-dim uppercase">Presión (nPa)</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-data text-accent-amber">{speed.toFixed(0)}</p>
                <p className="text-[9px] text-text-dim uppercase">km/s</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-accent-cyan transition-all duration-1000" style={{ width: `${Math.min((pressure/15)*100, 100)}%` }} />
            </div>
          </div>
        </Html>
      </Canvas>
    </div>
  )
}
