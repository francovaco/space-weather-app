'use client'
// ============================================================
// src/components/instruments/SolarCycleClient.tsx
// Solar Cycle Progression — observed + predicted SSN & F10.7
// ============================================================
import { useMemo, useState } from 'react'
import { RefreshCw, Sun, TrendingUp, Activity, Radio } from 'lucide-react'
import { LoadingMessage, ErrorMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT } from '@/components/charts/PlotlyChart'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getSolarCycleData } from '@/lib/swpc-api'
import type { SolarCycleData, SolarCycleObserved, SolarCyclePredicted } from '@/types/swpc'

const USAGE = [
  'Seguimiento de la actividad solar a lo largo del ciclo de 11 años',
  'Planificación de misiones espaciales según la fase del ciclo solar',
  'Predicción del nivel de arrastre atmosférico en satélites de órbita baja (LEO)',
  'Evaluación del riesgo de tormentas geomagnéticas y llamaradas solares',
  'Referencia para ingenieros de sistemas de energía eléctrica y comunicaciones',
  'Calibración de modelos ionosféricos y predicciones de propagación de radio HF',
]

const IMPACTS = [
  'Máximo solar: mayor frecuencia de llamaradas X y eyecciones de masa coronal (CME)',
  'Aumento de manchas solares → incremento de radiación UV/EUV que perturba la ionósfera',
  'Mayor arrastre atmosférico en satélites LEO durante el máximo solar',
  'Incremento de corrientes inducidas geomagnéticamente (GIC) en infraestructuras',
  'Degradación de señales GPS y comunicaciones HF durante períodos de alta actividad',
  'El flujo F10.7 elevado indica mayor irradiancia solar que afecta sistemas terrestres',
]

type ChartTab = 'ssn' | 'f10.7'

function StatCard({
  icon,
  label,
  value,
  sub,
  color = '#22d3ee',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="info-block flex items-start gap-3 p-3">
      <span style={{ color }} className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xs text-text-muted">{label}</p>
        <p className="font-display text-base font-bold" style={{ color }}>
          {value}
        </p>
        {sub && <p className="text-2xs text-text-muted">{sub}</p>}
      </div>
    </div>
  )
}

export function SolarCycleClient() {
  const [activeTab, setActiveTab] = useState<ChartTab>('ssn')

  const { data, isLoading, isError, isFetching } = useAutoRefresh<SolarCycleData>({
    queryKey: ['solar-cycle'],
    fetcher: getSolarCycleData,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  // Derive stats from observed data
  const stats = useMemo(() => {
    if (!data?.observed?.length) return null
    const obs = data.observed.filter((d) => d.observed_swpc_ssn !== null)
    const latest = obs[obs.length - 1]
    const latestSSN = latest?.observed_swpc_ssn ?? latest?.ssn ?? 0
    const latestF107 = latest?.['f10.7'] ?? 0
    const maxSSN = Math.max(...obs.map((d) => d.observed_swpc_ssn ?? d.ssn ?? 0))
    const maxEntry = obs.find(
      (d) => (d.observed_swpc_ssn ?? d.ssn ?? 0) === maxSSN,
    )
    const latestDate = latest?.['time-tag'] ?? ''

    // Predicted max
    const pred = data.predicted ?? []
    const maxPredSSN = pred.length ? Math.max(...pred.map((d) => d.predicted_ssn)) : 0

    return { latestSSN, latestF107, maxSSN, maxEntry, latestDate, maxPredSSN }
  }, [data])

  // -1.0 means "no data" in NOAA's API — convert to null so Plotly shows gaps
  const valid = (v: number | null) => (v === null || v === -1.0 ? null : v)

  // Default x range: Cycle 24 start → end of predictions
  const predEndDate = data?.predicted?.at(-1)?.['time-tag'] ?? '2031-12'
  const DEFAULT_XRANGE: [string, string] = ['2008-01-01', `${predEndDate}-28`]

  // SSN chart
  const ssnPlotData: Plotly.Data[] = useMemo(() => {
    if (!data) return []
    const obs: SolarCycleObserved[] = data.observed ?? []
    const pred: SolarCyclePredicted[] = data.predicted ?? []

    // Observed monthly SSN (use observed_swpc_ssn when valid, else ssn)
    const obsMonthly: Plotly.Data = {
      x: obs.map((d) => d['time-tag']),
      y: obs.map((d) => valid(d.observed_swpc_ssn) ?? valid(d.ssn)),
      type: 'scatter',
      mode: 'lines',
      name: 'Manchas observadas (mensual)',
      connectgaps: false,
      line: { color: 'rgba(34,211,238,0.4)', width: 1 },
      hovertemplate: '%{x|%b %Y}: <b>%{y}</b><extra></extra>',
    }

    // Smoothed SSN
    const obsSmoothed: Plotly.Data = {
      x: obs.map((d) => d['time-tag']),
      y: obs.map((d) => valid(d.smoothed_swpc_ssn) ?? valid(d.smoothed_ssn)),
      type: 'scatter',
      mode: 'lines',
      name: 'SSN suavizado (observado)',
      connectgaps: false,
      line: { color: '#22d3ee', width: 2.5 },
      hovertemplate: '%{x|%b %Y}: <b>%{y:.1f}</b><extra></extra>',
    }

    // Predicted high band (filled area top)
    const predHigh: Plotly.Data = {
      x: pred.map((d) => d['time-tag']),
      y: pred.map((d) => d.high_ssn),
      type: 'scatter',
      mode: 'lines',
      name: 'Predicción alta',
      line: { color: 'transparent', width: 0 },
      showlegend: false,
      hoverinfo: 'skip',
    }

    // Predicted low band (fill to above trace)
    const predLow: Plotly.Data = {
      x: pred.map((d) => d['time-tag']),
      y: pred.map((d) => d.low_ssn),
      type: 'scatter',
      mode: 'lines',
      name: 'Rango predicción',
      fill: 'tonexty',
      fillcolor: 'rgba(251,146,60,0.15)',
      line: { color: 'transparent', width: 0 },
      hovertemplate: '%{x|%b %Y}: <b>%{y}</b><extra>Bajo</extra>',
    }

    // Predicted center line
    const predCenter: Plotly.Data = {
      x: pred.map((d) => d['time-tag']),
      y: pred.map((d) => d.predicted_ssn),
      type: 'scatter',
      mode: 'lines',
      name: 'SSN predicho (SWPC)',
      line: { color: '#fb923c', width: 2, dash: 'dot' },
      hovertemplate: '%{x|%b %Y}: <b>%{y}</b><extra>Predicción</extra>',
    }

    return [obsMonthly, obsSmoothed, predHigh, predLow, predCenter]
  }, [data])

  // F10.7 chart
  const f107PlotData: Plotly.Data[] = useMemo(() => {
    if (!data) return []
    const obs: SolarCycleObserved[] = data.observed ?? []
    const pred: SolarCyclePredicted[] = data.predicted ?? []

    const obsF107: Plotly.Data = {
      x: obs.map((d) => d['time-tag']),
      y: obs.map((d) => valid(d['f10.7'])),
      type: 'scatter',
      mode: 'lines',
      name: 'F10.7 observado (mensual)',
      connectgaps: false,
      line: { color: 'rgba(167,139,250,0.4)', width: 1 },
      hovertemplate: '%{x|%b %Y}: <b>%{y} sfu</b><extra></extra>',
    }

    const obsSmoothedF107: Plotly.Data = {
      x: obs.map((d) => d['time-tag']),
      y: obs.map((d) => valid(d['smoothed_f10.7'])),
      type: 'scatter',
      mode: 'lines',
      name: 'F10.7 suavizado',
      connectgaps: false,
      line: { color: '#a78bfa', width: 2.5 },
      hovertemplate: '%{x|%b %Y}: <b>%{y:.1f} sfu</b><extra></extra>',
    }

    const predF107High: Plotly.Data = {
      x: pred.map((d) => d['time-tag']),
      y: pred.map((d) => d['high_f10.7']),
      type: 'scatter',
      mode: 'lines',
      name: 'F10.7 predicción alta',
      line: { color: 'transparent', width: 0 },
      showlegend: false,
      hoverinfo: 'skip',
    }

    const predF107Low: Plotly.Data = {
      x: pred.map((d) => d['time-tag']),
      y: pred.map((d) => d['low_f10.7']),
      type: 'scatter',
      mode: 'lines',
      name: 'Rango predicción F10.7',
      fill: 'tonexty',
      fillcolor: 'rgba(251,146,60,0.15)',
      line: { color: 'transparent', width: 0 },
      hovertemplate: '%{x|%b %Y}: <b>%{y} sfu</b><extra>Bajo</extra>',
    }

    const predF107: Plotly.Data = {
      x: pred.map((d) => d['time-tag']),
      y: pred.map((d) => d['predicted_f10.7']),
      type: 'scatter',
      mode: 'lines',
      name: 'F10.7 predicho',
      line: { color: '#fb923c', width: 2, dash: 'dot' },
      hovertemplate: '%{x|%b %Y}: <b>%{y} sfu</b><extra>Predicción</extra>',
    }

    return [obsF107, obsSmoothedF107, predF107High, predF107Low, predF107]
  }, [data])

  const ssnLayout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: 'solar-cycle-ssn',
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      type: 'date',
      automargin: true,
      range: DEFAULT_XRANGE,
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Número de Manchas Solares (SSN)', font: { size: 11, color: '#64748b' } },
      rangemode: 'tozero',
      automargin: true,
    },
    margin: { l: 60, r: 30, t: 40, b: 65 },
    hovermode: 'x unified',
    legend: { orientation: 'h', y: -0.18, font: { size: 10 } },
  }

  const f107Layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: 'solar-cycle-f107',
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      type: 'date',
      automargin: true,
      range: DEFAULT_XRANGE,
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Flujo Radio F10.7 (sfu)', font: { size: 11, color: '#64748b' } },
      rangemode: 'tozero',
      automargin: true,
    },
    margin: { l: 60, r: 30, t: 40, b: 65 },
    hovermode: 'x unified',
    legend: { orientation: 'h', y: -0.18, font: { size: 10 } },
  }

  const latestTimestamp = data?.observed?.[data.observed.length - 1]?.['time-tag']
  const latestMonthLabel = latestTimestamp
    ? new Date(`${latestTimestamp}-15`).toLocaleDateString('es', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
              Progresión del Ciclo Solar
            </h1>
            {latestMonthLabel && (
              <span className="font-mono text-[10px] uppercase tracking-tighter text-text-muted">
                Último dato: {latestMonthLabel}
              </span>
            )}
            {isFetching && !isLoading && (
              <RefreshCw size={11} className="animate-spin text-accent-cyan opacity-60" />
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            NOAA/SWPC · Ciclo Solar 25 · Manchas solares y flujo F10.7 · Actualización mensual
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Sun size={16} />}
          label="SSN actual (suavizado)"
          value={stats?.latestSSN?.toFixed(1) ?? '—'}
          sub={stats?.latestDate ? new Date(stats.latestDate).toLocaleDateString('es', { month: 'short', year: 'numeric' }) : undefined}
          color="#22d3ee"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Máx. observado Ciclo 25"
          value={stats?.maxSSN?.toFixed(1) ?? '—'}
          sub={
            stats?.maxEntry?.['time-tag']
              ? new Date(stats.maxEntry['time-tag']).toLocaleDateString('es', { month: 'short', year: 'numeric' })
              : undefined
          }
          color="#34d399"
        />
        <StatCard
          icon={<Activity size={16} />}
          label="Máx. predicho SWPC"
          value={stats?.maxPredSSN?.toFixed(0) ?? '—'}
          sub="Predicción oficial"
          color="#fb923c"
        />
        <StatCard
          icon={<Radio size={16} />}
          label="F10.7 actual"
          value={stats?.latestF107 ? `${stats.latestF107.toFixed(1)} sfu` : '—'}
          sub="Flujo radio 10.7 cm"
          color="#a78bfa"
        />
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab('ssn')}
          className={`rounded py-2 text-xs font-medium transition-colors ${
            activeTab === 'ssn'
              ? 'bg-accent-cyan/20 text-accent-cyan'
              : 'bg-background-secondary text-text-muted hover:text-text-secondary'
          }`}
        >
          Manchas Solares (SSN)
        </button>
        <button
          onClick={() => setActiveTab('f10.7')}
          className={`rounded py-2 text-xs font-medium transition-colors ${
            activeTab === 'f10.7'
              ? 'bg-accent-purple/20 text-accent-purple'
              : 'bg-background-secondary text-text-muted hover:text-text-secondary'
          }`}
        >
          Flujo Radio F10.7
        </button>
      </div>

      {/* Chart */}
      <div className="card relative overflow-hidden flex flex-col" style={{ height: 480, minHeight: 480 }}>
        {isLoading && !data && <LoadingMessage message="Cargando datos del ciclo solar..." />}
        {isError && <ErrorMessage message="Error al cargar datos del ciclo solar" />}
        {data && activeTab === 'ssn' && (
          <PlotlyChart data={ssnPlotData} layout={ssnLayout} className="flex-1 w-full" />
        )}
        {data && activeTab === 'f10.7' && (
          <PlotlyChart data={f107PlotData} layout={f107Layout} className="flex-1 w-full" />
        )}
      </div>

      {/* Legend note */}
      <div className="flex flex-wrap gap-4 text-2xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded" style={{ background: '#22d3ee' }} />
          SSN suavizado observado
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-5 rounded"
            style={{ background: '#fb923c', borderTop: '1px dashed #fb923c' }}
          />
          Predicción SWPC (línea punteada)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded opacity-40"
            style={{ background: '#fb923c' }}
          />
          Rango de predicción (banda)
        </span>
      </div>

      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El ciclo solar es una variación periódica de aproximadamente 11 años en la actividad del Sol, medida por el número de manchas solares (SSN — Sunspot Number). El Ciclo Solar 25 comenzó en diciembre de 2019 según el Panel Internacional de Predicción del Ciclo Solar (ISES).
        </p>
        <p>
          El <strong className="text-text-primary">Número de Manchas Solares (SSN)</strong> es el indicador primario del ciclo solar. NOAA/SWPC publica datos mensuales observados del Centro Mundial de Datos para el Índice de Manchas Solares (SIDC, Bruselas) y una versión suavizada con promedio de 13 meses. Los valores predichos incluyen un rango de incertidumbre alto-bajo.
        </p>
        <p>
          El <strong className="text-text-primary">Flujo F10.7</strong> (radio solar a 10.7 cm, en unidades de flujo solar — sfu) es un proxy confiable de la actividad solar UV/EUV que no requiere observación óptica. Un F10.7 alto indica mayor irradiancia solar que perturba la ionósfera, aumenta el arrastre en satélites LEO y afecta las comunicaciones HF.
        </p>
        <p>
          Durante el <strong className="text-text-primary">máximo solar</strong> (pico del ciclo), la frecuencia de llamaradas X, CMEs y tormentas geomagnéticas alcanza su máximo. El mínimo solar representa el período de menor actividad entre dos ciclos consecutivos. El Ciclo 25 ha superado las predicciones iniciales y actualmente se perfila más activo de lo esperado.
        </p>
      </SectionDetails>
    </div>
  )
}
