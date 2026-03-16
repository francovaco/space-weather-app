'use client'
// ============================================================
// src/components/instruments/GeoMagPerturbationsClient.tsx
// Geospace Ground Magnetic Perturbation Maps — 3 views
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getGeoMagPerturbationFrames } from '@/lib/swpc-api'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { DataAge } from '@/components/ui/DataAge'
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeoMagFrame {
  url: string
  time_tag: string
}

type GeoMagView = 'global' | 'polar-lt'

const VIEW_TABS: { key: GeoMagView; label: string; desc: string }[] = [
  { key: 'global', label: 'Global', desc: 'Perturbaciones magnéticas — Vista global' },
  { key: 'polar-lt', label: 'Polar', desc: 'Perturbaciones magnéticas — Vista polar' },
]

const USAGE = [
  'Monitoreo en tiempo real de perturbaciones del campo magnético terrestre durante tormentas geomagnéticas',
  'Evaluación de la intensidad de corrientes telúricas inducidas que afectan infraestructura eléctrica',
  'Identificación de regiones geográficas con mayor exposición a perturbaciones magnéticas severas',
  'Apoyo a operaciones de exploración geofísica sensibles al campo magnético de fondo',
  'Validación y verificación de modelos de tormenta geomagnética (Dst, SYM-H, AE)',
  'Referencia para operadores de redes eléctricas en latitudes altas durante eventos Kp ≥ 5',
  'Estudio de la propagación de corrientes de anillo y auroral electrojet durante fases de tormenta',
]

const IMPACTS = [
  'Inducción de corrientes geomagnéticamente inducidas (GIC) en redes eléctricas, gasoductos y cables submarinos',
  'Saturación de transformadores de alta tensión y posibles apagones en regiones de alta latitud',
  'Errores en sistemas de navegación por brújula y giroscopios magnéticos en aeronaves y buques',
  'Interferencia con sistemas de detección magnética de submarinos y levantamientos geofísicos',
  'Degradación de la precisión de sistemas de posicionamiento que dependen de modelos del campo magnético (IGRF)',
  'Daño potencial a infraestructuras de tuberías por aceleración de corrosión electrolítica',
  'Perturbación de sistemas de señalización ferroviaria que usan circuitos de vía con referencia magnética',
]

// ───────────────────────────────────────────────────────────────
// Delta B color detection via HSV hue mapping.
// The SWPC geospace colormap rotates: cyan (~185°) → green (120°) → yellow (60°) → orange (30°) → red (0°)
// This is robust against any desaturation/muting in the rendered images.
// ───────────────────────────────────────────────────────────────
function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }
  return { h: h * 360, s: max === 0 ? 0 : d / max, v: max }
}

function matchGeoMagValue(r: number, g: number, b: number): number | null {
  // White/near-white = map background
  if (r > 230 && g > 230 && b > 230) return null
  // Black = borders/lines
  if (r < 20 && g < 20 && b < 20) return null

  const { h, s, v } = rgbToHsv(r, g, b)
  // Low saturation = land fill, ocean fill, graticules — ignore
  if (s < 0.12) return null
  // Very dark = shadow/border remnant
  if (v < 0.25) return null
  // Hues above ~210° = blue/purple = not in this colormap
  if (h > 210) return null

  // Piecewise linear: hue 185→120→60→30→0 maps to nT 0→100→200→300→400
  const STOPS: [number, number][] = [
    [185, 0],
    [120, 100],
    [60, 200],
    [30, 300],
    [0, 400],
  ]
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [h0, v0] = STOPS[i]
    const [h1, v1] = STOPS[i + 1]
    if (h <= h0 && h >= h1) {
      const t = (h0 - h) / (h0 - h1)
      return Math.round(v0 + t * (v1 - v0))
    }
  }
  // Hue between 185–210 = very pale cyan border → treat as ~0
  if (h > 185 && h <= 210) return 0
  return null
}

function getContainedBounds(cW: number, cH: number, iW: number, iH: number) {
  const cAR = cW / cH
  const iAR = iW / iH
  let rW: number, rH: number, oX: number, oY: number
  if (iAR > cAR) {
    rW = cW
    rH = cW / iAR
    oX = 0
    oY = (cH - rH) / 2
  } else {
    rH = cH
    rW = cH * iAR
    oX = (cW - rW) / 2
    oY = 0
  }
  return { rW, rH, oX, oY }
}

function proxyUrl(url: string) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}`
}

// ───────────────────────────────────────────────────────────────
// Main exported component
// ───────────────────────────────────────────────────────────────

export function GeoMagPerturbationsClient() {
  const [view, setView] = useState<GeoMagView>('global')
  const activeTab = VIEW_TABS.find((t) => t.key === view)!

  const { data: globalFrames } = useAutoRefresh<GeoMagFrame[]>({
    queryKey: ['geo-mag-perturbations', 'global', 'header'],
    fetcher: () => getGeoMagPerturbationFrames('global') as Promise<GeoMagFrame[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Perturbaciones Magnéticas Terrestres
          </h1>
          <DataAge timestamp={globalFrames?.[globalFrames.length - 1]?.time_tag} />
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Geospace Ground Magnetic Perturbation Maps · delta B (nT) · Actualización cada 5 minutos
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
                : 'text-text-muted hover:text-text-primary hover:bg-border/40',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Animation panel for current view */}
      <GeoMagPanel key={view} view={view} desc={activeTab.desc} />

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Detalles */}
      <SectionDetails>
        <p>
          Los mapas de perturbaciones magnéticas terrestres del SWPC/NOAA muestran la variación del campo
          magnético en superficie (delta B, en nanoteslas) generada por corrientes ionosféricas y de magnetósfera
          durante eventos de clima espacial. Los datos provienen de una red de magnetómetros terrestres operados
          por diversas instituciones geofísicas a nivel mundial.
        </p>
        <p>
          El parámetro delta B representa la diferencia vectorial entre el campo magnético observado y el campo
          de referencia del modelo IGRF (International Geomagnetic Reference Field). Valores por encima de
          100 nT indican actividad moderada; valores superiores a 300-400 nT corresponden a tormentas
          geomagnéticas intensas (G3-G5) capaces de inducir corrientes significativas en infraestructuras
          eléctricas y de transporte.
        </p>
        <p>
          Las vistas polares norte y sur resaltan las perturbaciones en los electrojets aurorales (latitudes
          60°-80°), donde las corrientes alcanzan su máxima intensidad durante tormentas. La vista global
          permite observar la distribución planetaria y el avance de la perturbación magnética en tiempo real.
          Las animaciones cubren las últimas ~24 horas con resolución temporal de 5 minutos.
        </p>
        <p>
          Para interpretar la escala de colores: cian pálido ≈ 0 nT (sin perturbación), verde ≈ 100 nT
          (actividad leve), amarillo ≈ 200 nT (moderada), naranja-rojo ≈ 300 nT (intensa), rojo oscuro
          ≥ 400 nT (tormenta severa). Al pausar la animación, el cursor sobre la imagen muestra el valor
          estimado de delta B en la posición del puntero.
        </p>
      </SectionDetails>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Panel per view (fetches + renders player)
// ───────────────────────────────────────────────────────────────

function GeoMagPanel({ view, desc }: { view: GeoMagView; desc: string }) {
  const { data: frames, isLoading, isError } = useAutoRefresh<GeoMagFrame[]>({
    queryKey: ['geo-mag-perturbations', view],
    fetcher: () => getGeoMagPerturbationFrames(view) as Promise<GeoMagFrame[]>,
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
          <span className="text-xs text-red-400">Error al cargar perturbaciones magnéticas</span>
        </div>
      )}
      {frames && frames.length > 0 && <GeoMagPlayer frames={frames} />}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Internal animation player with hover color-picking
// ───────────────────────────────────────────────────────────────

function GeoMagPlayer({ frames }: { frames: GeoMagFrame[] }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeFrames, setActiveFrames] = useState<GeoMagFrame[]>([])
  const FPS_STEPS = [1, 2, 3, 4, 5, 8, 10, 15, 20]
  const [fpsIdx, setFpsIdx] = useState(3)
  const speedMs = Math.round(1000 / FPS_STEPS[fpsIdx])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hover color-picking state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgContRef = useRef<HTMLDivElement>(null)
  const canvasReady = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{
    x: number
    y: number
    value: number
    rgb: string
  } | null>(null)

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
    const ok: (GeoMagFrame | null)[] = new Array(frames.length).fill(null)
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
                  ok[i + bi] = null
                  doneCount++
                  if (!cancelled) setLoadProgress(Math.round((doneCount / frames.length) * 100))
                  resolve()
                }
                img.src = proxyUrl(f.url)
              }),
          ),
        )
      }

      if (!cancelled) {
        const valid = ok.filter((f): f is GeoMagFrame => f !== null)
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

  // Draw frame to hidden canvas for pixel sampling when paused
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
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        canvasReady.current = true
      }
    }
    img.src = proxyUrl(current.url)
  }, [playing, current])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (playing || !canvasReady.current) {
        setHoverInfo(null)
        return
      }
      const canvas = canvasRef.current
      const container = imgContRef.current
      if (!canvas || !container || canvas.width === 0) {
        setHoverInfo(null)
        return
      }
      const rect = container.getBoundingClientRect()
      const { rW, rH, oX, oY } = getContainedBounds(
        rect.width,
        rect.height,
        canvas.width,
        canvas.height,
      )
      const mx = e.clientX - rect.left - oX
      const my = e.clientY - rect.top - oY
      if (mx < 0 || my < 0 || mx > rW || my > rH) {
        setHoverInfo(null)
        return
      }
      const imgX = Math.min(canvas.width - 1, Math.round((mx / rW) * canvas.width))
      const imgY = Math.min(canvas.height - 1, Math.round((my / rH) * canvas.height))
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      const p = ctx.getImageData(imgX, imgY, 1, 1).data
      const value = matchGeoMagValue(p[0], p[1], p[2])
      if (value === null) {
        setHoverInfo(null)
        return
      }
      setHoverInfo({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        value,
        rgb: `rgb(${p[0]},${p[1]},${p[2]})`,
      })
    },
    [playing],
  )

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
        <div className="flex flex-col items-center justify-center gap-3 py-16">
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
          {/* Image area with hover */}
          <div
            ref={imgContRef}
            className="relative mx-auto flex max-h-[60vh] items-center justify-center bg-black"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: !playing ? 'crosshair' : undefined }}
          >
            <canvas ref={canvasRef} className="hidden" />
            <img
              src={proxyUrl(current.url)}
              alt="Perturbación magnética terrestre"
              className="max-h-[60vh] w-auto object-contain"
              draggable={false}
            />

            {/* Timestamp overlay */}
            <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 font-data text-2xs text-text-secondary">
              {fmtTime(current.time_tag)}
            </div>

            {/* Color scale legend */}
            <div className="absolute bottom-2 left-2 flex flex-col items-start gap-0.5 rounded bg-black/70 px-2 py-1.5">
              <span className="font-data text-2xs text-text-muted">delta B (nT)</span>
              <div
                className="h-2 w-20 rounded-sm"
                style={{
                  background:
                    'linear-gradient(to right, rgb(176,232,240), rgb(0,200,0), rgb(255,220,0), rgb(255,50,0), rgb(90,0,0))',
                }}
              />
              <div className="flex w-20 justify-between font-data text-2xs text-text-muted">
                <span>0</span>
                <span>200</span>
                <span>400</span>
              </div>
            </div>

            {/* Hover tooltip */}
            {hoverInfo && !playing && (
              <div
                className="pointer-events-none absolute z-20 rounded border border-white/20 bg-black/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                style={{
                  left: Math.min(
                    hoverInfo.x + 14,
                    (imgContRef.current?.clientWidth ?? 300) - 150,
                  ),
                  top: Math.max(hoverInfo.y - 44, 4),
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded border border-white/30"
                    style={{ backgroundColor: hoverInfo.rgb }}
                  />
                  <span className="whitespace-nowrap font-data text-xs text-white">
                    ~{hoverInfo.value} nT
                  </span>
                </div>
                <div className="mt-0.5 font-data text-2xs text-text-muted">delta B</div>
              </div>
            )}
          </div>

          {/* Hover hint */}
          {!playing && (
            <p className="text-center font-data text-2xs text-text-dim">
              Pausa activa · mueve el cursor sobre la imagen para ver delta B
            </p>
          )}

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
                a.download = current.url.split('/').pop() || 'geo-mag-frame.png'
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
