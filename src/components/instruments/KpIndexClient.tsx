'use client'
// ============================================================
// src/components/instruments/KpIndexClient.tsx
// Planetary K-Index bar chart with color-coded Kp levels
// Mirrors SWPC: https://www.swpc.noaa.gov/products/planetary-k-index
// ============================================================
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import Link from 'next/link'

interface KpSample {
  time_tag: string
  kp: number
  a_running: number
  station_count: number
}

function fetchKpData(): Promise<KpSample[]> {
  return fetch('/api/swpc/kp-index').then((r) => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })
}

// Color mapping matching SWPC chart
function kpColor(kp: number): string {
  if (kp >= 8) return '#dc2626' // Kp 8-9 — extreme
  if (kp >= 7) return '#ef4444' // Kp 7 — severe
  if (kp >= 6) return '#f97316' // Kp 6 — strong storm
  if (kp >= 5) return '#f59e0b' // Kp 5 — minor storm
  if (kp >= 4) return '#eab308' // Kp 4 — active
  return '#22c55e'              // Kp 0-3 — quiet
}

// Geomagnetic activity level label
function kpLabel(kp: number): string {
  if (kp >= 8) return 'Extrema (G4-G5)'
  if (kp >= 7) return 'Severa (G4)'
  if (kp >= 6) return 'Fuerte (G3)'
  if (kp >= 5) return 'Tormenta menor (G1)'
  if (kp >= 4) return 'Activo'
  if (kp >= 2) return 'Sin perturbar'
  return 'Quieto'
}

const USAGE = [
  'Medición global de la actividad geomagnética mediante índice planetario Kp (0-9)',
  'Indicador primario para la escala NOAA de tormentas geomagnéticas (G1-G5)',
  'Pronóstico de auroras boreales y australes — mayor Kp, mayor visibilidad a menores latitudes',
  'Evaluación de condiciones geomagnéticas para operaciones de satélites en LEO',
  'Entrada para modelos de arrastre atmosférico sobre objetos en órbita',
  'Monitoreo del estado de la magnetósfera terrestre en tiempo real',
  'Apoyo a decisiones en operaciones de redes eléctricas durante perturbaciones geomagnéticas',
  'Estimación del riesgo de corrientes inducidas geomagnéticamente (GIC)',
]

const IMPACTS = [
  'Kp ≥ 5: Tormenta geomagnética G1 — Fluctuaciones débiles en redes eléctricas, auroras visibles hasta ~60° latitud',
  'Kp ≥ 6: Tormenta G2 — Posibles alertas de voltaje, corrección orbital de satélites necesaria, auroras hasta ~55°',
  'Kp ≥ 7: Tormenta G3 — Correcciones de voltaje en redes eléctricas, degradación de navegación y HF, auroras hasta ~50°',
  'Kp ≥ 8: Tormenta G4 — Problemas generalizados de voltaje, pérdida de tracking de satélites, auroras hasta ~45°',
  'Kp = 9: Tormenta G5 — Colapso potencial de redes eléctricas, daños a transformadores, auroras hasta ~40° latitud',
  'Aumento del arrastre atmosférico sobre satélites LEO por expansión de la termósfera',
  'Degradación significativa de señales GPS y GNSS durante tormentas geomagnéticas',
  'Interferencia en sistemas de comunicación HF, especialmente en altas latitudes',
]

export function KpIndexClient() {
  const { data: samples, isLoading, isError } = useAutoRefresh<KpSample[]>({
    queryKey: ['kp-index'],
    fetcher: fetchKpData,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  // Build bar chart data — each bar colored individually
  const times = samples?.map((s) => s.time_tag) ?? []
  const kps = samples?.map((s) => s.kp) ?? []
  const colors = kps.map(kpColor)
  const hoverTexts = samples?.map((s) => {
    const t = new Date(s.time_tag).toISOString().replace('T', ' ').slice(0, 16)
    return `${t} UTC<br>Kp: ${s.kp.toFixed(2)}<br>${kpLabel(s.kp)}<br>Estaciones: ${s.station_count}`
  }) ?? []

  const plotData: Plotly.Data[] = [
    {
      x: times,
      y: kps,
      type: 'bar' as const,
      marker: { color: colors },
      hovertext: hoverTexts,
      hoverinfo: 'text' as const,
      width: 3 * 60 * 60 * 1000 * 0.85, // ~3h bar width
    },
  ]

  // Storm level threshold lines
  const thresholds = [
    { kp: 4, label: 'Activo', color: '#eab308' },
    { kp: 5, label: 'G1', color: '#f59e0b' },
    { kp: 6, label: 'G2', color: '#f97316' },
    { kp: 7, label: 'G3', color: '#ef4444' },
    { kp: 8, label: 'G4', color: '#dc2626' },
    { kp: 9, label: 'G5', color: '#991b1b' },
  ]

  const shapes: Partial<Plotly.Shape>[] = thresholds.map((t) => ({
    type: 'line',
    xref: 'paper',
    yref: 'y',
    x0: 0,
    x1: 1,
    y0: t.kp,
    y1: t.kp,
    line: { color: t.color, width: 1, dash: 'dot' },
  }))

  const annotations: Partial<Plotly.Annotations>[] = thresholds.map((t) => ({
    xref: 'paper',
    yref: 'y',
    x: 1.01,
    y: t.kp,
    text: t.label,
    showarrow: false,
    font: { size: 10, color: t.color, family: 'JetBrains Mono, monospace' },
    xanchor: 'left' as const,
    yanchor: 'middle' as const,
  }))

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: 'kp',
    title: {
      text: 'Índice Planetario Kp (estimado)',
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
      title: { text: 'Kp', font: { size: 12, color: '#64748b' }, standoff: 5 },
      range: [0, 9.5],
      dtick: 1,
      exponentformat: 'none' as const,
    },
    bargap: 0.15,
    showlegend: false,
    margin: { l: 50, r: 45, t: 40, b: 80 },
    hovermode: 'closest',
    shapes,
    annotations,
  }

  const config: Partial<Plotly.Config> = {
    ...PLOTLY_DEFAULT_CONFIG,
    scrollZoom: true,
  }

  // Current Kp value
  const latest = samples?.[samples.length - 1]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Índice Planetario K
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Actividad geomagnética global · Intervalos de 3 horas · Actualización cada 5 min ·{' '}
            <Link href="/noaa-scales" className="text-accent-cyan hover:underline">Escalas NOAA</Link>
          </p>
        </div>
        {latest && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background-card px-3 py-2">
            <div className="flex flex-col items-end">
              <span className="section-label text-text-muted">Kp Actual</span>
              <div className="flex items-center gap-2">
                <span
                  className="font-display text-lg font-bold tabular-nums"
                  style={{ color: kpColor(latest.kp) }}
                >
                  {latest.kp.toFixed(2)}
                </span>
                <span className="text-2xs text-text-secondary">{kpLabel(latest.kp)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="card relative overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              Cargando índice Kp…
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs text-red-400">Error al cargar datos del índice Kp</span>
          </div>
        )}
        {samples && samples.length > 0 && (
          <PlotlyChart
            data={plotData}
            layout={layout}
            config={config}
            className="min-h-[420px]"
          />
        )}
        {samples && samples.length > 0 && (
          <div className="absolute right-2 top-1 text-[9px] text-text-dim">
            Último dato: {new Date(samples[samples.length - 1].time_tag).toLocaleString('es-AR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })} UTC
          </div>
        )}
      </div>

      {/* Kp Scale Reference */}
      <div className="card p-4">
        <h3 className="section-label mb-2">Referencia de Escala Kp</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-5">
          {[
            { range: 'Kp 0–1', label: 'Quieto', color: '#22c55e' },
            { range: 'Kp 2–3', label: 'Sin perturbar', color: '#22c55e' },
            { range: 'Kp 4', label: 'Activo', color: '#eab308' },
            { range: 'Kp 5', label: 'Tormenta menor (G1)', color: '#f59e0b' },
            { range: 'Kp 6', label: 'Tormenta moderada (G2)', color: '#f97316' },
            { range: 'Kp 7', label: 'Tormenta fuerte (G3)', color: '#ef4444' },
            { range: 'Kp 8', label: 'Tormenta severa (G4)', color: '#dc2626' },
            { range: 'Kp 9', label: 'Tormenta extrema (G5)', color: '#991b1b' },
          ].map((item) => (
            <div key={item.range} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-2xs text-text-secondary">
                <strong className="text-text-primary">{item.range}</strong> — {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage & Impacts */}
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      {/* Detalles */}
      <SectionDetails>
        <p>
          El índice Kp es una medida global de la actividad geomagnética basada en fluctuaciones del campo magnético observadas por una red de 13 estaciones de observación geomagética distribuidas entre las latitudes 44°N y 60°N. Fue desarrollado por Julius Bartels en 1938 y se reporta en una escala cuasi-logarítmica de 0 a 9.
        </p>
        <p>
          Valores de Kp de 0 a 3 indican condiciones geomagnéticas quietas. Un Kp de 4 se considera inestable, y valores de 5 a 9 indican tormentas geomagnéticas de intensidad creciente, correspondiéndose con las escalas G1 a G5 del SWPC (Kp5=G1 menor, Kp6=G2 moderada, Kp7=G3 fuerte, Kp8=G4 severa, Kp9=G5 extrema).
        </p>
        <p>
          El índice se calcula cada 3 horas (8 valores al día) y el SWPC provee un índice Kp estimado en tiempo real basado en datos de magnetómetros. También se publica el índice ap, que es la equivalencia lineal del Kp y permite promediar para calcular el índice Ap diario.
        </p>
      </SectionDetails>
    </div>
  )
}
