'use client'
// ============================================================
// src/components/instruments/SpaceWeatherOverviewClient.tsx
// NOAA Space Weather Overview — 3-day quick-look GIF
// ============================================================
import { useState, useEffect } from 'react'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { RefreshCw } from 'lucide-react'

const OVERVIEW_URL = 'https://services.swpc.noaa.gov/images/swx-overview-large.gif'

function proxyUrl(url: string, bust: number) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}&_=${bust}`
}

export function SpaceWeatherOverviewClient() {
  const [bust, setBust] = useState(() => Date.now())
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())
  const [loading, setLoading] = useState(true)

  // Refresh every 10 minutes
  useEffect(() => {
    const id = setInterval(() => {
      setBust(Date.now())
      setLastUpdated(new Date())
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = () => {
    setBust(Date.now())
    setLastUpdated(new Date())
    setLoading(true)
  }

  const fmtTime = (d: Date) =>
    d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Panorama del Clima Espacial
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Space Weather Overview · Flujo X, Protones y Kp — últimas 72 horas · NOAA/SWPC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data text-2xs text-text-muted">
            {fmtTime(lastUpdated)}
          </span>
          <button
            onClick={handleRefresh}
            className="ctrl-btn"
            title="Actualizar imagen"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Overview image */}
      <div className="card overflow-hidden p-0">
        <div className="relative flex items-center justify-center bg-black">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background-secondary">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
                Cargando panorama…
              </div>
            </div>
          )}
          <img
            key={bust}
            src={proxyUrl(OVERVIEW_URL, bust)}
            alt="Space Weather Overview — Solar X-ray, Proton Flux, Kp Index"
            className="mx-auto max-h-[75vh] w-auto object-contain"
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        </div>
      </div>

      {/* Subplot guide */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            title: 'Flujo de Rayos X Solar',
            color: 'text-accent-cyan',
            desc: 'Mide la emisión de rayos X del Sol en dos bandas (0.05–0.4 nm y 0.1–0.8 nm). Los picos indican fulguraciones solares clasificadas como A, B, C, M o X según su intensidad.',
          },
          {
            title: 'Flujo de Protones Solares',
            color: 'text-yellow-400',
            desc: 'Partículas energéticas (protones ≥10 MeV) emitidas durante eventos solares. Valores ≥ 10 pfu activan alertas de tormenta de radiación solar (escala S1–S5).',
          },
          {
            title: 'Índice Kp Planetario',
            color: 'text-green-400',
            desc: 'Índice global de perturbación geomagnética (0–9) derivado de una red de magnetómetros terrestres. Kp ≥ 5 indica tormenta geomagnética; Kp ≥ 7 es tormenta fuerte (G3+).',
          },
        ].map(({ title, color, desc }) => (
          <div key={title} className="card space-y-1">
            <h3 className={`font-display text-xs font-bold uppercase tracking-wider ${color}`}>
              {title}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <SectionDetails>
        <p>
          El Panorama del Clima Espacial es una vista rápida de los tres indicadores más importantes del
          estado del clima espacial en las últimas 72 horas. La imagen es generada continuamente por el
          Centro de Predicción del Clima Espacial (SWPC) de la NOAA y se actualiza de forma automática.
        </p>
        <p>
          Las franjas sombreadas en el panel del índice Kp representan los umbrales de las escalas NOAA:
          verde (Kp 0–4, condiciones tranquilas), amarillo (Kp 5, G1), naranja (Kp 6, G2), rojo (Kp 7–8,
          G3–G4) y rojo oscuro (Kp 9, G5). Los eventos de flujo X y protones se correlacionan
          frecuentemente con eyecciones de masa coronal (CME) y pueden preceder perturbaciones
          geomagnéticas por 1–3 días.
        </p>
      </SectionDetails>
    </div>
  )
}
