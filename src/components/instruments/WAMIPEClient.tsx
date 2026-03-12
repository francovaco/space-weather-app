'use client'
// ============================================================
// src/components/instruments/WAMIPEClient.tsx
// WAM-IPE (Whole Atmosphere Model – Ionosphere Plasmasphere
// Electrodynamics) — 4-view animation player with hover values
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getWAMIPEFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { cn, proxyImg } from '@/lib/utils'

interface WAMIPEFrame {
  url: string
  time_tag: string
}

type WAMIPEView = 'neutral-nowcast' | 'ionosphere-nowcast' | 'neutral-forecast' | 'ionosphere-forecast'

const VIEW_TABS: { key: WAMIPEView; label: string; desc: string }[] = [
  { key: 'neutral-nowcast', label: 'Neutro Nowcast', desc: 'Atmósfera neutra — Análisis en tiempo real' },
  { key: 'ionosphere-nowcast', label: 'Ionósfera Nowcast', desc: 'Ionósfera global — Análisis en tiempo real' },
  { key: 'neutral-forecast', label: 'Neutro Pronóstico', desc: 'Atmósfera neutra — Pronóstico a 2 días' },
  { key: 'ionosphere-forecast', label: 'Ionósfera Pronóstico', desc: 'Ionósfera global — Pronóstico a 2 días' },
]

const USAGE = [
  'Soporte para alertas de comunicaciones de aviación HF y degradación de señales GNSS/GPS',
  'Predicción de densidad termosférica para cálculo de arrastre orbital y gestión de tráfico espacial',
  'Monitoreo del Contenido Total de Electrones (TEC) y la Máxima Frecuencia Utilizable (MUF)',
  'Apoyo a las actividades de pronóstico de la Oficina de Clima Espacial (SWFO)',
  'Evaluación de condiciones ionosféricas para operaciones de radioenlaces y radar',
  'Planificación de maniobras orbitales considerando variaciones de densidad atmosférica',
  'Referencia para investigación en física de la alta atmósfera y acoplamiento termósfera-ionósfera',
]

const IMPACTS = [
  'Errores de posicionamiento GPS/GNSS causados por variaciones del TEC ionosférico',
  'Degradación o apagón de comunicaciones HF por perturbaciones ionosféricas',
  'Incremento de arrastre orbital en satélites LEO por calentamiento termosférico',
  'Alteración de la propagación de ondas de radio durante tormentas geomagnéticas',
  'Riesgo para la reentrada de basura espacial por expansión termosférica inesperada',
  'Centelleo ionosférico que afecta señales de comunicación satelital',
  'Impacto en sistemas de vigilancia y detección sobre el horizonte (OTH radar)',
]

// ───────────────────────────────────────────────
// Color Scales & Helpers
// ───────────────────────────────────────────────

interface ColorPoint { r: number; g: number; b: number; val: number }

const WAM_SCALES = {
  density: {
    unit: '10⁻¹¹ kg/m³',
    points: [
      { r: 0, g: 0, b: 0, val: 0.0 },       // Black
      { r: 15, g: 0, b: 50, val: 0.1 },    // Very Dark Blue
      { r: 35, g: 0, b: 100, val: 0.25 },   // Dark Blue/Purple
      { r: 80, g: 0, b: 150, val: 0.5 },    // Purple
      { r: 150, g: 0, b: 120, val: 0.75 },  // Dark Red/Magenta
      { r: 215, g: 0, b: 0, val: 1.0 },     // Red
      { r: 255, g: 100, b: 0, val: 1.25 },  // Orange
      { r: 255, g: 190, b: 0, val: 1.5 },   // Amber
      { r: 255, g: 240, b: 50, val: 1.75 }, // Yellow
      { r: 255, g: 255, b: 200, val: 2.0 }, // Pale Yellow/White
    ]
  },
  ratio: {
    unit: 'Ratio O/N₂',
    points: [
      { r: 0, g: 0, b: 0, val: 0.2 },       // Black
      { r: 20, g: 0, b: 80, val: 0.35 },    // Dark Blue
      { r: 80, g: 0, b: 150, val: 0.5 },    // Purple
      { r: 160, g: 30, b: 120, val: 0.65 }, // Magenta
      { r: 230, g: 60, b: 60, val: 0.8 },   // Light Red/Salmon
      { r: 255, g: 150, b: 80, val: 0.95 }, // Orange/Peach
      { r: 255, g: 255, b: 180, val: 1.1 }, // Pale Yellow
    ]
  },
  percent: {
    unit: '% ΔDens',
    points: [
      { r: 0, g: 0, b: 255, val: -100 },    // Pure Blue
      { r: 50, g: 100, b: 255, val: -75 },  // Sky Blue
      { r: 130, g: 170, b: 255, val: -50 }, // Light Blue
      { r: 200, g: 220, b: 255, val: -25 }, // Pale Blue
      { r: 255, g: 255, b: 255, val: 0 },    // White
      { r: 255, g: 210, b: 210, val: 25 },   // Pale Red
      { r: 255, g: 140, b: 140, val: 50 },   // Light Red
      { r: 255, g: 70, b: 70, val: 75 },     // Medium Red
      { r: 255, g: 0, b: 0, val: 100 },      // Pure Red
    ]
  },
  tec: {
    unit: 'TECu',
    points: [
      { r: 0, g: 30, b: 80, val: 0 },      // Dark Blue
      { r: 40, g: 60, b: 120, val: 20 },   // Blueish Grey
      { r: 120, g: 120, b: 120, val: 40 },  // Grey
      { r: 220, g: 220, b: 100, val: 60 },  // Yellowish
      { r: 255, g: 255, b: 0, val: 80 },    // Pure Yellow
    ]
  },
  muf: {
    unit: 'MHz',
    points: [
      { r: 30, g: 0, b: 100, val: 0 },     // Deep Purple
      { r: 120, g: 0, b: 180, val: 10 },   // Purple
      { r: 200, g: 50, b: 150, val: 20 },  // Magenta
      { r: 255, g: 120, b: 50, val: 30 },  // Orange
      { r: 255, g: 200, b: 20, val: 40 },  // Amber/Yellow
      { r: 255, g: 255, b: 0, val: 50 },   // Yellow
    ]
  },
  tecAnomaly: {
    unit: 'TECu',
    points: [
      { r: 0, g: 0, b: 255, val: -30 },    // Blue
      { r: 150, g: 150, b: 255, val: -15 }, // Light Blue
      { r: 255, g: 255, b: 255, val: 0 },   // White
      { r: 255, g: 150, b: 150, val: 15 },  // Pink
      { r: 255, g: 0, b: 0, val: 30 },     // Red
    ]
  },
  mufAnomaly: {
    unit: 'MHz',
    points: [
      { r: 0, g: 0, b: 255, val: -25 },    // Blue
      { r: 150, g: 150, b: 255, val: -12.5 }, // Light Blue
      { r: 255, g: 255, b: 255, val: 0 },   // White
      { r: 255, g: 150, b: 150, val: 12.5 }, // Pink
      { r: 255, g: 0, b: 0, val: 25 },     // Red
    ]
  }
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function matchWAMValue(r: number, g: number, b: number, scaleType: keyof typeof WAM_SCALES): { val: number; unit: string } | null {
  const scale = WAM_SCALES[scaleType]
  let minDist = Infinity
  let closestVal = 0

  // Standard match
  for (const p of scale.points) {
    const d = colorDist(r, g, b, p.r, p.g, p.b)
    if (d < minDist) {
      minDist = d
      closestVal = p.val
    }
  }

  // Handle night-side / brightness variations (simple boost)
  const max = Math.max(r, g, b)
  if (minDist > 70 && max > 20) {
    const factor = 220 / max
    const br = Math.min(255, r * factor), bg = Math.min(255, g * factor), bb = Math.min(255, b * factor)
    for (const p of scale.points) {
      const d = colorDist(br, bg, bb, p.r, p.g, p.b)
      if (d < minDist) { minDist = d; closestVal = p.val }
    }
  }

  if (minDist > 100) return null
  return { val: closestVal, unit: scale.unit }
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

export function WAMIPEClient() {
  const [view, setView] = useState<WAMIPEView>('neutral-nowcast')
  const activeTab = VIEW_TABS.find((t) => t.key === view)!

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          WAM-IPE — Modelo Atmosférico e Ionosférico
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Whole Atmosphere Model – Ionosphere Plasmasphere Electrodynamics · Nowcast y pronóstico a 2 días · Actualización cada 10 min
        </p>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 rounded-md bg-background-secondary p-1">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={cn(
              'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
              view === tab.key
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-border/40'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel for current view */}
      <WAMIPEPanel key={view} view={view} desc={activeTab.desc} />

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Details */}
      <SectionDetails>
        <p>
          WAM-IPE es un sistema de modelos acoplados operado por el SWPC de la NOAA que combina el Modelo de Atmósfera Completa (WAM) con el modelo de Ionósfera-Plasmasfera-Electrodinámica (IPE) para proporcionar análisis y pronósticos del estado de la alta atmósfera terrestre.
        </p>
        <p>
          <strong>WAM</strong> extiende el modelo GFS (Global Forecast System) de la NOAA desde la superficie hasta aproximadamente 600 km de altitud (~150 niveles verticales), modelando la termósfera neutra incluyendo densidad, temperatura y composición (razón O/N₂).
        </p>
        <p>
          <strong>IPE</strong> es un modelo tridimensional de la ionósfera y plasmasfera (90–10,000 km) que calcula distribuciones de densidad de plasma, TEC (Contenido Total de Electrones) y MUF (Máxima Frecuencia Utilizable) a escala global.
        </p>
        <p>
          El <em>nowcast</em> asimila datos de viento solar en tiempo real desde L1 cada 5 minutos y se reinicializa cada 6 horas. El <em>pronóstico</em> se ejecuta 4 veces al día (00, 06, 12, 18 UT) generando predicciones a 2 días usando índices Kp y F10.7 como forzamiento solar.
        </p>
      </SectionDetails>
    </div>
  )
}

function WAMIPEPanel({ view, desc }: { view: WAMIPEView; desc: string }) {
  const { data: frames, isLoading, isError } = useAutoRefresh<WAMIPEFrame[]>({
    queryKey: ['wam-ipe', view],
    fetcher: () => getWAMIPEFrames(view) as Promise<WAMIPEFrame[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
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
          <span className="text-xs text-red-400">Error al cargar datos de WAM-IPE</span>
        </div>
      )}
      {frames && (
        frames.length > 0 ? (
          <WAMIPEPlayer frames={frames} viewType={view} />
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

function WAMIPEPlayer({ frames, viewType }: { frames: WAMIPEFrame[]; viewType: WAMIPEView }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<WAMIPEFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3)
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hover refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgContRef = useRef<HTMLDivElement>(null)
  const canvasReady = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; val: number; unit: string; label: string; rgb: string } | null>(null)

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
  }, [frames])

  useEffect(() => {
    let cancelled = false
    const BATCH = 8
    const ok: (WAMIPEFrame | null)[] = new Array(frames.length).fill(null)
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
                img.src = proxyImg(f.url)
              })
          )
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is WAMIPEFrame => f !== null)
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

  // Draw to canvas for sampling
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
    
    // Determine which of the plots based on Quadrants (1800x1080 approx grid)
    const relX = imgX / canvas.width
    const relY = imgY / canvas.height
    
    let scaleType: keyof typeof WAM_SCALES | null = null
    let label = ''

    if (viewType.includes('neutral')) {
      // Top-Right: Neutral Density
      if (relX > 0.48 && relY < 0.52) {
        scaleType = 'density'; label = 'Densidad Neutra'
      } 
      // Bottom-Left: O/N2 Ratio
      else if (relX < 0.52 && relY > 0.48) {
        scaleType = 'ratio'; label = 'Ratio O/N₂'
      }
      // Bottom-Right: Density Anomaly
      else if (relX > 0.48 && relY > 0.48) {
        scaleType = 'percent'; label = 'Anomalía de Densidad'
      }
    } else if (viewType.includes('ionosphere')) {
      // Top-Left: TEC
      if (relX < 0.52 && relY < 0.52) {
        scaleType = 'tec'; label = 'TEC'
      }
      // Top-Right: MUF
      else if (relX > 0.48 && relY < 0.52) {
        scaleType = 'muf'; label = 'MUF'
      }
      // Bottom-Left: TEC Anomaly
      else if (relX < 0.52 && relY > 0.48) {
        scaleType = 'tecAnomaly'; label = 'Anomalía TEC'
      }
      // Bottom-Right: MUF Anomaly
      else if (relX > 0.48 && relY > 0.48) {
        scaleType = 'mufAnomaly'; label = 'Anomalía MUF'
      }
    }

    if (!scaleType) { setHoverInfo(null); return }

    const match = matchWAMValue(p[0], p[1], p[2], scaleType)
    if (!match) { setHoverInfo(null); return }

    setHoverInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      val: match.val,
      unit: match.unit,
      label,
      rgb: `rgb(${p[0]},${p[1]},${p[2]})`,
    })
  }, [playing, viewType])

  const handleMouseLeave = useCallback(() => setHoverInfo(null), [])

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total])
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total])

  const fmtTime = (ts: string) => {
    try {
      return new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    } catch { return ts }
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
            <div className="h-full bg-accent-cyan transition-all duration-200" style={{ width: `${loadProgress}%` }} />
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
            className="relative mx-auto max-h-[75vh] bg-black flex items-center justify-center select-none cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <canvas ref={canvasRef} className="hidden" />
            <img
              ref={imgRef}
              src={proxyImg(current.url)}
              alt="WAM-IPE model output"
              className="max-h-[75vh] w-auto object-contain"
              draggable={false}
            />
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>

            {/* Hover Tooltip */}
            {hoverInfo && !playing && (
              <div
                className="pointer-events-none absolute z-20 rounded border border-white/20 bg-black/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                style={{
                  left: Math.min(hoverInfo.x + 14, (imgContRef.current?.clientWidth ?? 300) - 160),
                  top: Math.max(hoverInfo.y - 40, 4),
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xs font-bold uppercase text-text-dim tracking-wider">{hoverInfo.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded border border-white/30" style={{ backgroundColor: hoverInfo.rgb }} />
                    <span className="font-data text-xs text-white whitespace-nowrap">
                      {hoverInfo.val > 0 && hoverInfo.unit.includes('%') ? '+' : ''}{hoverInfo.val} {hoverInfo.unit}
                    </span>
                  </div>
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
            <button className="ctrl-btn" onClick={prev} title="Cuadro anterior"><SkipBack size={13} /></button>
            <button className="ctrl-btn" onClick={() => setPlaying(!playing)} title={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button className="ctrl-btn" onClick={next} title="Cuadro siguiente"><SkipForward size={13} /></button>
            <div className="h-4 w-px bg-border mx-1" />
            <button className="ctrl-btn" onClick={() => setFpsIdx((i) => Math.max(0, i - 1))} title="Más lento"><span className="text-2xs font-bold">−</span></button>
            <span className="data-value text-text-muted">{FPS_STEPS[fpsIdx]}fps</span>
            <button className="ctrl-btn" onClick={() => setFpsIdx((i) => Math.min(FPS_STEPS.length - 1, i + 1))} title="Más rápido"><span className="text-2xs font-bold">+</span></button>
            <span className="ml-auto data-value text-text-muted">{idx + 1}/{total}</span>
            <div className="h-4 w-px bg-border mx-1" />
            <button className="ctrl-btn" onClick={() => {
              const a = document.createElement('a'); a.href = current.url; a.download = current.url.split('/').pop() || 'wam-ipe.png'; a.target = '_blank'; a.click()
            }} title="Descargar imagen actual"><Download size={13} /></button>
          </div>
        </>
      )}
    </div>
  )
}
