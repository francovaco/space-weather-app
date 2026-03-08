'use client'
// ============================================================
// src/components/instruments/SolarWindClient.tsx
// WSA-ENLIL Solar Wind Prediction animation player
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getSolarWindFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'

interface EnlilFrame {
  url: string
  time_tag: string
}

const USAGE = [
  'Predicción de la velocidad y densidad del viento solar en la heliosfera interna',
  'Pronóstico de tiempos de llegada de Eyecciones de Masa Coronal (CME) a la Tierra',
  'Modelado tridimensional de la propagación del viento solar desde el Sol hasta 2 AU',
  'Evaluación de condiciones interplanetarias para pronósticos de tormentas geomagnéticas',
  'Visualización del plano eclíptico y meridional de la heliosfera',
  'Monitoreo de regiones de interacción corrotantes (CIR) y corrientes de alta velocidad',
  'Entrada fundamental para modelos de pronóstico geomagnético operacional',
]

const IMPACTS = [
  'Tormentas geomagnéticas causadas por CMEs de alta velocidad que impactan la magnetósfera',
  'Interrupciones en redes de energía eléctrica por corrientes inducidas geomagnéticamente (GIC)',
  'Degradación de señales GPS y GNSS durante perturbaciones del viento solar',
  'Aumento de la tasa de radiación en rutas de aviación durante eventos de partículas energéticas',
  'Arrastre atmosférico incrementado sobre satélites en órbita baja terrestre (LEO)',
  'Interferencia en comunicaciones de alta frecuencia (HF) durante tormentas geomagnéticas',
  'Riesgo para astronautas por eventos de partículas solares energéticas asociados a CMEs',
  'Expansión del óvalo auroral hacia latitudes medias durante eventos severos de viento solar',
]

export function SolarWindClient() {
  const { data: frames, isLoading, isError } = useAutoRefresh<EnlilFrame[]>({
    queryKey: ['solar-wind-enlil'],
    fetcher: () => getSolarWindFrames() as Promise<EnlilFrame[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Predicción de Viento Solar WSA-ENLIL
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Modelo de propagación del viento solar · Predicción de llegada de CMEs · Actualización cada 1 min
        </p>
      </div>

      {/* Animation player */}
      <div className="card relative overflow-hidden">
        {isLoading && !frames && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              Cargando cuadros WSA-ENLIL…
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs text-red-400">Error al cargar datos del modelo ENLIL</span>
          </div>
        )}
        {frames && frames.length > 0 && (
          <EnlilPlayer frames={frames} />
        )}
      </div>

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />
    </div>
  )
}

// ───────────────────────────────────────────────
// Internal animation player (self-contained)
// ───────────────────────────────────────────────

function EnlilPlayer({ frames }: { frames: EnlilFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<EnlilFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3) // default 4 fps
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    const ok: (EnlilFrame | null)[] = new Array(frames.length).fill(null)
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
              doneCount++
              if (!cancelled) setLoadProgress(Math.round((doneCount / frames.length) * 100))
              resolve()
            }
            img.src = f.url
          }))
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is EnlilFrame => f !== null)
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
          <div className="relative mx-auto bg-black" style={{ maxWidth: 800 }}>
            <img
              ref={imgRef}
              src={current.url}
              alt="WSA-ENLIL solar wind"
              className="h-auto w-full"
              draggable={false}
            />
            {/* Timestamp overlay */}
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>
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
