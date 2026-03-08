'use client'
// ============================================================
// src/components/instruments/WAMIPEClient.tsx
// WAM-IPE (Whole Atmosphere Model – Ionosphere Plasmasphere
// Electrodynamics) — 4-view animation player
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getWAMIPEFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <p>
          <strong>Fuente:</strong> NOAA/SWPC — <em>WAM-IPE: Whole Atmosphere Model – Ionosphere Plasmasphere Electrodynamics</em>
        </p>
      </SectionDetails>
    </div>
  )
}

// ───────────────────────────────────────────────
// Single view animation panel
// ───────────────────────────────────────────────

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
      {frames && frames.length > 0 && <WAMIPEPlayer frames={frames} />}
    </div>
  )
}

// ───────────────────────────────────────────────
// Internal animation player
// ───────────────────────────────────────────────

function WAMIPEPlayer({ frames }: { frames: WAMIPEFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<WAMIPEFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3)
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

  // Preload all frames in batches, filter failures, then auto-play
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
        const valid = ok.filter((f): f is WAMIPEFrame => f !== null)
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
          <div className="relative mx-auto max-h-[60vh] bg-black flex items-center justify-center">
            <img
              ref={imgRef}
              src={current.url}
              alt="WAM-IPE model output"
              className="max-h-[60vh] w-auto object-contain"
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
                a.download = current.url.split('/').pop() || 'wam-ipe-frame.png'
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
