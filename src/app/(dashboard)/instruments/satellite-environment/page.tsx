import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Entorno Satélite' }
export default function SatelliteEnvironmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Entorno del Satélite
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Vista combinada de partículas y rayos X · Resumen del entorno en tiempo real
        </p>
      </div>
      <div className="card text-center py-12 text-text-muted text-xs">
        Panel de entorno del satélite — a implementar
      </div>
    </div>
  )
}
