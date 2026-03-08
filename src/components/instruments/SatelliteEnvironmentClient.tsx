'use client'
// ============================================================
// src/components/instruments/SatelliteEnvironmentClient.tsx
// Combined view: Proton Flux + Electron Flux + X-Ray Flux
// No zoom, interactive hover, auto-refresh, no Usage/Impacts
// ============================================================
import { useState } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getProtonFluxData, getElectronFluxData, getXRayFluxData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange } from '@/types/swpc'

// ── Types ─────────────────────────────────────────────

interface FluxSample {
  time_tag: string
  satellite: number
  flux: number
  energy: string
}

interface XRaySample extends FluxSample {
  observed_flux: number
  electron_correction: number
  electron_contaminaton: boolean
}

// ── Constants ─────────────────────────────────────────

const PROTON_BANDS = [
  { energy: '>=10 MeV',  label: '≥10 MeV',  color: '#ef4444' },
  { energy: '>=50 MeV',  label: '≥50 MeV',  color: '#f59e0b' },
  { energy: '>=100 MeV', label: '≥100 MeV', color: '#3b82f6' },
  { energy: '>=500 MeV', label: '≥500 MeV', color: '#a855f7' },
]

const FLARE_CLASSES = [
  { value: 1e-4, label: 'X' },
  { value: 1e-5, label: 'M' },
  { value: 1e-6, label: 'C' },
  { value: 1e-7, label: 'B' },
  { value: 1e-8, label: 'A' },
]

// Shared config: no zoom tools, only hover interaction
const STATIC_CONFIG: Partial<Plotly.Config> = {
  ...PLOTLY_DEFAULT_CONFIG,
  displayModeBar: true,
  scrollZoom: false,
  modeBarButtonsToRemove: [
    'select2d', 'lasso2d', 'toggleSpikelines',
    'hoverClosestCartesian', 'hoverCompareCartesian',
    'toImage', 'zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
  ],
}

const COMPACT_MARGIN = { l: 60, r: 35, t: 35, b: 40 }

// ── Mini chart wrapper ────────────────────────────────

function ChartCard({
  title,
  isLoading,
  isError,
  children,
}: {
  title: string
  isLoading: boolean
  isError: boolean
  children: React.ReactNode
}) {
  return (
    <div className="card relative overflow-hidden">
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
            Cargando {title}…
          </div>
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-center py-16">
          <span className="text-xs text-red-400">Error al cargar {title}</span>
        </div>
      )}
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────

export function SatelliteEnvironmentClient() {
  const [range, setRange] = useState<TimeRange>('3d')
  const param = timeRangeToParam(range)

  // Fetch all three datasets in parallel
  const protons = useAutoRefresh<FluxSample[]>({
    queryKey: ['sat-env-protons', range],
    fetcher: () => getProtonFluxData(param) as Promise<FluxSample[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const electrons = useAutoRefresh<FluxSample[]>({
    queryKey: ['sat-env-electrons', range],
    fetcher: () => getElectronFluxData(param) as Promise<FluxSample[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const xrays = useAutoRefresh<XRaySample[]>({
    queryKey: ['sat-env-xray', range],
    fetcher: () => getXRayFluxData(param) as Promise<XRaySample[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  // ── Proton chart ──
  const protonTraces: Plotly.Data[] = protons.data
    ? PROTON_BANDS.map((b) => {
        const pts = protons.data!.filter((d) => d.energy === b.energy)
        return {
          x: pts.map((d) => d.time_tag),
          y: pts.map((d) => d.flux),
          type: 'scattergl' as const,
          mode: 'lines' as const,
          name: b.label,
          line: { color: b.color, width: 1.5 },
          hovertemplate: `%{y:.2f} pfu<extra>${b.label}</extra>`,
        }
      })
    : []

  const protonLayout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: 'Flujo Integral de Protones',
      font: { size: 13, color: '#e2e8f0', family: 'JetBrains Mono, monospace' },
      x: 0.01,
      xanchor: 'left',
    },
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date' },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'pfu', font: { size: 11, color: '#64748b' }, standoff: 5 },
      type: 'log',
      range: [-2, 6],
      dtick: 1,
      exponentformat: 'power',
    },
    legend: { ...PLOTLY_DARK_LAYOUT.legend, orientation: 'h', x: 0.5, xanchor: 'center', y: -0.15, font: { size: 10, color: '#94a3b8' } },
    margin: COMPACT_MARGIN,
    hovermode: 'x unified',
    shapes: [{
      type: 'line', xref: 'paper', yref: 'y',
      x0: 0, x1: 1, y0: 10, y1: 10,
      line: { color: '#ef4444', width: 1.5, dash: 'dash' },
    }],
    annotations: [{
      xref: 'paper', yref: 'y', x: 0, y: 1,
      text: 'Umbral de alerta SWPC 10 MeV',
      showarrow: false, font: { size: 10, color: '#ef4444' },
      xanchor: 'left' as const, yanchor: 'bottom' as const, yshift: 2,
    }],
  }

  // ── Electron chart ──
  const ge2 = electrons.data?.filter((d) => d.energy === '>=2 MeV') ?? []
  const electronTraces: Plotly.Data[] = ge2.length > 0
    ? [{
        x: ge2.map((d) => d.time_tag),
        y: ge2.map((d) => d.flux),
        type: 'scattergl' as const,
        mode: 'lines' as const,
        name: '≥2 MeV',
        line: { color: '#ef4444', width: 1.5 },
        hovertemplate: '%{y:.1f} pfu<extra>≥2 MeV</extra>',
      }]
    : []

  const electronLayout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: 'Flujo Integral de Electrones',
      font: { size: 13, color: '#e2e8f0', family: 'JetBrains Mono, monospace' },
      x: 0.01,
      xanchor: 'left',
    },
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date' },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'pfu', font: { size: 11, color: '#64748b' }, standoff: 5 },
      type: 'log',
      dtick: 1,
    },
    legend: { ...PLOTLY_DARK_LAYOUT.legend, orientation: 'h', x: 0.5, xanchor: 'center', y: -0.15, font: { size: 10, color: '#94a3b8' } },
    margin: COMPACT_MARGIN,
    hovermode: 'x unified',
    shapes: [{
      type: 'line', xref: 'paper', yref: 'y',
      x0: 0, x1: 1, y0: 1000, y1: 1000,
      line: { color: '#f59e0b', width: 1.5, dash: 'dash' },
    }],
    annotations: [{
      xref: 'paper', yref: 'y', x: 1, y: 1000,
      text: 'Umbral SWPC (1000 pfu)',
      showarrow: false, font: { size: 10, color: '#f59e0b' },
      xanchor: 'right' as const, yshift: -10,
    }],
  }

  // ── X-Ray chart ──
  const longWave = xrays.data?.filter((d) => d.energy === '0.1-0.8nm') ?? []
  const shortWave = xrays.data?.filter((d) => d.energy === '0.05-0.4nm') ?? []

  const xrayTraces: Plotly.Data[] = [
    {
      x: longWave.map((d) => d.time_tag),
      y: longWave.map((d) => d.flux),
      type: 'scattergl' as const,
      mode: 'lines' as const,
      name: '0.1–0.8 nm',
      line: { color: '#ef4444', width: 1.5 },
      hovertemplate: '%{y:.2e} W/m²<extra>0.1–0.8 nm</extra>',
    },
    {
      x: shortWave.map((d) => d.time_tag),
      y: shortWave.map((d) => d.flux),
      type: 'scattergl' as const,
      mode: 'lines' as const,
      name: '0.05–0.4 nm',
      line: { color: '#3b82f6', width: 1.5 },
      hovertemplate: '%{y:.2e} W/m²<extra>0.05–0.4 nm</extra>',
    },
  ]

  const xrayShapes: Partial<Plotly.Shape>[] = FLARE_CLASSES.map((fc) => ({
    type: 'line', xref: 'paper', yref: 'y',
    x0: 1, x1: 1.01, y0: fc.value, y1: fc.value,
    line: { color: '#475569', width: 1 },
  }))

  const xrayAnnotations: Partial<Plotly.Annotations>[] = FLARE_CLASSES.map((fc) => ({
    xref: 'paper', yref: 'y', x: 1.02,
    y: Math.log10(fc.value),
    text: fc.label,
    showarrow: false,
    font: { size: 11, color: '#94a3b8', family: 'JetBrains Mono, monospace' },
    xanchor: 'left' as const, yanchor: 'middle' as const,
  }))

  const xrayLayout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: 'Flujo de Rayos X',
      font: { size: 13, color: '#e2e8f0', family: 'JetBrains Mono, monospace' },
      x: 0.01,
      xanchor: 'left',
    },
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date' },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'W/m²', font: { size: 11, color: '#64748b' }, standoff: 5 },
      type: 'log',
      range: [-9, -2],
      dtick: 1,
      exponentformat: 'power',
    },
    legend: { ...PLOTLY_DARK_LAYOUT.legend, orientation: 'h', x: 0.5, xanchor: 'center', y: -0.15, font: { size: 10, color: '#94a3b8' } },
    margin: { ...COMPACT_MARGIN, r: 40 },
    hovermode: 'x unified',
    shapes: xrayShapes,
    annotations: xrayAnnotations,
  }

  return (
    <div className="space-y-4">
      {/* Header + range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Entorno del Satélite
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            GOES · Vista combinada de partículas y rayos X · Tiempo real
          </p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Proton Flux */}
      <ChartCard title="protones" isLoading={protons.isLoading} isError={protons.isError}>
        {protons.data && protons.data.length > 0 && (
          <PlotlyChart data={protonTraces} layout={protonLayout} config={STATIC_CONFIG} className="min-h-[320px]" />
        )}
      </ChartCard>

      {/* Electron Flux */}
      <ChartCard title="electrones" isLoading={electrons.isLoading} isError={electrons.isError}>
        {electrons.data && electrons.data.length > 0 && (
          <PlotlyChart data={electronTraces} layout={electronLayout} config={STATIC_CONFIG} className="min-h-[320px]" />
        )}
      </ChartCard>

      {/* X-Ray Flux */}
      <ChartCard title="rayos X" isLoading={xrays.isLoading} isError={xrays.isError}>
        {xrays.data && xrays.data.length > 0 && (
          <PlotlyChart data={xrayTraces} layout={xrayLayout} config={STATIC_CONFIG} className="min-h-[320px]" />
        )}
      </ChartCard>

      {/* Detalles */}
      <SectionDetails>
        <p>
          La página de Entorno del Satélite proporciona una vista consolidada de las tres mediciones clave del entorno de partículas y radiación en la órbita geoestacionaria del satélite GOES: flujo de protones, flujo de electrones y flujo de rayos X.
        </p>
        <p>
          El flujo de protones muestra partículas energéticas en cuatro bandas (≥10, ≥50, ≥100, ≥500 MeV) con un umbral de evento de 10 pfu que define el inicio de una tormenta de radiación solar (escala S). El flujo de electrones (≥2 MeV) indica el riesgo de carga electrostática en satélites, con umbral de alerta en 1000 pfu.
        </p>
        <p>
          El flujo de rayos X en las bandas 0.05–0.4 nm y 0.1–0.8 nm permite la clasificación de fulguraciones solares (A, B, C, M, X). Juntos, estos indicadores proporcionan una evaluación integral del entorno de radiación espacial que afecta tanto a los satélites como a las comunicaciones terrestres.
        </p>
        <p>
          <strong>Fuente:</strong> NOAA/SWPC — <em>Satellite Environment Overview</em>
        </p>
      </SectionDetails>
    </div>
  )
}
