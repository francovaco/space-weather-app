'use client'
// ============================================================
// src/components/instruments/AnomalyMonitorClient.tsx
// Correlates GOES-19 Radiation Spikes with NASA DONKI Notifications
// ============================================================
import { useState, useMemo } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT, PLOTLY_DEFAULT_CONFIG } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getProtonFluxData, getElectronFluxData, getDONKINotifications, timeRangeToParam } from '@/lib/swpc-api'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import type { TimeRange } from '@/types/swpc'
import { AlertTriangle, Satellite, Zap, Info } from 'lucide-react'

// ── Types ─────────────────────────────────────────────

interface DONKINotification {
  messageID: string
  messageType: string
  messageIssueTime: string
  messageURL: string
  messageBody: string
}

interface FluxSample {
  time_tag: string
  flux: number
  energy: string
}

// ── Main component ────────────────────────────────────

export function AnomalyMonitorClient() {
  const [range, setRange] = useState<TimeRange>('7d')
  const param = timeRangeToParam(range)

  // Calculate startDate based on range for NASA API
  const donkiDates = useMemo(() => {
    const now = new Date()
    const end = now.toISOString().split('T')[0]
    let days = 7
    if (range === '1d') days = 1
    if (range === '3d') days = 3
    if (range === '7d') days = 7
    // For 1h and 6h, we still get at least 1 day of notifications for context
    if (range === '1h' || range === '6h') days = 1
    
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    return { start, end }
  }, [range])

  // 1. Fetch GOES-19 Proton Flux (Hazard indicator)
  const protons = useAutoRefresh<FluxSample[]>({
    queryKey: ['proton-flux-anomaly', range],
    fetcher: () => getProtonFluxData(param) as Promise<FluxSample[]>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  // 2. Fetch NASA DONKI Notifications (Impact reports)
  const donki = useAutoRefresh<DONKINotification[]>({
    queryKey: ['donki-notifications', range],
    fetcher: () => getDONKINotifications(donkiDates.start, donkiDates.end) as Promise<DONKINotification[]>,
    intervalMs: REFRESH_INTERVALS.TEN_MIN,
  })

  // 3. Filter Notifications for Spacecraft Impacts
  const relevantEvents = useMemo(() => {
    if (!donki.data) return []
    const keywords = ['spacecraft', 'impact', 'anomaly', 'operational', 'satellite', 'upset', 'seu', 'charging']
    return donki.data.filter(n => 
      keywords.some(k => n.messageBody.toLowerCase().includes(k))
    ).map(n => ({
      ...n,
      isHighPriority: n.messageBody.toLowerCase().includes('anomaly') || n.messageBody.toLowerCase().includes('upset')
    }))
  }, [donki.data])

  // 4. Prepare Plotly Traces (Protons as background)
  const plotData: Plotly.Data[] = useMemo(() => {
    const traces: Plotly.Data[] = []

    if (protons.data) {
      const energyBands = [
        { energy: '>=10 MeV', label: '≥10 MeV', color: 'rgba(239, 68, 68, 0.6)', width: 2 },
        { energy: '>=50 MeV', label: '≥50 MeV', color: 'rgba(245, 158, 11, 0.6)', width: 1.5 },
        { energy: '>=100 MeV', label: '≥100 MeV', color: 'rgba(59, 130, 246, 0.6)', width: 1.5 },
      ]

      energyBands.forEach(band => {
        const pts = protons.data!.filter(d => d.energy === band.energy)
        if (pts.length > 0) {
          traces.push({
            x: pts.map(d => d.time_tag),
            y: pts.map(d => d.flux),
            type: 'scattergl',
            mode: 'lines',
            name: `Protones ${band.label}`,
            line: { color: band.color, width: band.width },
            fill: band.energy === '>=10 MeV' ? 'tozeroy' : undefined,
            fillcolor: band.energy === '>=10 MeV' ? 'rgba(239, 68, 68, 0.03)' : undefined,
            hovertemplate: `%{y:.2f} pfu<extra>${band.label}</extra>`,
          })
        }
      })
    }

    // Add vertical lines for DONKI events
    relevantEvents.forEach((event, i) => {
      traces.push({
        x: [event.messageIssueTime, event.messageIssueTime],
        y: [0.01, 100000],
        type: 'scattergl',
        mode: 'lines',
        name: `Evento: ${event.messageID}`,
        line: { 
          color: event.isHighPriority ? '#f59e0b' : '#94a3b8', 
          width: 1, 
          dash: 'dot' 
        },
        hoverinfo: 'none',
        showlegend: false,
      })
    })

    return traces
  }, [protons.data, relevantEvents])

  // 5. Annotations for Chart
  const annotations: Partial<Plotly.Annotations>[] = useMemo(() => {
    return relevantEvents.map(event => ({
      x: event.messageIssueTime,
      y: 4, // Log scale position
      xref: 'x', yref: 'y',
      text: event.isHighPriority ? '⚠️ ANOMALÍA' : '📢 INFO',
      showarrow: true,
      arrowhead: 2,
      ax: 0, ay: -40,
      font: { size: 10, color: event.isHighPriority ? '#f59e0b' : '#94a3b8' },
      bgcolor: 'rgba(15, 23, 42, 0.8)',
      bordercolor: event.isHighPriority ? '#f59e0b' : '#475569',
    }))
  }, [relevantEvents])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: range,
    xaxis: { 
      ...PLOTLY_DARK_LAYOUT.xaxis, 
      type: 'date',
      // Explicitly set range to match proton data if available
      range: protons.data && protons.data.length > 0 
        ? [protons.data[0].time_tag, protons.data[protons.data.length-1].time_tag] 
        : undefined
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Flujo de Protones (pfu)', font: { size: 11, color: '#64748b' } },
      type: 'log',
      range: [-1, 5],
    },
    margin: { l: 60, r: 30, t: 40, b: 60 },
    hovermode: 'x unified',
    annotations,
  }

  const currentFlux = protons.data ? protons.data[protons.data.length - 1]?.flux : 0
  
  const getRiskLevel = (flux: number) => {
    if (flux >= 1000) return { label: 'Extremo', color: 'text-red-500 bg-red-500/20' }
    if (flux >= 100) return { label: 'Alto', color: 'text-orange-500 bg-orange-500/20' }
    if (flux >= 10) return { label: 'Moderado', color: 'text-amber-500 bg-amber-500/20' }
    return { label: 'Bajo', color: 'text-green-500 bg-green-500/20' }
  }

  const risk = getRiskLevel(currentFlux)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={24} />
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
              Monitor de Anomalías Satelitales
            </h1>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Correlación de reportes NASA DONKI con picos de radiación de GOES-19 (L1/GEO)
          </p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} hideHistorical />
      </div>

      {/* Main Chart */}
      <div className="card relative overflow-hidden h-[400px] flex flex-col">
        {protons.isLoading && <LoadingMessage message="Cargando datos de radiación..." />}
        {protons.isError && <ErrorMessage message="Error al cargar datos del GOES" />}
        {protons.data && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>

      {/* Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-secondary">
            <Satellite size={16} />
            Eventos y Reportes de Impacto
          </h2>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {donki.isLoading && <LoadingMessage message="Consultando NASA DONKI..." />}
            {!donki.isLoading && relevantEvents.length === 0 && (
              <EmptyMessage message="No se han reportado impactos satelitales en este periodo." />
            )}
            {relevantEvents.map((event) => (
              <div 
                key={event.messageID} 
                className={`card p-4 border-l-4 transition-colors hover:bg-white/5 ${
                  event.isHighPriority ? 'border-amber-500 bg-amber-500/5' : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="text-2xs font-mono text-text-dim uppercase">
                    {new Date(event.messageIssueTime).toLocaleString()} · {event.messageType}
                  </span>
                  <a 
                    href={event.messageURL} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:text-accent-cyan"
                  >
                    <Info size={14} />
                  </a>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                  {event.messageBody.replace(/<\/?[^>]+(>|$)/g, "")}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {event.isHighPriority && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                      <Zap size={10} /> ALTA PRIORIDAD
                    </span>
                  )}
                  <span className="text-[10px] text-text-muted">ID: {event.messageID}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Análisis de Riesgo
          </h2>
          <div className="card p-5 bg-background-secondary/50 border-primary/10">
            <div className="space-y-6">
              <div>
                <p className="text-2xs text-text-muted uppercase mb-3 tracking-widest">Flujo Actual (pfu)</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-red-400">≥10 MeV</span>
                    <span className="text-lg font-bold font-mono">
                      {protons.data ? (protons.data.filter(d => d.energy === '>=10 MeV').pop()?.flux.toFixed(2) || '0.00') : '---'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-400">≥50 MeV</span>
                    <span className="text-lg font-bold font-mono">
                      {protons.data ? (protons.data.filter(d => d.energy === '>=50 MeV').pop()?.flux.toFixed(2) || '0.00') : '---'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-400">≥100 MeV</span>
                    <span className="text-lg font-bold font-mono">
                      {protons.data ? (protons.data.filter(d => d.energy === '>=100 MeV').pop()?.flux.toFixed(2) || '0.00') : '---'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-xs font-bold text-text-primary mb-3 uppercase tracking-tighter">Probabilidad de Anomalía</h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Single Event Upsets (SEU)</span>
                    <span className={`badge-live text-[10px] border-none ${risk.color}`}>{risk.label}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Carga Superficial</span>
                    <span className={`badge-live text-[10px] border-none ${risk.color}`}>{risk.label}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Degradación Solar</span>
                    <span className={`badge-live text-[10px] border-none ${risk.color}`}>{risk.label}</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-md bg-primary/5 p-3 text-[11px] text-text-secondary border border-primary/10 italic">
                Nota: Este monitor utiliza datos de la red DONKI para identificar eventos que la NASA clasifica como riesgosos para la flota satelital operativa.
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionDetails>
        <p>
          El <strong>Monitor de Anomalías Satelitales</strong> es una herramienta de correlación cruzada que vincula las observaciones físicas del satélite GOES-19 con los reportes de eventos del <strong>NASA Community Coordinated Modeling Center (CCMC)</strong> a través del sistema DONKI.
        </p>
        <p className="mt-4">
          La radiación espacial, especialmente el flujo de protones de alta energía (SEP), es la causa principal de fallos en la electrónica de los satélites comerciales. Estos fallos pueden manifestarse como:
        </p>
        <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-text-secondary">
          <li><strong>SEU (Single Event Upsets):</strong> Corrupción de bits en la memoria o microprocesadores.</li>
          <li><strong>Latch-ups:</strong> Cortocircuitos destructivos en componentes CMOS.</li>
          <li><strong>Degradación de paneles solares:</strong> Reducción permanente de la eficiencia de conversión de energía.</li>
        </ul>
        <p className="mt-4">
          Al superponer los reportes de impacto sobre los picos de flujo de partículas, los operadores pueden identificar patrones de vulnerabilidad y prepararse para maniobras de mitigación o reinicios de sistemas preventivos.
        </p>
      </SectionDetails>
    </div>
  )
}
