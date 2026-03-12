'use client'
// ============================================================
// src/components/instruments/ElectronFluxClient.tsx
// Interactive GOES Electron Flux chart with auto-refresh
// ============================================================
import { useState, useMemo } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { NormalizeToggle, normalizeSeries } from '@/components/ui/NormalizeToggle'
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

const ALERT_THRESHOLD = 1000

export function ElectronFluxClient() {
  const [range, setRange] = useState<TimeRange>('1d')
  const [normalize, setNormalize] = useState(false)

  const { data: rawData, isLoading, isError } = useAutoRefresh<ElectronSample[]>({
    queryKey: ['electron-flux', range],
    fetcher: () => getElectronFluxData(timeRangeToParam(range)) as Promise<ElectronSample[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const ge2 = useMemo(() => rawData?.filter((d) => d.energy === '>=2 MeV') ?? [], [rawData])

  const plotData = useMemo((): Plotly.Data[] => {
    if (ge2.length === 0) return []
    const yValues = normalize ? normalizeSeries(ge2.map(d => d.flux)) : ge2.map(d => d.flux)
    return [{
      x: ge2.map((d) => d.time_tag),
      y: yValues,
      type: 'scattergl',
      mode: 'lines',
      name: '≥2 MeV',
      line: { color: '#ef4444', width: 1.5 },
      hovertemplate: normalize ? '%{y:.1f}%<extra>≥2 MeV</extra>' : '%{y:.1f} pfu<extra>≥2 MeV</extra>',
    }]
  }, [ge2, normalize])

  // CRITICAL FIX: Plotly expects log10 coordinates for annotations on 'log' axes
  const thresholdY = useMemo(() => {
    if (normalize) {
      if (ge2.length === 0) return 0
      const vals = ge2.map(d => d.flux).filter(v => v !== null && !isNaN(v))
      const min = Math.min(...vals)
      const max = Math.max(...vals)
      if (max === min) return 50
      return ((ALERT_THRESHOLD - min) / (max - min)) * 100
    }
    return Math.log10(ALERT_THRESHOLD) // log10(1000) = 3
  }, [ge2, normalize])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `${range}-${normalize}`,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: normalize ? 'Flujo Relativo (%)' : 'Electrones (pfu)', font: { size: 11, color: '#64748b' } },
      type: normalize ? 'linear' : 'log',
      range: normalize ? [0, 105] : undefined,
      dtick: normalize ? 25 : 1,
      automargin: true,
    },
    margin: { l: 60, r: 40, t: 40, b: 65 },
    hovermode: 'x unified',
    shapes: (normalize && (thresholdY < 0 || thresholdY > 100)) ? [] : [
      {
        type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1,
        y0: thresholdY, y1: thresholdY,
        line: { color: '#f59e0b', width: 1.5, dash: 'dash' },
      }
    ],
    annotations: (normalize && (thresholdY < 0 || thresholdY > 100)) ? [] : [
      {
        xref: 'paper', yref: 'y', x: 0, y: thresholdY,
        text: `Umbral alerta (${ALERT_THRESHOLD} pfu)`,
        showarrow: false,
        font: { size: 10, color: '#f59e0b' },
        xanchor: 'left', yanchor: 'bottom', yshift: 4,
      }
    ],
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Flujo de Electrones</h1>
          <p className="mt-1 text-xs text-text-muted">GOES-19 · Flujo integral ≥2 MeV · Actualización cada 5 min</p>
        </div>
        <div className="flex items-center gap-3">
          <NormalizeToggle normalize={normalize} onToggle={setNormalize} />
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && !rawData && <LoadingMessage message="Cargando datos..." />}
        {isError && <ErrorMessage message="Error al cargar datos" />}
        {rawData && rawData.length === 0 && <EmptyMessage message="No hay datos disponibles." />}
        {rawData && rawData.length > 0 && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

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
