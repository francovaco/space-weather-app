'use client'
// ============================================================
// src/components/instruments/XRayFluxClient.tsx
// Interactive GOES X-Ray Flux chart with auto-refresh
// ============================================================
import { useState } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getXRayFluxData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange } from '@/types/swpc'

interface XRaySample {
  time_tag: string
  satellite: number
  flux: number
  observed_flux: number
  electron_correction: number
  electron_contaminaton: boolean
  energy: string
}

const USAGE = [
  'Monitoreo continuo de la actividad solar en rayos X blandos',
  'Clasificación de erupciones solares según escala GOES (A, B, C, M, X)',
  'Emisión de alertas por erupciones solares de clase M y X',
  'Indicador primario para pronóstico de tormentas de radiación solar',
  'Entrada para modelos de propagación ionosférica y absorción HF (D-RAP)',
  'Evaluación del impacto solar sobre sistemas de navegación GNSS',
  'Seguimiento de la evolución temporal de regiones activas en el disco solar',
]

const IMPACTS = [
  'Erupciones de clase M/X causan apagones de radio HF en el lado diurno de la Tierra',
  'Degradación de señales GPS y GNSS durante erupciones solares intensas',
  'Absorción de onda corta (SWF) que afecta comunicaciones aeronáuticas transoceánicas',
  'Aumento súbito de ionización en la región D de la ionósfera',
  'Posible generación de eventos de protones solares (SPE) tras erupciones clase X',
  'Interferencia en sistemas de radar y vigilancia durante erupciones intensas',
  'Riesgo de eyecciones de masa coronal (CME) asociadas a erupciones X',
  'Impacto en operaciones de lanzamiento espacial por condiciones de radiación elevada',
]

// X-ray flare class thresholds (W/m²) for 0.1–0.8 nm band
const FLARE_CLASSES = [
  { value: 1e-4, label: 'X' },
  { value: 1e-5, label: 'M' },
  { value: 1e-6, label: 'C' },
  { value: 1e-7, label: 'B' },
  { value: 1e-8, label: 'A' },
]

export function XRayFluxClient() {
  const [range, setRange] = useState<TimeRange>('6h')

  const { data: rawData, isLoading, isError } = useAutoRefresh<XRaySample[]>({
    queryKey: ['xray-flux', range],
    fetcher: () => getXRayFluxData(timeRangeToParam(range)) as Promise<XRaySample[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  // Separate short and long wavelength bands
  const shortWave = rawData?.filter((d) => d.energy === '0.05-0.4nm') ?? []
  const longWave = rawData?.filter((d) => d.energy === '0.1-0.8nm') ?? []

  const plotData: Plotly.Data[] = [
    {
      x: longWave.map((d) => d.time_tag),
      y: longWave.map((d) => d.flux),
      type: 'scattergl' as const,
      mode: 'lines' as const,
      name: '0.1–0.8 nm (Onda larga)',
      line: { color: '#ef4444', width: 1.5 },
      hovertemplate: '%{y:.2e} W/m²<extra>0.1–0.8 nm</extra>',
    },
    {
      x: shortWave.map((d) => d.time_tag),
      y: shortWave.map((d) => d.flux),
      type: 'scattergl' as const,
      mode: 'lines' as const,
      name: '0.05–0.4 nm (Onda corta)',
      line: { color: '#3b82f6', width: 1.5 },
      hovertemplate: '%{y:.2e} W/m²<extra>0.05–0.4 nm</extra>',
    },
  ]

  // Flare class annotation lines on the right Y axis
  const shapes: Partial<Plotly.Shape>[] = FLARE_CLASSES.map((fc) => ({
    type: 'line',
    xref: 'paper',
    yref: 'y',
    x0: 1,
    x1: 1.01,
    y0: fc.value,
    y1: fc.value,
    line: { color: '#475569', width: 1 },
  }))

  const annotations: Partial<Plotly.Annotations>[] = FLARE_CLASSES.map((fc) => ({
    xref: 'paper',
    yref: 'y',
    x: 1.02,
    y: Math.log10(fc.value),
    text: fc.label,
    showarrow: false,
    font: { size: 12, color: '#94a3b8', family: 'JetBrains Mono, monospace' },
    xanchor: 'left' as const,
    yanchor: 'middle' as const,
  }))

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: range,
    title: {
      text: 'GOES Flujo de Rayos X',
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
      title: { text: 'W/m²', font: { size: 12, color: '#64748b' }, standoff: 5 },
      type: 'log',
      range: [-9, -2],
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
    margin: { l: 65, r: 40, t: 40, b: 100 },
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
      {/* Header + range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Flujo de Rayos X Solar
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            GOES · Onda corta y onda larga · Actualización cada 1 minuto
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
              Cargando datos de rayos X…
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs text-red-400">Error al cargar datos de rayos X</span>
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

      {/* Detalles */}
      <SectionDetails>
        <p>
          El sensor XRS (X-Ray Sensor) del satélite GOES mide el flujo de rayos X solares en dos bandas de longitud de onda: 0.05–0.4 nm (banda corta) y 0.1–0.8 nm (banda larga). Estos datos se utilizan para clasificar las fulguraciones solares en las escalas estándar A, B, C, M y X.
        </p>
        <p>
          Las fulguraciones solares de clase M y X son las más significativas para el clima espacial, ya que pueden provocar apagones de radio de alta frecuencia (HF) en el lado diurno de la Tierra en cuestión de minutos. La escala es logarítmica: cada letra representa un aumento de 10 veces en la intensidad del pico de flujo.
        </p>
        <p>
          El flujo de rayos X de la banda larga (1–8 Å) es el principal indicador utilizado por el SWPC para emitir alertas de fulguraciones. Un evento de clase M5 o superior generalmente dispara una alerta de apagón de radio R1–R2, mientras que un evento X10+ puede producir un apagón R4–R5.
        </p>
      </SectionDetails>
    </div>
  )
}
