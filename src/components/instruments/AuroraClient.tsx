'use client'
// ============================================================
// src/components/instruments/AuroraClient.tsx
// Aurora 30-minute forecast — North & South pole side by side
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getAuroraFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { LoadingMessage, ErrorMessage, EmptyMessage, PreloadProgress } from '@/components/ui/StatusMessages'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { DataAge } from '@/components/ui/DataAge'
import { cn } from '@/lib/utils'

interface AuroraFrame {
  url: string
  time_tag: string
}

// ───────────────────────────────────────────────
// Aurora color scale: green → yellow → red
// [r, g, b, probability%, energy ergs/cm²]
// Extracted from OVATION PNG gradient bar
// ───────────────────────────────────────────────
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

function proxyUrl(url: string) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}`
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function matchAuroraValue(r: number, g: number, b: number): { prob: number; ergs: number } | null {
  // White/bright gray = text/labels
  if (r > 200 && g > 200 && b > 200) return null
  // Very dark = space/ocean background
  if (r + g + b < 60) return null
  // Blue-dominant = ocean/space background
  if (b > r + 20 && b > g + 20) return null
  // Gray/brown with low saturation = land/coast (all channels close together)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 40 && max < 200) return null

  let minDist = Infinity
  let best: { prob: number; ergs: number } | null = null
  for (const [sr, sg, sb, prob, ergs] of AURORA_SCALE) {
    const d = colorDist(r, g, b, sr, sg, sb)
    if (d < minDist) { minDist = d; best = { prob, ergs } }
  }
  if (minDist > 70) return null
  return best
}

function getContainedBounds(cW: number, cH: number, iW: number, iH: number) {
  const cAR = cW / cH, iAR = iW / iH
  let rW: number, rH: number, oX: number, oY: number
  if (iAR > cAR) { rW = cW; rH = cW / iAR; oX = 0; oY = (cH - rH) / 2 }
  else { rH = cH; rW = cH * iAR; oX = (cW - rW) / 2; oY = 0 }
  return { rW, rH, oX, oY }
}

const USAGE = [
  'Pronóstico a corto plazo (30 min) de la probabilidad de aurora visible',
  'Planificación de observaciones de aurora boreal y austral',
  'Monitoreo de la extensión del óvalo auroral en tiempo real',
  'Evaluación del impacto geomagnético sobre regiones de alta latitud',
  'Apoyo a operaciones de aviación en rutas polares sensibles a tormentas geomagnéticas',
  'Indicador visual de la actividad geomagnética global derivado del modelo OVATION',
  'Herramienta de referencia para centros de pronóstico de clima espacial',
]

const IMPACTS = [
  'Tormentas geomagnéticas que expanden el óvalo auroral hacia latitudes medias',
  'Interferencia en comunicaciones HF y señales de radionavegación en zonas polares',
  'Corrientes inducidas geomagnéticamente (GIC) que afectan redes eléctricas de alta latitud',
  'Degradación de la precisión GPS durante eventos aurorales intensos',
  'Aumento de la tasa de radiación para tripulaciones de aviación en rutas polares',
  'Perturbaciones ionosféricas que provocan centelleo de señales satelitales',
  'Riesgo de daño a transformadores de potencia en regiones afectadas por GIC',
  'Posible visibilidad de auroras en latitudes inusuales durante eventos severos',
]

export function AuroraClient() {
  const { data: northFrames } = useAutoRefresh<AuroraFrame[]>({
    queryKey: ['aurora', 'north'],
    fetcher: () => getAuroraFrames('north') as Promise<AuroraFrame[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Pronóstico de Aurora — 30 Minutos
          </h1>
          <DataAge timestamp={northFrames?.[northFrames.length - 1]?.time_tag} />
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Modelo OVATION · Probabilidad de aurora boreal y austral · Actualización cada 5 min
        </p>
      </div>

      {/* Dual players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AuroraPanel pole="north" label="Polo Norte (Boreal)" />
        <AuroraPanel pole="south" label="Polo Sur (Austral)" />
      </div>

      {/* Shared Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Detalles */}
      <SectionDetails>
        <p>
          El pronóstico de aurora de 30 minutos se genera a partir del modelo OVATION Prime, desarrollado por la NOAA. Este modelo empírico estima la probabilidad de observar aurora visible desde el suelo, basándose en mediciones en tiempo real del viento solar obtenidas por el satélite DSCOVR en el punto de Lagrange L1.
        </p>
        <p>
          Las imágenes muestran la distribución geográfica de la probabilidad de aurora tanto para el hemisferio norte (aurora boreal) como para el hemisferio sur (aurora austral). El óvalo auroral —la zona de máxima probabilidad— se expande hacia latitudes más bajas durante tormentas geomagnéticas intensas.
        </p>
        <p>
          El modelo OVATION utiliza como entrada principal la componente Bz del campo magnético interplanetario (IMF) y la velocidad del viento solar para calcular el acoplamiento magnetosférico. Cuando Bz es negativo (orientación sur), la reconexión magnética en el lado diurno permite mayor entrada de energía, expandiendo e intensificando el óvalo auroral.
        </p>
      </SectionDetails>
    </div>
  )
}

function AuroraPanel({ pole, label }: { pole: 'north' | 'south'; label: string }) {
  const { data: frames, isLoading, isError } = useAutoRefresh<AuroraFrame[]>({
    queryKey: ['aurora', pole],
    fetcher: () => getAuroraFrames(pole) as Promise<AuroraFrame[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  return (
    <div className="card overflow-hidden">
      <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </h2>

      {isLoading && !frames && (
        <LoadingMessage message="Cargando cuadros…" className="py-20" />
      )}
      {isError && (
        <ErrorMessage message="Error al cargar datos" className="py-20" />
      )}
      {frames && frames.length > 0 && (
        <AuroraPlayer frames={frames} />
      )}
      {frames && frames.length === 0 && (
        <EmptyMessage message="No hay pronóstico disponible" className="py-20" />
      )}
    </div>
  )
}

function AuroraPlayer({ frames }: { frames: AuroraFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<AuroraFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3) // default 4 fps
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hover color picking
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgContRef = useRef<HTMLDivElement>(null)
  const canvasReady = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; prob: number; ergs: number; rgb: string } | null>(null)

  const total = activeFrames.length
  const current = activeFrames[Math.min(idx, Math.max(0, total - 1))]

  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setLoaded(false)
    setLoadProgress(0)
    setActiveFrames([])
  }, [frames])

  useEffect(() => {
    let cancelled = false
    const BATCH = 8
    const ok: (AuroraFrame | null)[] = new Array(frames.length).fill(null)
    let doneCount = 0

    async function preloadAll() {
      for (let i = 0; i < frames.length; i += BATCH) {
        if (cancelled) return
        const batch = frames.slice(i, i + BATCH)
        await Promise.all(
          batch.map((f, bi) => new Promise<void>((resolve) => {
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
          }))
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is AuroraFrame => f !== null)
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
    return () => { cancelled = true }
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
    const match = matchAuroraValue(p[0], p[1], p[2])
    if (!match) { setHoverInfo(null); return }
    setHoverInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      prob: match.prob,
      ergs: match.ergs,
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
      {!loaded && (
        <PreloadProgress progress={loadProgress} />
      )}

      {loaded && activeFrames.length === 0 && (
        <EmptyMessage message="No se pudieron cargar las imágenes" className="py-20" />
      )}

      {loaded && current && (
        <>
          <div
            ref={imgContRef}
            className="relative mx-auto w-full bg-black flex items-center justify-center select-none cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <canvas ref={canvasRef} className="hidden" />
            <img
              ref={imgRef}
              src={current.url}
              alt="Aurora forecast"
              className="h-auto w-full"
              draggable={false}
            />
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>
            {hoverInfo && !playing && (
              <div
                className="pointer-events-none absolute z-20 rounded border border-white/20 bg-black/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                style={{
                  left: Math.min(hoverInfo.x + 14, (imgContRef.current?.clientWidth ?? 300) - 180),
                  top: Math.max(hoverInfo.y - 40, 4),
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded border border-white/30"
                    style={{ backgroundColor: hoverInfo.rgb }}
                  />
                  <span className="font-data text-xs text-white whitespace-nowrap">
                    {hoverInfo.prob}% — {hoverInfo.ergs.toFixed(1)} ergs/cm²
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
            <button className="ctrl-btn" onClick={() => setPlaying(!playing)} title={playing ? 'Pausar' : 'Reproducir'}>
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
            <span className="data-value text-text-muted">
              {FPS_STEPS[fpsIdx]}fps
            </span>
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
                a.download = current.url.split('/').pop() || 'frame.jpg'
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
