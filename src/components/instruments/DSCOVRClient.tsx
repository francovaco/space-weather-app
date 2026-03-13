'use client'
// ============================================================
// src/components/instruments/DSCOVRClient.tsx
// Interactive DSCOVR IMF (Interplanetary Magnetic Field) chart
// ============================================================
import { useState, useMemo } from 'react'
import { LoadingMessage, ErrorMessage, EmptyMessage } from '@/components/ui/StatusMessages'
import { PlotlyChart, PLOTLY_DARK_LAYOUT } from '@/components/charts/PlotlyChart'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { DataExporter } from '@/components/ui/DataExporter'
import { UsageImpacts } from '@/components/ui/UsageImpacts'
import { SectionDetails } from '@/components/ui/SectionDetails'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getDSCOVRMagData, timeRangeToParam } from '@/lib/swpc-api'
import type { TimeRange, DSCOVRMagReading } from '@/types/swpc'

const USAGE = [
  'Monitoreo del campo magnético interplanetario (IMF) en el punto L1',
  'Identificación de la orientación Bz (clave para tormentas geomagnéticas)',
  'Detección de estructuras magnéticas en CMEs (Eyecciones de Masa Coronal)',
  'Previsión a corto plazo (15-60 min) de actividad auroral',
  'Seguimiento de sectores del campo magnético solar (HCS crossings)',
  'Detección de ondas de choque interplanetarias y discontinuidades',
]

const IMPACTS = [
  'Bz hacia el sur (negativo) facilita la reconexión magnética con la Tierra',
  'Grandes valores de Bt indican campos comprimidos o CMEs potentes',
  'Las rotaciones bruscas de Bz pueden desencadenar subtormentas rápidas',
  'Permite alertar sobre posibles impactos geomagnéticos antes de que lleguen a la Tierra',
  'Crucial para el modelo OVATION de predicción de auroras',
]

export function DSCOVRClient() {
  const [range, setRange] = useState<TimeRange>('6h')

  const { data: samples, isLoading, isError } = useAutoRefresh<DSCOVRMagReading[]>({
    queryKey: ['dscovr-mag', range],
    fetcher: () => getDSCOVRMagData(timeRangeToParam(range)) as Promise<DSCOVRMagReading[]>,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  const plotData: Plotly.Data[] = useMemo(() => {
    if (!samples) return []
    return [
      {
        x: samples.map((s) => s.time_tag),
        y: samples.map((s) => s.bx),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Bx (Sol-Tierra)', line: { color: '#94a3b8', width: 1 },
        hovertemplate: '%{y:.2f} nT<extra>Bx</extra>',
        visible: 'legendonly'
      },
      {
        x: samples.map((s) => s.time_tag),
        y: samples.map((s) => s.by),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'By (Órbita)', line: { color: '#38bdf8', width: 1 },
        hovertemplate: '%{y:.2f} nT<extra>By</extra>',
        visible: 'legendonly'
      },
      {
        x: samples.map((s) => s.time_tag),
        y: samples.map((s) => s.bz),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Bz (Norte-Sur)', line: { color: '#ef4444', width: 2 },
        hovertemplate: '%{y:.2f} nT<extra>Bz</extra>',
      },
      {
        x: samples.map((s) => s.time_tag),
        y: samples.map((s) => s.bt),
        type: 'scattergl' as const, mode: 'lines' as const, name: 'Bt (Total)', line: { color: '#f59e0b', width: 2 },
        hovertemplate: '%{y:.2f} nT<extra>Bt</extra>',
      },
    ]
  }, [samples])

  const layout: Partial<Plotly.Layout> = {
    ...PLOTLY_DARK_LAYOUT,
    uirevision: range,
    xaxis: { ...PLOTLY_DARK_LAYOUT.xaxis, type: 'date', automargin: true },
    yaxis: { 
      ...PLOTLY_DARK_LAYOUT.yaxis, 
      title: { text: 'Campo Magnético IMF (nT)', font: { size: 11, color: '#64748b' } }, 
      autorange: true, 
      automargin: true 
    },
    margin: { l: 60, r: 20, t: 40, b: 65 },
    hovermode: 'x unified',
    // Add a zero line for Bz
    shapes: [
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: 0,
        y1: 0,
        line: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1,
          dash: 'dot'
        }
      }
    ]
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">DSCOVR / IMF</h1>
          <p className="mt-1 text-xs text-text-muted">Punto de Lagrange L1 · Campo Magnético Interplanetario · Actualización cada 1 min</p>
        </div>
        <div className="flex items-center gap-4">
          <DataExporter 
            data={samples?.map(s => ({
              time: s.time_tag,
              Bx: s.bx,
              By: s.by,
              Bz: s.bz,
              Bt: s.bt
            })) || []} 
            filename={`dscovr-imf-${range}`} 
          />
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={range} onChange={setRange} hideHistorical />
          </div>
        </div>
      </div>

      <div className="card relative overflow-hidden flex flex-col" style={{ height: 450, minHeight: 450 }}>
        {isLoading && <LoadingMessage message="Cargando datos de DSCOVR..." />}
        {isError && !isLoading && <ErrorMessage message="Error al cargar datos de L1" />}
        {!isError && !isLoading && samples && samples.length === 0 && (
          <EmptyMessage message="No hay datos de DSCOVR disponibles." />
        )}
        {!isError && !isLoading && samples && samples.length > 0 && (
          <PlotlyChart data={plotData} layout={layout} className="flex-1 w-full" />
        )}
      </div>
      <UsageImpacts usage={USAGE} impacts={IMPACTS} />

      <SectionDetails>
        <p>
          El satélite <strong>DSCOVR</strong> (Deep Space Climate Observatory) se encuentra en el punto de Lagrange L1, a unos 1.5 millones de kilómetros de la Tierra en dirección al Sol. Sus instrumentos monitorean el viento solar y el <strong>Campo Magnético Interplanetario (IMF)</strong> antes de que impacten nuestra magnetósfera.
        </p>
        <p className="mt-4">
          La componente <strong>Bz</strong> es la más crítica para la predicción de auroras y tormentas geomagnéticas. Cuando Bz es negativa (apunta hacia el sur), las líneas de campo del IMF pueden conectarse con las de la Tierra, permitiendo que el plasma solar entre en nuestra magnetósfera.
        </p>
        <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-text-secondary">
          <li><strong>Bt:</strong> Magnitud total del campo magnético interplanetario. Valores elevados ({'>'}10 nT) suelen indicar la llegada de una perturbación.</li>
          <li><strong>Bz:</strong> Componente Norte-Sur. Un Bz sostenido de -10 nT o más suele provocar tormentas geomagnéticas significativas.</li>
          <li><strong>Bx / By:</strong> Componentes en el plano Sol-Tierra y de la órbita. Útiles para identificar la polaridad del sector solar.</li>
        </ul>
      </SectionDetails>
    </div>
  )
}
