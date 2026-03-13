'use client'
// ============================================================
// src/components/instruments/SUVIClient.tsx
// SUVI animation player with wavelength tabs
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage, PreloadProgress } from '@/components/ui/StatusMessages'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getSuviFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { DataAge } from '@/components/ui/DataAge'
import { cn, proxyImg } from '@/lib/utils'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'

interface SuviFrame {
  url: string
  time_tag: string
}

type Wavelength = '094' | '131' | '171' | '195' | '284'

const WAVELENGTH_TABS: { id: Wavelength; label: string; color: string }[] = [
  { id: '094', label: '94 Angstroms',  color: '#ef4444' },
  { id: '131', label: '131 Angstroms', color: '#f97316' },
  { id: '171', label: '171 Angstroms', color: '#eab308' },
  { id: '195', label: '195 Angstroms', color: '#22c55e' },
  { id: '284', label: '284 Angstroms', color: '#3b82f6' },
]

const USAGE = [
  'Monitoreo continuo de la corona solar en múltiples longitudes de onda del ultravioleta extremo (EUV)',
  'Detección y seguimiento de erupciones solares (flares) en tiempo real',
  'Observación de hoyos coronales como fuente de viento solar de alta velocidad',
  'Identificación de regiones activas y su evolución en el disco solar',
  'Monitoreo de protuberancias y filamentos solares que pueden derivar en CMEs',
  'Estimación de la temperatura y densidad del plasma coronal',
  'Apoyo a pronósticos de actividad solar y clima espacial',
]

const IMPACTS = [
  'Erupciones solares que causan apagones de radio (Radio Blackouts) en la cara iluminada de la Tierra',
  'Eyecciones de masa coronal (CMEs) originadas en regiones activas observadas por SUVI',
  'Corrientes de viento solar de alta velocidad desde hoyos coronales que generan tormentas geomagnéticas',
  'Perturbaciones ionosféricas que afectan sistemas de navegación GPS y comunicaciones',
  'Aumento de radiación en la magnetósfera por partículas energéticas asociadas a erupciones',
  'Impacto en operaciones de satélites por expansión atmosférica durante tormentas geomagnéticas',
  'Degradación de señales HF en rutas de aviación por absorción ionosférica',
]

export function SUVIClient() {
  const [wavelength, setWavelength] = useState<Wavelength>('171')

  const { data: frames, isLoading, isError } = useAutoRefresh<SuviFrame[]>({
    queryKey: ['suvi', wavelength],
    fetcher: () => getSuviFrames(wavelength) as Promise<SuviFrame[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            SUVI — Ultravioleta Solar
          </h1>
          <DataAge timestamp={frames?.[frames.length - 1]?.time_tag} />
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Imágenes de la corona solar · GOES-19 · 5 longitudes de onda EUV · Actualización cada 5 min
        </p>
      </div>

      {/* Wavelength tabs */}
      <div className="flex gap-1 rounded-md border border-border bg-background-secondary p-0.5 flex-wrap">
        {WAVELENGTH_TABS.map((w) => (
          <button
            key={w.id}
            onClick={() => setWavelength(w.id)}
            className={cn(
              'rounded px-2.5 py-1 text-2xs font-medium transition-colors',
              wavelength === w.id
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* Animation player */}
      <div className="card relative overflow-hidden">
        {isLoading && !frames && (
          <LoadingMessage message="Cargando imágenes SUVI..." />
        )}
        {isError && (
          <ErrorMessage 
            message="Error al cargar imágenes SUVI" 
            description="No se pudo obtener la lista de imágenes por el momento."
          />
        )}
        {frames && (
          frames.length > 0 ? (
            <SuviPlayer frames={frames} />
          ) : (
            <EmptyMessage 
              message="No hay imágenes SUVI disponibles" 
              description="Es posible que las imágenes más recientes no estén disponibles temporalmente."
            />
          )
        )}
      </div>

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Detalles */}
      <SectionDetails>
        <p>
          El instrumento SUVI (Solar Ultraviolet Imager) a bordo de GOES captura imágenes del Sol completo en seis canales del ultravioleta extremo (EUV). Cada canal está sintonizado a una longitud de onda específica que resalta diferentes temperaturas y estructuras de la atmósfera solar.
        </p>
        <p>
          Los canales disponibles son: 94 Angstroms (regiones de llamarada, ~6.3 MK), 131 Angstroms (corona activa y llamaradas, ~0.4 y 10 MK), 171 Angstroms (corona quieta y bucles coronales, ~0.6 MK), 195 Angstroms (corona y transición, ~1.2 MK), 284 Angstroms (corona activa, ~2.0 MK) y 304 Angstroms (cromosfera y región de transición, ~0.05 MK).
        </p>
        <p>
          SUVI reemplaza al instrumento SXI de satélites GOES anteriores con mayor resolución espacial y temporal. Las imágenes se utilizan para monitorear la actividad solar incluyendo fulguraciones, agujeros coronales, filamentos y prominencias. La cadencia típica es de una imagen cada 4 minutos por canal.
        </p>
      </SectionDetails>
    </div>
  )
}

// ───────────────────────────────────────────────
// Internal animation player
// ───────────────────────────────────────────────

function SuviPlayer({ frames }: { frames: SuviFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<SuviFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3) // default 4 fps
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const imgRef = useRef<HTMLImageElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = activeFrames.length
  const current = activeFrames[Math.min(idx, Math.max(0, total - 1))]

  // Reset when frames change (new wavelength)
  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setLoaded(false)
    setLoadError(false)
    setLoadProgress(0)
    setActiveFrames([])
  }, [frames])

  // Preload frames in batches, filter failures, then auto-play
  useEffect(() => {
    let cancelled = false
    const BATCH = 8
    const ok: (SuviFrame | null)[] = new Array(frames.length).fill(null)
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
            img.src = proxyImg(f.url)
          }))
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is SuviFrame => f !== null)
        if (valid.length > 0) {
          setActiveFrames(valid)
          setLoaded(true)
          setPlaying(true)
        } else {
          setLoadError(true)
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
        <PreloadProgress progress={loadProgress} />
      )}

      {loaded && loadError && (
        <ErrorMessage 
          message="No se pudieron cargar las imágenes" 
          description="Hubo un problema al descargar los cuadros de la animación."
        />
      )}

      {loaded && !loadError && current && (
        <>
      {/* Image */}
      <div className="relative mx-auto bg-black" style={{ maxWidth: 600 }}>
        <img
          ref={imgRef}
          src={proxyImg(current.url)}
          alt="SUVI frame"
          className="h-auto w-full"
          draggable={false}
        />
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
