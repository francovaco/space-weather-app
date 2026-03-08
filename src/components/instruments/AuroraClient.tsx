'use client'
// ============================================================
// src/components/instruments/AuroraClient.tsx
// Aurora 30-minute forecast — North & South pole side by side
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getAuroraFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

interface AuroraFrame {
  url: string
  time_tag: string
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
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Pronóstico de Aurora — 30 Minutos
        </h1>
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
    </div>
  )
}

// ───────────────────────────────────────────────
// Single aurora animation panel
// ───────────────────────────────────────────────

function AuroraPanel({ pole, label }: { pole: 'north' | 'south'; label: string }) {
  const { data: frames, isLoading, isError } = useAutoRefresh<AuroraFrame[]>({
    queryKey: ['aurora', pole],
    fetcher: () => getAuroraFrames(pole) as Promise<AuroraFrame[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  return (
    <div className="card overflow-hidden">
      <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-text-secondary">
        {label}
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
          <span className="text-xs text-red-400">Error al cargar datos</span>
        </div>
      )}
      {frames && frames.length > 0 && (
        <AuroraPlayer frames={frames} />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────
// Internal animation player (self-contained)
// ───────────────────────────────────────────────

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
              doneCount++
              if (!cancelled) setLoadProgress(Math.round((doneCount / frames.length) * 100))
              resolve()
            }
            img.src = f.url
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
          <div className="relative mx-auto w-full bg-black">
            <img
              ref={imgRef}
              src={current.url}
              alt="Aurora forecast"
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
          </div>
        </>
      )}
    </div>
  )
}
