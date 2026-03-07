import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Estado del Satélite' }
export default function SatelliteStatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Estado del Satélite e Instrumentos
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Estado operacional del GOES-19 · Fuente: NOAA OSPO · Actualización cada 5 minutos
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Panel de estado del satélite — a implementar
      </div>
    </div>
  )
}
