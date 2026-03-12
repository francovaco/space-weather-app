'use client'
// ============================================================
// src/components/instruments/ProtonFluxClient.tsx
// Interactive GOES Proton Flux chart with auto-refresh
// ============================================================
import { useState, useMemo } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { NormalizeToggle, normalizeSeries } from '@/components/ui/NormalizeToggle'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getProtonFluxData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange } from '@/types/swpc'

interface ProtonSample {
  time_tag: string
  satellite: number
  flux: number
  energy: string
}

const USAGE = [
  'Monitoreo de Eventos de Protones Solares (SPE) tras eyecciones de masa coronal (CME) o llamaradas solares',
  'Emisión de alertas y advertencias de inicio o persistencia de tormentas de radiación solar (Escala S)',
  'Evaluación de riesgos de fallos electrónicos (SEU) y daños permanentes en satélites operativos',
  'Gestión de comunicaciones de radio HF mediante el monitoreo de la ionización en casquetes polares',
  'Evaluación de dosis de radiación para tripulaciones de aviación en rutas transpolares de alta latitud',
  'Protección de astronautas en misiones espaciales tripuladas ante aumentos de partículas energéticas',
  'Entrada crítica para modelos de absorción ionosférica en la región D (D-RAP)',
]

const IMPACTS = [
  'Satélites: Aumento de la tasa de Eventos de Trastorno Único (SEU) y degradación de paneles solares',
  'Aviación: Absorción en la Región D (PCA) que bloquea comunicaciones de radio HF en zonas polares',
  'Navegación: Perturbaciones en señales satelitales que afectan la precisión de sistemas GPS y GNSS',
  'Salud Espacial: Riesgo biológico para astronautas durante actividades extravehiculares (EVA)',
  'Operaciones en Órbita: Necesidad de ejecutar maniobras de protección o apagado preventivo de sensores',
  'Comunicaciones: Interferencia y ruido en enlaces satélite-tierra durante eventos intensos',
]

const ENERGY_BANDS = [
  { energy: '>=10 MeV',  label: '≥10 MeV',  color: '#ef4444' },
  { energy: '>=50 MeV',  label: '≥50 MeV',  color: '#f59e0b' },
  { energy: '>=100 MeV', label: '≥100 MeV', color: '#3b82f6' },
  { energy: '>=500 MeV', label: '≥500 MeV', color: '#a855f7' },
]

const PROTON_ALERT_THRESHOLD = 10

export function ProtonFluxClient() {
  const [range, setRange] = useState<TimeRange>('1d')
  const [normalize, setNormalize] = useState(false)

  const { data: rawData, isLoading, isError } = useAutoRefresh<ProtonSample[]>({
    queryKey: ['proton-flux', range],
    fetcher: () => getProtonFluxData(timeRangeToParam(range)) as Promise<ProtonSample[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  // Normalize visuals while keeping data precision for tooltips
  const plotData: Plotly.Data[] = useMemo(() => {
    if (!rawData) return []
    return ENERGY_BANDS.map((band) => {
      const filtered = rawData.filter((d) => d.energy === band.energy)
      const realY = filtered.map(d => d.flux)
      const visualY = normalize ? normalizeSeries(realY) : realY
      
      return {
        x: filtered.map((d) => d.time_tag),
        y: visualY,
        customdata: realY,
        type: 'scattergl' as const,
        mode: 'lines' as const,
        name: band.label,
        line: { color: band.color, width: 1.5 },
        hovertemplate: '%{customdata:.2f} MeV<extra>' + band.label + '</extra>',
      }
    })
  }, [rawData, normalize])

  // Smart threshold and axis mapping
  const { thresholdY, yAxisConfig, labelSuffix } = useMemo(() => {
    if (!rawData) return { thresholdY: 10, yAxisConfig: { type: 'log', range: [-2, 6] }, labelSuffix: '' }
    
    if (normalize) {
      const refBand = rawData.filter(d => d.energy === '>=10 MeV').map(d => d.flux).filter(v => v !== null && !isNaN(v))
      if (refBand.length === 0) return { thresholdY: 50, yAxisConfig: { range: [0, 105] }, labelSuffix: '' }
      
      const min = Math.min(...refBand)
      const max = Math.max(...refBand)
      
      let calcY = ((PROTON_ALERT_THRESHOLD - min) / (max - min)) * 100
      const isPinned = calcY > 120
      const displayThresholdY = isPinned ? 115 : calcY
      
      const tickVals = [0, 25, 50, 75, 100]
      const tickTexts = tickVals.map(v => (min + (v / 100) * (max - min)).toFixed(2))

      return { 
        thresholdY: displayThresholdY, 
        yAxisConfig: {
          tickvals: tickVals,
          ticktext: tickTexts,
          range: [0, isPinned ? 130 : Math.max(105, calcY + 10)],
          type: 'linear'
        },
        labelSuffix: isPinned ? ' (Fuera de escala)' : ''
      }
    }
    
    return { thresholdY: 10, yAxisConfig: { type: 'log', range: [-2, 6] }, labelSuffix: '' }
  }, [rawData, normalize])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `${range}-${normalize}`,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Flujo Protones (MeV)', font: { size: 11, color: '#64748b' } },
      ...yAxisConfig,
      automargin: true,
    },
    margin: { l: 65, r: 20, t: 40, b: 85 },
    legend: {
      orientation: 'h', x: 0.5, xanchor: 'center', y: -0.2,
      font: { size: 11, color: '#94a3b8' }, bgcolor: 'transparent',
    },
    hovermode: 'x unified',
    shapes: [
      {
        type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1,
        y0: normalize ? thresholdY! : PROTON_ALERT_THRESHOLD, 
        y1: normalize ? thresholdY! : PROTON_ALERT_THRESHOLD,
        line: { color: '#ef4444', width: 1.5, dash: 'dash' },
      },
    ],
    annotations: [
      {
        xref: 'paper', yref: 'y', x: 0, 
        y: normalize ? thresholdY! : Math.log10(PROTON_ALERT_THRESHOLD),
        text: `Umbral alerta ≥10 MeV${labelSuffix}`,
        showarrow: false,
        font: { size: 10, color: '#ef4444', weight: 'bold' },
        xanchor: 'left' as const, yanchor: 'bottom' as const, yshift: 4,
      },
    ],
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Flujo de Protones</h1>
          <p className="mt-1 text-xs text-text-muted">GOES · Flujo integral en múltiples niveles de energía · Actualización cada 5 min</p>
        </div>
        <div className="flex items-center gap-3">
          <NormalizeToggle normalize={normalize} onToggle={setNormalize} />
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && !rawData && <LoadingMessage message="Cargando datos..." />}
        {isError && <ErrorMessage message="Error al cargar datos" />}
        {rawData && rawData.length === 0 && <EmptyMessage message="No hay datos de protones" />}
        {rawData && rawData.length > 0 && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>

      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El instrumento SEISS (Space Environment In Situ Suite) a bordo de la nueva generación de satélites GOES mide el flujo integral de protones energéticos en múltiples bandas de energía. Estos datos son fundamentales para la seguridad operativa en el espacio y la atmósfera superior, permitiendo la identificación de aumentos repentinos de partículas tras eyecciones de masa coronal (CME) o llamaradas solares.
        </p>
        <p>
          Una Tormenta de Radiación Solar comienza oficialmente cuando el flujo integral de protones ≥10 MeV alcanza o supera el valor de 10. El SWPC utiliza la escala S para clasificar estos eventos: S1 (Menor) en nivel 10, S2 (Moderada) en 100, S3 (Fuerte) en 1.000, S4 (Severa) en 10.000 y S5 (Extrema) en 100.000.
        </p>
        <p>
          Además del flujo de 10 MeV, se monitorean partículas de mayor energía como las de ≥100 MeV. Se emiten alertas específicas cuando este flujo supera el nivel de 1, debido a que estas partículas tienen una capacidad de penetración mucho más alta en materiales blindados y tejido biológico, representando un riesgo crítico para astronautas y electrónica sensible.
        </p>
      </SectionDetails>
    </div>
  )
}
