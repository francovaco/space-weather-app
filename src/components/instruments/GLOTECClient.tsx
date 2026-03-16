'use client'
// ============================================================
// src/components/instruments/GLOTECClient.tsx
// GloTEC (Global Total Electron Content) — Atlantic/Pacific
// animation player with 3 map types per view + Mouse Hover
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getGLOTECFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { LoadingMessage, ErrorMessage, EmptyMessage, PreloadProgress } from '@/components/ui/StatusMessages'
import { DataAge } from '@/components/ui/DataAge'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { cn, proxyImg } from '@/lib/utils'

// ───────────────────────────────────────────────
// Color Scales & Helpers
// ───────────────────────────────────────────────

interface ColorPoint { r: number; g: number; b: number; val: number }

// Approximate scales based on standard SWPC GloTEC visualizations
const SCALES: Record<string, { unit: string; points: ColorPoint[] }> = {
  tec: {
    unit: 'TECU',
    points: [
      { r: 35, g: 25, b: 75, val: 0 },      // Dark Purple
      { r: 55, g: 65, b: 190, val: 10 },    // Blue
      { r: 65, g: 145, b: 240, val: 20 },   // Sky Blue
      { r: 50, g: 225, b: 215, val: 30 },   // Cyan
      { r: 90, g: 245, b: 140, val: 40 },   // Light Green
      { r: 155, g: 255, b: 75, val: 50 },   // Electric Lime
      { r: 225, g: 255, b: 60, val: 60 },   // Yellow-Green
      { r: 255, g: 210, b: 50, val: 70 },   // Golden Yellow
      { r: 255, g: 125, b: 30, val: 80 },   // Dark Orange
      { r: 215, g: 45, b: 15, val: 90 },    // Red-Orange
      { r: 125, g: 0, b: 0, val: 100 },     // Deep Red
    ]
  },
  anomaly: {
    unit: 'ΔTECU',
    points: [
      { r: 35, g: 0, b: 55, val: -30 },     // Dark Purple
      { r: 90, g: 60, b: 130, val: -20 },   // Purple
      { r: 175, g: 165, b: 200, val: -10 }, // Lavender
      { r: 255, g: 255, b: 255, val: 0 },    // White (Neutral)
      { r: 250, g: 190, b: 125, val: 10 },  // Peach
      { r: 215, g: 115, b: 0, val: 20 },    // Orange
      { r: 135, g: 55, b: 0, val: 30 },     // Dark Orange
    ]
  },
  ray: {
    unit: 'Rayos/Vóxel',
    points: [
      { r: 255, g: 255, b: 220, val: 0.0 }, // Light Yellow / Cream
      { r: 190, g: 235, b: 150, val: 0.5 }, // Pale Green
      { r: 140, g: 210, b: 110, val: 1.0 }, // Light Green
      { r: 85, g: 175, b: 85, val: 1.5 },   // Green
      { r: 40, g: 130, b: 65, val: 2.0 },   // Medium-Dark Green
      { r: 15, g: 90, b: 45, val: 2.5 },    // Dark Green
      { r: 0, g: 55, b: 25, val: 3.0 },     // Deep Dark Green
    ]
  }
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function matchScaleValue(r: number, g: number, b: number, type: GLOTECType): number | null {
  const scale = SCALES[type]
  
  // Helper to find closest point in a list
  const findBest = (cr: number, cg: number, cb: number) => {
    let minDist = Infinity
    let closestVal = 0
    for (const p of scale.points) {
      const d = colorDist(cr, cg, cb, p.r, p.g, p.b)
      if (d < minDist) {
        minDist = d
        closestVal = p.val
      }
    }
    return { dist: minDist, val: closestVal }
  }

  // 1. Try exact match first
  const original = findBest(r, g, b)
  if (original.dist < 70) return original.val

  // 2. Try matching with "brightness boost" to handle night-side shading
  // We normalize the pixel to a target brightness if it's not too dark or desaturated
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max > 0 ? (max - min) / max : 0

  // Only boost if there's enough color information (saturation) and it's not pure black
  if (max > 15 && saturation > 0.15) {
    const factor = 220 / max
    const br = Math.min(255, r * factor)
    const bg = Math.min(255, g * factor)
    const bb = Math.min(255, b * factor)
    
    const boosted = findBest(br, bg, bb)
    if (boosted.dist < 100) return boosted.val
  }

  // 3. Fallback for very dark values (often 0 in these maps)
  if (max < 15) return 0

  return null
}

function getContainedBounds(cW: number, cH: number, iW: number, iH: number) {
  const cAR = cW / cH, iAR = iW / iH
  let rW: number, rH: number, oX: number, oY: number
  if (iAR > cAR) { rW = cW; rH = cW / iAR; oX = 0; oY = (cH - rH) / 2 }
  else { rH = cH; rW = cH * iAR; oX = (cW - rW) / 2; oY = 0 }
  return { rW, rH, oX, oY }
}

// ───────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────

interface GLOTECFrame {
  url: string
  time_tag: string
}

type GLOTECView = 'atlantic' | 'pacific'
type GLOTECType = 'tec' | 'anomaly' | 'ray'

const VIEW_TABS: { key: GLOTECView; label: string }[] = [
  { key: 'atlantic', label: 'Global Atlántico' },
  { key: 'pacific', label: 'Global Pacífico' },
]

const TYPE_TABS: { key: GLOTECType; label: string; desc: string }[] = [
  { key: 'tec', label: 'Contenido de Electrones (TEC)', desc: 'TEC Total en tiempo real' },
  { key: 'anomaly', label: 'Anomalía de TEC', desc: 'Desviación respecto a la media de 10 días' },
  { key: 'ray', label: 'Trazado de Rayos / MUF', desc: 'Propagación de radio y conteo de rayos por vóxel' },
]

const USAGE = [
  'Monitoreo del Contenido Total de Electrones (TEC) a escala global en tiempo real',
  'Cálculo de retardos en señales de satélite para corrección de errores GPS/GNSS',
  'Identificación de anomalías ionosféricas mediante el mapa de anomalías de 10 días',
  'Análisis de condiciones para radio-propagación HF usando mapas de trazado de rayos',
  'Soporte para operaciones de aviación que dependen de sistemas de navegación satelital',
  'Referencia para estudios de clima espacial y acoplamiento termósfera-ionósfera',
]

const IMPACTS = [
  'Errores de precisión en sistemas de posicionamiento GNSS por variaciones del TEC',
  'Degradación de comunicaciones satelitales por centelleo ionosférico',
  'Interrupciones en enlaces de radio HF durante eventos de tormenta ionosférica',
  'Alteración de la Frecuencia Máxima Utilizable (MUF) para comunicaciones de larga distancia',
  'Pérdida de señal en receptores GPS de alta precisión durante anomalías severas',
]

export function GLOTECClient() {
  const [view, setView] = useState<GLOTECView>('atlantic')
  const [type, setType] = useState<GLOTECType>('tec')
  const activeType = TYPE_TABS.find((t) => t.key === type)!

  const { data: headerFrames } = useAutoRefresh<GLOTECFrame[]>({
    queryKey: ['glotec', 'header', 'atlantic', 'tec'],
    fetcher: () => getGLOTECFrames('atlantic', 'tec') as Promise<GLOTECFrame[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            GloTEC — Contenido Total de Electrones
          </h1>
          <DataAge timestamp={headerFrames?.at(-1)?.time_tag} />
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Global Total Electron Content · Modelo asimilativo de la ionósfera en tiempo real · Actualización cada 10 min
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Main view tabs (Atlantic/Pacific) */}
        <div className="flex items-center gap-1 rounded-md bg-background-secondary p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={cn(
                'flex-1 rounded px-4 py-1.5 text-xs font-medium transition-colors',
                view === tab.key
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-border/40'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-type tabs (TEC/Anomaly/Ray) */}
        <div className="flex items-center gap-1 rounded-md border border-border/40 p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setType(tab.key)}
              className={cn(
                'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                type === tab.key
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                  : 'text-text-muted hover:text-text-primary hover:bg-border/20'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel for current view + type */}
      <GLOTECPanel key={`${view}-${type}`} view={view} type={type} desc={activeType.desc} />

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Details */}
      <SectionDetails>
        <p>
          GloTEC (Global Total Electron Content) es un modelo asimilativo de la ionósfera desarrollado por la NOAA/SWPC que utiliza mediciones de estaciones terrestres GNSS y datos satelitales para estimar la densidad de electrones en la alta atmósfera.
        </p>
        <p>
          <strong>Mapas de TEC:</strong> Representan el Contenido Total de Electrones integrado. Es la métrica fundamental para corregir retardos en señales GPS.
        </p>
        <p>
          <strong>Mapas de Anomalía:</strong> Muestran la desviación del TEC actual respecto a la media móvil de los últimos 10 días. Permite identificar rápidamente tormentas ionosféricas de fase positiva (aumento de densidad) o negativa (depleción), que afectan de manera distinta a las radiocomunicaciones.
        </p>
        <p>
          <strong>Trazado de Rayos / MUF:</strong> Estos mapas indican las condiciones de propagación para ondas de radio de alta frecuencia (HF). La Frecuencia Máxima Utilizable (MUF) es crítica para operadores de radio que necesitan seleccionar la banda óptima según el estado de la ionósfera.
        </p>
        </SectionDetails>
    </div>
  )
}

function GLOTECPanel({ view, type, desc }: { view: GLOTECView; type: GLOTECType; desc: string }) {
  const { data: frames, isLoading, isError } = useAutoRefresh<GLOTECFrame[]>({
    queryKey: ['glotec', view, type],
    fetcher: () => getGLOTECFrames(view, type) as Promise<GLOTECFrame[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  return (
    <div className="card overflow-hidden">
      <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-text-secondary">
        {desc}
      </h2>

      {isLoading && !frames && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
            Cargando cuadros…
          </div>
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-center py-20">
          <span className="text-xs text-red-400">Error al cargar datos de GloTEC</span>
        </div>
      )}
      {frames && (
        frames.length > 0 ? (
          <GLOTECPlayer frames={frames} type={type} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-red-400 font-medium">No hay imágenes disponibles</span>
            <p className="text-xs text-text-muted text-center max-w-sm px-4">
              Es posible que los datos del modelo no estén disponibles temporalmente.
            </p>
          </div>
        )
      )}
    </div>
  )
}

function GLOTECPlayer({ frames, type }: { frames: GLOTECFrame[]; type: GLOTECType }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<GLOTECFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3)
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hover feature refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgContRef = useRef<HTMLDivElement>(null)
  const canvasReady = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; value: number; rgb: string } | null>(null)

  const total = activeFrames.length
  const current = activeFrames[Math.min(idx, Math.max(0, total - 1))]

  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setLoaded(false)
    setLoadError(false)
    setLoadProgress(0)
    setActiveFrames([])
    setHoverInfo(null)
  }, [frames, type])

  useEffect(() => {
    let cancelled = false
    const BATCH = 8
    const ok: (GLOTECFrame | null)[] = new Array(frames.length).fill(null)
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
                // Use proxy to allow canvas reading
                img.src = proxyImg(f.url)
              })
          )
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is GLOTECFrame => f !== null)
        if (valid.length > 0) {
          setActiveFrames(valid)
          setLoaded(true)
          setPlaying(true)
        } else {
          setLoadError(true)
          setLoaded(true)
        }
      }
    }

    preloadAll()
    return () => {
      cancelled = true
    }
  }, [frames])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (playing && total > 1) {
      intervalRef.current = setInterval(() => {
        setIdx((prev) => (prev + 1) % total)
      }, speedMs)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, speedMs, total])

  // Draw current frame to hidden canvas for pixel sampling
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
    img.src = proxyImg(current.url)
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
    const value = matchScaleValue(p[0], p[1], p[2], type)
    
    if (value === null) { setHoverInfo(null); return }
    
    setHoverInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      value,
      rgb: `rgb(${p[0]},${p[1]},${p[2]})`,
    })
  }, [playing, type])

  const handleMouseLeave = useCallback(() => setHoverInfo(null), [])

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total])
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total])

  const fmtTime = (ts: string) => {
    try {
      return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    } catch {
      return ts
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!loaded && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
            Precargando imágenes… {loadProgress}%
          </div>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-accent-cyan transition-all duration-200"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </div>
      )}

      {loaded && loadError && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-red-400 font-medium">No se pudieron cargar las imágenes</span>
          <p className="text-xs text-text-muted text-center max-w-sm px-4">
            Es posible que las imágenes más recientes no estén disponibles temporalmente.
          </p>
        </div>
      )}

      {loaded && !loadError && current && (
        <>
          <div 
            ref={imgContRef}
            className="relative mx-auto max-h-[60vh] bg-black flex items-center justify-center select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: !playing ? 'crosshair' : 'default' }}
          >
            <canvas ref={canvasRef} className="hidden" />
            <img
              ref={imgRef}
              src={proxyImg(current.url)}
              alt={`GloTEC ${type} output`}
              className="max-h-[60vh] w-auto object-contain"
              draggable={false}
            />
            {/* Timestamp */}
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>

            {/* Hover Tooltip */}
            {hoverInfo && !playing && (
              <div
                className="pointer-events-none absolute z-20 rounded border border-white/20 bg-black/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                style={{
                  left: Math.min(hoverInfo.x + 14, (imgContRef.current?.clientWidth ?? 300) - 140),
                  top: Math.max(hoverInfo.y - 40, 4),
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded border border-white/30"
                    style={{ backgroundColor: hoverInfo.rgb }}
                  />
                  <span className="font-data text-xs text-white whitespace-nowrap">
                    {hoverInfo.value > 0 && type === 'anomaly' ? '+' : ''}{hoverInfo.value} {SCALES[type].unit}
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
            <button className="ctrl-btn" onClick={prev} title="Cuadro anterior">
              <SkipBack size={13} />
            </button>
            <button
              className="ctrl-btn"
              onClick={() => setPlaying(!playing)}
              title={playing ? 'Pausar' : 'Reproducir'}
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button className="ctrl-btn" onClick={next} title="Cuadro siguiente">
              <SkipForward size={13} />
            </button>

            <div className="h-4 w-px bg-border" />

            <button
              className="ctrl-btn"
              onClick={() => setFpsIdx((i) => Math.max(0, i - 1))}
              title="Más lento"
            >
              <span className="text-2xs font-bold">−</span>
            </button>
            <span className="data-value text-text-muted">{FPS_STEPS[fpsIdx]}fps</span>
            <button
              className="ctrl-btn"
              onClick={() => setFpsIdx((i) => Math.min(FPS_STEPS.length - 1, i + 1))}
              title="Más rápido"
            >
              <span className="text-2xs font-bold">+</span>
            </button>

            <span className="ml-auto data-value text-text-muted">
              {idx + 1}/{total}
            </span>

            <div className="h-4 w-px bg-border" />

            <button
              className="ctrl-btn"
              onClick={() => {
                const a = document.createElement('a')
                a.href = current.url
                a.download = current.url.split('/').pop() || `glotec-${type}-frame.png`
                a.target = '_blank'
                a.click()
              }}
              title="Descargar imagen actual"
            >
              <Download size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
