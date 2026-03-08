'use client'
// ============================================================
// src/components/instruments/DRAPClient.tsx
// D-Region Absorption Predictions (D-RAP) — 3 views animation
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getDRAPFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DRAPFrame {
  url: string
  time_tag: string
}

type DRAPView = 'global' | 'north-pole' | 'south-pole'

const VIEW_TABS: { key: DRAPView; label: string; desc: string }[] = [
  { key: 'global', label: 'Global', desc: '1 dB ABS — Mapa de absorción global' },
  { key: 'north-pole', label: 'Polo Norte', desc: '10 dB ABS — Vista polar norte' },
  { key: 'south-pole', label: 'Polo Sur', desc: '10 dB ABS — Vista polar sur' },
]

const USAGE = [
  'Predicción de absorción de señales de radio HF en la región D de la ionósfera',
  'Evaluación del impacto de eventos solares sobre comunicaciones de alta frecuencia',
  'Planificación de frecuencias óptimas para comunicaciones HF durante eventos de absorción',
  'Monitoreo en tiempo real del estado de la ionósfera inferior (60-90 km)',
  'Apoyo a operaciones de aviación que dependen de comunicaciones HF en rutas oceánicas',
  'Detección de eventos de protones solares que causan absorción en casquetes polares (PCA)',
  'Referencia para centros de pronóstico de clima espacial y telecomunicaciones',
]

const IMPACTS = [
  'Apagones parciales o totales de comunicaciones HF en regiones afectadas',
  'Degradación de señales de radionavegación en bandas de baja y media frecuencia',
  'Pérdida de contacto con aeronaves en rutas transpolares durante eventos de protones solares',
  'Interrupción de comunicaciones de emergencia que dependen de HF',
  'Absorción incrementada en casquetes polares durante tormentas de radiación solar (tipo S)',
  'Impacto en sistemas de radar que operan en frecuencias afectadas por absorción ionosférica',
  'Reducción de la máxima frecuencia utilizable (MUF) para enlaces HF de larga distancia',
]

export function DRAPClient() {
  const [view, setView] = useState<DRAPView>('global')
  const activeTab = VIEW_TABS.find((t) => t.key === view)!

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          D-RAP — Predicción de Absorción Región D
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          D-Region Absorption Predictions · Absorción de radio HF en la ionósfera inferior · Actualización cada minuto
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
      <DRAPPanel key={view} view={view} desc={activeTab.desc} />

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />
    </div>
  )
}

// ───────────────────────────────────────────────
// Single view animation panel
// ───────────────────────────────────────────────

function DRAPPanel({ view, desc }: { view: DRAPView; desc: string }) {
  const { data: frames, isLoading, isError } = useAutoRefresh<DRAPFrame[]>({
    queryKey: ['d-rap', view],
    fetcher: () => getDRAPFrames(view) as Promise<DRAPFrame[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
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
          <span className="text-xs text-red-400">Error al cargar datos de D-RAP</span>
        </div>
      )}
      {frames && frames.length > 0 && <DRAPPlayer frames={frames} view={view} />}
    </div>
  )
}

// ───────────────────────────────────────────────
// D-RAP color scale: palette indices 0-234 → 0-35 units
// Global = MHz (freq degraded), Polar = dB (absorption)
// ───────────────────────────────────────────────
const DRAP_SCALE: [number, number, number, number][] = [
  [0,0,0, 0],
  [31,0,28, 1],
  [61,0,63, 2],
  [80,0,100, 3],
  [88,0,132, 4],
  [84,0,159, 5],
  [71,0,195, 6],
  [43,0,236, 7],
  [21,0,255, 8],
  [0,21,255, 9],
  [0,55,255, 10],
  [0,93,255, 11],
  [0,131,255, 12],
  [0,174,255, 13],
  [0,203,255, 14],
  [0,246,255, 15],
  [0,255,220, 16],
  [0,255,191, 17],
  [0,255,148, 18],
  [0,255,110, 19],
  [0,255,67, 20],
  [0,255,38, 21],
  [4,255,0, 22],
  [46,255,0, 23],
  [76,255,0, 24],
  [119,255,0, 25],
  [157,255,0, 26],
  [191,255,0, 27],
  [229,255,0, 28],
  [255,238,0, 29],
  [255,199,0, 30],
  [255,165,0, 31],
  [255,123,0, 32],
  [255,89,0, 33],
  [255,51,0, 34],
  [255,12,0, 35],
]

function proxyUrl(url: string) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}`
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function matchDRAPValue(r: number, g: number, b: number): number | null {
  // White = background/text, not data
  if (r > 240 && g > 240 && b > 240) return null
  // Very dark pixels near borders/lines
  if (r < 5 && g < 5 && b < 5) return 0
  let minDist = Infinity
  let value = 0
  for (const [sr, sg, sb, v] of DRAP_SCALE) {
    const d = colorDist(r, g, b, sr, sg, sb)
    if (d < minDist) { minDist = d; value = v }
  }
  // If too far from any known color, it's probably background
  if (minDist > 80) return null
  return value
}

function getContainedBounds(cW: number, cH: number, iW: number, iH: number) {
  const cAR = cW / cH, iAR = iW / iH
  let rW: number, rH: number, oX: number, oY: number
  if (iAR > cAR) { rW = cW; rH = cW / iAR; oX = 0; oY = (cH - rH) / 2 }
  else { rH = cH; rW = cH * iAR; oX = (cW - rW) / 2; oY = 0 }
  return { rW, rH, oX, oY }
}

// ───────────────────────────────────────────────
// Internal animation player
// ───────────────────────────────────────────────

function DRAPPlayer({ frames, view }: { frames: DRAPFrame[]; view: DRAPView }) {
  const unit = view === 'global' ? 'MHz' : 'dB'
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<DRAPFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3)
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hover color picking
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgContRef = useRef<HTMLDivElement>(null)
  const canvasReady = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; value: number; rgb: string } | null>(null)

  const total = activeFrames.length
  const current = activeFrames[Math.min(idx, Math.max(0, total - 1))]

  // Reset when frames change
  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setLoaded(false)
    setLoadProgress(0)
    setActiveFrames([])
  }, [frames])

  // Preload all frames in batches, filter failures, then auto-play
  useEffect(() => {
    let cancelled = false
    const BATCH = 8
    const ok: (DRAPFrame | null)[] = new Array(frames.length).fill(null)
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
                  doneCount++
                  if (!cancelled) setLoadProgress(Math.round((doneCount / frames.length) * 100))
                  resolve()
                }
                img.src = f.url
              })
          )
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is DRAPFrame => f !== null)
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

  // Play/pause loop
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

  // Draw current frame to hidden canvas for pixel sampling when paused
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
    const value = matchDRAPValue(p[0], p[1], p[2])
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
      return new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    } catch {
      return ts
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Loading progress */}
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
          {/* Image */}
          <div
            ref={imgContRef}
            className="relative mx-auto max-h-[60vh] bg-black flex items-center justify-center"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: !playing ? 'crosshair' : undefined }}
          >
            <canvas ref={canvasRef} className="hidden" />
            <img
              ref={imgRef}
              src={current.url}
              alt="D-RAP absorption prediction"
              className="max-h-[60vh] w-auto object-contain"
              draggable={false}
            />
            {/* Timestamp overlay */}
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>
            {/* Hover tooltip */}
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
                    {hoverInfo.value} {unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Timeline slider */}
          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={idx}
            onChange={(e) => setIdx(parseInt(e.target.value, 10))}
            className="w-full accent-primary"
          />

          {/* Controls */}
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

            {/* Speed */}
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

            {/* Frame counter */}
            <span className="ml-auto data-value text-text-muted">
              {idx + 1}/{total}
            </span>

            <div className="h-4 w-px bg-border" />

            {/* Download current frame */}
            <button
              className="ctrl-btn"
              onClick={() => {
                const a = document.createElement('a')
                a.href = current.url
                a.download = current.url.split('/').pop() || 'drap-frame.png'
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
