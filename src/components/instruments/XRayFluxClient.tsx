'use client'
// ============================================================
// src/components/instruments/XRayFluxClient.tsx
// Interactive GOES X-Ray Flux chart with auto-refresh
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
import { getXRayFluxData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange } from '@/types/swpc'

interface XRaySample {
  time_tag: string
  satellite: number
  flux: number
  observed_flux: number
  electron_correction: number
  electron_contaminaton: boolean
  energy: string
}

const USAGE = [
  'Detección y clasificación en tiempo real de fulguraciones solares',
  'Indicador primario para la emisión de alertas de Apagón de Radio (Escala R)',
  'Determinación del inicio, pico y finalización de eventos eruptivos solares',
  'Monitoreo de la actividad solar de fondo para el pronóstico de ciclos solares',
  'Entrada crítica para los modelos de absorción de la Región D (D-RAP)',
  'Evaluación del riesgo de Eventos de Partículas Energéticas (SPE) tras erupciones intensas',
  'Referencia para la calibración de sensores de actitud en satélites operativos',
]

const IMPACTS = [
  'Comunicaciones: Bloqueos de radio de alta frecuencia (HF) en el lado diurno de la Tierra',
  'Navegación: Degradación de señales LF y errores en sistemas de posicionamiento GPS/GNSS',
  'Aviación: Pérdida de comunicación en rutas transoceánicas y polares durante eventos M y X',
  'Ionósfera: Perturbaciones ionosféricas repentinas (SID) que alteran la propagación de ondas',
  'Satélites: Aumento del arrastre atmosférico en satélites de órbita baja (LEO) por expansión térmica',
  'Tecnología: Ruido e interferencia en radares de vigilancia y defensa aérea',
]

const FLARE_CLASSES = [
  { value: 1e-4, label: 'X' },
  { value: 1e-5, label: 'M' },
  { value: 1e-6, label: 'C' },
  { value: 1e-7, label: 'B' },
  { value: 1e-8, label: 'A' },
]

export function XRayFluxClient() {
  const [range, setRange] = useState<TimeRange>('6h')
  const [normalize, setNormalize] = useState(false)

  const { data: rawData, isLoading, isError, isFetching } = useAutoRefresh<XRaySample[]>({
    queryKey: ['xray-flux', range],
    fetcher: async () => {
      const data = await getXRayFluxData(timeRangeToParam(range)) as XRaySample[]
      // Ordenar por fecha ascendente
      return data.slice().sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
    },
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  const shortWave = useMemo(() => rawData?.filter((d) => d.energy === '0.05-0.4nm') ?? [], [rawData])
  const longWave = useMemo(() => rawData?.filter((d) => d.energy === '0.1-0.8nm') ?? [], [rawData])

  const plotData: Plotly.Data[] = useMemo(() => {
    return [
      {
        x: longWave.map((d) => d.time_tag),
        y: normalize ? normalizeSeries(longWave.map((d) => d.flux)) : longWave.map((d) => d.flux),
        customdata: longWave.map(d => d.flux),
        type: 'scattergl' as const, mode: 'lines' as const, name: '0.1–0.8 nm',
        line: { color: '#ef4444', width: 1.5 },
        hovertemplate: '%{customdata:.2e} W/m²<extra>0.1–0.8 nm</extra>',
      },
      {
        x: shortWave.map((d) => d.time_tag),
        y: normalize ? normalizeSeries(shortWave.map((d) => d.flux)) : shortWave.map((d) => d.flux),
        customdata: shortWave.map(d => d.flux),
        type: 'scattergl' as const, mode: 'lines' as const, name: '0.05–0.4 nm',
        line: { color: '#3b82f6', width: 1.5 },
        hovertemplate: '%{customdata:.2e} W/m²<extra>0.05–0.4 nm</extra>',
      },
    ]
  }, [longWave, shortWave, normalize])

  const { yAxisConfig, classLines, classLabels } = useMemo(() => {
    if (!rawData || longWave.length === 0) {
      return {
        yAxisConfig: { type: 'log' as const, range: [-9, -2] },
        classLines: FLARE_CLASSES.map(fc => ({ y: fc.value, label: fc.label })),
        classLabels: FLARE_CLASSES.map(fc => ({ y: fc.value, label: fc.label }))
      }
    }

    if (normalize) {
      const vals = longWave.map(d => d.flux).filter(v => v !== null && !isNaN(v))
      const min = Math.min(...vals), max = Math.max(...vals)
      const tickVals = [0, 25, 50, 75, 100]
        const tickTexts = tickVals.map(pct => {
          const val = min + (pct / 100) * (max - min)
          if (Math.abs(val) < 0.0001) {
            return val.toFixed(10)
          } else {
            return val.toFixed(6)
          }
        })
      const normalizedClasses = FLARE_CLASSES.map(fc => ({
        y: ((fc.value - min) / (max - min)) * 100,
        label: fc.label
      })).filter(c => c.y >= -10 && c.y <= 120)

      return {
        yAxisConfig: { tickvals: tickVals, ticktext: tickTexts, range: [0, 105], type: 'linear' as const },
        classLines: normalizedClasses,
        classLabels: normalizedClasses
      }
    }

    return {
      yAxisConfig: { type: 'log' as const, range: [-9, -2], dtick: 1 },
      classLines: FLARE_CLASSES.map(fc => ({ y: fc.value, label: fc.label })),
      classLabels: FLARE_CLASSES.map(fc => ({ y: fc.value, label: fc.label }))
    }
  }, [longWave, normalize, rawData])

  const layout: Partial<Plotly.Layout> = useMemo(() => ({
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `${range}-${normalize}`,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Flujo Rayos X (W/m²)', font: { size: 11, color: '#64748b' } },
      ...yAxisConfig,
      automargin: true,
    },
    margin: { l: 65, r: 40, t: 40, b: 65 },
    hovermode: 'x unified',
    shapes: classLines.map(cl => ({
      type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1,
      y0: cl.y, y1: cl.y,
      line: { color: 'rgba(71, 85, 105, 0.3)', width: 1, dash: 'dot' }
    })),
    annotations: classLabels.map(cl => ({
      xref: 'paper', yref: 'y', x: 1.01, y: cl.y,
      text: cl.label, showarrow: false,
      font: { size: 11, color: '#94a3b8', family: 'JetBrains Mono, monospace' },
      xanchor: 'left', yanchor: 'middle'
    })),
  }), [range, normalize, yAxisConfig, classLines, classLabels])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Flujo de Rayos X</h1>
            <DataAge timestamp={rawData?.[rawData.length - 1]?.time_tag} />
            {isFetching && !isLoading && <RefreshCw size={11} className="animate-spin text-accent-cyan opacity-60" />}
          </div>
          <p className="mt-1 text-xs text-text-muted">GOES-19 · Clasificación de Fulguraciones Solares · Actualización cada 1 min</p>
        </div>

        <div className="flex items-center gap-4">
          <DataExporter 
            data={rawData ? rawData.map(d => ({
              time: d.time_tag,
              flux: d.flux,
              energy: d.energy,
              satellite: d.satellite
            })) : []} 
            filename={`xray-flux-${range}`} 
          />
          <div className="flex items-center gap-3">
            <NormalizeToggle normalize={normalize} onToggle={setNormalize} />
            <TimeRangeSelector value={range} onChange={setRange} hideHistorical />
          </div>
        </div>
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && !rawData && <LoadingMessage message="Cargando datos..." />}
        {isError && <ErrorMessage message="Error al cargar datos" />}
        {rawData && rawData.length === 0 && <EmptyMessage message="No hay datos disponibles." />}
        {rawData && rawData.length > 0 && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>

      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El sensor de rayos X (XRS) a bordo de los satélites GOES mide el flujo solar en dos bandas de energía distintas: 0.05 a 0.4 nm (banda corta) y 0.1 a 0.8 nm (banda larga). Estas mediciones son la base científica para la clasificación de las fulguraciones solares en una escala logarítmica representada por las letras A, B, C, M y X.
        </p>
        <p>
          Cada letra en la escala indica un aumento de diez veces en la intensidad del flujo de rayos X. Las erupciones de clase M (moderada) y X (extrema) son las más críticas para el clima espacial terrestre, ya que pueden ionizar instantáneamente la atmósfera superior y causar apagones de radio HF que duran desde minutos hasta horas.
        </p>
        <p>
          Los datos del canal de onda larga (0.1–0.8 nm) se utilizan directamente para determinar el nivel de la Escala R de NOAA (Radio Blackouts). Un evento R1 (menor) comienza cuando el flujo alcanza el nivel M1 (1e-5 W/m²), mientras que un evento R5 (extremo) se activa con niveles X20 o superiores, provocando el colapso total de las comunicaciones por radio en todo el lado diurno del planeta.
        </p>
      </SectionDetails>
    </div>
  )
}
