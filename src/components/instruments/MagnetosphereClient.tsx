'use client'
// ============================================================
// src/components/instruments/MagnetosphereClient.tsx
// Geospace Magnetosphere Movies — Density, Pressure, Velocity
// ============================================================
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { LoadingMessage, ErrorMessage, PreloadProgress } from '@/components/ui/StatusMessages'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getMagnetosphereFrames, getSolarWindPlasma } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { Magnetosphere3D } from './Magnetosphere3D'
import { Play, Pause, SkipBack, SkipForward, Download, Box, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MagnetosphereFrame {
  url: string
  time_tag: string
}

type MagnetosphereType = 'density' | 'pressure' | 'velocity'

const TYPE_TABS: { key: MagnetosphereType; label: string; desc: string; unit: string }[] = [
  { key: 'density', label: 'Densidad', desc: 'Densidad del plasma magnetosférico', unit: 'cm⁻³' },
  { key: 'pressure', label: 'Presión', desc: 'Presión del plasma magnetosférico', unit: 'nPa' },
  { key: 'velocity', label: 'Velocidad', desc: 'Velocidad del plasma (V_x)', unit: 'km/s' },
]

const USAGE = [
  'Visualización en tiempo real de la interacción del viento solar con la magnetósfera',
  'Monitoreo de la posición y deformación del límite de la magnetopausa',
  'Evaluación de la acumulación de energía en la cola magnética (magnetotail)',
  'Identificación de procesos de reconexión magnética en el lado diurno y nocturno',
  'Seguimiento del transporte de plasma desde el viento solar hacia la ionósfera',
  'Referencia para la predicción de tormentas geomagnéticas y subtormentas',
  'Soporte para el análisis de impacto en satélites orbitando en regiones críticas',
]

const IMPACTS = [
  'Compresión extrema de la magnetopausa durante la llegada de CMEs severas',
  'Exposición de satélites geoestacionarios directamente al viento solar',
  'Inyección de partículas energéticas en los cinturones de radiación',
  'Inducción de corrientes geomagnéticamente inducidas (GIC) en redes eléctricas',
  'Perturbaciones en la propagación de señales de comunicación y navegación satelital',
  'Aumento de la actividad de auroras por precipitación de partículas magnetosféricas',
  'Erosión de la atmósfera superior durante periodos de forzamiento solar intenso',
]

// ───────────────────────────────────────────────
// Color Scales & Helpers
// ───────────────────────────────────────────────

const GEO_SCALES = {
  density: {
    unit: 'cm⁻³', // Note: Scale is log10(N) 0-4
    points: [
      { r: 255, g: 245, b: 255, val: 0.0 }, // Light Pink/White
      { r: 220, g: 220, b: 245, val: 0.5 }, // Very Light Blue
      { r: 170, g: 190, b: 230, val: 1.0 }, // Light Blue
      { r: 120, g: 160, b: 210, val: 1.5 }, // Sky Blue
      { r: 80, g: 130, b: 190, val: 2.0 },  // Blue
      { r: 40, g: 100, b: 160, val: 2.5 },  // Medium Blue
      { r: 15, g: 75, b: 135, val: 3.0 },   // Deep Blue
      { r: 5, g: 50, b: 100, val: 3.5 },    // Dark Blue
      { r: 0, g: 30, b: 70, val: 4.0 },     // Very Dark Blue
    ]
  },
  pressure: {
    unit: 'nPa',
    points: [
      { r: 40, g: 60, b: 150, val: 0.0 },   // Dark Blue
      { r: 100, g: 150, b: 200, val: 0.25 }, // Light Blue
      { r: 180, g: 230, b: 240, val: 0.5 },  // Cyan/White
      { r: 240, g: 250, b: 200, val: 0.75 }, // Pale Yellow
      { r: 255, g: 220, b: 100, val: 1.0 },  // Amber/Yellow
      { r: 255, g: 140, b: 50, val: 1.25 },  // Orange
      { r: 220, g: 20, b: 20, val: 1.5 },    // Red
    ]
  },
  velocity: {
    unit: 'km/s',
    points: [
      { r: 180, g: 20, b: 50, val: -600 },   // Deep Red
      { r: 230, g: 80, b: 60, val: -450 },   // Red-Orange
      { r: 250, g: 150, b: 80, val: -300 },  // Orange
      { r: 255, g: 220, b: 150, val: -150 }, // Amber/Yellow
      { r: 255, g: 255, b: 220, val: 0 },    // Pale Yellow/White
      { r: 200, g: 240, b: 150, val: 150 },  // Pale Green
      { r: 120, g: 200, b: 150, val: 300 },  // Green
      { r: 60, g: 150, b: 180, val: 450 },   // Teal/Blue
      { r: 50, g: 80, b: 160, val: 600 },    // Blue
    ]
  }
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function matchGeoValue(r: number, g: number, b: number, type: MagnetosphereType): { val: number; unit: string } | null {
  // Ignore background (very dark grey/black) and Earth (white/black sphere)
  if (r < 25 && g < 25 && b < 25) return null
  
  const scale = GEO_SCALES[type]
  let minDist = Infinity
  let closestVal = 0

  for (const p of scale.points) {
    const d = colorDist(r, g, b, p.r, p.g, p.b)
    if (d < minDist) { minDist = d; closestVal = p.val }
  }

  if (minDist > 80) return null

  // For density, the scale is log10, so val 2.0 = 10^2 = 100 cm^-3
  // But usually users prefer to see the raw value or the log value.
  // The user image shows 0.0, 1.0... let's show the literal scale value first.
  return { val: closestVal, unit: scale.unit }
}

function getContainedBounds(cW: number, cH: number, iW: number, iH: number) {
  const cAR = cW / cH, iAR = iW / iH
  let rW: number, rH: number, oX: number, oY: number
  if (iAR > cAR) { rW = cW; rH = cW / iAR; oX = 0; oY = (cH - rH) / 2 }
  else { rH = cH; rW = cH * iAR; oX = (cW - rW) / 2; oY = 0 }
  return { rW, rH, oX, oY }
}

function proxyUrl(url: string) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}`
}

// ───────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────

type ViewMode = '2d' | '3d'

export function MagnetosphereClient() {
  const [type, setType] = useState<MagnetosphereType>('density')
  const [viewMode, setViewMode] = useState<ViewMode>('2d')
  const activeTab = TYPE_TABS.find((t) => t.key === type)!

  const { data: headerFrames } = useAutoRefresh<MagnetosphereFrame[]>({
    queryKey: ['magnetosphere', 'header', 'density'],
    fetcher: () => getMagnetosphereFrames('density') as Promise<MagnetosphereFrame[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
              Geospace — Modelado de la Magnetósfera
            </h1>
            <DataAge timestamp={headerFrames?.[headerFrames.length - 1]?.time_tag} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Magnetosphere Movies · Densidad, Presión y Velocidad del plasma · Modelo Geospace v2.0 · Actualización cada minuto
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background-secondary p-1">
          <button
            onClick={() => setViewMode('2d')}
            className={cn(
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all',
              viewMode === '2d' ? 'bg-primary text-white shadow-glow-blue' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Layers size={14} />
            <span>2D</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={cn(
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all',
              viewMode === '3d' ? 'bg-accent-cyan text-white shadow-glow-blue' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Box size={14} />
            <span>3D Interactiva</span>
          </button>
        </div>
      </div>

      {viewMode === '2d' ? (
        <>
          {/* Type tabs */}
          <div className="flex items-center gap-1 rounded-md bg-background-secondary p-1">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setType(tab.key)}
                className={cn(
                  'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  type === tab.key
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-border/40'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Player */}
          <MagnetospherePanel key={type} type={type} desc={activeTab.desc} />
        </>
      ) : (
        <MagnetospherePanel3D />
      )}

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Details */}
      <SectionDetails>
        <p>
          Las &quot;Geospace Magnetosphere Movies&quot; son el resultado del modelo Geospace v2.0, una implementación operativa del modelo Space Weather Modeling Framework (SWMF) que simula la respuesta de la magnetósfera terrestre al forzamiento del viento solar.
        </p>
        <p>
          <strong>Densidad:</strong> Muestra la distribución del número de partículas por unidad de volumen. Es útil para identificar el arco de choque (bow shock), la magnetopausa y la acumulación de plasma en la cola magnética.
        </p>
        <p>
          <strong>Presión:</strong> Representa la presión dinámica y térmica del plasma. Las regiones de alta presión (rojo/amarillo) indican fuerte compresión contra el campo magnético terrestre, especialmente en el punto subsolar durante tormentas.
        </p>
        <p>
          <strong>Velocidad (V_x):</strong> Visualiza el flujo del plasma a lo largo del eje Tierra-Sol. Los valores negativos indican flujo hacia la Tierra (o alejándose del sol), mientras que los cambios bruscos de color señalan zonas de cizallamiento y turbulencia.
        </p>
        <p>
          Estas animaciones se generan a partir de datos medidos por los satélites en el punto lagrangiano L1 (como DSCOVR o ACE) que sirven como condiciones de contorno para el modelo. La vista presentada es el plano X-Z (vista lateral), con el Sol hacia la izquierda.
        </p>
      </SectionDetails>
    </div>
  )
}

function MagnetospherePanel3D() {
  const { data: plasma, isLoading, isError } = useAutoRefresh<any[]>({
    queryKey: ['solar-wind-plasma'],
    fetcher: () => getSolarWindPlasma() as Promise<any[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  const latest = useMemo(() => {
    if (!plasma || plasma.length === 0) return null
    return plasma[plasma.length - 1]
  }, [plasma])

  // Calculate dynamic pressure: P = 1.6726e-6 * n * v^2
  const pressure = useMemo(() => {
    if (!latest) return 2.0 // Baseline
    return 1.6726e-6 * latest.density * Math.pow(latest.speed, 2)
  }, [latest])

  if (isLoading && !plasma) return <LoadingMessage message="Iniciando entorno 3D..." />
  if (isError) return <ErrorMessage message="Error al cargar entorno 3D" />

  return (
    <div className="card p-0 overflow-hidden" style={{ height: 600 }}>
      <Magnetosphere3D pressure={pressure} speed={latest?.speed || 400} />
    </div>
  )
}

function MagnetospherePanel({ type, desc }: { type: MagnetosphereType; desc: string }) {
  const { data: frames, isLoading, isError } = useAutoRefresh<MagnetosphereFrame[]>({
    queryKey: ['magnetosphere', type],
    fetcher: () => getMagnetosphereFrames(type) as Promise<MagnetosphereFrame[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  return (
    <div className="card overflow-hidden">
      <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-text-secondary">
        {desc}
      </h2>

      {isLoading && !frames && (
        <LoadingMessage message="Cargando cuadros de Geospace..." />
      )}
      {isError && (
        <ErrorMessage 
          message="Error al cargar datos de Geospace" 
          description="No se pudo obtener la secuencia de imágenes del modelo Geospace."
        />
      )}
      {frames && frames.length > 0 && <MagnetospherePlayer frames={frames} type={type} />}
    </div>
  )
}

function MagnetospherePlayer({ frames, type }: { frames: MagnetosphereFrame[]; type: MagnetosphereType }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<MagnetosphereFrame[]>([])
  const FPS_STEPS = [1, 2, 4, 8, 12, 16, 20]
  const [fpsIdx, setFpsIdx] = useState(3)
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgContRef = useRef<HTMLDivElement>(null)
  const canvasReady = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; val: number; unit: string; rgb: string } | null>(null)

  const total = activeFrames.length
  const current = activeFrames[Math.min(idx, Math.max(0, total - 1))]

  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setLoaded(false)
    setLoadProgress(0)
    setActiveFrames([])
    setHoverInfo(null)
  }, [frames])

  useEffect(() => {
    let cancelled = false
    const BATCH = 8
    const ok: (MagnetosphereFrame | null)[] = new Array(frames.length).fill(null)
    let doneCount = 0

    async function preloadAll() {
      for (let i = 0; i < frames.length; i += BATCH) {
        if (cancelled) return
        const batch = frames.slice(i, i + BATCH)
        await Promise.all(
          batch.map(
            (f, bi) =>
              new Promise<void>((resolve) => {
                const img = new Image()
                img.onload = () => {
                  ok[i + bi] = f
                  doneCount++
                  if (!cancelled) setLoadProgress(Math.round((doneCount / frames.length) * 100))
                  resolve()
                }
                img.onerror = () => {
                  // Mark as null so it gets filtered out
                  ok[i + bi] = null
                  doneCount++
                  if (!cancelled) setLoadProgress(Math.round((doneCount / frames.length) * 100))
                  resolve()
                }
                img.src = proxyUrl(f.url)
              })
          )
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is MagnetosphereFrame => f !== null)
        if (valid.length > 0) {
          setActiveFrames(valid)
          setLoaded(true)
          setPlaying(true)
        } else {
          // If all failed, show something at least to avoid infinite loading
          setActiveFrames(frames)
          setLoaded(true)
        }
      }
    }

    preloadAll()
    return () => { cancelled = true }
  }, [frames])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (playing && total > 1) {
      intervalRef.current = setInterval(() => {
        setIdx((prev) => (prev + 1) % total)
      }, speedMs)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speedMs, total])

  useEffect(() => {
    canvasReady.current = false
    if (playing || !current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) { ctx.drawImage(img, 0, 0); canvasReady.current = true }
    }
    img.src = proxyUrl(current.url)
  }, [playing, current])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (playing || !canvasReady.current) { setHoverInfo(null); return }
    const canvas = canvasRef.current
    const container = imgContRef.current
    if (!canvas || !container || canvas.width === 0) { setHoverInfo(null); return }

    const rect = container.getBoundingClientRect()
    const { rW, rH, oX, oY } = getContainedBounds(rect.width, rect.height, canvas.width, canvas.height)

    const mx = e.clientX - rect.left - oX
    const my = e.clientY - rect.top - oY

    if (mx < 0 || my < 0 || mx > rW || my > rH) { setHoverInfo(null); return }

    const imgX = Math.min(canvas.width - 1, Math.round((mx / rW) * canvas.width))
    const imgY = Math.min(canvas.height - 1, Math.round((my / rH) * canvas.height))

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const p = ctx.getImageData(imgX, imgY, 1, 1).data
    const match = matchGeoValue(p[0], p[1], p[2], type)
    if (!match) { setHoverInfo(null); return }

    setHoverInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      val: match.val,
      unit: match.unit,
      rgb: `rgb(${p[0]},${p[1]},${p[2]})`,
    })
  }, [playing, type])

  const handleMouseLeave = useCallback(() => setHoverInfo(null), [])

  const fmtTime = (ts: string) => {
    try { return ts.replace('Z', '').replace('T', ' ').slice(0, 16) + ' UTC' }
    catch { return ts }
  }

  return (
    <div className="flex flex-col gap-3">
      {!loaded && (
        <PreloadProgress progress={loadProgress} />
      )}

      {loaded && current && (
        <>
          <div 
            ref={imgContRef}
            className="relative mx-auto max-h-[60vh] bg-black flex items-center justify-center select-none cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <canvas ref={canvasRef} className="hidden" />
            <img
              ref={imgRef}
              src={proxyUrl(current.url)}
              alt="Magnetosphere model output"
              className="max-h-[60vh] w-auto object-contain"
              draggable={false}
            />
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>

            {hoverInfo && !playing && (
              <div
                className="pointer-events-none absolute z-20 rounded border border-white/20 bg-black/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                style={{
                  left: Math.min(hoverInfo.x + 14, (imgContRef.current?.clientWidth ?? 300) - 140),
                  top: Math.max(hoverInfo.y - 40, 4),
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded border border-white/30" style={{ backgroundColor: hoverInfo.rgb }} />
                  <span className="font-data text-xs text-white whitespace-nowrap">
                    {hoverInfo.val} {hoverInfo.unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={idx}
            onChange={(e) => setIdx(parseInt(e.target.value, 10))}
            className="w-full accent-primary"
          />

          <div className="player-controls flex-wrap">
            <button className="ctrl-btn" onClick={() => setIdx((i) => (i - 1 + total) % total)} title="Anterior"><SkipBack size={13} /></button>
            <button className="ctrl-btn" onClick={() => setPlaying(!playing)} title={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button className="ctrl-btn" onClick={() => setIdx((i) => (i + 1) % total)} title="Siguiente"><SkipForward size={13} /></button>
            <div className="h-4 w-px bg-border mx-1" />
            <button className="ctrl-btn" onClick={() => setFpsIdx((i) => Math.max(0, i - 1))} title="Lento"><span className="text-2xs font-bold">−</span></button>
            <span className="data-value text-text-muted">{FPS_STEPS[fpsIdx]}fps</span>
            <button className="ctrl-btn" onClick={() => setFpsIdx((i) => Math.min(FPS_STEPS.length - 1, i + 1))} title="Rápido"><span className="text-2xs font-bold">+</span></button>
            <span className="ml-auto data-value text-text-muted">{idx + 1}/{total}</span>
            <div className="h-4 w-px bg-border mx-1" />
            <button className="ctrl-btn" onClick={() => {
              const a = document.createElement('a'); a.href = current.url; a.download = `geospace-${type}.png`; a.target = '_blank'; a.click()
            }} title="Descargar"><Download size={13} /></button>
          </div>
        </>
      )}
    </div>
  )
}
