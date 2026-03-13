'use client'
// ============================================================
// src/components/instruments/SolarWindClient.tsx
// Interactive Solar Wind chart (Speed & Temperature)
// ============================================================
import { useState } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { NormalizeToggle, normalizeSeries } from '@/components/ui/NormalizeToggle'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { DataAge } from '@/components/ui/DataAge'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getSolarWindFrames } from '@/lib/swpc-api'

const USAGE = [
  'Monitoreo de la velocidad del plasma solar que impacta la magnetósfera',
  'Identificación de corrientes de viento solar de alta velocidad (HSS) de agujeros coronales',
  'Detección de ondas de choque interplanetarias asociadas a CMEs',
  'Predicción del tiempo de llegada de tormentas geomagnéticas',
  'Evaluación de la temperatura del plasma como indicador de estructuras solares',
  'Entrada para modelos de predicción de auroras y actividad geomagnética',
]

const IMPACTS = [
  'Viento solar > 500 km/s puede desencadenar tormentas geomagnéticas menores (G1)',
  'Choques de alta velocidad causan compresiones súbitas de la magnetósfera (SSC)',
  'Aumento del riesgo de carga superficial en satélites por plasma caliente',
  'Perturbaciones en la ionósfera que afectan señales de comunicación y GPS',
  'Inducción de corrientes eléctricas en redes de energía terrestres',
  'Variaciones en la densidad del viento solar que afectan el arrastre satelital',
]

export function SolarWindClient() {
  const [range, setRange] = useState<any>('1d') // Note: Fetcher currently fixed range
  const [normalize, setNormalize] = useState(false)

  const { data: samples, isLoading, isError } = useAutoRefresh<any[]>({
    queryKey: ['solar-wind'],
    fetcher: () => fetch('/api/swpc/solar-wind-speed').then(r => r.json()),
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const plotData: Plotly.Data[] = [
    {
      x: samples?.map((s) => s.time_tag),
      y: normalize ? normalizeSeries(samples?.map(s => s.wind_speed) || []) : samples?.map((s) => s.wind_speed),
      type: 'scattergl' as const,
      mode: 'lines' as const,
      name: 'Velocidad (km/s)',
      line: { color: '#22d3ee', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(34,211,238,0.05)',
      hovertemplate: normalize ? '%{y:.1f}% del máximo<extra>Velocidad</extra>' : '%{y:.1f} km/s<extra>Velocidad</extra>',
    }
  ]

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `solar-wind-${normalize}`,
    title: {
      text: 'Viento Solar (Velocidad de Plasma)',
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
      title: { text: normalize ? 'Velocidad Relativa (%)' : 'Velocidad (km/s)', font: { size: 12, color: '#64748b' }, standoff: 5 },
      range: normalize ? [0, 105] : undefined,
      autorange: true,
    },
    margin: { l: 65, r: 20, t: 40, b: 100 },
    hovermode: 'x unified',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
              Viento Solar
            </h1>
            <DataAge timestamp={samples?.[samples.length - 1]?.time_tag} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            DSCOVR / ACE · Velocidad de flujo de plasma en tiempo real · Actualización cada 5 min
          </p>
        </div>
        <NormalizeToggle normalize={normalize} onToggle={setNormalize} />
      </div>

      {/* Chart */}
      <div className="card relative overflow-hidden">
        {isLoading && (
          <LoadingMessage message="Cargando datos de viento solar..." />
        )}
        {isError && (
          <ErrorMessage 
            message="Error al cargar datos" 
            description="No se pudo establecer conexión con el flujo de datos DSCOVR/ACE."
          />
        )}
        {samples && samples.length === 0 && (
          <EmptyMessage message="No hay datos de viento solar disponibles." />
        )}
        {samples && samples.length > 0 && (
          <PlotlyChart
            data={plotData}
            layout={layout}
            className="min-h-[400px]"
          />
        )}
      </div>

      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El viento solar es un flujo continuo de partículas cargadas (principalmente protones y electrones) que emanan de la corona solar. Estos datos provienen de los satélites DSCOVR y ACE, situados en el punto de Lagrange L1, a unos 1.5 millones de km de la Tierra, lo que proporciona un aviso previo de 15 a 60 minutos antes del impacto.
        </p>
        <p>
          La velocidad típica del viento solar varía entre 300 y 500 km/s. Durante eventos solares, como la llegada de una Eyección de Masa Coronal (CME) o corrientes de alta velocidad provenientes de agujeros coronales, la velocidad puede superar los 800-1000 km/s, provocando tormentas geomagnéticas severas.
        </p>
      </SectionDetails>
    </div>
  )
}
