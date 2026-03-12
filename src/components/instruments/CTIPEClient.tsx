'use client'
// ============================================================
// src/components/instruments/CTIPEClient.tsx
// CTIPe model animation player (Coupled Thermosphere Ionosphere Plasmasphere Electrodynamics)
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getCTIPEFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { LoadingMessage, ErrorMessage, EmptyMessage, PreloadProgress } from '@/components/ui/StatusMessages'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { proxyImg } from '@/lib/utils'

// ───────────────────────────────────────────────
// Color Scales & Helpers
// ───────────────────────────────────────────────
const TEC_SCALE: [number, number, number, number][] = [
  [ 42,  41, 142,  0],
  [ 58,  82, 175,  5],
  [ 63, 114, 183, 10],
  [ 67, 146, 191, 15],
  [ 83, 171, 183, 20],
  [110, 191, 163, 25],
  [145, 208, 143, 30],
  [182, 222, 128, 35],
  [215, 233, 126, 40],
  [241, 237, 140, 45],
  [253, 224, 137, 50],
  [253, 195, 116, 55],
  [252, 161,  96, 60],
  [248, 124,  79, 65],
  [236,  86,  64, 70],
  [214,  52,  48, 75],
  [184,  25,  34, 80],
  [150,   8,  21, 85],
  [114,   1,  15, 90],
  [ 80,   0,  15, 95],
  [ 48,   0,  15, 100],
]

function proxyUrl(url: string) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}`
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function matchTECValue(r: number, g: number, b: number): number | null {
  // White/bright gray labels
  if (r > 200 && g > 200 && b > 200) return null
  // Gray lines (continents/grid)
  if (Math.abs(r-g) < 15 && Math.abs(g-b) < 15 && r < 180) return null

  let minDist = Infinity
  let bestValue: number | null = null
  for (const [sr, sg, sb, val] of TEC_SCALE) {
    const d = colorDist(r, g, b, sr, sg, sb)
    if (d < minDist) { minDist = d; bestValue = val }
  }
  if (minDist > 70) return null
  return bestValue
}

function getContainedBounds(cW: number, cH: number, iW: number, iH: number) {
  const cAR = cW / cH, iAR = iW / iH
  let rW: number, rH: number, oX: number, oY: number
  if (iAR > cAR) { rW = cW; rH = cW / iAR; oX = 0; oY = (cH - rH) / 2 }
  else { rH = cH; rW = cH * iAR; oX = (cW - rW) / 2; oY = 0 }
  return { rW, rH, oX, oY }
}

interface CTIPEFrame {
  url: string
  time_tag: string
}

const USAGE = [
  'Pronóstico global de la densidad de electrones en la ionósfera y plasmósfera',
  'Predicción de variaciones del Contenido Total de Electrones (TEC) por actividad solar',
  'Evaluación de efectos en la propagación de señales GNSS y sistemas de posicionamiento',
  'Modelado de la respuesta termosférica a tormentas geomagnéticas',
  'Pronóstico de la dinámica de vientos neutros en la alta atmósfera',
  'Detección de tormentas ionosféricas positivas y negativas en desarrollo',
  'Apoyo a la mitigación de errores ionosféricos en comunicaciones satelitales',
]

const IMPACTS = [
  'Errores de precisión en sistemas GPS y GNSS debido a variaciones en el TEC',
  'Retardos significativos en señales de comunicación satelital trans-ionosférica',
  'Degradación de comunicaciones HF por cambios en la frecuencia crítica ionosférica',
  'Arrastre atmosférico variable sobre satélites en órbita baja (LEO) por cambios en la termósfera',
  'Centelleo ionosférico que provoca pérdida de enganche en señales de navegación',
  'Perturbaciones en la propagación de radio sobre regiones polares y ecuatoriales',
  'Interferencia en radares de vigilancia espacial y sistemas de comunicación trans-atmosféricos',
]

export function CTIPEClient() {
  const { data: frames, isLoading, isError } = useAutoRefresh<CTIPEFrame[]>({
    queryKey: ['ctipe-forecast'],
    fetcher: () => getCTIPEFrames() as Promise<CTIPEFrame[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Modelo CTIPe
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Coupled Thermosphere Ionosphere Plasmasphere Electrodynamics · Pronóstico de Contenido Total de Electrones
        </p>
      </div>

      {/* Animation player */}
      <div className="card relative overflow-hidden">
        {isLoading && !frames && (
          <LoadingMessage message="Cargando datos de CTIPe…" />
        )}
        {isError && (
          <ErrorMessage 
            message="Error al cargar datos" 
            description="No se pudieron obtener los cuadros del modelo CTIPe."
          />
        )}
        {frames && (
          frames.length > 0 ? (
            <CTIPEPlayer frames={frames} />
          ) : (
            <EmptyMessage message="No hay cuadros disponibles" />
          )
        )}
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
  const [fpsIdx, setFpsIdx] = useState(3) // default 4 fps
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hover color picking
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgContRef = useRef<HTMLDivElement>(null)
  const canvasReady = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; val: number; rgb: string } | null>(null)

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

  // Preload frames in batches, filter failures, then auto-play
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
          batch.map((f, bi) => new Promise<void>((resolve) => {
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
          }))
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
    return () => { cancelled = true }
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
    const val = matchTECValue(p[0], p[1], p[2])
    if (val === null) { setHoverInfo(null); return }
    setHoverInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      val,
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
        <PreloadProgress progress={loadProgress} />
      )}

      {loaded && current && (
        <>
          {/* Image */}
          <div
            ref={imgContRef}
            className="relative mx-auto w-full bg-black"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: !playing ? 'crosshair' : undefined }}
          >
            <canvas ref={canvasRef} className="hidden" />
            <img
              ref={imgRef}
              src={proxyUrl(current.url)}
              alt="CTIPe TEC forecast"
              className="h-auto w-full"
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
                  left: Math.min(hoverInfo.x + 14, (imgContRef.current?.clientWidth ?? 300) - 160),
                  top: Math.max(hoverInfo.y - 40, 4),
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded border border-white/30"
                    style={{ backgroundColor: hoverInfo.rgb }}
                  />
                  <div className="flex flex-col">
                    <span className="font-data text-xs text-white">TEC: {hoverInfo.val} units</span>
                  </div>
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
            <button className="ctrl-btn" onClick={() => setPlaying(!playing)} title={playing ? 'Pausar' : 'Reproducir'}>
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
