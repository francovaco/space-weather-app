import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = { title: 'Mapa de Alertas — SMN Argentina' }

const SMNAlertsMap = dynamic(
  () => import('@/components/smn-alerts/SMNAlertsMap').then(m => m.SMNAlertsMap),
  { ssr: false, loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-text-muted">
      Cargando mapa…
    </div>
  )},
)

export default function SMNAlertsPage() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Mapa de Alertas Meteorológicas
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          SMN Argentina · Sistema de Alerta Temprana · 171 zonas · Actualización cada 30 min
        </p>
      </div>
      <div className="h-[calc(100vh-10rem)]">
        <SMNAlertsMap />
      </div>
    </div>
  )
}
