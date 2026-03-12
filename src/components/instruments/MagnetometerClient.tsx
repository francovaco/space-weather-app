'use client'
// ============================================================
// src/components/instruments/MagnetometerClient.tsx
// Interactive GOES Magnetometer chart with auto-refresh
// ============================================================
import { useState } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { NormalizeToggle, normalizeSeries } from '@/components/ui/NormalizeToggle'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getMagnetometerData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange, MagnetometerReading } from '@/types/swpc'

const USAGE = [
  'Monitoreo del campo magnético ambiental en órbita geoestacionaria',
  'Identificación de compresiones de la magnetósfera por viento solar',
  'Detección de subtormentas magnetosféricas y reconfiguración del campo',
  'Indicador de la intensidad de la corriente de anillo durante tormentas',
  'Validación de modelos de la magnetósfera en tiempo real',
  'Detección de ondas electromagnéticas de baja frecuencia (waves)',
  'Seguimiento de la inclinación del campo magnético (magnetic tilting)',
]

const IMPACTS = [
  'Las compresiones fuertes pueden exponer satélites geoestacionarios al viento solar',
  'Cambios rápidos en el campo (dB/dt) inducen corrientes en cables de satélites',
  'Interferencia con magnetopar de actitud (sensores de orientación) de satélites',
  'Tormentas geomagnéticas que afectan la estabilidad de la órbita',
  'Relación directa con la aparición de auroras en latitudes altas y medias',
  'Aumento del riesgo de descargas electrostáticas en componentes externos',
]

export function MagnetometerClient() {
  const [range, setRange] = useState<TimeRange>('6h')
  const [normalize, setNormalize] = useState(false)

  const { data: samples, isLoading, isError } = useAutoRefresh<MagnetometerReading[]>({
    queryKey: ['magnetometer', range],
    fetcher: () => getMagnetometerData(timeRangeToParam(range)) as Promise<MagnetometerReading[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  const plotData: Plotly.Data[] = [
    {
      x: samples?.map((s) => s.time_tag),
      y: normalize ? normalizeSeries(samples?.map(s => s.Hp) || []) : samples?.map((s) => s.Hp),
      type: 'scattergl' as const, mode: 'lines' as const, name: 'Hp (Paralelo)', line: { color: '#ef4444', width: 1.5 },
      hovertemplate: normalize ? '%{y:.1f}%<extra>Hp</extra>' : '%{y:.2f} nT<extra>Hp</extra>',
    },
    {
      x: samples?.map((s) => s.time_tag),
      y: normalize ? normalizeSeries(samples?.map(s => s.He) || []) : samples?.map((s) => s.He),
      type: 'scattergl' as const, mode: 'lines' as const, name: 'He (Tierra)', line: { color: '#3b82f6', width: 1.5 },
      hovertemplate: normalize ? '%{y:.1f}%<extra>He</extra>' : '%{y:.2f} nT<extra>He</extra>',
    },
    {
      x: samples?.map((s) => s.time_tag),
      y: normalize ? normalizeSeries(samples?.map(s => s.Hn) || []) : samples?.map((s) => s.Hn),
      type: 'scattergl' as const, mode: 'lines' as const, name: 'Hn (Normal)', line: { color: '#10b981', width: 1.5 },
      hovertemplate: normalize ? '%{y:.1f}%<extra>Hn</extra>' : '%{y:.2f} nT<extra>Hn</extra>',
    },
    {
      x: samples?.map((s) => s.time_tag),
      y: normalize ? normalizeSeries(samples?.map(s => s.total) || []) : samples?.map((s) => s.total),
      type: 'scattergl' as const, mode: 'lines' as const, name: 'Total', line: { color: '#f59e0b', width: 2 },
      hovertemplate: normalize ? '%{y:.1f}%<extra>Total</extra>' : '%{y:.2f} nT<extra>Total</extra>',
    },
  ]

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `${range}-${normalize}`,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: normalize ? 'Campo Relativo (%)' : 'Campo Magnético (nT)', font: { size: 11, color: '#64748b' } },
      autorange: true, range: normalize ? [0, 105] : undefined, automargin: true,
    },
    margin: { l: 60, r: 20, t: 40, b: 65 },
    hovermode: 'x unified',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Magnetómetro</h1>
          <p className="mt-1 text-xs text-text-muted">GOES-19 · Componentes Hp, He, Hn y Campo Total · Actualización cada 1 min</p>
        </div>
        <div className="flex items-center gap-3">
          <NormalizeToggle normalize={normalize} onToggle={setNormalize} />
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && <LoadingMessage message="Cargando datos..." />}
        {isError && <ErrorMessage message="Error al cargar datos" />}
        {samples && samples.length === 0 && <EmptyMessage message="No hay datos disponibles." />}
        {samples && samples.length > 0 && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El magnetómetro de flujo de tres ejes a bordo del satélite GOES mide la magnitud y dirección del campo magnético ambiental en la órbita geoestacionaria. El sistema de coordenadas utilizado es el <strong>PEN</strong>:
        </p>
        <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-text-secondary">
          <li><strong>Hp:</strong> Paralelo al eje de rotación de la Tierra (Norte).</li>
          <li><strong>He:</strong> Perpendicular a Hp y dirigido hacia el centro de la Tierra.</li>
          <li><strong>Hn:</strong> Normal a Hp y He, completando el sistema hacia el Este.</li>
        </ul>
        <p className="mt-4">
          Durante periodos de calma, el magnetómetro mide principalmente el campo magnético terrestre (geomagnético) estirado por el viento solar. Sin embargo, durante tormentas geomagnéticas, se pueden observar variaciones bruscas causadas por corrientes eléctricas en la magnetósfera, compresiones del viento solar o la llegada de ondas de choque interplanetarias.
        </p>
      </SectionDetails>
    </div>
  )
}
