'use client'
// ============================================================
// src/components/instruments/KpIndexClient.tsx
// Interactive Kp Index chart with auto-refresh
// ============================================================
import { useMemo, useState } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { DataExporter } from '@/components/ui/DataExporter'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getKpIndexData } from '@/lib/swpc-api'
import type { KpReading, TimeRange } from '@/types/swpc'

const USAGE = [
  'Indicador global de la actividad geomagnética y tormentas solares',
  'Determinación de la intensidad de tormentas geomagnéticas (Escala G de NOAA)',
  'Predicción de la visibilidad y extensión de auroras boreales y australes',
  'Evaluación del impacto en redes eléctricas y sistemas de navegación',
  'Monitoreo de la estabilidad del campo magnético terrestre',
  'Referencia para operaciones satelitales y comunicaciones de radio HF',
]

const IMPACTS = [
  'Kp ≥ 5 (Tormenta G1): Fluctuaciones débiles en redes eléctricas y auroras en latitudes altas',
  'Kp ≥ 7 (Tormenta G3): Problemas de control de voltaje y auroras en latitudes medias',
  'Kp = 9 (Tormenta G5): Colapso de redes eléctricas e interferencia total en radio HF',
  'Degradación de señales GNSS (GPS) por irregularidades ionosféricas',
  'Aumento del arrastre atmosférico en satélites de órbita baja (LEO)',
  'Corrientes inducidas geomagnéticamente (GIC) en tuberías y cables submarinos',
]

export function KpIndexClient() {
  const [range, setRange] = useState<TimeRange>('3d')
  const [selectedDate, setSelectedDate] = useState<string>('')

  const { data: samples, isLoading, isError } = useAutoRefresh<KpReading[]>({
    queryKey: ['kp-index', range, selectedDate],
    fetcher: () => getKpIndexData(range === 'historical' ? selectedDate : undefined) as Promise<KpReading[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  // Prepare plot data with memoization
  const plotData: Plotly.Data[] = useMemo(() => {
    if (!samples || samples.length === 0) return []
    
    let filteredSamples = []
    
    if (range === 'historical' && selectedDate) {
      // Historical data from API is already range-scoped
      filteredSamples = samples
    } else {
      // Default: Filter to last 3 days (72 hours)
      const threeDaysAgo = new Date()
      threeDaysAgo.setHours(threeDaysAgo.getHours() - 72)
      filteredSamples = samples.filter(s => new Date(s.time_tag) >= threeDaysAgo)
    }

    const kpValues = filteredSamples.map(s => s.kp)

    return [
      {
        x: filteredSamples.map((s) => s.time_tag),
        y: kpValues,
        customdata: kpValues,
        type: 'bar',
        name: 'Índice Kp',
        marker: {
          color: kpValues.map((v) => {
            if (v >= 9) return '#960000' // G5 - Granate
            if (v >= 8) return '#c80000' // G4 - Rojo Oscuro
            if (v >= 7) return '#ff0000' // G3 - Rojo
            if (v >= 6) return '#ff9600' // G2 - Naranja
            if (v >= 5) return '#ffff00' // G1 - Amarillo
            return '#10b981' // Quiet - Verde Suave
          }),
          line: { width: 0.5, color: 'rgba(0,0,0,0.3)' }
        },
        hovertemplate: 'Kp %{customdata}<extra></extra>',
      },
    ]
  }, [samples])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: 'kp-static',
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Índice Planetario Kp', font: { size: 11, color: '#64748b' } },
      range: [0, 9.5],
      dtick: 1,
      type: 'linear',
      automargin: true,
    },
    margin: { l: 60, r: 100, t: 40, b: 65 },
    hovermode: 'x unified',
    shapes: [
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 5, y1: 5, line: { color: '#ffff00', width: 1, dash: 'dot' } },
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 6, y1: 6, line: { color: '#ff9600', width: 1, dash: 'dot' } },
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 7, y1: 7, line: { color: '#ff0000', width: 1, dash: 'dot' } },
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 8, y1: 8, line: { color: '#c80000', width: 1, dash: 'dot' } },
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 9, y1: 9, line: { color: '#960000', width: 1, dash: 'dot' } },
    ],
    annotations: [
      { xref: 'paper', yref: 'y', x: 1.02, y: 5, text: 'G1', showarrow: false, font: { size: 10, color: '#ffff00', fontWeight: 'bold' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 6, text: 'G2', showarrow: false, font: { size: 10, color: '#ff9600', fontWeight: 'bold' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 7, text: 'G3', showarrow: false, font: { size: 10, color: '#ff0000', fontWeight: 'bold' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 8, text: 'G4', showarrow: false, font: { size: 10, color: '#c80000', fontWeight: 'bold' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 9, text: 'G5', showarrow: false, font: { size: 10, color: '#960000', fontWeight: 'bold' }, xanchor: 'left' },
    ],
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Índice Planetario Kp</h1>
          <p className="mt-1 text-xs text-text-muted">SWPC · Actividad geomagnética global · Actualización cada 3 horas</p>
        </div>
        <div className="flex items-center gap-4">
          <DataExporter 
            data={plotData[0]?.x ? (plotData[0].x as any[]).map((x, i) => ({ 
              time: x, 
              kp: (plotData[0].customdata as any[])[i] 
            })) : []} 
            filename={`kp-index-${range === 'historical' ? selectedDate : range}`} 
          />
          <TimeRangeSelector 
            value={range} 
            onChange={setRange} 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && !samples && <LoadingMessage message="Cargando índice Kp..." />}
        {isError && <ErrorMessage message="Error al cargar datos" />}
        {samples && samples.length === 0 && <EmptyMessage message="No hay datos disponibles." />}
        {samples && samples.length > 0 && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>

      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El índice Kp (Planetario) es un indicador de la actividad geomagnética global, derivado del promedio de los índices K medidos por una red de magnetómetros en latitudes medias alrededor del mundo. Se expresa en una escala de 0 a 9.
        </p>
        <p>
          Valores de Kp de 0 a 3 indican condiciones geomagnéticas quietas. Un Kp de 4 se considera inestable, y valores de 5 a 9 indican tormentas geomagnéticas de intensidad creciente, correspondiéndose con las escalas G1 a G5 del SWPC (Kp5=G1 menor, Kp6=G2 moderada, Kp7=G3 fuerte, Kp8=G4 severa, Kp9=G5 extrema).
        </p>
        <p>
          El índice se calcula cada 3 horas (8 valores al día) y el SWPC provee un índice Kp en tiempo real basado en datos de magnetómetros. También se publica el índice ap, que es la equivalencia lineal del Kp y permite promediar para calcular el índice Ap diario.
        </p>
      </SectionDetails>
    </div>
  )
}
