'use client'
// ============================================================
// src/components/instruments/GLOTECClient.tsx
// GloTEC (Global Total Electron Content) — Atlantic/Pacific
// animation player with 3 map types per view
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getGLOTECFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  { key: 'tec', label: 'Contenido Electrones (TEC)', desc: 'TEC Total en tiempo real' },
  { key: 'anomaly', label: 'Anomalía de TEC', desc: 'Diferencia respecto a la media de 10 días' },
  { key: 'ray', label: 'Ray Tracing / MUF', desc: 'Radio-propagación y Frecuencia Máxima Utilizable' },
]

const USAGE = [
  'Monitoreo del Contenido Total de Electrones (TEC) a escala global en tiempo real',
  'Cálculo de retardos en señales de satélite para corrección de errores GPS/GNSS',
  'Identificación de anomalías ionosféricas mediante el mapa de anomalías de 10 días',
  'Análisis de condiciones para radio-propagación HF usando mapas de Ray Tracing',
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          GloTEC — Contenido Total de Electrones
        </h1>
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
          <strong>Ray Tracing / MUF:</strong> Estos mapas indican las condiciones de propagación para ondas de radio de alta frecuencia (HF). La Frecuencia Máxima Utilizable (MUF) es crítica para operadores de radio que necesitan seleccionar la banda óptima según el estado de la ionósfera.
        </p>
        <p>
          <strong>Fuente:</strong> NOAA/SWPC — <em>Global Total Electron Content (GloTEC)</em>
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
      {frames && frames.length > 0 && <GLOTECPlayer frames={frames} type={type} />}
    </div>
  )
}

function GLOTECPlayer({ frames, type }: { frames: GLOTECFrame[]; type: GLOTECType }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<GLOTECFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3)
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        const valid = ok.filter((f): f is GLOTECFrame => f !== null)
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
          <div className="relative mx-auto max-h-[60vh] bg-black flex items-center justify-center">
            <img
              ref={imgRef}
              src={current.url}
              alt={`GloTEC ${type} output`}
              className="max-h-[60vh] w-auto object-contain"
              draggable={false}
            />
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>
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
