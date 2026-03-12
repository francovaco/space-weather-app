'use client'
// ============================================================
// src/components/instruments/KpIndexClient.tsx
// Interactive Kp Index chart with auto-refresh
// ============================================================
import { useState } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { NormalizeToggle, normalizeSeries } from '@/components/ui/NormalizeToggle'
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
  const [normalize, setNormalize] = useState(false)

  const { data: samples, isLoading, isError } = useAutoRefresh<KpReading[]>({
    queryKey: ['kp-index'],
    fetcher: () => getKpIndexData() as Promise<KpReading[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  const plotData: Plotly.Data[] = [
    {
      x: samples?.map((s) => s.time_tag),
      y: normalize ? normalizeSeries(samples?.map(s => s.kp) || []) : samples?.map((s) => s.kp),
      type: 'bar',
      name: 'Índice Kp',
      marker: {
        color: samples?.map((s) => {
          const v = s.kp
          if (v >= 7) return '#ef4444' // G3+
          if (v >= 5) return '#f59e0b' // G1-G2
          return '#10b981' // Quiet
        }),
      },
      hovertemplate: normalize ? '%{y:.1f}% del máximo<extra>Kp</extra>' : 'Kp %{y}<extra></extra>',
    },
  ]

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `kp-${normalize}`,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: normalize ? 'Kp Relativo (%)' : 'Índice Kp', font: { size: 11, color: '#64748b' } },
      range: normalize ? [0, 105] : [0, 9],
      dtick: normalize ? 20 : 1,
      automargin: true,
    },
    margin: { l: 60, r: 20, t: 40, b: 65 },
    hovermode: 'x unified',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Índice Planetario Kp</h1>
          <p className="mt-1 text-xs text-text-muted">SWPC · Actividad geomagnética global · Actualización cada 3 horas</p>
        </div>
        <NormalizeToggle normalize={normalize} onToggle={setNormalize} />
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && <LoadingMessage message="Cargando índice Kp..." />}
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
