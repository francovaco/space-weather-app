'use client'
// ============================================================
// src/components/instruments/ProtonFluxClient.tsx
// Interactive GOES Proton Flux chart with auto-refresh
// ============================================================
import { useState } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getProtonFluxData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange } from '@/types/swpc'

interface ProtonSample {
  time_tag: string
  satellite: number
  flux: number
  energy: string
}

const USAGE = [
  'Monitoreo de tormentas de radiación solar por protones energéticos',
  'Emisión de alertas cuando el flujo de protones ≥10 MeV supera 10 pfu (nivel S1)',
  'Evaluación de dosis de radiación para tripulaciones de aviación en rutas polares',
  'Protección de astronautas y misiones espaciales tripuladas ante eventos de protones solares',
  'Entrada para modelos de absorción en la región D de la ionósfera (D-RAP)',
  'Evaluación de riesgo de daño por radiación en componentes electrónicos de satélites',
  'Monitoreo de la actividad solar en conjunción con erupciones solares y CMEs',
]

const IMPACTS = [
  'Tormentas de radiación solar que aumentan la exposición a radiación en vuelos polares',
  'Degradación y fallos en paneles solares de satélites por bombardeo de protones energéticos',
  'Errores en memorias de a bordo (SEU) y latch-up en electrónica de satélites',
  'Absorción de señales HF en las regiones polares (Polar Cap Absorption, PCA)',
  'Interferencia en comunicaciones de radio de alta frecuencia en latitudes altas',
  'Riesgo para la salud de astronautas durante actividades extravehiculares (EVA)',
  'Degradación de sensores ópticos e infrarrojos en satélites de observación',
  'Impacto en operaciones de lanzamiento espacial por niveles elevados de radiación',
]



// Energy bands to display with colors
const ENERGY_BANDS = [
  { energy: '>=10 MeV',  label: '≥10 MeV',  color: '#ef4444' },
  { energy: '>=50 MeV',  label: '≥50 MeV',  color: '#f59e0b' },
  { energy: '>=100 MeV', label: '≥100 MeV', color: '#3b82f6' },
  { energy: '>=500 MeV', label: '≥500 MeV', color: '#a855f7' },
]

export function ProtonFluxClient() {
  const [range, setRange] = useState<TimeRange>('1d')

  const { data: rawData, isLoading, isError } = useAutoRefresh<ProtonSample[]>({
    queryKey: ['proton-flux', range],
    fetcher: () => getProtonFluxData(timeRangeToParam(range)) as Promise<ProtonSample[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const plotData: Plotly.Data[] = rawData
    ? ENERGY_BANDS.map((band) => {
        const filtered = rawData.filter((d) => d.energy === band.energy)
        return {
          x: filtered.map((d) => d.time_tag),
          y: filtered.map((d) => d.flux),
          type: 'scattergl' as const,
          mode: 'lines' as const,
          name: band.label,
          line: { color: band.color, width: 1.5 },
          hovertemplate: `%{y:.2f} pfu<extra>${band.label}</extra>`,
        }
      })
    : []



  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: 'GOES Flujo Integral de Protones',
      font: { size: 14, color: '#e2e8f0', family: 'JetBrains Mono, monospace' },
      x: 0.01,
      xanchor: 'left',
    },
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      title: { text: 'Tiempo Universal (UTC)', font: { size: 12, color: '#64748b' }, standoff: 10 },
      type: 'date',
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Protones (pfu)', font: { size: 12, color: '#64748b' }, standoff: 5 },
      type: 'log',
      range: [-2, 6],
      dtick: 1,
      exponentformat: 'power',
    },
    legend: {
      ...PLOTLY_DARK_LAYOUT.legend,
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.22,
      font: { size: 11, color: '#94a3b8' },
    },
    margin: { l: 65, r: 20, t: 40, b: 100 },
    hovermode: 'x unified',
    shapes: [
      {
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: 10,
        y1: 10,
        line: { color: '#ef4444', width: 1.5, dash: 'dash' },
      },
    ],
    annotations: [
      {
        xref: 'paper',
        yref: 'y',
        x: 0,
        y: 1,
        text: 'Umbral de alerta SWPC 10 MeV',
        showarrow: false,
        font: { size: 11, color: '#ef4444' },
        xanchor: 'left' as const,
        yanchor: 'bottom' as const,
        yshift: 2,
      },
    ],
  }

  const config: Partial<Plotly.Config> = {
    ...PLOTLY_DEFAULT_CONFIG,
    scrollZoom: true,
  }

  return (
    <div className="space-y-4">
      {/* Header + range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Flujo de Protones
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            GOES · Flujo integral de protones en múltiples niveles de energía · Actualización cada 5 min
          </p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Chart */}
      <div className="card relative overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              Cargando datos de flujo de protones…
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs text-red-400">Error al cargar datos de flujo de protones</span>
          </div>
        )}
        {rawData && rawData.length > 0 && (
          <PlotlyChart
            data={plotData}
            layout={layout}
            config={config}
            className="min-h-[420px]"
          />
        )}
        {rawData && rawData.length > 0 && (
          <div className="absolute right-2 top-1 text-[9px] text-text-dim">
            Último dato: {new Date(rawData[rawData.length - 1].time_tag).toLocaleString('es-AR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })} UTC
          </div>
        )}
      </div>

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />
    </div>
  )
}
