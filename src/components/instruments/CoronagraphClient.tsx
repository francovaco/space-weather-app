'use client'
// ============================================================
// src/components/instruments/CoronagraphClient.tsx
// Coronagraph animation player with 4 source tabs
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getCoronagraphFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { cn } from '@/lib/utils'
import type { CoronagraphSource } from '@/types/swpc'
import { CORONAGRAPH_SOURCES } from '@/types/swpc'
import { Play, Pause, SkipBack, SkipForward, RefreshCw, Download } from 'lucide-react'

interface CoronaFrame {
  url: string
  time_tag: string
}

const USAGE = [
  'Detección y seguimiento de Eyecciones de Masa Coronal (CME) en tiempo real',
  'Caracterización de la estructura y velocidad de las CMEs para pronósticos de clima espacial',
  'Monitoreo de la corona solar externa y actividad transitoria',
  'Entrada crítica para el modelo WSA-Enlil de predicción de viento solar',
  'Observación de la interacción del viento solar con estructuras coronales',
  'Identificación de halos coronales indicativos de CMEs dirigidas a la Tierra',
  'Estudio de la dinámica de streamers coronales y su relación con el viento solar',
]

const IMPACTS = [
  'Tormentas geomagnéticas severas causadas por CMEs que impactan la magnetósfera terrestre',
  'Interrupciones en redes de energía eléctrica por corrientes inducidas geomagnéticamente (GIC)',
  'Degradación y pérdida de señales GPS y sistemas de posicionamiento de precisión',
  'Aumento de radiación en rutas de aviación polar durante eventos de partículas solares',
  'Daño potencial a satélites en órbita por partículas energéticas asociadas a CMEs',
  'Interferencia en comunicaciones HF de radio durante tormentas geomagnéticas',
  'Riesgo para astronautas y operaciones de estaciones espaciales por radiación',
  'Perturbaciones ionosféricas que afectan comunicaciones y navegación satelital',
]

export function CoronagraphClient() {
  const [source, setSource] = useState<CoronagraphSource>('GOES-CCOR-1')

  const { data: frames, isLoading, isError } = useAutoRefresh<CoronaFrame[]>({
    queryKey: ['coronagraph', source],
    fetcher: () => getCoronagraphFrames(source) as Promise<CoronaFrame[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Coronógrafo
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Detección de CMEs · GOES CCOR-1 · LASCO C2 y C3 · Actualización cada 10 min
        </p>
      </div>

      {/* Source tabs */}
      <div className="flex gap-1 rounded-md border border-border bg-background-secondary p-0.5 flex-wrap">
        {CORONAGRAPH_SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSource(s.id)}
            className={cn(
              'rounded px-2.5 py-1 text-2xs font-medium transition-colors',
              source === s.id
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Animation player */}
      <div className="card relative overflow-hidden">
        {isLoading && !frames && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              Cargando cuadros del coronógrafo…
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs text-red-400">Error al cargar datos del coronógrafo</span>
          </div>
        )}
        {frames && frames.length > 0 && (
          <CoronagraphPlayer frames={frames} />
        )}
      </div>

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Detalles */}
      <SectionDetails>
        <p>
          El coronógrafo CCOR (Compact Coronagraph) de GOES y los coronógrafos LASCO C2/C3 del observatorio SOHO proporcionan imágenes de la corona solar exterior ocultando el disco solar brillante con un disco opaco. Esto permite observar las eyecciones de masa coronal (CME) a medida que se propagan por el espacio.
        </p>
        <p>
          LASCO C2 observa la corona interna de 1.5 a 6 radios solares, mientras que LASCO C3 cubre de 3.7 a 30 radios solares. El coronógrafo compacto CCOR-1 de GOES proporciona una perspectiva complementaria desde la órbita geoestacionaria.
        </p>
        <p>
          Las CME son expulsiones masivas de plasma y campo magnético desde la corona solar. Cuando están dirigidas hacia la Tierra, pueden causar tormentas geomagnéticas severas al interactuar con la magnetosfera terrestre. El tiempo de tránsito tipico de una CME desde el Sol hasta la Tierra es de 1 a 3 días.
        </p>
      </SectionDetails>
    </div>
  )
}

// ───────────────────────────────────────────────
// Internal animation player (self-contained state)
// ───────────────────────────────────────────────

function CoronagraphPlayer({ frames }: { frames: CoronaFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<CoronaFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3) // default 4 fps
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = activeFrames.length
  const current = activeFrames[Math.min(idx, Math.max(0, total - 1))]

  // Reset when frames change (new source)
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
    const ok: (CoronaFrame | null)[] = new Array(frames.length).fill(null)
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
            img.src = f.url
          }))
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is CoronaFrame => f !== null)
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

      {/* Image */}
      {loaded && (
        <>
        <div className="relative mx-auto bg-black" style={{ maxWidth: 600 }}>
        <img
          ref={imgRef}
          src={current.url}
          alt="Coronagraph frame"
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
