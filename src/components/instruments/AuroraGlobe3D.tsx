'use client'
// ============================================================
// src/components/instruments/AuroraGlobe3D.tsx
// Globo terrestre 3D con probabilidad de aurora OVATION
// ============================================================
import { useRef, useMemo, Suspense, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useQuery } from '@tanstack/react-query'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { DataAge } from '@/components/ui/DataAge'
import { RotateCcw } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────

interface OvationData {
  'Forecast Time': string
  'Observation Time'?: string
  coordinates: [number, number, number][] // [lon, lat, aurora_value 0-100]
}

interface HoverInfo {
  clientX: number
  clientY: number
  prob: number
  rgb: string
}

// ── Escala AURORA (23 entradas, igual que AuroraClient.tsx) ─
// [r, g, b, probabilidad%, energía ergs/cm²]

const AURORA_SCALE: [number, number, number, number, number][] = [
  [ 28, 211,  30, 10, 0.0],
  [ 23, 228,  13, 14, 0.5],
  [ 31, 232,  10, 18, 0.8],
  [ 37, 241,   6, 22, 1.1],
  [ 46, 247,   3, 26, 1.3],
  [ 57, 254,   0, 30, 1.5],
  [ 98, 254,   0, 34, 1.7],
  [136, 255,   0, 38, 1.9],
  [181, 255,   1, 42, 2.1],
  [223, 254,   0, 46, 2.3],
  [255, 251,   0, 50, 2.5],
  [255, 231,   1, 54, 2.8],
  [254, 215,   0, 58, 3.0],
  [255, 196,   0, 62, 3.2],
  [255, 180,   0, 66, 3.4],
  [255, 163,   0, 68, 3.6],
  [255, 144,   1, 72, 3.8],
  [254, 125,   0, 76, 4.0],
  [254,  72,   0, 80, 4.2],
  [255,  17,   0, 84, 4.5],
  [248,   2,   0, 86, 4.7],
  [239,   0,   0, 88, 4.8],
  [213,   0,   0, 90, 5.0],
]

function probToRgb(ovationVal: number): [number, number, number] {
  const prob = Math.max(AURORA_SCALE[0][3], Math.min(AURORA_SCALE[AURORA_SCALE.length - 1][3], ovationVal))
  let lo = 0
  for (let i = 0; i < AURORA_SCALE.length - 1; i++) {
    if (AURORA_SCALE[i][3] <= prob && AURORA_SCALE[i + 1][3] >= prob) { lo = i; break }
  }
  const hi = Math.min(lo + 1, AURORA_SCALE.length - 1)
  const range = AURORA_SCALE[hi][3] - AURORA_SCALE[lo][3]
  const f = range === 0 ? 0 : (prob - AURORA_SCALE[lo][3]) / range
  return [
    (AURORA_SCALE[lo][0] + (AURORA_SCALE[hi][0] - AURORA_SCALE[lo][0]) * f) / 255,
    (AURORA_SCALE[lo][1] + (AURORA_SCALE[hi][1] - AURORA_SCALE[lo][1]) * f) / 255,
    (AURORA_SCALE[lo][2] + (AURORA_SCALE[hi][2] - AURORA_SCALE[lo][2]) * f) / 255,
  ]
}

// ── Constantes ─────────────────────────────────────────────

const R = 1.5
const THRESHOLD = 3
const POLE_CUTOFF = 88
const TEX_W = 2048
const TEX_H = 1024

// ── Helpers de coordenadas ─────────────────────────────────

// Conversión que coincide exactamente con el UV mapping de Three.js SphereGeometry:
// u = lon/360 → x = -r·cos(u·2π)·sin(v·π), z = r·sin(u·2π)·sin(v·π)
function geoToVec(lat: number, lon: number, r: number): [number, number, number] {
  const phi   = (lon / 360) * 2 * Math.PI       // azimuth (u → 0…2π)
  const theta = ((90 - lat) / 180) * Math.PI    // polar   (v → 0…π)
  return [
    -r * Math.cos(phi) * Math.sin(theta),
     r * Math.cos(theta),
     r * Math.sin(phi) * Math.sin(theta),
  ]
}

// Inversa exacta de geoToVec
function vecToLatLon(v: THREE.Vector3): [number, number] {
  const len = v.length()
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, v.y / len))) * (180 / Math.PI)
  const lon = ((Math.atan2(v.z, -v.x) * (180 / Math.PI)) + 360) % 360
  return [lat, lon]
}

// ── Bordes de países ───────────────────────────────────────

function CountryBorders({ rings }: { rings: [number, number][][] }) {
  const geo = useMemo(() => {
    const BORDER_R = R + 0.008
    const positions: number[] = []
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lon1, lat1] = ring[i]
        const [lon2, lat2] = ring[i + 1]
        if (Math.abs(lon2 - lon1) > 180) continue
        const [x1, y1, z1] = geoToVec(lat1, lon1, BORDER_R)
        const [x2, y2, z2] = geoToVec(lat2, lon2, BORDER_R)
        positions.push(x1, y1, z1, x2, y2, z2)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [rings])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#3a6898" transparent opacity={0.55} depthWrite={false} />
    </lineSegments>
  )
}

// ── Textura aurora (canvas equirectangular → CanvasTexture) ─
// Dibuja cada punto OVATION como un círculo y aplica blur
// para fusionar los anillos en una banda continua y suave.

function AuroraTextureSphere({ coordinates }: { coordinates: [number, number, number][] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const clock = useRef(0)

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = TEX_W
    canvas.height = TEX_H
    const ctx = canvas.getContext('2d')!

    const filtered = coordinates.filter(
      ([, lat, v]) => v >= THRESHOLD && Math.abs(lat) <= POLE_CUTOFF,
    )

    if (filtered.length > 0) {
      // 1) Canvas temporal — dibuja gradientes radiales sin blur
      const tmp = document.createElement('canvas')
      tmp.width = TEX_W
      tmp.height = TEX_H
      const tctx = tmp.getContext('2d')!

      for (const [lon, lat, val] of filtered) {
        const x = (lon / 360) * TEX_W
        const y = ((90 - lat) / 180) * TEX_H
        const [r, g, b] = probToRgb(val)
        const ri = Math.round(r * 255)
        const gi = Math.round(g * 255)
        const bi = Math.round(b * 255)
        const alpha = 0.6 + (val / 100) * 0.4

        // Gradiente radial: centro opaco → borde completamente transparente con caída larga
        const rad = 16
        const grad = tctx.createRadialGradient(x, y, 0, x, y, rad)
        grad.addColorStop(0,    `rgba(${ri},${gi},${bi},${alpha})`)
        grad.addColorStop(0.3,  `rgba(${ri},${gi},${bi},${alpha * 0.75})`)
        grad.addColorStop(0.65, `rgba(${ri},${gi},${bi},${alpha * 0.3})`)
        grad.addColorStop(1,    `rgba(${ri},${gi},${bi},0)`)
        tctx.fillStyle = grad
        tctx.beginPath()
        tctx.arc(x, y, rad, 0, Math.PI * 2)
        tctx.fill()
      }

      // 2) Compositar con blur global → fusiona todos los puntos y suaviza los bordes
      ctx.filter = 'blur(18px)'
      ctx.drawImage(tmp, 0, 0)
      // Segunda pasada ligera para reforzar el núcleo brillante
      ctx.filter = 'blur(5px)'
      ctx.globalAlpha = 0.4
      ctx.drawImage(tmp, 0, 0)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [coordinates])

  useEffect(() => () => texture.dispose(), [texture])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    clock.current += delta
    ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity =
      0.82 + Math.sin(clock.current * 1.4) * 0.1
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[R + 0.012, 72, 72]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Esfera invisible para hover raycasting ─────────────────
// La textura no permite raycasting por punto, así que usamos
// una esfera transparente y convertimos el punto 3D a lat/lon.

const MAX_HOVER_DIST_SQ = 5 * 5 // 5 grados de radio de detección

function AuroraHitSphere({
  coordinates,
  groupRef,
  onHover,
}: {
  coordinates: [number, number, number][]
  groupRef: React.RefObject<THREE.Group>
  onHover: (info: HoverInfo | null) => void
}) {
  const filtered = useMemo(
    () => coordinates.filter(([, lat, v]) => v >= THRESHOLD && Math.abs(lat) <= POLE_CUTOFF),
    [coordinates],
  )

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!groupRef.current) { onHover(null); return }

      // Transformar el punto de espacio mundo al espacio local del grupo
      const localPt = groupRef.current.worldToLocal(e.point.clone())
      const [hitLat, hitLon] = vecToLatLon(localPt)

      let nearest: [number, number, number] | null = null
      let minDist = Infinity

      for (const pt of filtered) {
        const dLat = hitLat - pt[1]
        const dLon = Math.min(Math.abs(hitLon - pt[0]), 360 - Math.abs(hitLon - pt[0]))
        const d = dLat * dLat + dLon * dLon
        if (d < minDist) { minDist = d; nearest = pt }
      }

      if (!nearest || minDist > MAX_HOVER_DIST_SQ) { onHover(null); return }

      const [, , val] = nearest
      const [r, g, b] = probToRgb(val)
      onHover({
        clientX: e.clientX,
        clientY: e.clientY,
        prob: Math.round(val),
        rgb: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`,
      })
    },
    [filtered, groupRef, onHover],
  )

  return (
    <mesh onPointerMove={handlePointerMove} onPointerLeave={() => onHover(null)}>
      <sphereGeometry args={[R + 0.014, 32, 32]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

// ── Grupo Tierra ───────────────────────────────────────────

function EarthGroup({
  coordinates,
  borders,
  spinning,
  onHover,
}: {
  coordinates?: [number, number, number][]
  borders?: [number, number][][]
  spinning: boolean
  onHover: (info: HoverInfo | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const AXIAL_TILT = 23.4 * (Math.PI / 180)

  useFrame((_, delta) => {
    if (spinning && groupRef.current) groupRef.current.rotation.y += delta * 0.07
  })

  return (
    <group ref={groupRef} rotation={[0, 0, AXIAL_TILT]}>
      {/* Esfera principal */}
      <mesh>
        <sphereGeometry args={[R, 72, 72]} />
        <meshStandardMaterial
          color="#0f3060"
          emissive="#0a2248"
          emissiveIntensity={0.6}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Bordes de países */}
      {borders && borders.length > 0 && <CountryBorders rings={borders} />}

      {/* Aurora como textura suave */}
      {coordinates && coordinates.length > 0 && (
        <>
          <AuroraTextureSphere coordinates={coordinates} />
          <AuroraHitSphere coordinates={coordinates} groupRef={groupRef} onHover={onHover} />
        </>
      )}

      {/* Atmósfera interior */}
      <mesh>
        <sphereGeometry args={[R + 0.045, 32, 32]} />
        <meshBasicMaterial
          color="#2266cc" transparent opacity={0.12}
          side={THREE.FrontSide} blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Atmósfera exterior (rim glow) */}
      <mesh>
        <sphereGeometry args={[R + 0.12, 32, 32]} />
        <meshBasicMaterial
          color="#1a55bb" transparent opacity={0.08}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ── Escena ─────────────────────────────────────────────────

function GlobeScene({
  data, borders, spinning, onHover,
}: {
  data?: OvationData
  borders?: [number, number][][]
  spinning: boolean
  onHover: (info: HoverInfo | null) => void
}) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <pointLight position={[8, 3, 5]} intensity={2.0} color="#fff8e6" />
      <pointLight position={[-5, -2, -4]} intensity={0.5} color="#4477bb" />
      <Stars radius={90} depth={50} count={3000} factor={4} fade speed={0.4} />
      <EarthGroup coordinates={data?.coordinates} borders={borders} spinning={spinning} onHover={onHover} />
      <OrbitControls enablePan={false} minDistance={2.4} maxDistance={9} rotateSpeed={0.55} zoomSpeed={0.8} makeDefault />
    </>
  )
}

// ── Componente principal ───────────────────────────────────

export function AuroraGlobe3D() {
  const [spinning, setSpinning] = useState(true)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useAutoRefresh<OvationData>({
    queryKey: ['aurora-ovation'],
    fetcher: () => fetch('/api/swpc/aurora-ovation').then((r) => r.json()),
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const { data: bordersData } = useQuery<{ rings: [number, number][][] }>({
    queryKey: ['world-borders'],
    queryFn: () => fetch('/api/geo/world-borders').then((r) => r.json()),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const activePoints = useMemo(
    () => data?.coordinates?.filter(([, lat, v]) => v >= THRESHOLD && Math.abs(lat) <= POLE_CUTOFF).length ?? 0,
    [data],
  )

  const maxProb = useMemo(
    () => (data?.coordinates ? Math.round(Math.max(...data.coordinates.map(([, , v]) => v))) : 0),
    [data],
  )

  const tooltipPos = useMemo(() => {
    if (!hoverInfo || !canvasWrapRef.current) return null
    const rect = canvasWrapRef.current.getBoundingClientRect()
    return {
      x: Math.min(hoverInfo.clientX - rect.left + 14, rect.width - 170),
      y: Math.max(hoverInfo.clientY - rect.top - 44, 4),
    }
  }, [hoverInfo])

  return (
    <div className="card overflow-hidden">
      {/* Encabezado */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-text-secondary">
            Vista Global 3D — Modelo OVATION
          </h2>
          <DataAge timestamp={data?.['Forecast Time']} alwaysElapsed />
        </div>
        <div className="flex items-center gap-3">
          {activePoints > 0 && (
            <div className="flex items-center gap-3 font-data text-2xs text-text-muted">
              <span>{activePoints.toLocaleString()} puntos activos</span>
              <span className="text-text-dim">·</span>
              <span>
                Máx:{' '}
                <span style={{ color: `rgb(${probToRgb(maxProb).map((c) => Math.round(c * 255)).join(',')})` }}>
                  {maxProb}%
                </span>
              </span>
            </div>
          )}
          <button
            className="ctrl-btn"
            onClick={() => setSpinning((s) => !s)}
            title={spinning ? 'Detener rotación' : 'Reanudar rotación'}
          >
            <RotateCcw size={12} className={spinning ? 'animate-spin-slow-reverse' : 'opacity-40'} />
          </button>
          <span className="hidden text-2xs text-text-dim sm:block">Arrastra · Scroll para zoom</span>
        </div>
      </div>

      {/* Canvas 3D */}
      <div ref={canvasWrapRef} className="relative h-[480px] w-full overflow-hidden rounded-md bg-[#020608]">
        {isLoading && !data && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="animate-pulse font-data text-xs text-text-dim">Cargando datos OVATION…</span>
          </div>
        )}
        {isError && !data && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-data text-xs text-red-400">Error al cargar datos OVATION</span>
          </div>
        )}

        <Canvas camera={{ position: [0, 1.8, 4.8], fov: 42 }} gl={{ antialias: true, alpha: false }} style={{ background: '#020608' }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <GlobeScene data={data} borders={bordersData?.rings} spinning={spinning} onHover={setHoverInfo} />
          </Suspense>
        </Canvas>

        {/* Tooltip hover */}
        {hoverInfo && tooltipPos && (
          <div
            className="pointer-events-none absolute z-20 rounded border border-white/20 bg-black/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded border border-white/30" style={{ backgroundColor: hoverInfo.rgb }} />
              <span className="font-data text-xs text-white whitespace-nowrap">
                {hoverInfo.prob}% probabilidad
              </span>
            </div>
          </div>
        )}

        {data?.['Forecast Time'] && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 font-data text-2xs text-text-dim backdrop-blur-sm">
            Pronóstico: {new Date(data['Forecast Time']).toISOString().replace('T', ' ').slice(0, 16)} UTC
          </div>
        )}

        <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/50 px-2 py-1 font-data text-2xs text-text-dim backdrop-blur-sm">
          Polo N · Polo S visibles
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-2xs uppercase tracking-wider text-text-dim">Probabilidad:</span>
        <div
          className="h-2.5 min-w-[140px] flex-1 max-w-xs overflow-hidden rounded-full"
          style={{ background: `linear-gradient(to right, ${AURORA_SCALE.map(([r, g, b]) => `rgb(${r},${g},${b})`).join(',')})` }}
        />
        <div className="flex items-center gap-4 font-data text-2xs text-text-muted">
          <span>10%</span>
          <span>90%</span>
        </div>
      </div>
    </div>
  )
}
