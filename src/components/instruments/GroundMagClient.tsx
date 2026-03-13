'use client'
// ============================================================
// src/components/instruments/GroundMagClient.tsx
// Interactive Ground Magnetometer chart (INTERMAGNET HAPI)
// ============================================================
import { useState, useMemo, useEffect } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT } from '@/components/charts/PlotlyChart'
import { DataExporter } from '@/components/ui/DataExporter'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { DataAge } from '@/components/ui/DataAge'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import type { GroundMagReading } from '@/types/swpc'
import { Search, Globe } from 'lucide-react'

const USAGE = [
  'Monitoreo de variaciones del campo magnético en la superficie terrestre',
  'Cálculo de corrientes inducidas geomagnéticamente (GIC) en redes eléctricas',
  'Validación de modelos de tormentas geomagnéticas locales',
  'Seguimiento de pulsaciones magnéticas y tormentas de inicio súbito (SSC)',
  'Referencia para la navegación magnética y estudios geofísicos',
]

const IMPACTS = [
  'Variaciones rápidas (dB/dt) pueden dañar transformadores eléctricos',
  'Interferencia en sistemas de perforación dirigida (Oil & Gas)',
  'Degradación de la precisión en brújulas magnéticas',
  'Indicador local de la intensidad de la tormenta en curso',
]

interface StationOption {
  id: string
  iagaCode: string
  label: string
}

export function GroundMagClient() {
  const [stations, setStations] = useState<StationOption[]>([])
  const [selectedId, setSelectedId] = useState<string>('bou/best-avail/PT1M/hdzf')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)

  // Fetch station catalog on mount
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch('/api/swpc/ground-mag/catalog')
        if (!res.ok) throw new Error('Catalog failed')
        const data = await res.json()
        if (Array.isArray(data)) {
          setStations(data)
        }
      } catch (err) {
        console.error('Failed to load station catalog', err)
      } finally {
        setIsLoadingCatalog(false)
      }
    }
    fetchCatalog()
  }, [])

  const { data: samples, isLoading, isError } = useAutoRefresh<GroundMagReading[]>({
    queryKey: ['ground-mag', selectedId],
    fetcher: async () => {
      const res = await fetch(`/api/swpc/ground-mag?stationId=${encodeURIComponent(selectedId)}`)
      if (!res.ok) throw new Error('Data fetch failed')
      return res.json()
    },
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  const filteredStations = useMemo(() => {
    if (!searchTerm) return stations
    const lower = searchTerm.toLowerCase()
    return stations.filter(s => 
      s.label.toLowerCase().includes(lower) || 
      s.iagaCode.toLowerCase().includes(lower)
    )
  }, [stations, searchTerm])

  const plotData: Plotly.Data[] = useMemo(() => {
    if (!samples || !Array.isArray(samples) || samples.length === 0) return []
    return [
      {
        x: samples.map((s) => s.time_tag),
        y: samples.map((s) => s.h),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Componente H (Horiz.)', line: { color: '#22d3ee', width: 1.5 },
        hovertemplate: '%{y:.2f} nT<extra>H</extra>',
      },
      {
        x: samples.map((s) => s.time_tag),
        y: samples.map((s) => s.z),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Componente Z (Vert.)', line: { color: '#f43f5e', width: 1.5 },
        hovertemplate: '%{y:.2f} nT<extra>Z</extra>',
        visible: 'legendonly'
      },
      {
        x: samples.map((s) => s.time_tag),
        y: samples.map((s) => s.db_dt),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'dB/dt (Variación)', line: { color: '#fbbf24', width: 1 },
        hovertemplate: '%{y:.2f} nT/min<extra>dB/dt</extra>',
        yaxis: 'y2'
      },
    ]
  }, [samples])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: selectedId,
    xaxis: { 
      ...PLOTLY_DARK_LAYOUT.xaxis, 
      type: 'date', 
      automargin: true,
      title: { text: 'Tiempo Universal (UTC)', font: { size: 10, color: '#64748b' } }
    },
    yaxis: { 
      ...PLOTLY_DARK_LAYOUT.yaxis, 
      title: { text: 'Intensidad de Campo (nT)', font: { size: 11, color: '#64748b' } }, 
      autorange: true 
    },
    yaxis2: {
      title: { text: 'dB/dt (nT/min)', font: { size: 11, color: '#fbbf24' } },
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      autorange: true,
      tickfont: { color: '#fbbf24', size: 10 }
    },
    margin: { l: 60, r: 60, t: 40, b: 65 },
    hovermode: 'x unified',
    legend: { orientation: 'h', y: -0.2 }
  }

  const selectedStation = stations.find(s => s.id === selectedId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="text-primary" size={20} />
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Magnetómetros Terrestres</h1>
            <DataAge timestamp={samples?.[samples.length - 1]?.time_tag} />
          </div>
          <p className="mt-1 text-xs text-text-muted">Red Global INTERMAGNET · Datos de Superficie · Actualización cada 1 min</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input 
                type="text"
                placeholder="Buscar estación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background-tertiary text-text-primary text-xs rounded border border-border pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary w-[180px]"
              />
            </div>
            <select 
              value={selectedId} 
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={isLoadingCatalog}
              className="bg-background-tertiary text-text-primary text-xs rounded border border-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary max-w-[220px]"
            >
              {isLoadingCatalog && <option>Cargando catálogo...</option>}
              {!isLoadingCatalog && filteredStations.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
              {!isLoadingCatalog && filteredStations.length === 0 && <option disabled>No se encontraron estaciones</option>}
            </select>
          </div>
          <DataExporter 
            data={samples || []} 
            filename={`ground-mag-${selectedStation?.iagaCode || 'data'}`} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="card p-3 flex flex-col items-center justify-center bg-background-secondary/50 border-accent-cyan/20">
          <span className="text-2xs text-text-muted uppercase tracking-tighter">Observatorio</span>
          <span className="text-lg font-bold text-accent-cyan">{selectedStation?.iagaCode || '---'}</span>
        </div>
        <div className="card p-3 flex flex-col items-center justify-center bg-background-secondary/50">
          <span className="text-2xs text-text-muted uppercase tracking-tighter">Ventana Temporal</span>
          <span className="text-sm font-medium">Últimas 24 Horas</span>
        </div>
        <div className="card p-3 flex flex-col items-center justify-center bg-background-secondary/50">
          <span className="text-2xs text-text-muted uppercase tracking-tighter">Resolución</span>
          <span className="text-sm font-medium">1 Minuto</span>
        </div>
        <div className="card p-3 flex flex-col items-center justify-center bg-background-secondary/50">
          <span className="text-2xs text-text-muted uppercase tracking-tighter">Fuente</span>
          <span className="text-sm font-medium text-text-dim uppercase tracking-tighter">BGS HAPI</span>
        </div>
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && <LoadingMessage message={`Consultando red INTERMAGNET para ${selectedStation?.iagaCode || 'estación'}...`} />}
        {isError && !isLoading && <ErrorMessage message="Error al conectar con el servidor HAPI" description="Es posible que la estación seleccionada no tenga datos en tiempo real en este momento." />}
        {!isError && !isLoading && samples && (!Array.isArray(samples) || samples.length === 0) && (
          <EmptyMessage message="No hay datos disponibles para esta estación en las últimas 24 horas." />
        )}
        {!isError && !isLoading && samples && Array.isArray(samples) && samples.length > 0 && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          Los <strong>magnetómetros terrestres</strong> de la red INTERMAGNET proporcionan una visión global de cómo las corrientes en la magnetósfera y la ionósfera afectan el campo magnético en la superficie. A diferencia de los datos geoestacionarios (GOES), estos sensores capturan la respuesta local de la Tierra.
        </p>
        <p className="mt-4">
          Interpretación de componentes (HDZF):
        </p>
        <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-text-secondary">
          <li><strong>H (Horizontal):</strong> Indica la intensidad de la corriente de anillo. Caídas fuertes en H suelen coincidir con la fase principal de una tormenta geomagnética.</li>
          <li><strong>Z (Vertical):</strong> Ayuda a localizar la posición de los electrojets aurorales.</li>
          <li><strong>dB/dt:</strong> La tasa de cambio temporal del campo magnético. Valores elevados son precursores de GICs (corrientes inducidas) que pueden afectar transformadores eléctricos.</li>
        </ul>
      </SectionDetails>
    </div>
  )
}
