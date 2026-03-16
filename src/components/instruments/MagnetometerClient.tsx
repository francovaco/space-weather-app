'use client'
// ============================================================
// src/components/instruments/MagnetometerClient.tsx
// Interactive GOES Magnetometer chart with auto-refresh
// ============================================================
import { useState, useMemo } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { RefreshCw } from 'lucide-react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { DataExporter } from '@/components/ui/DataExporter'
import { NormalizeToggle, normalizeSeries } from '@/components/ui/NormalizeToggle'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { DataAge } from '@/components/ui/DataAge'
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

  const { data: samples, isLoading, isError, isFetching } = useAutoRefresh<MagnetometerReading[]>({
    queryKey: ['magnetometer', range],
    fetcher: async () => {
      const data = await getMagnetometerData(timeRangeToParam(range)) as MagnetometerReading[]
      // Ordenar por fecha ascendente
      return data.slice().sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
    },
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  // Detect Arcjet events (start and end)
  const arcjetEvents = useMemo(() => {
    if (!samples || samples.length === 0) return []
    const events: { start: string; end?: string }[] = []
    let activeEvent: { start: string; end?: string } | null = null

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      // SWPC uses 1 for arcjet_flag (typed as number in MagnetometerReading)
      const isArcjet = s.arcjet_flag === 1

      if (isArcjet && !activeEvent) {
        activeEvent = { start: s.time_tag }
        events.push(activeEvent)
      } else if (!isArcjet && activeEvent) {
        activeEvent.end = s.time_tag
        activeEvent = null
      }
    }
    return events
  }, [samples])

  // Calculate Local Noon (N) and Midnight (M) markers for GOES-East (75.2° W)
  // Local Midnight ~ 05:00 UTC, Local Noon ~ 17:00 UTC
  const diurnalMarkers = useMemo(() => {
    if (!samples || samples.length === 0) return []
    const markers: { time: string; label: string }[] = []
    const start = new Date(samples[0].time_tag)
    const end = new Date(samples[samples.length - 1].time_tag)
    
    const curr = new Date(start)
    curr.setUTCHours(5, 0, 0, 0) // First Midnight
    if (curr < start) curr.setUTCDate(curr.getUTCDate() + 1)

    while (curr <= end) {
      markers.push({ time: curr.toISOString(), label: 'M' }) // Midnight
      
      const noon = new Date(curr)
      noon.setUTCHours(17, 0, 0, 0)
      if (noon <= end && noon >= start) {
        markers.push({ time: noon.toISOString(), label: 'N' }) // Noon
      }
      
      curr.setUTCDate(curr.getUTCDate() + 1)
    }
    return markers
  }, [samples])

  const plotData: Plotly.Data[] = useMemo(() => {
    if (!samples) return []
    return [
      {
        x: samples.map((s) => s.time_tag),
        y: normalize ? normalizeSeries(samples.map(s => s.Hp)) : samples.map((s) => s.Hp),
        customdata: samples.map(s => s.Hp),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Hp (Paralelo)', line: { color: '#ef4444', width: 1.5 },
        hovertemplate: '%{customdata:.2f} nT<extra>Hp</extra>',
      },
      {
        x: samples.map((s) => s.time_tag),
        y: normalize ? normalizeSeries(samples.map(s => s.He)) : samples.map((s) => s.He),
        customdata: samples.map(s => s.He),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'He (Tierra)', line: { color: '#3b82f6', width: 1.5 },
        hovertemplate: '%{customdata:.2f} nT<extra>He</extra>',
      },
      {
        x: samples.map((s) => s.time_tag),
        y: normalize ? normalizeSeries(samples.map(s => s.Hn)) : samples.map((s) => s.Hn),
        customdata: samples.map(s => s.Hn),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Hn (Normal)', line: { color: '#10b981', width: 1.5 },
        hovertemplate: '%{customdata:.2f} nT<extra>Hn</extra>',
      },
      {
        x: samples.map((s) => s.time_tag),
        y: normalize ? normalizeSeries(samples.map(s => s.total)) : samples.map((s) => s.total),
        customdata: samples.map(s => s.total),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Total', line: { color: '#f59e0b', width: 2 },
        hovertemplate: '%{customdata:.2f} nT<extra>Total</extra>',
      },
    ]
  }, [samples, normalize])

  const yAxisConfig = useMemo(() => {
    if (!normalize || !samples || samples.length === 0) return { autorange: true }
    const totalVals = samples.map(s => s.total).filter(v => v !== null && !isNaN(v))
    if (totalVals.length === 0) return { range: [0, 105] }
    const min = Math.min(...totalVals), max = Math.max(...totalVals)
    const tickVals = [0, 25, 50, 75, 100]
    const tickTexts = tickVals.map(pct => (min + (pct / 100) * (max - min)).toFixed(1))
    return { tickvals: tickVals, ticktext: tickTexts, range: [0, 105], type: 'linear' as const }
  }, [samples, normalize])

  // Combined shapes and annotations
  const shapes: Partial<Plotly.Shape>[] = useMemo(() => {
    const s: Partial<Plotly.Shape>[] = []
    // Arcjet lines
    arcjetEvents.forEach(event => {
      s.push({ type: 'line', xref: 'x', yref: 'paper', x0: event.start, x1: event.start, y0: 0, y1: 1, line: { color: 'rgba(255, 255, 255, 0.4)', width: 1, dash: 'dot' } })
      if (event.end) s.push({ type: 'line', xref: 'x', yref: 'paper', x0: event.end, x1: event.end, y0: 0, y1: 1, line: { color: 'rgba(255, 255, 255, 0.4)', width: 1, dash: 'dot' } })
    })
    // Noon/Midnight lines (subtle)
    diurnalMarkers.forEach(m => {
      s.push({ type: 'line', xref: 'x', yref: 'paper', x0: m.time, x1: m.time, y0: 0, y1: 0.05, line: { color: 'rgba(255, 255, 255, 0.2)', width: 1 } })
    })
    return s
  }, [arcjetEvents, diurnalMarkers])

  const annotations: Partial<Plotly.Annotations>[] = useMemo(() => {
    const a: Partial<Plotly.Annotations>[] = []
    // Arcjet labels
    arcjetEvents.forEach(event => {
      a.push({ x: event.start, y: 1, xref: 'x', yref: 'paper', text: 'Arcjet Start', showarrow: false, font: { size: 9, color: 'rgba(255, 255, 255, 0.6)' }, textangle: -90, xanchor: 'right', yanchor: 'top', yshift: -10 } as unknown as Partial<Plotly.Annotations>)
      if (event.end) a.push({ x: event.end, y: 1, xref: 'x', yref: 'paper', text: 'Arcjet End', showarrow: false, font: { size: 9, color: 'rgba(255, 255, 255, 0.6)' }, textangle: -90, xanchor: 'right', yanchor: 'top', yshift: -10 } as unknown as Partial<Plotly.Annotations>)
    })
    // Noon/Midnight labels
    diurnalMarkers.forEach(m => {
      a.push({ x: m.time, y: 0, xref: 'x', yref: 'paper', text: m.label, showarrow: false, font: { size: 10, color: 'rgba(255, 255, 255, 0.4)', weight: 'bold' }, yanchor: 'bottom', yshift: 5 })
    })
    return a
  }, [arcjetEvents, diurnalMarkers])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `${range}-${normalize}`,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: { ...PLOTLY_DARK_LAYOUT.yaxis, title: { text: 'Campo Magnético (nT)', font: { size: 11, color: '#64748b' } }, ...yAxisConfig, automargin: true },
    margin: { l: 60, r: 20, t: 40, b: 65 },
    hovermode: 'x unified',
    shapes,
    annotations,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Magnetómetro</h1>
            <DataAge timestamp={samples?.[samples.length - 1]?.time_tag} />
            {isFetching && !isLoading && <RefreshCw size={11} className="animate-spin text-accent-cyan opacity-60" />}
          </div>
          <p className="mt-1 text-xs text-text-muted">GOES-19 · Componentes Hp, He, Hn y Campo Total · Actualización cada 1 min</p>
        </div>
        <div className="flex items-center gap-4">
          <DataExporter 
            data={samples?.map(s => ({
              time: s.time_tag,
              Hp: s.Hp,
              He: s.He,
              Hn: s.Hn,
              Total: s.total
            })) || []} 
            filename={`magnetometer-${range}`} 
          />
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={range} onChange={setRange} hideHistorical />
          </div>
        </div>
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && <LoadingMessage message="Cargando datos..." />}
        {isError && !isLoading && <ErrorMessage message="Error al cargar datos" />}
        {!isError && !isLoading && samples && samples.length === 0 && (
          <EmptyMessage message="No hay datos disponibles." />
        )}
        {!isError && !isLoading && samples && samples.length > 0 && (
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
        <p className="mt-4 text-accent-cyan/80 text-[11px] italic">
          Nota: Los marcadores <strong>Arcjet Start/End</strong> indican periodos de interferencia artificial. Los marcadores <strong>N</strong> y <strong>M</strong> indican el mediodía y la medianoche local en la longitud del satélite (75.2° W).
        </p>
        <p className="mt-4">
          Durante periodos de calma, el magnetómetro mide principalmente el campo magnético terrestre (geomagnético) estirado por el viento solar. Sin embargo, durante tormentas geomagnéticas, se pueden observar variaciones bruscas causadas por corrientes eléctricas en la magnetósfera, compresiones del viento solar o la llegada de ondas de choque interplanetarias.
        </p>
      </SectionDetails>
    </div>
  )
}
