'use client'
// ============================================================
// src/components/instruments/AuroraMap.tsx
// Interactive Aurora Map using Plotly (Geo/Globe) - No Token Required
// ============================================================
import { useMemo, useState } from 'react'
import { PlotlyChart, PLOTLY_DARK_LAYOUT } from '@/components/charts/PlotlyChart'
import { LoadingMessage, ErrorMessage } from '@/components/ui/StatusMessages'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getLatestAuroraData } from '@/lib/swpc-api'
import { Globe as GlobeIcon, Map as MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuroraData {
  'Observation Time': string
  'Forecast Time': string
  'Data Format': string
  coordinates: [number, number, number][]
}

export function AuroraMap() {
  const [projection, setProjection] = useState<'orthographic' | 'natural earth'>('orthographic')
  
  const { data, isLoading, isError } = useAutoRefresh<AuroraData>({
    queryKey: ['aurora-latest-data'],
    fetcher: () => getLatestAuroraData() as Promise<AuroraData>,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  const plotData: Plotly.Data[] = useMemo(() => {
    if (!data || !data.coordinates) return []

    // Filter points with probability > 5 to improve performance and look
    const activePoints = data.coordinates.filter(c => c[2] > 5)
    
    const lons = activePoints.map(c => c[0] > 180 ? c[0] - 360 : c[0])
    const lats = activePoints.map(c => c[1])
    const probs = activePoints.map(c => c[2])

    return [
      {
        type: 'scattergeo',
        lon: lons,
        lat: lats,
        mode: 'markers',
        marker: {
          size: projection === 'orthographic' ? 3 : 4,
          opacity: 0.7,
          color: probs,
          colorscale: [
            [0, 'rgba(34, 197, 94, 0.1)'],
            [0.2, '#22c55e'],
            [0.5, '#eab308'],
            [1, '#ef4444']
          ],
          showscale: false
        },
        text: probs.map(p => `Probabilidad: ${p}%`),
        hoverinfo: 'text+lon+lat'
      }
    ]
  }, [data, projection])

  const layout: Partial<Plotly.Layout> = useMemo(() => ({
    ...PLOTLY_DARK_LAYOUT,
    margin: { t: 10, b: 10, l: 10, r: 10 },
    height: 600,
    showlegend: false,
    geo: {
      projection: {
        type: projection
      },
      showland: true,
      landcolor: '#0f172a',
      showocean: true,
      oceancolor: '#020617',
      showcountries: true,
      countrycolor: '#334155',
      showlakes: true,
      lakecolor: '#020617',
      bgcolor: 'rgba(0,0,0,0)',
      resolution: 50,
      lonaxis: { showgrid: true, gridcolor: 'rgba(255,255,255,0.05)' },
      lataxis: { showgrid: true, gridcolor: 'rgba(255,255,255,0.05)' }
    }
  }), [projection])

  return (
    <div className="relative card overflow-hidden border border-primary/20 bg-slate-950 p-0">
      {/* Projection Switcher */}
      <div className="absolute top-4 left-4 z-20 flex bg-slate-900/80 p-1 rounded-md border border-white/10 backdrop-blur-md">
        <button 
          onClick={() => setProjection('orthographic')}
          className={cn(
            "p-1.5 rounded transition-all",
            projection === 'orthographic' ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
          )}
          title="Vista Global 3D"
        >
          <GlobeIcon size={16} />
        </button>
        <button 
          onClick={() => setProjection('natural earth')}
          className={cn(
            "p-1.5 rounded transition-all",
            projection === 'natural earth' ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
          )}
          title="Vista Plana"
        >
          <MapIcon size={16} />
        </button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <LoadingMessage message="Sincronizando óvalo auroral..." />
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <ErrorMessage message="Error al renderizar proyección geográfica" />
        </div>
      )}

      <div className="w-full h-[600px]">
        {data && <PlotlyChart data={plotData} layout={layout} config={{ scrollZoom: true, displayModeBar: false }} className="w-full h-full" />}
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-6 left-6 p-4 bg-slate-900/90 border border-white/10 rounded-lg backdrop-blur-md z-10 shadow-2xl">
        <h3 className="text-xs font-bold text-white uppercase mb-3 tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          OVALO AURORAL
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-32 h-2.5 bg-gradient-to-r from-green-500/20 via-yellow-500 to-red-500 rounded-full border border-white/5" />
            <span className="text-[10px] font-mono text-text-muted">0 - 100%</span>
          </div>
          {data && (
            <div className="space-y-1 pt-2 border-t border-white/5">
              <div className="text-[9px] text-text-dim flex justify-between gap-4">
                <span className="uppercase tracking-tighter">Observación:</span>
                <span className="font-mono">{new Date(data['Observation Time']).toLocaleTimeString()}</span>
              </div>
              <div className="text-[9px] text-text-dim flex justify-between gap-4">
                <span className="uppercase tracking-tighter">Pronóstico:</span>
                <span className="font-mono">{new Date(data['Forecast Time']).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
