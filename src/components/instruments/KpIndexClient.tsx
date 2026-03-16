'use client'
// ============================================================
// src/components/instruments/KpIndexClient.tsx
// Interactive Kp Index chart with auto-refresh
// ============================================================
import { useMemo, useState } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { RefreshCw } from 'lucide-react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { DataExporter } from '@/components/ui/DataExporter'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { DataAge } from '@/components/ui/DataAge'
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
  const [selectedDate, setSelectedDate] = useState<string | undefined>()

  const { data: samples, isLoading, isError, isFetching } = useAutoRefresh<KpReading[]>({
    queryKey: ['kp-index', range, selectedDate],
    fetcher: () => {
      if (range === 'historical' && selectedDate) {
        return getKpIndexData(selectedDate) as Promise<KpReading[]>;
      }
      return getKpIndexData() as Promise<KpReading[]>;
    },
    intervalMs: REFRESH_INTERVALS.THIRTY_MIN,
  })

  // Prepare plot data with memoization
  const plotData: Plotly.Data[] = useMemo(() => {
    if (!samples || samples.length === 0) return []
    
    // Calculate cutoff time based on selected range
    const now = new Date()
    let hours = 72 // Default 3d
    switch (range) {
      case '6h': hours = 6; break
      case '1d': hours = 24; break
      case '3d': hours = 72; break
      case '7d': hours = 168; break
      default: hours = 72
    }
    
    let filteredSamples = samples;
    if (range === 'historical' && selectedDate) {
      filteredSamples = samples.filter(s => {
        const dt = new Date(s.time_tag);
        const sel = new Date(selectedDate);
        return dt.getUTCFullYear() === sel.getUTCFullYear() &&
               dt.getUTCMonth() === sel.getUTCMonth() &&
               dt.getUTCDate() === sel.getUTCDate();
      });
    } else {
      const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000)
      filteredSamples = samples.filter(s => new Date(s.time_tag) >= cutoff)
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
  }, [samples, range])

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
      { xref: 'paper', yref: 'y', x: 1.02, y: 5, text: '<b>G1</b>', showarrow: false, font: { size: 10, color: '#ffff00' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 6, text: '<b>G2</b>', showarrow: false, font: { size: 10, color: '#ff9600' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 7, text: '<b>G3</b>', showarrow: false, font: { size: 10, color: '#ff0000' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 8, text: '<b>G4</b>', showarrow: false, font: { size: 10, color: '#c80000' }, xanchor: 'left' },
      { xref: 'paper', yref: 'y', x: 1.02, y: 9, text: '<b>G5</b>', showarrow: false, font: { size: 10, color: '#960000' }, xanchor: 'left' },
    ],
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Índice Planetario Kp</h1>
            <DataAge timestamp={samples?.[samples.length - 1]?.time_tag} />
            {isFetching && !isLoading && <RefreshCw size={11} className="animate-spin text-accent-cyan opacity-60" />}
          </div>
          <p className="mt-1 text-xs text-text-muted">SWPC · Actividad geomagnética global · Actualización cada 3 horas</p>
        </div>
        <div className="flex items-center gap-4">
          <DataExporter
            data={samples ? samples.map(s => ({ time: s.time_tag, kp: s.kp })) : []}
            filename={`kp-index-${range}${selectedDate ? `-${selectedDate}` : ''}`}
          />
          <TimeRangeSelector 
            value={range} 
            onChange={setRange} 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            hideHistorical={false}
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
