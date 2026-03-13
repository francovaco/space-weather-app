'use client'

import { useState, useMemo } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { 
  getXRayFluxData, 
  getProtonFluxData, 
  getElectronFluxData, 
  getMagnetometerData,
  timeRangeToParam 
} from '@/lib/swpc-api'
import { LoadingMessage, ErrorMessage } from '@/components/ui/StatusMessages'
import { Layout, Data } from 'plotly.js'
import { Activity, Zap, Radio, Gauge, barChart as BarChart3, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type InstrumentType = 'xray' | 'proton' | 'electron' | 'mag'

interface InstrumentInfo {
  id: InstrumentType
  label: string
  unit: string
  color: string
  icon: any
  fetcher: (range: string) => Promise<any>
  getY: (data: any) => number[]
  getX: (data: any) => string[]
  scaleType: 'log' | 'linear'
}

const INSTRUMENTS: Record<InstrumentType, InstrumentInfo> = {
  xray: {
    id: 'xray',
    label: 'Rayos X (Largo)',
    unit: 'W/m²',
    color: '#ef4444',
    icon: Zap,
    fetcher: (r) => getXRayFluxData(r),
    getX: (data) => data.filter((d: any) => d.energy === '0.1-0.8nm').map((d: any) => d.time_tag),
    getY: (data) => data.filter((d: any) => d.energy === '0.1-0.8nm').map((d: any) => d.flux),
    scaleType: 'log'
  },
  proton: {
    id: 'proton',
    label: 'Protones (≥10 MeV)',
    unit: 'pfu',
    color: '#fbbf24',
    icon: Activity,
    fetcher: (r) => getProtonFluxData(r),
    getX: (data) => data.filter((d: any) => d.energy === '>=10 MeV').map((d: any) => d.time_tag),
    getY: (data) => data.filter((d: any) => d.energy === '>=10 MeV').map((d: any) => d.flux),
    scaleType: 'log'
  },
  electron: {
    id: 'electron',
    label: 'Electrones (≥2 MeV)',
    unit: 'pfu',
    color: '#3b82f6',
    icon: Radio,
    fetcher: (r) => getElectronFluxData(r),
    getX: (data) => data.filter((d: any) => d.energy === '>=2 MeV').map((d: any) => d.time_tag),
    getY: (data) => data.filter((d: any) => d.energy === '>=2 MeV').map((d: any) => d.flux),
    scaleType: 'log'
  },
  mag: {
    id: 'mag',
    label: 'Magnetómetro (Total)',
    unit: 'nT',
    color: '#22d3ee',
    icon: Gauge,
    fetcher: (r) => getMagnetometerData(r),
    getX: (data) => data.map((d: any) => d.time_tag),
    getY: (data) => data.map((d: any) => d.total),
    scaleType: 'linear'
  }
}

/** Robust normalization: scales numeric values to 0-100 */
function normalizeValues(values: number[]): number[] {
  if (!values || values.length === 0) return []
  const clean = values.filter(v => v !== null && !isNaN(v) && isFinite(v))
  if (clean.length === 0) return values
  
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  
  if (max === min) return values.map(() => 50) 
  return values.map(v => {
    if (v === null || isNaN(v) || !isFinite(v)) return null as any
    return ((v - min) / (max - min)) * 100
  })
}

export function ComparisonClient() {
  const [range, setRange] = useState<any>('1d')
  const [instA, setInstA] = useState<InstrumentType>('xray')
  const [instB, setInstB] = useState<InstrumentType>('proton')
  const [normalize, setNormalize] = useState(true)

  const queryA = useAutoRefresh({
    queryKey: ['compare', instA, range],
    fetcher: () => INSTRUMENTS[instA].fetcher(timeRangeToParam(range)),
    intervalMs: REFRESH_INTERVALS.FIVE_MIN
  })

  const queryB = useAutoRefresh({
    queryKey: ['compare', instB, range],
    fetcher: () => INSTRUMENTS[instB].fetcher(timeRangeToParam(range)),
    intervalMs: REFRESH_INTERVALS.FIVE_MIN
  })

  const plotData = useMemo(() => {
    const data: Data[] = []
    
    if (queryA.data) {
      const yOrig = INSTRUMENTS[instA].getY(queryA.data)
      const yValues = normalize ? normalizeValues(yOrig) : yOrig
      const xValues = INSTRUMENTS[instA].getX(queryA.data)

      data.push({
        x: xValues,
        y: yValues,
        name: INSTRUMENTS[instA].label,
        type: 'scattergl',
        mode: 'lines',
        line: { color: INSTRUMENTS[instA].color, width: 2 },
        yaxis: 'y',
        hovertemplate: normalize ? '%{x}<br>%{y:.1f}% del máximo<extra>Inst. A</extra>' : `%{y:.2e} ${INSTRUMENTS[instA].unit}<extra>Inst. A</extra>`
      })
    }

    if (queryB.data) {
      const yOrig = INSTRUMENTS[instB].getY(queryB.data)
      const yValues = normalize ? normalizeValues(yOrig) : yOrig
      const xValues = INSTRUMENTS[instB].getX(queryB.data)

      data.push({
        x: xValues,
        y: yValues,
        name: INSTRUMENTS[instB].label,
        type: 'scattergl',
        mode: 'lines',
        line: { color: INSTRUMENTS[instB].color, width: 2 },
        yaxis: 'y2',
        hovertemplate: normalize ? '%{x}<br>%{y:.1f}% del máximo<extra>Inst. B</extra>' : `%{y:.2e} ${INSTRUMENTS[instB].unit}<extra>Inst. B</extra>`
      })
    }

    return data
  }, [queryA.data, queryB.data, instA, instB, normalize])

  const layout: Partial<Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: `${instA}-${instB}-${normalize}`, 
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      type: 'date',
      title: 'Tiempo Universal (UTC)'
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { 
        text: normalize ? `${INSTRUMENTS[instA].label} (%)` : `${INSTRUMENTS[instA].label} (${INSTRUMENTS[instA].unit})`, 
        font: { color: INSTRUMENTS[instA].color, size: 11 } 
      },
      type: normalize ? 'linear' : INSTRUMENTS[instA].scaleType,
      side: 'left',
      showgrid: true,
      autorange: true,
      zeroline: false
    },
    yaxis2: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { 
        text: normalize ? `${INSTRUMENTS[instB].label} (%)` : `${INSTRUMENTS[instB].label} (${INSTRUMENTS[instB].unit})`, 
        font: { color: INSTRUMENTS[instB].color, size: 11 } 
      },
      type: normalize ? 'linear' : INSTRUMENTS[instB].scaleType,
      side: 'right',
      overlaying: 'y',
      showgrid: false,
      autorange: true,
      zeroline: false
    },
    legend: { ...PLOTLY_DARK_LAYOUT.legend, orientation: 'h', y: -0.25 },
    margin: { l: 60, r: 60, t: 40, b: 100 },
    hovermode: 'x unified'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
            Análisis Comparativo
          </h1>
          <p className="mt-1 text-xs text-text-muted italic">
            Superposición de instrumentos para identificar correlaciones temporales.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-background-secondary border border-border pl-3 pr-2 py-1 rounded-lg shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-text-dim">Normalizar</span>
            <button
              onClick={() => setNormalize(!normalize)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                normalize ? "bg-primary shadow-glow-blue" : "bg-slate-700"
              )}
            >
              <span className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200",
                normalize ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>
          <TimeRangeSelector value={range} onChange={setRange} hideHistorical />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selector A */}
        <div className="card p-4 space-y-3 shadow-glow-blue/5">
          <p className="section-label text-accent-cyan">Instrumento A (Eje Izquierdo)</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(INSTRUMENTS).map(inst => (
              <button
                key={inst.id}
                onClick={() => setInstA(inst.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-medium",
                  instA === inst.id 
                    ? "bg-white/10 border-accent-cyan text-text-primary shadow-glow-blue/20" 
                    : "bg-background-secondary border-border text-text-muted hover:border-white/20"
                )}
              >
                <inst.icon size={14} style={{ color: inst.color }} />
                {inst.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector B */}
        <div className="card p-4 space-y-3 shadow-glow-orange/5">
          <p className="section-label text-accent-amber">Instrumento B (Eje Derecho)</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(INSTRUMENTS).map(inst => (
              <button
                key={inst.id}
                onClick={() => setInstB(inst.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-medium",
                  instB === inst.id 
                    ? "bg-white/10 border-accent-amber text-text-primary shadow-glow-orange/20" 
                    : "bg-background-secondary border-border text-text-muted hover:border-white/20"
                )}
              >
                <inst.icon size={14} style={{ color: inst.color }} />
                {inst.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico Comparativo */}
      <div className="card relative min-h-[500px]">
        {(queryA.isLoading || queryB.isLoading) && <LoadingMessage message="Sincronizando flujos de datos..." />}
        <PlotlyChart 
          data={plotData} 
          layout={layout} 
          className="h-[500px]" 
          loading={queryA.isLoading || queryB.isLoading} 
        />
      </div>

      <div className="rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 p-4 flex gap-3 shadow-glow-blue/5">
        <Info className="text-accent-cyan shrink-0" size={18} />
        <div className="text-xs text-text-secondary leading-relaxed">
          <p className="font-bold text-accent-cyan mb-1 uppercase tracking-wider">¿Cómo interpretar este gráfico?</p>
          <p>
            El modo comparativo permite observar la relación causa-efecto en el clima espacial. Por ejemplo, una fulguración masiva visible en el 
            <strong> Flujo de Rayos X</strong> (Instrumento A) suele ser seguida minutos u horas después por un aumento en el 
            <strong> Flujo de Protones</strong> (Instrumento B), indicando la llegada de una tormenta de radiación solar.
          </p>
        </div>
      </div>
    </div>
  )
}
