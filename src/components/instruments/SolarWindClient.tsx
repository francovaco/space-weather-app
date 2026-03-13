'use client'
// ============================================================
// src/components/instruments/SolarWindClient.tsx
// WSA-ENLIL Solar Wind Prediction Animation Player
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getSolarWindFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { LoadingMessage, ErrorMessage, EmptyMessage, PreloadProgress } from '@/components/ui/StatusMessages'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { DataAge } from '@/components/ui/DataAge'
import { cn, proxyImg } from '@/lib/utils'

interface EnlilFrame {
  url: string
  time_tag: string
}

const USAGE = [
  'Predicción de la llegada de Eyecciones de Masa Coronal (CME) a la Tierra',
  'Mapeo de la densidad y velocidad del viento solar en el sistema solar interno',
  'Identificación de Regiones de Interacción en Co-rotación (CIR)',
  'Estimación de la magnitud del impacto de tormentas geomagnéticas',
  'Apoyo a la planificación de misiones espaciales y operaciones satelitales',
  'Referencia visual para la evolución temporal de estructuras solares masivas',
]

const IMPACTS = [
  'Choque de CMEs con la magnetósfera que desencadenan tormentas geomagnéticas',
  'Compresión de la magnetopausa que afecta satélites en órbita geoestacionaria',
  'Aumento de la densidad de plasma que provoca arrastre satelital en LEO',
  'Variaciones de velocidad que inducen corrientes eléctricas en tierra (GIC)',
  'Perturbaciones en las comunicaciones de radio y señales GPS/GNSS',
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
              Viento Solar (WSA-ENLIL)
            </h1>
            <DataAge timestamp={frames?.[frames.length - 1]?.time_tag} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Modelo de Predicción Heliosférica · Evolución de Densidad y Velocidad · Actualización cada 2 horas
          </p>
        </div>
      </div>

      {/* Animation Player Container */}
      <div className="card overflow-hidden">
        {isLoading && !frames && (
          <LoadingMessage message="Cargando animación WSA-ENLIL…" className="py-20" />
        )}
        {isError && (
          <ErrorMessage message="Error al conectar con el servidor de modelos" className="py-20" />
        )}
        {frames && frames.length > 0 && (
          <SolarWindPlayer frames={frames} />
        )}
        {frames && frames.length === 0 && (
          <EmptyMessage message="No hay pronóstico ENLIL disponible en este momento" className="py-20" />
        )}
      </div>

      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El modelo <strong>WSA-ENLIL</strong> es una herramienta de predicción heliosférica física que simula las condiciones del viento solar y la propagación de Eyecciones de Masa Coronal (CME) desde el Sol hasta la Tierra.
        </p>
        <p className="mt-4">
          La animación muestra dos vistas principales:
        </p>
        <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-text-secondary">
          <li><strong>Plano Eclíptico (Izquierda):</strong> Vista desde arriba del sistema solar, mostrando la propagación radial de las partículas.</li>
          <li><strong>Plano Meridional (Derecha):</strong> Vista lateral que muestra la extensión latitudinal de las estructuras solares.</li>
        </ul>
        <p className="mt-4">
          Este modelo es vital para predecir con horas de antelación cuándo impactará una tormenta solar sobre nuestra magnetósfera, permitiendo a los operadores de satélites y redes eléctricas tomar medidas preventivas.
        </p>
      </SectionDetails>
    </div>
  )
}

function SolarWindPlayer({ frames }: { frames: EnlilFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<EnlilFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3) // 4 fps default
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
              ok[i + bi] = null
              doneCount++
              if (!cancelled) setLoadProgress(Math.round((doneCount / frames.length) * 100))
              resolve()
            }
            img.src = proxyImg(f.url)
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

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (playing && activeFrames.length > 1) {
      intervalRef.current = setInterval(() => {
        setIdx((prev) => (prev + 1) % activeFrames.length)
      }, speedMs)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, speedMs, activeFrames.length])

  const prev = useCallback(() => setIdx((i) => (i - 1 + activeFrames.length) % activeFrames.length), [activeFrames.length])
  const next = useCallback(() => setIdx((i) => (i + 1) % activeFrames.length), [activeFrames.length])

  const current = activeFrames[idx]

  const fmtTime = (ts: string) => {
    try {
      return new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    } catch {
      return ts
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {!loaded && <PreloadProgress progress={loadProgress} />}

      {loaded && current && (
        <>
          <div className="relative mx-auto w-full max-w-4xl bg-black rounded-lg overflow-hidden border border-white/5">
            <img
              src={proxyImg(current.url)}
              alt="WSA-ENLIL Simulation"
              className="h-auto w-full object-contain mx-auto max-h-[60vh]"
              draggable={false}
            />
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, activeFrames.length - 1)}
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

            <button className="ctrl-btn" onClick={() => setFpsIdx((i) => Math.max(0, i - 1))} title="Más lento">
              <span className="text-2xs font-bold">−</span>
            </button>
            <span className="data-value text-text-muted">{FPS_STEPS[fpsIdx]}fps</span>
            <button className="ctrl-btn" onClick={() => setFpsIdx((i) => Math.min(FPS_STEPS.length - 1, i + 1))} title="Más rápido">
              <span className="text-2xs font-bold">+</span>
            </button>

            <span className="ml-auto data-value text-text-muted">
              {idx + 1}/{activeFrames.length}
            </span>

            <div className="h-4 w-px bg-border" />

            <button
              className="ctrl-btn"
              onClick={() => {
                const a = document.createElement('a')
                a.href = proxyImg(current.url)
                a.download = `wsa-enlil-${current.time_tag}.jpg`
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
