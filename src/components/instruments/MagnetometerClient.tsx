'use client'
// ============================================================
// src/components/instruments/MagnetometerClient.tsx
// Interactive GOES Magnetometer chart with auto-refresh
// ============================================================
import { useState } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getMagnetometerData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange } from '@/types/swpc'
import { cn } from '@/lib/utils'

interface MagSample {
  time_tag: string
  satellite: number
  He: number | null
  Hp: number | null
  Hn: number | null
  total: number | null
  arcjet_flag: boolean
}

const USAGE = [
  'Monitoreo en tiempo real de componentes del campo geomagnético (Hp, He, Hn) en órbita geoestacionaria',
  'Interpretación de mediciones de partículas energéticas del GOES',
  'Detección de inicio de tormentas geomagnéticas (Sudden Storm Commencement)',
  'Construcción de modelos de campo magnético terrestre',
  'Identificación de acumulación y liberación de energía en la magnetósfera durante tormentas y subtormentas',
  'Indicación de cuando el viento solar ha empujado la magnetopausa dentro de la órbita geoestacionaria',
  'Validación de modelos de gran escala del acoplamiento magnetósfera-ionósfera',
  'Apoyo a decisiones de lanzamiento de cohetes sonda de investigación',
]

const IMPACTS = [
  'Tormentas geomagnéticas que afectan redes de transmisión eléctrica causando corrientes inducidas geomagnéticamente (GIC)',
  'Perturbaciones en sistemas de navegación GPS y posicionamiento de precisión',
  'Interferencia en comunicaciones HF de radio de alta frecuencia',
  'Degradación de comunicaciones satelitales por perturbaciones ionosféricas',
  'Aumento del arrastre en satélites de órbita baja (LEO) por expansión atmosférica',
  'Riesgo para operaciones de naves espaciales en órbita geoestacionaria por acumulación de carga eléctrica',
  'Interrupciones en señales de aviación durante condiciones geo-magnéticas severas',
  'Aumento de radiación en rutas polares de aviación durante eventos extremos',
]

// Components traces with NOAA-style colors
const TRACES = [
  { key: 'Hp' as const, label: 'Hp (paralelo al eje de spin)', color: '#ef4444' },  // red
  { key: 'He' as const, label: 'He (radial, hacia afuera)',     color: '#22c55e' },  // green
  { key: 'Hn' as const, label: 'Hn (normal, hacia el este)',    color: '#3b82f6' },  // blue
  { key: 'total' as const, label: 'B Total',                    color: '#a855f7' },  // purple
]

export function MagnetometerClient() {
  const [range, setRange] = useState<TimeRange>('6h')

  const { data: rawData, isLoading, isError } = useAutoRefresh<MagSample[]>({
    queryKey: ['magnetometer', range],
    fetcher: () => getMagnetometerData(timeRangeToParam(range)) as Promise<MagSample[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  // Find arcjet intervals for annotation
  const arcjetIntervals: { start: string; end: string }[] = []
  if (rawData) {
    let inArcjet = false
    let start = ''
    for (const s of rawData) {
      if (s.arcjet_flag && !inArcjet) {
        inArcjet = true
        start = s.time_tag
      } else if (!s.arcjet_flag && inArcjet) {
        inArcjet = false
        arcjetIntervals.push({ start, end: s.time_tag })
      }
    }
    if (inArcjet && rawData.length > 0) {
      arcjetIntervals.push({ start, end: rawData[rawData.length - 1].time_tag })
    }
  }

  const plotData: Plotly.Data[] = rawData
    ? TRACES.map(t => ({
        x: rawData.map(s => s.time_tag),
        y: rawData.map(s => s[t.key]),
        type: 'scattergl' as const,
        mode: 'lines' as const,
        name: t.label,
        line: { color: t.color, width: 1.5 },
        hovertemplate: `%{y:.1f} nT<extra>${t.key}</extra>`,
      }))
    : []

  // Arcjet shapes (gray vertical bands)
  const shapes: Partial<Plotly.Shape>[] = arcjetIntervals.map(a => ({
    type: 'rect',
    xref: 'x',
    yref: 'paper',
    x0: a.start,
    x1: a.end,
    y0: 0,
    y1: 1,
    fillcolor: 'rgba(120,120,120,0.2)',
    line: { width: 0 },
  }))

  // Arcjet annotations
  const annotations: Partial<Plotly.Annotations>[] = arcjetIntervals.flatMap(a => [
    {
      x: a.start,
      y: 1,
      yref: 'paper' as const,
      xref: 'x' as const,
      text: 'Arcjet Start',
      showarrow: true,
      arrowhead: 0,
      ax: 0,
      ay: -25,
      font: { size: 8, color: '#94a3b8' },
    },
    {
      x: a.end,
      y: 1,
      yref: 'paper' as const,
      xref: 'x' as const,
      text: 'Arcjet End',
      showarrow: true,
      arrowhead: 0,
      ax: 0,
      ay: -25,
      font: { size: 8, color: '#94a3b8' },
    },
  ])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: range,
    title: {
      text: `GOES-19 Magnetómetro`,
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
      title: { text: 'nT (nanotesla)', font: { size: 12, color: '#64748b' }, standoff: 5 },
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
    shapes,
    annotations,
  }

  const config: Partial<Plotly.Config> = {
    ...PLOTLY_DEFAULT_CONFIG,
    scrollZoom: true,
  }

  return (
    <div className="space-y-4">
      {/* Header + range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Magnetómetro GOES
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Componentes del campo geomagnético · Hp, He, Hn · Actualización cada 1 min
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
              Cargando datos del magnetómetro…
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs text-red-400">Error al cargar datos del magnetómetro</span>
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
        {/* Last update indicator */}
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
