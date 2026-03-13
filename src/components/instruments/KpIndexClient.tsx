'use client'
// ============================================================
// src/components/instruments/KpIndexClient.tsx
// Interactive Kp Index chart with auto-refresh
// ============================================================
import { useMemo } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT } from '@/components/charts/PlotlyChart'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getKpIndexData } from '@/lib/swpc-api'
import type { KpReading } from '@/types/swpc'

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
  const { data: samples, isLoading, isError } = useAutoRefresh<KpReading[]>({
    queryKey: ['kp-index'],
    fetcher: () => getKpIndexData() as Promise<KpReading[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  // Prepare plot data with memoization
  const plotData: Plotly.Data[] = useMemo(() => {
    if (!samples || samples.length === 0) return []
    
    const kpValues = samples.map(s => s.kp)

    return [
      {
        x: samples.map((s) => s.time_tag),
        y: kpValues,
        customdata: kpValues,
        type: 'bar',
        name: 'Índice Kp',
        marker: {
          color: kpValues.map((v) => {
            if (v >= 7) return '#ef4444' // G3+
            if (v >= 5) return '#f59e0b' // G1-G2
            return '#10b981' // Quiet
          }),
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
      range: [0, 9],
      dtick: 1,
      type: 'linear',
      automargin: true,
    },
    margin: { l: 60, r: 20, t: 40, b: 65 },
    hovermode: 'x unified',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Índice Planetario Kp</h1>
          <p className="mt-1 text-xs text-text-muted">SWPC · Actividad geomagnética global · Actualización cada 3 horas</p>
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
        
        {/* Legend Overlay */}
        {samples && samples.length > 0 && (
          <div className="absolute left-20 top-12 flex gap-4 text-[10px] font-bold uppercase tracking-wider hidden sm:flex">
            <div className="flex items-center gap-1.5 text-green-500">
              <div className="h-2 w-2 rounded-full bg-current" /> Calma (0-4)
            </div>
            <div className="flex items-center gap-1.5 text-amber-500">
              <div className="h-2 w-2 rounded-full bg-current" /> Tormenta G1-G2 (5-6)
            </div>
            <div className="flex items-center gap-1.5 text-red-500">
              <div className="h-2 w-2 rounded-full bg-current" /> Tormenta G3+ (7-9)
            </div>
          </div>
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
