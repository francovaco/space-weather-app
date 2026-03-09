'use client'
// ============================================================
// src/components/instruments/CTIPEClient.tsx
// CTIPe (Total Electron Content Forecast)
// animation player with Mouse Hover for TEC values
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getCTIPEFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

// ───────────────────────────────────────────────
// Color Scales & Helpers
// ───────────────────────────────────────────────

interface ColorPoint { r: number; g: number; b: number; val: number }

// Scale based on CTIPe-TEC visualization (0 to 130 TECU)
// Refined based on reference image ticks for maximum precision
const CTIPE_SCALE: ColorPoint[] = [
  { r: 0, g: 0, b: 100, val: 0 },      // 0: Deep Blue
  { r: 0, g: 0, b: 180, val: 10 },     // 10: Navy
  { r: 0, g: 0, b: 255, val: 20 },     // 20: Blue
  { r: 0, g: 100, b: 255, val: 30 },    // 30: Mid Blue
  { r: 0, g: 180, b: 255, val: 40 },    // 40: Sky Blue
  { r: 0, g: 255, b: 255, val: 50 },    // 50: Cyan
  { r: 0, g: 255, b: 150, val: 60 },    // 60: Teal / Seafoam
  { r: 0, g: 255, b: 0, val: 70 },      // 70: Pure Green
  { r: 150, g: 255, b: 0, val: 80 },    // 80: Lime / Yellow-Green
  { r: 255, g: 255, b: 0, val: 90 },    // 90: Yellow
  { r: 255, g: 190, b: 0, val: 100 },   // 100: Amber / Yellow-Orange
  { r: 255, g: 110, b: 0, val: 110 },   // 110: Orange
  { r: 255, g: 50, b: 0, val: 120 },    // 120: Red-Orange
  { r: 255, g: 0, b: 0, val: 130 },     // 130: Red
]

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function matchScaleValue(r: number, g: number, b: number): number | null {
  const findBest = (cr: number, cg: number, cb: number) => {
    let minDist = Infinity
    let best: ColorPoint | null = null
    let second: ColorPoint | null = null
    for (const p of CTIPE_SCALE) {
      const d = colorDist(cr, cg, cb, p.r, p.g, p.b)
      if (d < minDist) {
        minDist = d
        second = best
        best = p
      }
    }
    return { dist: minDist, best, second }
  }

  // 1. Try direct match
  const original = findBest(r, g, b)
  
  // 2. Handle shaded/darkened areas (common in forecast maps)
  // If no good match, try boosting brightness if it's not too desaturated
  let match = original
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max > 0 ? (max - min) / max : 0

  if (original.dist > 70 && max > 10 && saturation > 0.2) {
    const factor = 240 / max
    const boosted = findBest(
      Math.min(255, r * factor),
      Math.min(255, g * factor),
      Math.min(255, b * factor)
    )
    if (boosted.dist < original.dist) match = boosted
  }

  // Final check for validity
  if (match.dist > 110) return null
  if (r < 15 && g < 15 && b < 15) return 0
  if (!match.best) return null

  // Interpolate between the two closest points for a smoother reading
  if (match.second && match.dist > 5) {
    const d2 = colorDist(r, g, b, match.second.r, match.second.g, match.second.b)
    if (d2 < 140) {
      const w1 = 1 - (match.dist / (match.dist + d2))
      const w2 = 1 - (d2 / (match.dist + d2))
      return Math.round(match.best.val * w1 + match.second.val * w2)
    }
  }

  return match.best.val
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

interface CTIPEFrame {
  url: string
  time_tag: string
}

const USAGE = [
  'Pronóstico del Contenido Total de Electrones (TEC) global mediante modelado físico',
  'Estimación de errores de retardo ionosférico para sistemas GNSS/GPS',
  'Monitoreo de la respuesta ionosférica ante eventos de forzamiento solar',
  'Análisis de la densidad de plasma en la alta atmósfera y su evolución temporal',
  'Apoyo a la planificación de comunicaciones satelitales y operaciones espaciales',
]

const IMPACTS = [
  'Degradación de la precisión en posicionamiento GNSS de una frecuencia',
  'Interferencia en señales de comunicación satelital y navegación aérea',
  'Variaciones en la propagación de ondas de radio HF (reflexión y absorción)',
  'Potenciales efectos de centelleo ionosférico en regiones de alta densidad',
]

export function CTIPEClient() {
  const { data: frames, isLoading, isError } = useAutoRefresh<CTIPEFrame[]>({
    queryKey: ['ctipe-frames'],
    fetcher: () => getCTIPEFrames() as Promise<CTIPEFrame[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          CTIPe — Pronóstico de TEC
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Coupled Thermosphere Ionosphere Plasmasphere Electrodynamics · Pronóstico de Contenido Total de Electrones
        </p>
      </div>

      <div className="card overflow-hidden">
        <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-text-secondary">
          Pronóstico de Contenido Total de Electrones (TEC)
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
            <span className="text-xs text-red-400">Error al cargar datos de CTIPe</span>
          </div>
        )}
        {frames && frames.length > 0 && <CTIPEPlayer frames={frames} />}
      </div>

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Details */}
      <SectionDetails>
        <p>
          El modelo CTIPe (Coupled Thermosphere Ionosphere Plasmasphere Electrodynamics) es un modelo físico no lineal de última generación que simula de manera autoconsistente la interacción entre la termósfera, la ionósfera y la plasmósfera terrestre.
        </p>
        <p>
          <strong>Pronóstico de TEC:</strong> Estas animaciones muestran la evolución prevista del Contenido Total de Electrones. A diferencia de los modelos observacionales (como GloTEC), CTIPe utiliza leyes físicas para predecir cómo responderá la atmósfera superior a las condiciones cambiantes del viento solar y la actividad geomagnética.
        </p>
        <p>
          <strong>Importancia:</strong> El TEC es un factor crítico para cualquier sistema que utilice ondas de radio que atraviesan la atmósfera, especialmente el GPS. Las variaciones en el TEC provocan retardos en las señales que pueden traducirse en errores de posición de varios metros si no se corrigen adecuadamente.
        </p>
      </SectionDetails>
    </div>
  )
}

function CTIPEPlayer({ frames }: { frames: CTIPEFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<CTIPEFrame[]>([])
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
    let cancelled = false
    const BATCH = 8
    const ok: (CTIPEFrame | null)[] = new Array(frames.length).fill(null)
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
        const valid = ok.filter((f): f is CTIPEFrame => f !== null)
        if (valid.length > 0) {
          setActiveFrames(valid)
          setLoaded(true)
          setPlaying(true)
        } else {
          setActiveFrames(frames)
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
    const value = matchScaleValue(p[0], p[1], p[2])
    
    if (value === null) { setHoverInfo(null); return }
    
    setHoverInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      value,
      rgb: `rgb(${p[0]},${p[1]},${p[2]})`,
    })
  }, [playing])

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

      {loaded && current && (
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
              src={proxyUrl(current.url)}
              alt="CTIPe TEC Forecast"
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
                    {hoverInfo.value} TECU
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
                a.download = current.url.split('/').pop() || `ctipe-tec-frame.png`
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
