'use client'
// ============================================================
// src/components/instruments/ElectronFluxClient.tsx
// Interactive GOES Electron Flux chart with auto-refresh
// ============================================================
import { useState } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getElectronFluxData, timeRangeToParam } from '@/lib/swpc-api'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import type { TimeRange } from '@/types/swpc'

interface ElectronSample {
  time_tag: string
  satellite: number
  flux: number
  energy: string
}

const USAGE = [
  'Monitoreo de la intensidad del cinturón exterior de radiación de electrones en órbita geoestacionaria',
  'Evaluación del riesgo de carga interna (internal charging) en componentes de satélites',
  'Emisión de alertas cuando el flujo de electrones >2 MeV supera 1000 pfu',
  'Indicador de inyección de electrones en la magnetósfera durante subtormentas',
  'Seguimiento de la población de electrones relativistas atrapados en el cinturón de Van Allen externo',
  'Entrada para modelos de pronóstico de electrones relativistas (REFM)',
  'Evaluación de condiciones de radiación para operaciones de satélites geoestacionarios',
]

const IMPACTS = [
  'Carga interna de satélites por electrones energéticos que penetran blindajes y acumulan carga en componentes',
  'Descargas electrostáticas que causan anomalías y fallos en sistemas electrónicos de satélites',
  'Degradación acelerada de paneles solares y componentes ópticos en satélites geoestacionarios',
  'Aumento de tasa de errores en memorias de a bordo (SEU) por partículas energéticas',
  'Riesgo de pérdida temporal o permanente de funcionalidad en satélites de comunicaciones',
  'Interferencia en sensores de actitud y sistemas de navegación satelital',
  'Impacto en satélites de observación terrestre y meteorológicos en órbita alta',
  'Necesidad de modos de protección (safe mode) en satélites durante eventos extremos',
]

// Alert threshold: 1000 pfu for >=2 MeV electrons (SWPC standard)
const ALERT_THRESHOLD = 1000

export function ElectronFluxClient() {
  const [range, setRange] = useState<TimeRange>('1d')

  const { data: rawData, isLoading, isError } = useAutoRefresh<ElectronSample[]>({
    queryKey: ['electron-flux', range],
    fetcher: () => getElectronFluxData(timeRangeToParam(range)) as Promise<ElectronSample[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  // Separate by energy band
  const ge2 = rawData?.filter((d) => d.energy === '>=2 MeV') ?? []

  const plotData: Plotly.Data[] = []

  if (ge2.length > 0) {
    plotData.push({
      x: ge2.map((d) => d.time_tag),
      y: ge2.map((d) => d.flux),
      type: 'scattergl',
      mode: 'lines',
      name: '≥2 MeV',
      line: { color: '#ef4444', width: 1.5 },
      hovertemplate: '%{y:.1f} pfu<extra>≥2 MeV</extra>',
    })
  }

  // Alert threshold line
  const thresholdShape: Partial<Plotly.Shape> = {
    type: 'line',
    xref: 'paper',
    yref: 'y',
    x0: 0,
    x1: 1,
    y0: ALERT_THRESHOLD,
    y1: ALERT_THRESHOLD,
    line: { color: '#f59e0b', width: 1.5, dash: 'dash' },
  }

  const thresholdAnnotation: Partial<Plotly.Annotations> = {
    xref: 'paper',
    yref: 'y',
    x: 0,
    y: 3,
    text: 'Umbral de alerta SWPC (1000 pfu)',
    showarrow: false,
    font: { size: 11, color: '#f59e0b' },
    xanchor: 'left',
    yanchor: 'bottom',
    yshift: 2,
  }

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: range,
    title: {
      text: 'GOES-19 Flujo Integral de Electrones',
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
      title: { text: 'Electrones (pfu)', font: { size: 12, color: '#64748b' }, standoff: 5 },
      type: 'log',
      dtick: 1,
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
    shapes: [thresholdShape],
    annotations: [thresholdAnnotation],
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
            Flujo de Electrones
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            GOES-19 · Flujo integral de electrones ≥2 MeV · Actualización cada 5 min
          </p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Chart */}
      <div className="card relative overflow-hidden">
        {isLoading && !rawData && (
          <LoadingMessage message="Cargando datos de flujo de electrones…" />
        )}
        {isError && (
          <ErrorMessage 
            message="Error al cargar datos" 
            description="No se pudieron obtener las lecturas de flujo de electrones de GOES."
          />
        )}
        {rawData && rawData.length === 0 && (
          <EmptyMessage message="No hay datos disponibles para este rango." />
        )}
        {rawData && rawData.length > 0 && (
          <PlotlyChart
            data={plotData}
            layout={layout}
            config={config}
            className="min-h-[420px]"
          />
        )}
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

      {/* Detalles */}
      <SectionDetails>
        <p>
          El instrumento SEISS (Space Environment In-Situ Suite) a bordo de GOES mide el flujo de electrones energéticos en la órbita geoestacionaria. Los datos de flujo de electrones con energía ≥2 MeV son particularmente importantes para evaluar el riesgo de carga electrostática en satélites.
        </p>
        <p>
          Niveles elevados de electrones energéticos (conocidos como «electrones asesinos») pueden penetrar el blindaje de los satélites y causar acumulación de carga interna, lo que potencialmente provoca descargas electrostáticas y daños a los componentes electrónicos. El umbral de alerta se establece en 1000 pfu (unidades de flujo de partículas).
        </p>
        <p>
          Las tormentas de electrones relativistas suelen producirse 1–3 días después de la llegada de corrientes de viento solar de alta velocidad provenientes de agujeros coronales. Estas tormentas pueden persistir durante varios días y representan un riesgo acumulativo para la electrónica de los satélites.
        </p>
      </SectionDetails>
    </div>
  )
}
